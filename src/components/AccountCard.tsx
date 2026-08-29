import { PiggyBank, Wallet, ArrowUpRight } from 'lucide-react';
import type { BankAccount } from '@/lib/domain';
import { formatCurrency, formatDate, maskAccountNumber } from '@/lib/format';

interface AccountCardProps {
  account: BankAccount;
  onOpen: (id: string) => void;
}

export function AccountCard({ account, onOpen }: AccountCardProps) {
  const isSavings = account.accountType === 'savings';
  const Icon = isSavings ? PiggyBank : Wallet;
  const accent = isSavings
    ? 'from-emerald-500 to-teal-600'
    : 'from-sky-500 to-blue-600';

  return (
    <button
      onClick={() => onOpen(account.id)}
      className="group relative w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-300"
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{account.ownerName}</p>
              <p className="font-mono text-xs text-slate-400">{maskAccountNumber(account.accountNumber)}</p>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isSavings ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
            {account.typeLabel}
          </span>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Balance</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-900">{formatCurrency(account.balance)}</p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">{account.ruleSummary}</p>
          <span className="flex items-center gap-0.5 text-xs font-medium text-slate-400 transition-colors group-hover:text-emerald-600">
            Open
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <p className="mt-2 text-[11px] text-slate-300">Opened {formatDate(account.createdAt)}</p>
      </div>
    </button>
  );
}
