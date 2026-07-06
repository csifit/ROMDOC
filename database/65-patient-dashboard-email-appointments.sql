-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 65: Patient dashboard appointment visibility
--
-- File:
-- ROMDOC/database/65-patient-dashboard-email-appointments.sql
--
-- Purpose:
-- Let a verified patient account see every appointment that belongs
-- to them, including:
-- - online patient-created appointments linked by patient_profile_id
-- - doctor/staff-created appointments linked only by patient_email
-- - past appointments
-- - future appointments
-- - pending, confirmed, rescheduled, completed, cancelled and no_show
--
-- This does NOT create open access. The authenticated user's email
-- from the Supabase JWT must match appointments.patient_email.
-- =====================================================

begin;

alter table public.appointments
  enable row level security;

grant select
on public.appointments
to authenticated;

create index if not exists
  idx_appointments_patient_email_lower_created
on public.appointments (
  lower(patient_email),
  created_at desc
)
where patient_email is not null;

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
  and lower(patient_email) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
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
  and policyname in (
    'Patients can view their own appointments',
    'Patients can view appointments matching their email'
  )
order by policyname;

