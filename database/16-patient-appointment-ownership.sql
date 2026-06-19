-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 52D: Patient-owned appointments
--
-- File:
-- ROMDOC/database/16-patient-appointment-ownership.sql
-- =====================================================

begin;

alter table public.appointments
  add column if not exists patient_profile_id uuid
    references public.profiles(id)
    on delete set null;

create index if not exists
  idx_appointments_patient_profile
on public.appointments (
  patient_profile_id,
  effective_start
);

alter table public.appointments
  enable row level security;

-- Anonymous users must never insert appointments.
revoke insert
on public.appointments
from anon;

grant insert, select
on public.appointments
to authenticated;

drop policy if exists
  "Patients can create their own appointments"
on public.appointments;

drop policy if exists
  "Patients can view their own appointments"
on public.appointments;

create policy
  "Patients can create their own appointments"
on public.appointments
for insert
to authenticated
with check (
  patient_profile_id = auth.uid()
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

create policy
  "Patients can view their own appointments"
on public.appointments
for select
to authenticated
using (
  patient_profile_id = auth.uid()
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
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'appointments'
  and column_name = 'patient_profile_id';

select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'appointments'
  and policyname in (
    'Patients can create their own appointments',
    'Patients can view their own appointments'
  )
order by policyname;