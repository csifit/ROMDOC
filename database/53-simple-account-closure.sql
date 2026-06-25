-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Simple patient account-closure request
--
-- Exact path:
-- ROMDOC/database/53-simple-account-closure.sql
--
-- Adds:
--   profiles.account_closure_requested_at
--
-- Does not add:
--   tables
--   RLS policies
--   RPC functions
--   triggers
--   cron jobs
-- =====================================================

begin;

alter table public.profiles
  add column if not exists
    account_closure_requested_at timestamptz;

create index if not exists
  profiles_pending_account_closure_idx
on public.profiles (
  account_closure_requested_at
)
where
  account_closure_requested_at is not null
  and account_status = 'active'
  and role = 'patient';

comment on column
  public.profiles.account_closure_requested_at
is
  'Timestamp set when a patient asks an administrator to close the account. The existing administrator block action performs the actual access closure.';

commit;

-- Verification

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name =
    'account_closure_requested_at';

select
  indexname,
  indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and indexname =
    'profiles_pending_account_closure_idx';
