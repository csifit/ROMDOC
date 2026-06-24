-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 64E: Patient reminder preferences
--
-- File:
-- ROMDOC/database/46-patient-reminder-preferences.sql
--
-- Requires:
--   profiles
--   appointment reminder migrations 43-45
-- =====================================================

begin;

create table if not exists
  public.patient_reminder_preferences (
    patient_profile_id uuid primary key
      references public.profiles(id)
      on update cascade
      on delete cascade,

    email_reminders_enabled boolean
      not null default true,

    reminder_48_hours_enabled boolean
      not null default true,

    reminder_24_hours_enabled boolean
      not null default true,

    created_at timestamptz
      not null default now(),

    updated_at timestamptz
      not null default now()
  );

comment on table
  public.patient_reminder_preferences
is
  'Patient-controlled appointment reminder preferences. Missing row means all email reminders are enabled by default.';

comment on column
  public.patient_reminder_preferences.email_reminders_enabled
is
  'Master switch for appointment reminder emails.';

comment on column
  public.patient_reminder_preferences.reminder_48_hours_enabled
is
  'Controls the approximately 48-hour appointment reminder email.';

comment on column
  public.patient_reminder_preferences.reminder_24_hours_enabled
is
  'Controls the approximately 24-hour appointment reminder email.';

create or replace function
  public.set_patient_reminder_preferences_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists
  patient_reminder_preferences_updated_at
on public.patient_reminder_preferences;

create trigger
  patient_reminder_preferences_updated_at
before update
on public.patient_reminder_preferences
for each row
execute function
  public.set_patient_reminder_preferences_updated_at();

alter table
  public.patient_reminder_preferences
enable row level security;

drop policy if exists
  "Patients can read own reminder preferences"
on public.patient_reminder_preferences;

create policy
  "Patients can read own reminder preferences"
on public.patient_reminder_preferences
for select
to authenticated
using (
  patient_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'patient'
      and account_status = 'active'
  )
);

drop policy if exists
  "Patients can insert own reminder preferences"
on public.patient_reminder_preferences;

create policy
  "Patients can insert own reminder preferences"
on public.patient_reminder_preferences
for insert
to authenticated
with check (
  patient_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'patient'
      and account_status = 'active'
  )
);

drop policy if exists
  "Patients can update own reminder preferences"
on public.patient_reminder_preferences;

create policy
  "Patients can update own reminder preferences"
on public.patient_reminder_preferences
for update
to authenticated
using (
  patient_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'patient'
      and account_status = 'active'
  )
)
with check (
  patient_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'patient'
      and account_status = 'active'
  )
);

revoke all
on table public.patient_reminder_preferences
from public, anon;

grant select, insert, update
on table public.patient_reminder_preferences
to authenticated;

commit;
