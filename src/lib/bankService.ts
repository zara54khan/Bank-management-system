import { supabase, type AccountRow, type AccountType, type TransactionRow } from './supabase';
import { toAccount, toTransactions, type BankAccount, type Transaction } from './domain';

// ===========================================================================
// BankService
// The application-facing service. It loads rows from Supabase, reconstructs
// the rich domain objects (BankAccount subclasses, Transaction), and persists
// the results of domain operations back to the database. The UI talks only to
// this service — it never touches Supabase or the domain classes directly.
// ===========================================================================

export interface NewAccountInput {
  ownerName: string;
  accountType: AccountType;
  initialDeposit: number;
  interestRate?: number;
  overdraftLimit?: number;
}

function generateAccountNumber(): string {
  // 10-digit readable number, grouped as XXXX-XXXX-XX
  const part = (n: number) => String(n).padStart(n >= 100 ? 4 : 2, '0');
  const a = Math.floor(1000 + Math.random() * 9000);
  const b = Math.floor(1000 + Math.random() * 9000);
  const c = Math.floor(10 + Math.random() * 90);
  return `${part(a)}-${part(b)}-${part(c)}`;
}

export const bankService = {
  // ---- Reads ----

  async listAccounts(): Promise<BankAccount[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as AccountRow[]).map(toAccount);
  },

  async getAccount(id: string): Promise<BankAccount> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Account not found.');
    return toAccount(data as AccountRow);
  },

  async listTransactions(accountId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return toTransactions(data as TransactionRow[]);
  },

  // ---- Mutations ----

  async createAccount(input: NewAccountInput): Promise<BankAccount> {
    if (input.initialDeposit < 0) throw new Error('Initial deposit cannot be negative.');
    if (!input.ownerName.trim()) throw new Error('Owner name is required.');

    const row: Record<string, unknown> = {
      account_number: generateAccountNumber(),
      owner_name: input.ownerName.trim(),
      account_type: input.accountType,
      balance: input.initialDeposit,
      interest_rate: input.accountType === 'savings' ? (input.interestRate ?? 0.03) : 0,
      overdraft_limit: input.accountType === 'checking' ? (input.overdraftLimit ?? 500) : 0,
    };

    const { data, error } = await supabase
      .from('accounts')
      .insert(row)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    const account = toAccount(data as AccountRow);

    // Record the opening deposit as the first transaction.
    if (input.initialDeposit > 0) {
      await this.recordTransaction(account.id, 'deposit', input.initialDeposit, 'Opening deposit', null, account.balance);
    }

    return account;
  },

  async deposit(accountId: string, amount: number, description?: string): Promise<BankAccount> {
    if (amount <= 0) throw new Error('Deposit amount must be greater than zero.');
    const account = await this.getAccount(accountId);
    account.deposit(amount);
    await this.updateBalance(accountId, account.balance);
    await this.recordTransaction(accountId, 'deposit', amount, description ?? 'Deposit', null, account.balance);
    return account;
  },

  async withdraw(accountId: string, amount: number, description?: string): Promise<BankAccount> {
    if (amount <= 0) throw new Error('Withdrawal amount must be greater than zero.');
    const account = await this.getAccount(accountId);
    account.withdraw(amount); // type-specific rule enforced inside the domain
    await this.updateBalance(accountId, account.balance);
    await this.recordTransaction(accountId, 'withdraw', amount, description ?? 'Withdrawal', null, account.balance);
    return account;
  },

  async transfer(fromId: string, toId: string, amount: number, description?: string): Promise<void> {
    if (amount <= 0) throw new Error('Transfer amount must be greater than zero.');
    if (fromId === toId) throw new Error('Cannot transfer to the same account.');

    const from = await this.getAccount(fromId);
    const to = await this.getAccount(toId);

    from.withdraw(amount);
    to.deposit(amount);

    await this.updateBalance(fromId, from.balance);
    await this.updateBalance(toId, to.balance);

    await this.recordTransaction(fromId, 'transfer_out', amount, description ?? `Transfer to ${to.accountNumber}`, toId, from.balance);
    await this.recordTransaction(toId, 'transfer_in', amount, description ?? `Transfer from ${from.accountNumber}`, fromId, to.balance);
  },

  async applyInterest(accountId: string): Promise<BankAccount> {
    const account = await this.getAccount(accountId);
    const interest = account.applyInterest();
    if (interest <= 0) throw new Error('This account does not earn interest.');
    await this.updateBalance(accountId, account.balance);
    await this.recordTransaction(accountId, 'interest', interest, 'Interest applied', null, account.balance);
    return account;
  },

  async deleteAccount(accountId: string): Promise<void> {
    const { error } = await supabase.from('accounts').delete().eq('id', accountId);
    if (error) throw new Error(error.message);
  },

  // ---- Internal helpers ----

  async updateBalance(accountId: string, balance: number): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .update({ balance, updated_at: new Date().toISOString() })
      .eq('id', accountId);
    if (error) throw new Error(error.message);
  },

  async recordTransaction(
    accountId: string,
    type: TransactionRow['type'],
    amount: number,
    description: string,
    relatedAccountId: string | null,
    balanceAfter: number,
  ): Promise<void> {
    const { error } = await supabase.from('transactions').insert({
      account_id: accountId,
      type,
      amount,
      description,
      related_account_id: relatedAccountId,
      balance_after: balanceAfter,
    });
    if (error) throw new Error(error.message);
  },
};
