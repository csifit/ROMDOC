-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 72E: Complimentary access expiry and reminders
--
-- File:
-- ROMDOC/database/61-complimentary-access-expiry-reminders.sql
-- =====================================================

begin;

create table if not exists public.doctor_access_reminders (
  id uuid primary key default gen_random_uuid(),
  access_grant_id uuid not null
    references public.doctor_access_grants(id)
    on delete restrict,
  doctor_id uuid not null
    references public.doctors(id)
    on delete restrict,
  reminder_type text not null
    check (
      reminder_type in (
        '30_days',
        '7_days'
      )
    ),
  scheduled_for date not null,
  recipient_email text not null,
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'processing',
        'sent',
        'failed',
        'skipped'
      )
    ),
  provider_message_id text,
  error_code text,
  error_message text,
  claimed_at timestamptz,
  sent_at timestamptz,
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint doctor_access_reminders_unique
    unique (
      access_grant_id,
      reminder_type
    )
);

create index if not exists
  idx_doctor_access_reminders_status
on public.doctor_access_reminders (
  status,
  scheduled_for
);

create index if not exists
  idx_doctor_access_reminders_doctor
on public.doctor_access_reminders (
  doctor_id,
  created_at desc
);

alter table public.doctor_access_reminders
enable row level security;

revoke all
on table public.doctor_access_reminders
from public, anon, authenticated;

grant all
on table public.doctor_access_reminders
to service_role;

drop trigger if exists
  set_doctor_access_reminders_updated_at
on public.doctor_access_reminders;

create trigger
  set_doctor_access_reminders_updated_at
before update
on public.doctor_access_reminders
for each row
execute function public.handle_updated_at();

create or replace function public.expire_due_complimentary_access()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_expired_count integer := 0;
begin
  update public.doctor_access_grants as dag
  set
    status = 'expired',
    updated_at = now()
  where dag.grant_type = 'admin_complimentary'
    and dag.status = 'active'
    and dag.ends_at <= now();

  get diagnostics
    v_expired_count = row_count;

  return v_expired_count;
end;
$function$;

revoke all
on function public.expire_due_complimentary_access()
from public, anon, authenticated;

grant execute
on function public.expire_due_complimentary_access()
to service_role;

commit;
