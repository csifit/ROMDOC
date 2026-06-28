-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Doctor access to own patient appointment requests
--
-- File:
-- ROMDOC/database/51-doctor-own-appointments-read-policy.sql
--
-- Purpose:
-- Allow an authenticated doctor to read every appointment
-- assigned to their own doctors.id record, regardless of:
--   - who created the appointment;
--   - appointment source;
--   - appointment status.
--
-- This is required so patient-created pending requests appear
-- in /doctor-dashboard/appointments.
-- =====================================================

begin;

alter table public.appointments
  enable row level security;

grant select
on public.appointments
to authenticated;

-- -----------------------------------------------------
-- Ownership helper
-- -----------------------------------------------------

create or replace function public.can_view_own_doctor_appointments(
  target_doctor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctors as doctor
    where doctor.id = target_doctor_id
      and doctor.profile_id = auth.uid()
  );
$$;

revoke all
on function public.can_view_own_doctor_appointments(uuid)
from public;

grant execute
on function public.can_view_own_doctor_appointments(uuid)
to authenticated;

-- -----------------------------------------------------
-- Doctor SELECT policy
-- -----------------------------------------------------

drop policy if exists
  "Doctors can view their own appointments"
on public.appointments;

create policy
  "Doctors can view their own appointments"
on public.appointments
for select
to authenticated
using (
  public.can_view_own_doctor_appointments(
    doctor_id
  )
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  policyname,
  cmd,
  roles,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'appointments'
  and policyname =
    'Doctors can view their own appointments';

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name =
    'can_view_own_doctor_appointments';
