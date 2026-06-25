-- =====================================================
-- ROMDOC DATABASE ROLLBACK
-- Remove Step 68B account-closure / retention complexity
--
-- Exact target path:
-- ROMDOC/database/52-rollback-step68b-privacy-complexity.sql
--
-- Removes database objects introduced by:
--   48-privacy-retention-and-account-closure.sql
--   49-account-closure-executor-foundation.sql
--   50-account-closure-notification-deliveries.sql
--   51-account-closure-completion-gate.sql
--
-- Keeps:
--   profiles.account_status
--   existing active / blocked account behavior
--   all unrelated appointment, doctor, medical-folder,
--   storage, admin, manager, and authentication policies
--
-- WARNING:
-- This permanently deletes data stored in the Step 68B
-- privacy tables. Export those tables first if needed.
-- =====================================================

begin;

-- =====================================================
-- 1. DROP STEP 68B FUNCTIONS
-- Drop functions before their referenced tables.
-- =====================================================

drop function if exists
  public.resolve_account_closure_plan_item(
    uuid,
    text,
    text,
    text,
    jsonb,
    uuid
  );

drop function if exists
  public.get_account_closure_completion_readiness(
    uuid
  );

drop function if exists
  public.finalize_account_closure_if_ready(
    uuid,
    uuid,
    jsonb
  );

drop function if exists
  public.complete_account_closure_preparation(
    uuid,
    text
  );

drop function if exists
  public.prepare_due_account_closures(
    text,
    integer
  );

drop function if exists
  public.release_stale_account_closure_locks(
    interval
  );

drop function if exists
  public.get_own_account_closure_status();

drop function if exists
  public.cancel_own_account_closure();

drop function if exists
  public.request_own_account_closure(
    text
  );

drop function if exists
  public.has_active_privacy_legal_hold(
    uuid,
    text,
    uuid
  );

-- =====================================================
-- 2. DROP STEP 68B TABLES
-- Reverse dependency order.
-- CASCADE is deliberately avoided.
-- =====================================================

drop table if exists
  public.privacy_account_closure_notification_deliveries;

drop table if exists
  public.privacy_account_closure_plan_items;

drop table if exists
  public.privacy_retention_run_items;

drop table if exists
  public.privacy_retention_runs;

drop table if exists
  public.privacy_account_closure_events;

drop table if exists
  public.privacy_legal_holds;

drop table if exists
  public.privacy_account_closure_requests;

-- =====================================================
-- 3. RESTORE SIMPLE PROFILE ACCOUNT STATUS
--
-- Before Step 68B, RomDoc used:
--   active
--   blocked
--
-- Any temporary closure state is restored to active.
-- =====================================================

update public.profiles
set
  account_status = 'active',
  updated_at = now()
where account_status in (
  'closure_requested',
  'restricted',
  'anonymized'
);

alter table public.profiles
  drop constraint if exists
    profiles_account_status_check;

alter table public.profiles
  add constraint
    profiles_account_status_check
  check (
    account_status in (
      'active',
      'blocked'
    )
  );

drop index if exists
  public.profiles_closure_requested_idx;

-- The general account-status index may have existed before
-- Step 68B and remains useful for active/blocked users.
-- Therefore it is intentionally retained:
--   public.profiles_account_status_idx

alter table public.profiles
  drop column if exists
    closure_requested_at;

alter table public.profiles
  drop column if exists
    restricted_at;

alter table public.profiles
  drop column if exists
    anonymized_at;

alter table public.profiles
  drop column if exists
    privacy_status_updated_at;

commit;

-- =====================================================
-- 4. VERIFICATION
-- Run after the transaction succeeds.
-- =====================================================

select
  to_regclass(
    'public.privacy_account_closure_requests'
  ) as closure_requests_should_be_null,
  to_regclass(
    'public.privacy_account_closure_events'
  ) as closure_events_should_be_null,
  to_regclass(
    'public.privacy_legal_holds'
  ) as legal_holds_should_be_null,
  to_regclass(
    'public.privacy_retention_runs'
  ) as retention_runs_should_be_null,
  to_regclass(
    'public.privacy_retention_run_items'
  ) as retention_run_items_should_be_null,
  to_regclass(
    'public.privacy_account_closure_plan_items'
  ) as closure_plan_items_should_be_null,
  to_regclass(
    'public.privacy_account_closure_notification_deliveries'
  ) as notification_deliveries_should_be_null;

select
  column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'closure_requested_at',
    'restricted_at',
    'anonymized_at',
    'privacy_status_updated_at'
  )
order by column_name;

select
  account_status,
  count(*) as profile_count
from public.profiles
group by account_status
order by account_status;

select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'has_active_privacy_legal_hold',
    'request_own_account_closure',
    'cancel_own_account_closure',
    'get_own_account_closure_status',
    'release_stale_account_closure_locks',
    'prepare_due_account_closures',
    'complete_account_closure_preparation',
    'resolve_account_closure_plan_item',
    'get_account_closure_completion_readiness',
    'finalize_account_closure_if_ready'
  )
order by routine_name;
