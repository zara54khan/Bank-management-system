import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---- Database row types ----

export type AccountType = 'savings' | 'checking';

export interface AccountRow {
  id: string;
  account_number: string;
  owner_name: string;
  account_type: AccountType;
  balance: number;
  interest_rate: number;
  overdraft_limit: number;
  created_at: string;
  updated_at: string;
}

export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'transfer_in'
  | 'transfer_out'
  | 'interest';

export interface TransactionRow {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  related_account_id: string | null;
  balance_after: number;
  created_at: string;
}
