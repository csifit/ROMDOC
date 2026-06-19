-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 45 correction: Appointment INSERT policies
--
-- File:
-- ROMDOC/database/10-doctor-appointment-insert-policy.sql
--
-- Purpose:
-- 1. Remove all older INSERT policies on appointments.
-- 2. Preserve public online appointment requests.
-- 3. Allow doctors to create confirmed appointments only
--    in their own schedule and at their own clinics.
-- =====================================================

begin;

alter table public.appointments
  enable row level security;

-- =====================================================
-- DOCTOR OWNERSHIP HELPER
-- =====================================================

create or replace function public.can_doctor_create_appointment(
  target_doctor_id uuid,
  target_clinic_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctors as d
    inner join public.doctor_clinics as dc
      on dc.doctor_id = d.id
    inner join public.profiles as p
      on p.id = d.profile_id
    where d.id = target_doctor_id
      and d.profile_id = auth.uid()
      and p.role = 'doctor'
      and dc.clinic_id = target_clinic_id
      and d.status not in (
        'suspended',
        'rejected'
      )
  );
$$;

revoke all
on function public.can_doctor_create_appointment(uuid, uuid)
from public;

grant execute
on function public.can_doctor_create_appointment(uuid, uuid)
to authenticated;

-- =====================================================
-- REMOVE ALL EXISTING INSERT POLICIES
-- =====================================================
--
-- This removes older INSERT policies that may conflict
-- with the current appointment architecture.
--
-- SELECT, UPDATE and DELETE policies are not changed.
-- =====================================================

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and cmd = 'INSERT'
  loop
    execute format(
      'drop policy if exists %I on public.appointments',
      policy_record.policyname
    );
  end loop;
end;
$$;

-- =====================================================
-- PUBLIC ONLINE APPOINTMENT REQUESTS
-- =====================================================
--
-- Used by:
-- POST /api/appointments
--
-- Public appointment requests:
-- - are not associated with an authenticated creator;
-- - use the online source;
-- - begin with pending status;
-- - do not yet have confirmed scheduling fields.
-- =====================================================

create policy
  "Public can create online appointment requests"
on public.appointments
as permissive
for insert
to anon, authenticated
with check (
  source = 'online'
  and created_by_profile_id is null
  and status = 'pending'
  and scheduled_date is null
  and scheduled_time is null
);

-- =====================================================
-- DOCTOR-CREATED APPOINTMENTS
-- =====================================================
--
-- Used by:
-- POST /api/doctor/appointments
-- =====================================================

create policy
  "Doctors can create their own appointments"
on public.appointments
as permissive
for insert
to authenticated
with check (
  public.can_doctor_create_appointment(
    doctor_id,
    clinic_id
  )

  and created_by_profile_id = auth.uid()

  and source in (
    'phone',
    'walk_in',
    'email',
    'other'
  )

  and status = 'confirmed'

  and requested_date is not null
  and requested_time is not null

  and scheduled_date is not null
  and scheduled_time is not null

  and requested_date = scheduled_date
  and requested_time = scheduled_time

  and reschedule_reason is null
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  policyname,
  cmd,
  permissive,
  roles,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'appointments'
order by
  cmd,
  policyname;

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name =
    'can_doctor_create_appointment';