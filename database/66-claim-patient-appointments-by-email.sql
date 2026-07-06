-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 66: Claim patient appointments by verified email
--
-- File:
-- ROMDOC/database/66-claim-patient-appointments-by-email.sql
--
-- Purpose:
-- Doctor/staff-created appointments can exist before the patient
-- has a RomDoc account. Those rows often have:
--   patient_profile_id = null
--   patient_email = the patient's email
--
-- When the patient later creates and verifies a RomDoc account using
-- the same email address, this function safely links those existing
-- appointments to the patient profile.
--
-- This keeps the patient dashboard appointment-specific and private.
-- It does not expose appointments to other users.
-- =====================================================

begin;

alter table public.appointments
  enable row level security;

grant select
on public.appointments
to authenticated;

create index if not exists
  idx_appointments_patient_email_lower_trim_created
on public.appointments (
  lower(trim(patient_email)),
  created_at desc
)
where patient_email is not null;

-- Keep / improve email-based read access as a fallback.
-- The trim() is intentional because doctor/staff-created rows may
-- contain accidental leading/trailing spaces.
drop policy if exists
  "Patients can view appointments matching their email"
on public.appointments;

create policy
  "Patients can view appointments matching their email"
on public.appointments
for select
to authenticated
using (
  patient_email is not null
  and lower(trim(patient_email)) =
    lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  and exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role in (
        'patient',
        'user'
      )
  )
);

-- Link existing appointment rows to the logged-in patient profile.
-- This is called from /patient-dashboard after login.
create or replace function public.claim_patient_appointments_by_email()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  current_email text := lower(
    trim(coalesce(auth.jwt() ->> 'email', ''))
  );
  claimed_count integer := 0;
begin
  if current_profile_id is null or current_email = '' then
    return 0;
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = current_profile_id
      and p.role in (
        'patient',
        'user'
      )
  ) then
    return 0;
  end if;

  update public.appointments as a
  set
    patient_profile_id = current_profile_id,
    updated_at = now()
  where a.patient_profile_id is null
    and a.patient_email is not null
    and lower(trim(a.patient_email)) = current_email;

  get diagnostics claimed_count = row_count;

  return claimed_count;
end;
$$;

revoke all
on function public.claim_patient_appointments_by_email()
from public;

grant execute
on function public.claim_patient_appointments_by_email()
to authenticated;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name =
    'claim_patient_appointments_by_email';

select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'appointments'
  and policyname in (
    'Patients can view their own appointments',
    'Patients can view appointments matching their email'
  )
order by policyname;

select
  indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'appointments'
  and indexname =
    'idx_appointments_patient_email_lower_trim_created';
