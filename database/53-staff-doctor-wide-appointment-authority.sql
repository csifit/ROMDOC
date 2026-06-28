-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Staff doctor-wide appointment authority
--
-- File:
-- ROMDOC/database/53-staff-doctor-wide-appointment-authority.sql
--
-- Result:
-- One active doctor_staff assignment grants the staff
-- member appointment-management authority for that doctor
-- across every clinic.
-- =====================================================

begin;

create or replace function
  public.is_staff_for_doctor(
    requested_staff_profile_id uuid,
    requested_doctor_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.doctor_staff
      as staff_assignment
    where
      staff_assignment.staff_profile_id =
        requested_staff_profile_id
      and staff_assignment.doctor_id =
        requested_doctor_id
      and staff_assignment.status =
        'active'
  );
$$;

revoke all
on function
  public.is_staff_for_doctor(
    uuid,
    uuid
  )
from public;

grant execute
on function
  public.is_staff_for_doctor(
    uuid,
    uuid
  )
to authenticated;

create or replace function
  public.is_staff_for_doctor_clinic(
    requested_staff_profile_id uuid,
    requested_doctor_id uuid,
    requested_clinic_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_staff_for_doctor(
      requested_staff_profile_id,
      requested_doctor_id
    );
$$;

revoke all
on function
  public.is_staff_for_doctor_clinic(
    uuid,
    uuid,
    uuid
  )
from public;

grant execute
on function
  public.is_staff_for_doctor_clinic(
    uuid,
    uuid,
    uuid
  )
to authenticated;

comment on function
  public.is_staff_for_doctor(
    uuid,
    uuid
  ) is
  'Returns true when a staff profile has at least one active assignment for the requested doctor.';

comment on function
  public.is_staff_for_doctor_clinic(
    uuid,
    uuid,
    uuid
  ) is
  'Compatibility helper. Staff appointment authority is doctor-wide; requested_clinic_id is retained for existing callers.';

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_staff_for_doctor',
    'is_staff_for_doctor_clinic'
  )
order by routine_name;
