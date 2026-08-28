-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 111: Family Doctor clinical overview foundation
--
-- File:
-- ROMDOC/database/111-family-doctor-clinical-overview.sql
--
-- Requires:
--   99-expanded-patient-medical-profile.sql
--   108-doctor-patient-database-foundation.sql
--   109-doctor-patient-contact-and-invite.sql
--   110-patient-database-rls-and-contact-audit-retirement.sql
--
-- Adds:
--   - one patient-controlled RomDoc Family Doctor link
--   - secure Patient RPC to set/change/remove that link
--   - synchronization with the existing Medical Profile
--     family_doctor section
--   - immutable Medical Profile history for designation changes
--
-- Important:
--   - no new user role is created
--   - a Patient may still belong to many Doctors' Patient Databases
--   - only one linked Family Doctor is designated at a time
--   - external Family Doctors remain informational only
--   - designation does not automatically expose specialist notes/files
-- =====================================================

begin;

create table if not exists public.patient_family_doctors (
  patient_profile_id uuid primary key
    references public.profiles(id)
    on update cascade
    on delete cascade,

  doctor_id uuid not null
    references public.doctors(id)
    on update cascade
    on delete cascade,

  designated_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.patient_family_doctors is
  'Patient-controlled link to one RomDoc Family Doctor. This link is used for longitudinal-care permissions. The visible Family Doctor name/clinic/phone remain in the existing Medical Profile family_doctor entry.';

create index if not exists
  idx_patient_family_doctors_doctor
on public.patient_family_doctors (
  doctor_id,
  patient_profile_id
);

drop trigger if exists
  patient_family_doctors_updated_at
on public.patient_family_doctors;

create trigger
  patient_family_doctors_updated_at
before update
on public.patient_family_doctors
for each row
execute function public.handle_updated_at();

alter table public.patient_family_doctors
  enable row level security;

-- No direct table access is needed. Reads/writes use protected
-- server routes and SECURITY DEFINER functions.
revoke all
on table public.patient_family_doctors
from public, anon, authenticated;

-- =====================================================
-- ACTIVE FAMILY DOCTOR HELPER
-- =====================================================

create or replace function
  public.is_current_doctor_family_doctor(
    target_patient_profile_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $function$
  select exists (
    select 1
    from public.patient_family_doctors as family_link
    join public.doctors as doctor
      on doctor.id = family_link.doctor_id
    join public.profiles as doctor_profile
      on doctor_profile.id = doctor.profile_id
    where family_link.patient_profile_id =
        target_patient_profile_id
      and doctor.profile_id = auth.uid()
      and doctor.status = 'active'
      and doctor_profile.role = 'doctor'
      and doctor_profile.account_status = 'active'
  );
$function$;

revoke all
on function public.is_current_doctor_family_doctor(uuid)
from public, anon;

grant execute
on function public.is_current_doctor_family_doctor(uuid)
to authenticated, service_role;

-- =====================================================
-- PATIENT-CONTROLLED FAMILY DOCTOR DESIGNATION
-- =====================================================
-- A linked RomDoc Family Doctor must already be a treating
-- Doctor with at least one confirmed/rescheduled/completed
-- RomDoc appointment for this Patient.
--
-- When target_doctor_id is NULL the link is removed. The
-- Patient may still retain external name/clinic/phone data;
-- those values remain informational and grant no RomDoc access.
-- =====================================================

create or replace function
  public.set_own_family_doctor(
    target_doctor_id uuid,
    target_name text,
    target_clinic text,
    target_phone text
  )
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  actor_profile_id uuid := auth.uid();
  validated_name text;
  validated_clinic text;
  validated_phone text;
  linked_slug text;
  linked_first_name text;
  linked_last_name text;
  linked_phone text;
  existing_entry public.patient_medical_profile_entries%rowtype;
  previous_value jsonb;
  next_value jsonb;
  saved_entry_id uuid;
begin
  if actor_profile_id is null then
    raise exception
      'authentication_required'
      using errcode = '42501';
  end if;

  if not public.is_active_patient_profile(actor_profile_id) then
    raise exception
      'active_patient_profile_required'
      using errcode = '42501';
  end if;

  validated_name :=
    nullif(trim(coalesce(target_name, '')), '');
  validated_clinic :=
    nullif(trim(coalesce(target_clinic, '')), '');
  validated_phone :=
    nullif(trim(coalesce(target_phone, '')), '');

  if char_length(coalesce(validated_name, '')) > 200
    or char_length(coalesce(validated_clinic, '')) > 200
    or char_length(coalesce(validated_phone, '')) > 50
  then
    raise exception
      'family_doctor_details_too_long'
      using errcode = '22023';
  end if;

  if target_doctor_id is not null then
    select
      doctor.slug,
      profile.first_name,
      profile.last_name,
      doctor.phone
    into
      linked_slug,
      linked_first_name,
      linked_last_name,
      linked_phone
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id = target_doctor_id
      and doctor.status = 'active'
      and profile.role = 'doctor'
      and profile.account_status = 'active'
      and exists (
        select 1
        from public.appointments as appointment
        where appointment.patient_profile_id = actor_profile_id
          and appointment.doctor_id = target_doctor_id
          and appointment.status in (
            'confirmed',
            'rescheduled',
            'completed'
          )
      )
    limit 1;

    if linked_slug is null then
      raise exception
        'family_doctor_must_be_treating_romdoc_doctor'
        using errcode = '42501';
    end if;

    validated_name :=
      nullif(
        trim(
          concat_ws(
            ' ',
            linked_first_name,
            linked_last_name
          )
        ),
        ''
      );

    if validated_name is null then
      validated_name := linked_slug;
    else
      validated_name := 'Dr. ' || validated_name;
    end if;

    validated_phone :=
      coalesce(
        nullif(trim(linked_phone), ''),
        validated_phone
      );

    insert into public.patient_family_doctors (
      patient_profile_id,
      doctor_id,
      designated_by_profile_id
    )
    values (
      actor_profile_id,
      target_doctor_id,
      actor_profile_id
    )
    on conflict (patient_profile_id)
    do update
    set
      doctor_id = excluded.doctor_id,
      designated_by_profile_id = excluded.designated_by_profile_id,
      updated_at = now();
  else
    delete from public.patient_family_doctors
    where patient_profile_id = actor_profile_id;
  end if;

  next_value := jsonb_build_object(
    'name', coalesce(validated_name, ''),
    'clinic', coalesce(validated_clinic, ''),
    'phone', coalesce(validated_phone, '')
  );

  select *
  into existing_entry
  from public.patient_medical_profile_entries
  where patient_profile_id = actor_profile_id
    and field_key = 'family_doctor'
  for update;

  if found then
    previous_value := existing_entry.value;

    if previous_value = next_value then
      return existing_entry.id;
    end if;

    update public.patient_medical_profile_entries
    set
      value = next_value,
      last_modified_by_profile_id = actor_profile_id,
      last_modified_at = now(),
      updated_at = now()
    where id = existing_entry.id
    returning id into saved_entry_id;
  else
    previous_value := null;

    insert into public.patient_medical_profile_entries (
      patient_profile_id,
      field_key,
      value,
      last_modified_by_profile_id,
      last_modified_at,
      updated_at
    )
    values (
      actor_profile_id,
      'family_doctor',
      next_value,
      actor_profile_id,
      now(),
      now()
    )
    returning id into saved_entry_id;
  end if;

  insert into public.patient_medical_profile_history (
    entry_id,
    patient_profile_id,
    field_key,
    previous_value,
    new_value,
    changed_by_profile_id
  )
  values (
    saved_entry_id,
    actor_profile_id,
    'family_doctor',
    previous_value,
    next_value,
    actor_profile_id
  );

  return saved_entry_id;
end;
$function$;

revoke all
on function public.set_own_family_doctor(
  uuid,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.set_own_family_doctor(
  uuid,
  text,
  text,
  text
)
to authenticated;

comment on function public.set_own_family_doctor(
  uuid,
  text,
  text,
  text
)
is
  'Allows an active Patient to designate a treating RomDoc Doctor as Family Doctor, or keep external Family Doctor details as information only. Changes are written to the existing immutable Medical Profile history.';

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'patient_family_doctors';

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_current_doctor_family_doctor',
    'set_own_family_doctor'
  )
order by routine_name;
