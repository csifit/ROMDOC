-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 56A: Admin users management and blocking
--
-- File:
-- ROMDOC/database/26-admin-users.sql
-- =====================================================

begin;

-- =====================================================
-- 1. ACCOUNT STATUS
-- =====================================================

alter table public.profiles
  add column if not exists account_status text;

update public.profiles
set account_status = 'active'
where account_status is null;

alter table public.profiles
  alter column account_status
  set default 'active';

alter table public.profiles
  alter column account_status
  set not null;

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (
    account_status in (
      'active',
      'blocked'
    )
  );

-- =====================================================
-- 2. BLOCKING AUDIT FIELDS
-- =====================================================

alter table public.profiles
  add column if not exists blocked_at timestamptz;

alter table public.profiles
  add column if not exists blocked_by_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.profiles
  add column if not exists blocked_reason text;

-- =====================================================
-- 3. INDEXES
-- =====================================================

create index if not exists
  idx_profiles_account_status
on public.profiles (
  account_status
);

create index if not exists
  idx_profiles_role_account_status
on public.profiles (
  role,
  account_status
);

create index if not exists
  idx_profiles_created_at
on public.profiles (
  created_at desc
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  id,
  role,
  first_name,
  last_name,
  account_status,
  blocked_at,
  blocked_by_profile_id,
  blocked_reason,
  created_at
from public.profiles
order by created_at desc;