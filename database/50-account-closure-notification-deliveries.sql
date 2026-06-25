-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 68B-6: Account-closure notification deliveries
--
-- File:
-- ROMDOC/database/50-account-closure-notification-deliveries.sql
-- =====================================================

begin;

create table if not exists public.privacy_account_closure_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  closure_request_id uuid not null references public.privacy_account_closure_requests(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  notification_type text not null check (notification_type in ('closure_requested','closure_cancelled','processing_started','closure_completed')),
  recipient_email text not null,
  locale text not null default 'ro' check (locale in ('ro','en')),
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  provider text not null default 'resend',
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (closure_request_id, notification_type),
  check (char_length(recipient_email) <= 320),
  check (error_message is null or char_length(error_message) <= 2000)
);

create index if not exists privacy_closure_notification_profile_idx
on public.privacy_account_closure_notification_deliveries (profile_id, created_at desc);

create index if not exists privacy_closure_notification_status_idx
on public.privacy_account_closure_notification_deliveries (status, created_at);

drop trigger if exists set_privacy_closure_notification_updated_at
on public.privacy_account_closure_notification_deliveries;

create trigger set_privacy_closure_notification_updated_at
before update on public.privacy_account_closure_notification_deliveries
for each row execute function public.handle_updated_at();

alter table public.privacy_account_closure_notification_deliveries enable row level security;
revoke all on table public.privacy_account_closure_notification_deliveries from public, anon, authenticated;
grant all on table public.privacy_account_closure_notification_deliveries to service_role;

comment on table public.privacy_account_closure_notification_deliveries is
  'Idempotent delivery log for account-closure transactional emails. Never store email bodies, medical content, tokens, or signed URLs.';

commit;

select table_name, row_security
from information_schema.tables
where table_schema = 'public'
  and table_name = 'privacy_account_closure_notification_deliveries';
