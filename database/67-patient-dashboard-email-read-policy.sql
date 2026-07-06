-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step: Simple patient dashboard appointment visibility
--
-- File:
-- ROMDOC/database/67-patient-dashboard-email-read-policy.sql
--
-- Purpose:
-- Allow a logged-in verified patient to see appointments linked
-- either by patient_profile_id or by the same patient e-mail address.
-- This keeps /patient-dashboard simple and avoids the RPC approach.
-- =====================================================

begin;

alter table public.appointments
  enable row level security;

grant select
on public.appointments
to authenticated;

-- Existing patient_profile_id ownership policy may remain.
-- This additional policy covers appointments created by a doctor/staff
-- or older rows where patient_profile_id is missing but patient_email matches.
drop policy if exists
  "Patients can view appointments by own email"
on public.appointments;

create policy
  "Patients can view appointments by own email"
on public.appointments
for select
to authenticated
using (
  lower(trim(patient_email)) =
    lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  and exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role in ('patient', 'user')
  )
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'appointments'
  and policyname = 'Patients can view appointments by own email';
