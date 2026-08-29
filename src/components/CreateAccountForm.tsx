import { useState, type FormEvent } from 'react';
import { PiggyBank, Wallet, AlertCircle } from 'lucide-react';
import type { AccountType } from '@/lib/supabase';
import type { NewAccountInput } from '@/lib/bankService';

interface CreateAccountFormProps {
  onSubmit: (input: NewAccountInput) => Promise<void>;
  onCancel: () => void;
}

export function CreateAccountForm({ onSubmit, onCancel }: CreateAccountFormProps) {
  const [ownerName, setOwnerName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('savings');
  const [initialDeposit, setInitialDeposit] = useState('1000');
  const [interestRate, setInterestRate] = useState('3');
  const [overdraftLimit, setOverdraftLimit] = useState('500');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        ownerName,
        accountType,
        initialDeposit: parseFloat(initialDeposit) || 0,
        interestRate: (parseFloat(interestRate) || 0) / 100,
        overdraftLimit: parseFloat(overdraftLimit) || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Account holder</label>
        <input
          type="text"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder="e.g. Jane Doe"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Account type</label>
        <div className="grid grid-cols-2 gap-3">
          <TypeCard
            selected={accountType === 'savings'}
            onClick={() => setAccountType('savings')}
            icon={<PiggyBank className="h-5 w-5" />}
            label="Savings"
            description="Earns interest"
          />
          <TypeCard
            selected={accountType === 'checking'}
            onClick={() => setAccountType('checking')}
            icon={<Wallet className="h-5 w-5" />}
            label="Checking"
            description="Overdraft allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Initial deposit</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-7 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>
        </div>

        {accountType === 'savings' ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Interest rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Overdraft limit</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={overdraftLimit}
                onChange={(e) => setOverdraftLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-7 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </div>
    </form>
  );
}

function TypeCard({
  selected,
  onClick,
  icon,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3.5 text-left transition-all ${
        selected
          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span className={selected ? 'text-emerald-600' : 'text-slate-400'}>{icon}</span>
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className="text-xs text-slate-500">{description}</span>
    </button>
  );
}
