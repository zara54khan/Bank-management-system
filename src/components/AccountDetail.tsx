import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Trash2,
  PiggyBank,
  Wallet,
  TrendingUp,
  AlertCircle,
  Plus,
  Minus,
  ArrowRight,
} from 'lucide-react';
import type { BankAccount, Transaction } from '@/lib/domain';
import { bankService } from '@/lib/bankService';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Modal } from './Modal';

interface AccountDetailProps {
  account: BankAccount;
  onBack: () => void;
  onChanged: () => void;
}

type ActionMode = 'deposit' | 'withdraw' | 'transfer' | null;

export function AccountDetail({ account, onBack, onChanged }: AccountDetailProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    bankService
      .listTransactions(account.id)
      .then((rows) => {
        if (!cancelled) setTransactions(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account.id, account.balance]);

  const isSavings = account.accountType === 'savings';
  const Icon = isSavings ? PiggyBank : Wallet;
  const accent = isSavings ? 'from-emerald-500 to-teal-600' : 'from-sky-500 to-blue-600';

  const handleAction = async (mode: ActionMode, amount: number, targetId?: string) => {
    setError(null);
    try {
      if (mode === 'deposit') await bankService.deposit(account.id, amount);
      else if (mode === 'withdraw') await bankService.withdraw(account.id, amount);
      else if (mode === 'transfer' && targetId) await bankService.transfer(account.id, targetId, amount);
      setActionMode(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleInterest = async () => {
    setError(null);
    try {
      await bankService.applyInterest(account.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await bankService.deleteAccount(account.id);
      setConfirmDelete(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          All accounts
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

      {/* Account header card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className={`h-2 w-full bg-gradient-to-r ${accent}`} />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}>
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{account.ownerName}</h2>
                <p className="font-mono text-sm text-slate-400">{account.accountNumber}</p>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${isSavings ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
                  {account.typeLabel}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current balance</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{formatCurrency(account.balance)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{account.ruleSummary}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <ActionButton icon={<ArrowDownCircle className="h-4 w-4" />} label="Deposit" onClick={() => { setError(null); setActionMode('deposit'); }} tone="emerald" />
            <ActionButton icon={<ArrowUpCircle className="h-4 w-4" />} label="Withdraw" onClick={() => { setError(null); setActionMode('withdraw'); }} tone="sky" />
            <ActionButton icon={<ArrowLeftRight className="h-4 w-4" />} label="Transfer" onClick={() => { setError(null); setActionMode('transfer'); }} tone="violet" />
            {isSavings && (
              <ActionButton icon={<TrendingUp className="h-4 w-4" />} label="Apply interest" onClick={handleInterest} tone="amber" />
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Transaction history */}
      <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Transaction history</h3>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-slate-400">No transactions yet.</p>
            <p className="mt-1 text-xs text-slate-300">Make a deposit to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {transactions.map((tx) => (
              <TransactionRowItem key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </div>

      {/* Action modals */}
      <ActionModal
        mode={actionMode}
        account={account}
        onClose={() => setActionMode(null)}
        onSubmit={handleAction}
      />

      {/* Delete confirmation */}
      <Modal open={confirmDelete} title="Delete account" onClose={() => setConfirmDelete(false)} maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete <span className="font-semibold text-slate-900">{account.ownerName}</span>'s account? This will also erase all transaction history and cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition-all hover:bg-rose-700"
            >
              Delete account
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---- Sub-components ----

function ActionButton({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: 'emerald' | 'sky' | 'violet' | 'amber';
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200',
    sky: 'bg-sky-50 text-sky-700 hover:bg-sky-100 ring-sky-200',
    violet: 'bg-violet-50 text-violet-700 hover:bg-violet-100 ring-violet-200',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-200',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition-all ${tones[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}

function TransactionRowItem({ tx }: { tx: Transaction }) {
  const isCredit = tx.isCredit;
  const Icon = isCredit ? Plus : Minus;
  const iconBg = isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600';
  const typeLabel: Record<string, string> = {
    deposit: 'Deposit',
    withdraw: 'Withdrawal',
    transfer_in: 'Transfer in',
    transfer_out: 'Transfer out',
    interest: 'Interest',
  };

  return (
    <li className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/60">
      <div className="flex items-center gap-3.5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">{typeLabel[tx.type] ?? tx.type}</p>
          <p className="text-xs text-slate-400">
            {tx.description ?? '—'} · {formatDateTime(tx.createdAt)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isCredit ? 'text-emerald-600' : 'text-slate-700'}`}>
          {isCredit ? '+' : '−'}{formatCurrency(tx.amount)}
        </p>
        <p className="font-mono text-xs text-slate-400">{formatCurrency(tx.balanceAfter)}</p>
      </div>
    </li>
  );
}

// ---- Action modal ----

function ActionModal({
  mode,
  account,
  onClose,
  onSubmit,
}: {
  mode: ActionMode;
  account: BankAccount;
  onClose: () => void;
  onSubmit: (mode: ActionMode, amount: number, targetId?: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'transfer') {
      bankService.listAccounts().then((all) => setAccounts(all.filter((a) => a.id !== account.id))).catch(() => {});
    }
    setAmount('');
    setTargetId('');
    setError(null);
  }, [mode, account.id]);

  if (!mode) return null;

  const titles: Record<string, string> = {
    deposit: 'Deposit funds',
    withdraw: 'Withdraw funds',
    transfer: 'Transfer funds',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(mode, parseFloat(amount) || 0, mode === 'transfer' ? targetId : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!mode} title={titles[mode]} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Account</span>
            <span className="font-medium text-slate-800">{account.ownerName}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-slate-500">Available balance</span>
            <span className="font-mono font-semibold text-slate-900">{formatCurrency(account.balance)}</span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-7 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>
        </div>

        {mode === 'transfer' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">To account</label>
            {accounts.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
                No other accounts available to transfer to.
              </p>
            ) : (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                required
              >
                <option value="">Select an account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.ownerName} — {a.accountNumber} ({formatCurrency(a.balance)})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || (mode === 'transfer' && !targetId)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mode === 'deposit' && <><ArrowDownCircle className="h-4 w-4" /> Deposit</>}
            {mode === 'withdraw' && <><ArrowUpCircle className="h-4 w-4" /> Withdraw</>}
            {mode === 'transfer' && <><ArrowRight className="h-4 w-4" /> Transfer</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
