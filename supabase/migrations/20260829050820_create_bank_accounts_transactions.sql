/*
# Bank Management System Schema

## Overview
Creates the core tables for a bank management system that demonstrates
inheritance, encapsulation, and abstraction through account types
(Savings, Checking) stored in a single-tenant, no-auth database.

## New Tables

### accounts
- `id` (uuid, primary key) — unique account identifier
- `account_number` (text, unique, not null) — human-readable account number
- `owner_name` (text, not null) — name of the account holder
- `account_type` (text, not null) — discriminator: 'savings' or 'checking'
- `balance` (numeric, not null, default 0) — current balance, always >= 0 enforced by app
- `interest_rate` (numeric, default 0) — annual interest rate for savings accounts
- `overdraft_limit` (numeric, default 0) — allowed negative balance for checking accounts
- `created_at` (timestamptz, default now()) — account creation timestamp
- `updated_at` (timestamptz, default now()) — last modification timestamp

### transactions
- `id` (uuid, primary key) — unique transaction identifier
- `account_id` (uuid, not null, references accounts) — the account this transaction belongs to
- `type` (text, not null) — 'deposit', 'withdraw', 'transfer_in', 'transfer_out', 'interest'
- `amount` (numeric, not null) — transaction amount (always positive)
- `description` (text) — optional human-readable description
- `related_account_id` (uuid, references accounts) — for transfers, the counterparty account
- `balance_after` (numeric, not null) — account balance after this transaction
- `created_at` (timestamptz, default now()) — transaction timestamp

## Security
- RLS enabled on both tables.
- Single-tenant (no auth): anon + authenticated roles have full CRUD since
  the data is intentionally shared/public for this demo application.
- All policies use `USING (true)` / `WITH CHECK (true)` because there is no
  sign-in screen and the data is intentionally public.

## Notes
1. Foreign key from transactions.account_id to accounts.id with ON DELETE CASCADE
   so deleting an account removes its transaction history.
2. Index on transactions.account_id for efficient per-account queries.
3. Index on accounts.account_number for lookups.
*/

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number text UNIQUE NOT NULL,
  owner_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('savings', 'checking')),
  balance numeric(14, 2) NOT NULL DEFAULT 0,
  interest_rate numeric(5, 4) DEFAULT 0,
  overdraft_limit numeric(14, 2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'withdraw', 'transfer_in', 'transfer_out', 'interest')),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  description text,
  related_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  balance_after numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- accounts policies (single-tenant, intentionally public)
DROP POLICY IF EXISTS "anon_select_accounts" ON accounts;
CREATE POLICY "anon_select_accounts" ON accounts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_accounts" ON accounts;
CREATE POLICY "anon_insert_accounts" ON accounts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_accounts" ON accounts;
CREATE POLICY "anon_update_accounts" ON accounts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_accounts" ON accounts;
CREATE POLICY "anon_delete_accounts" ON accounts FOR DELETE
  TO anon, authenticated USING (true);

-- transactions policies (single-tenant, intentionally public)
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);
