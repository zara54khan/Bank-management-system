import type { AccountRow, AccountType, TransactionRow, TransactionType } from './supabase';

// ===========================================================================
// ABSTRACTION
// The `Transaction` value object captures the immutable record of a single
// movement of money. It exposes only what consumers need; the internal
// representation (raw row from the database) is hidden behind a typed facade.
// ===========================================================================

export class Transaction {
  readonly id: string;
  readonly accountId: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly description: string | null;
  readonly relatedAccountId: string | null;
  readonly balanceAfter: number;
  readonly createdAt: string;

  constructor(row: TransactionRow) {
    this.id = row.id;
    this.accountId = row.account_id;
    this.type = row.type;
    this.amount = Number(row.amount);
    this.description = row.description;
    this.relatedAccountId = row.related_account_id;
    this.balanceAfter = Number(row.balance_after);
    this.createdAt = row.created_at;
  }

  // Encapsulation: a derived view is computed, not stored.
  get signedAmount(): number {
    return this.type === 'withdraw' || this.type === 'transfer_out'
      ? -this.amount
      : this.amount;
  }

  get isCredit(): boolean {
    return this.signedAmount >= 0;
  }
}

// ===========================================================================
// ABSTRACTION + INHERITANCE
// `BankAccount` is an abstract base class. It defines the contract every
// account type must follow (deposit, withdraw, transfer, interest) but
// leaves the type-specific rules abstract. Subclasses (SavingsAccount,
// CheckingAccount) implement those rules differently — the classic shape of
// inheritance and abstraction working together.
//
// ENCAPSULATION
// The `balance` is private and can only change through the controlled
// methods below. No code outside this class can set it directly, which
// guarantees every change is validated and recorded.
// ===========================================================================

export abstract class BankAccount {
  readonly id: string;
  readonly accountNumber: string;
  readonly ownerName: string;
  readonly accountType: AccountType;
  readonly createdAt: string;
  protected _balance: number;

  constructor(row: AccountRow) {
    this.id = row.id;
    this.accountNumber = row.account_number;
    this.ownerName = row.owner_name;
    this.accountType = row.account_type;
    this.createdAt = row.created_at;
    this._balance = Number(row.balance);
  }

  get balance(): number {
    return this._balance;
  }

  // --- Abstract operations: each account type decides its own rules ---

  /** Whether a withdrawal of `amount` is permitted under this account's rules. */
  abstract canWithdraw(amount: number): boolean;

  /** Apply interest specific to this account type. Returns interest earned. */
  abstract applyInterest(): number;

  // --- Concrete shared logic (encapsulated, validated) ---

  deposit(amount: number): void {
    this.assertPositive(amount, 'Deposit amount must be greater than zero.');
    this._balance += amount;
  }

  withdraw(amount: number): void {
    this.assertPositive(amount, 'Withdrawal amount must be greater than zero.');
    if (!this.canWithdraw(amount)) {
      throw new Error(
        `Withdrawal of ${amount.toFixed(2)} exceeds the available funds on account ${this.accountNumber}.`,
      );
    }
    this._balance -= amount;
  }

  /** Human-readable label for the account type, used in the UI. */
  abstract get typeLabel(): string;

  /** A short descriptor of the account's key rule, shown in the UI. */
  abstract get ruleSummary(): string;

  private assertPositive(amount: number, message: string): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(message);
    }
  }
}

// ===========================================================================
// INHERITANCE — SavingsAccount
// A savings account earns interest and forbids overdrafts. It extends
// BankAccount and supplies the two abstract operations with savings-specific
// behavior.
// ===========================================================================

export class SavingsAccount extends BankAccount {
  readonly interestRate: number;

  constructor(row: AccountRow) {
    super(row);
    this.interestRate = Number(row.interest_rate) || 0;
  }

  canWithdraw(amount: number): boolean {
    return this._balance - amount >= 0;
  }

  applyInterest(): number {
    if (this.interestRate <= 0) return 0;
    const interest = this._balance * this.interestRate;
    this._balance += interest;
    return interest;
  }

  get typeLabel(): string {
    return 'Savings';
  }

  get ruleSummary(): string {
    return `${(this.interestRate * 100).toFixed(2)}% annual interest · no overdraft`;
  }
}

// ===========================================================================
// INHERITANCE — CheckingAccount
// A checking account allows overdrafts up to a configured limit and earns no
// interest. Same interface as SavingsAccount, different rules.
// ===========================================================================

export class CheckingAccount extends BankAccount {
  readonly overdraftLimit: number;

  constructor(row: AccountRow) {
    super(row);
    this.overdraftLimit = Number(row.overdraft_limit) || 0;
  }

  canWithdraw(amount: number): boolean {
    return this._balance - amount >= -this.overdraftLimit;
  }

  applyInterest(): number {
    return 0;
  }

  get typeLabel(): string {
    return 'Checking';
  }

  get ruleSummary(): string {
    return `Overdraft up to ${this.overdraftLimit.toFixed(2)} · no interest`;
  }
}

// ===========================================================================
// ABSTRACTION — AccountFactory
// A small factory that hides which concrete subclass to instantiate based on
// the account_type discriminator. Callers work against `BankAccount` and never
// need to know the concrete type.
// ===========================================================================

export function toAccount(row: AccountRow): BankAccount {
  return row.account_type === 'savings'
    ? new SavingsAccount(row)
    : new CheckingAccount(row);
}

export function toTransactions(rows: TransactionRow[]): Transaction[] {
  return rows.map((r) => new Transaction(r));
}
