import { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, TrendingUp, Wallet, Users, AlertCircle } from 'lucide-react';
import { bankService, type NewAccountInput } from '@/lib/bankService';
import type { BankAccount } from '@/lib/domain';
import { formatCurrency } from '@/lib/format';
import { AccountCard } from '@/components/AccountCard';
import { AccountDetail } from '@/components/AccountDetail';
import { Modal } from '@/components/Modal';
import { CreateAccountForm } from '@/components/CreateAccountForm';

function App() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const rows = await bankService.listAccounts();
      setAccounts(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  const handleCreate = async (input: NewAccountInput) => {
    await bankService.createAccount(input);
    setShowCreate(false);
    await refresh();
  };

  const handleDetailChanged = async () => {
    await refresh();
  };

  // ---- Stats ----
  const totalAssets = accounts.reduce((sum, a) => sum + a.balance, 0);
  const savingsCount = accounts.filter((a) => a.accountType === 'savings').length;
  const checkingCount = accounts.filter((a) => a.accountType === 'checking').length;

  // ---- Detail view ----
  if (selected) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <AccountDetail account={selected} onBack={() => setSelectedId(null)} onChanged={handleDetailChanged} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Meridian Bank</h1>
              <p className="text-xs text-slate-400">Management System</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New account</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total assets"
            value={formatCurrency(totalAssets)}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="emerald"
          />
          <StatCard
            label="Savings accounts"
            value={String(savingsCount)}
            icon={<Wallet className="h-5 w-5" />}
            tone="sky"
          />
          <StatCard
            label="Checking accounts"
            value={String(checkingCount)}
            icon={<Users className="h-5 w-5" />}
            tone="violet"
          />
        </div>

        {/* Account grid */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Accounts</h2>
            {accounts.length > 0 && (
              <span className="text-sm text-slate-400">{accounts.length} total</span>
            )}
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-700 ring-1 ring-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState onCreate={() => setShowCreate(true)} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} onOpen={setSelectedId} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create modal */}
      <Modal open={showCreate} title="Create new account" onClose={() => setShowCreate(false)}>
        <CreateAccountForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}

// ---- Sub-components ----

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'sky' | 'violet';
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Building2 className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-700">No accounts yet</h3>
      <p className="mt-1 text-sm text-slate-400">Create your first account to start managing funds.</p>
      <button
        onClick={onCreate}
        className="mt-5 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Create account
      </button>
    </div>
  );
}

export default App;
