-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 61B: Doctor specialty management
--
-- File:
-- ROMDOC/database/32-doctor-specialty-management.sql
--
-- Adds:
--   - atomic doctor-owned specialty replacement function
--   - active-specialty validation
--   - maximum five specialties per doctor
-- =====================================================

begin;

create or replace function public.set_own_doctor_specialties(
  requested_specialty_ids uuid[]
)
returns table (
  specialty_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_doctor_id uuid;
  normalized_ids uuid[];
  requested_count integer;
  valid_count integer;
begin
  select doctor.id
  into current_doctor_id
  from public.doctors as doctor
  join public.profiles as profile
    on profile.id = doctor.profile_id
  where doctor.profile_id = auth.uid()
    and profile.role = 'doctor'
    and profile.account_status = 'active'
  limit 1;

  if current_doctor_id is null then
    raise exception 'active_doctor_profile_required'
      using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct item), '{}'::uuid[])
  into normalized_ids
  from unnest(coalesce(requested_specialty_ids, '{}'::uuid[])) as item;

  requested_count := coalesce(array_length(normalized_ids, 1), 0);

  if requested_count = 0 then
    raise exception 'at_least_one_specialty_required'
      using errcode = '23514';
  end if;

  if requested_count > 5 then
    raise exception 'maximum_five_specialties_allowed'
      using errcode = '23514';
  end if;

  select count(*)
  into valid_count
  from public.specialties as specialty
  where specialty.id = any(normalized_ids)
    and specialty.is_active = true;

  if valid_count <> requested_count then
    raise exception 'invalid_or_inactive_specialty'
      using errcode = '22023';
  end if;

  delete from public.doctor_specialties
  where doctor_id = current_doctor_id;

  insert into public.doctor_specialties (
    doctor_id,
    specialty_id
  )
  select
    current_doctor_id,
    specialty.id
  from public.specialties as specialty
  where specialty.id = any(normalized_ids);

  return query
  select doctor_specialty.specialty_id
  from public.doctor_specialties as doctor_specialty
  where doctor_specialty.doctor_id = current_doctor_id
  order by doctor_specialty.specialty_id;
end;
$$;

revoke all
on function public.set_own_doctor_specialties(uuid[])
from public, anon;

grant execute
on function public.set_own_doctor_specialties(uuid[])
to authenticated;

comment on function public.set_own_doctor_specialties(uuid[]) is
  'Atomically replaces the authenticated active doctor own specialty set with one to five active specialties.';

commit;
