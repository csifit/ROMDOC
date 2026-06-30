-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Patient Medical Profile
--
-- Project path:
-- ROMDOC/database/55-patient-medical-profile.sql
--
-- Adds:
--   - one current value per medical-profile section
--   - per-section "last modified by" metadata
--   - immutable change history
--   - patient read access
--   - doctor read/edit access through an owned appointment
-- =====================================================

begin;

-- =====================================================
-- 1. CURRENT PROFILE ENTRIES
-- =====================================================

create table if not exists
  public.patient_medical_profile_entries (
    id uuid primary key default gen_random_uuid(),

    patient_profile_id uuid not null
      references public.profiles(id)
      on update cascade
      on delete restrict,

    field_key text not null
      check (
        field_key in (
          'date_of_birth',
          'sex',
          'blood_group',
          'allergies',
          'current_medications',
          'chronic_conditions',
          'previous_surgeries',
          'implants_and_medical_devices',
          'emergency_contact',
          'family_doctor'
        )
      ),

    value jsonb not null
      default '{}'::jsonb
      check (
        jsonb_typeof(value) = 'object'
      ),

    last_modified_by_profile_id uuid not null
      references public.profiles(id)
      on update cascade
      on delete restrict,

    last_modified_at timestamptz not null
      default now(),

    created_at timestamptz not null
      default now(),

    updated_at timestamptz not null
      default now(),

    unique (
      patient_profile_id,
      field_key
    )
  );

comment on table
  public.patient_medical_profile_entries
is
  'Current structured Patient Medical Profile values. One row per patient and profile section.';

create index if not exists
  idx_patient_medical_profile_entries_patient
on public.patient_medical_profile_entries (
  patient_profile_id,
  field_key
);

-- =====================================================
-- 2. IMMUTABLE CHANGE HISTORY
-- =====================================================

create table if not exists
  public.patient_medical_profile_history (
    id uuid primary key default gen_random_uuid(),

    entry_id uuid not null
      references public.patient_medical_profile_entries(id)
      on update cascade
      on delete restrict,

    patient_profile_id uuid not null
      references public.profiles(id)
      on update cascade
      on delete restrict,

    field_key text not null,

    previous_value jsonb,
    new_value jsonb not null,

    changed_by_profile_id uuid not null
      references public.profiles(id)
      on update cascade
      on delete restrict,

    changed_at timestamptz not null
      default now()
  );

comment on table
  public.patient_medical_profile_history
is
  'Immutable audit history for Patient Medical Profile edits.';

create index if not exists
  idx_patient_medical_profile_history_patient
on public.patient_medical_profile_history (
  patient_profile_id,
  changed_at desc
);

create index if not exists
  idx_patient_medical_profile_history_entry
on public.patient_medical_profile_history (
  entry_id,
  changed_at desc
);

create or replace function
  public.prevent_patient_medical_profile_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception
    'patient_medical_profile_history_is_immutable'
    using errcode = '55000';
end;
$$;

drop trigger if exists
  prevent_patient_medical_profile_history_update
on public.patient_medical_profile_history;

create trigger
  prevent_patient_medical_profile_history_update
before update
on public.patient_medical_profile_history
for each row
execute function
  public.prevent_patient_medical_profile_history_mutation();

drop trigger if exists
  prevent_patient_medical_profile_history_delete
on public.patient_medical_profile_history;

create trigger
  prevent_patient_medical_profile_history_delete
before delete
on public.patient_medical_profile_history
for each row
execute function
  public.prevent_patient_medical_profile_history_mutation();

-- =====================================================
-- 3. SECURE DOCTOR UPDATE FUNCTION
-- =====================================================

create or replace function
  public.update_patient_medical_profile_entry(
    target_patient_profile_id uuid,
    target_appointment_id uuid,
    target_field_key text,
    target_value jsonb
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_profile_id uuid;
  actor_doctor_id uuid;
  existing_entry
    public.patient_medical_profile_entries%rowtype;
  saved_entry_id uuid;
begin
  actor_profile_id := auth.uid();

  if actor_profile_id is null then
    raise exception
      'authentication_required'
      using errcode = '42501';
  end if;

  if target_field_key not in (
    'date_of_birth',
    'sex',
    'blood_group',
    'allergies',
    'current_medications',
    'chronic_conditions',
    'previous_surgeries',
    'implants_and_medical_devices',
    'emergency_contact',
    'family_doctor'
  ) then
    raise exception
      'invalid_medical_profile_field'
      using errcode = '22023';
  end if;

  if target_value is null
    or jsonb_typeof(target_value) <> 'object'
  then
    raise exception
      'invalid_medical_profile_value'
      using errcode = '22023';
  end if;

  if not public.is_active_patient_profile(
    target_patient_profile_id
  ) then
    raise exception
      'patient_profile_is_not_active'
      using errcode = '42501';
  end if;

  select doctor.id
  into actor_doctor_id
  from public.doctors as doctor
  join public.profiles as doctor_profile
    on doctor_profile.id = doctor.profile_id
  where doctor.profile_id = actor_profile_id
    and doctor_profile.role = 'doctor'
    and doctor_profile.account_status = 'active'
  limit 1;

  if actor_doctor_id is null then
    raise exception
      'active_doctor_profile_required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.appointments as appointment
    where appointment.id = target_appointment_id
      and appointment.doctor_id = actor_doctor_id
      and appointment.patient_profile_id =
        target_patient_profile_id
      and appointment.status in (
        'confirmed',
        'rescheduled',
        'completed'
      )
  ) then
    raise exception
      'doctor_cannot_edit_patient_medical_profile'
      using errcode = '42501';
  end if;

  select *
  into existing_entry
  from public.patient_medical_profile_entries
  where patient_profile_id =
      target_patient_profile_id
    and field_key =
      target_field_key
  for update;

  if found then
    if existing_entry.value = target_value then
      return existing_entry.id;
    end if;

    update public.patient_medical_profile_entries
    set
      value = target_value,
      last_modified_by_profile_id =
        actor_profile_id,
      last_modified_at = now(),
      updated_at = now()
    where id = existing_entry.id
    returning id
    into saved_entry_id;

    insert into
      public.patient_medical_profile_history (
        entry_id,
        patient_profile_id,
        field_key,
        previous_value,
        new_value,
        changed_by_profile_id
      )
    values (
      saved_entry_id,
      target_patient_profile_id,
      target_field_key,
      existing_entry.value,
      target_value,
      actor_profile_id
    );
  else
    insert into
      public.patient_medical_profile_entries (
        patient_profile_id,
        field_key,
        value,
        last_modified_by_profile_id,
        last_modified_at,
        updated_at
      )
    values (
      target_patient_profile_id,
      target_field_key,
      target_value,
      actor_profile_id,
      now(),
      now()
    )
    returning id
    into saved_entry_id;

    insert into
      public.patient_medical_profile_history (
        entry_id,
        patient_profile_id,
        field_key,
        previous_value,
        new_value,
        changed_by_profile_id
      )
    values (
      saved_entry_id,
      target_patient_profile_id,
      target_field_key,
      null,
      target_value,
      actor_profile_id
    );
  end if;

  return saved_entry_id;
end;
$$;

revoke all
on function
  public.update_patient_medical_profile_entry(
    uuid,
    uuid,
    text,
    jsonb
  )
from public;

grant execute
on function
  public.update_patient_medical_profile_entry(
    uuid,
    uuid,
    text,
    jsonb
  )
to authenticated;

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

alter table
  public.patient_medical_profile_entries
enable row level security;

drop policy if exists
  "Patients can read own medical profile"
on public.patient_medical_profile_entries;

create policy
  "Patients can read own medical profile"
on public.patient_medical_profile_entries
for select
to authenticated
using (
  patient_profile_id = auth.uid()
  and public.is_active_patient_profile(
    auth.uid()
  )
);

drop policy if exists
  "Doctors can read accessible patient medical profile"
on public.patient_medical_profile_entries;

create policy
  "Doctors can read accessible patient medical profile"
on public.patient_medical_profile_entries
for select
to authenticated
using (
  public.doctor_can_access_patient_folder(
    patient_profile_id
  )
);

alter table
  public.patient_medical_profile_history
enable row level security;

-- The history table is intentionally not directly exposed.
-- It remains available to protected server-side service-role code.

revoke all
on table public.patient_medical_profile_entries
from public, anon, authenticated;

grant select
on table public.patient_medical_profile_entries
to authenticated;

revoke all
on table public.patient_medical_profile_history
from public, anon, authenticated;

commit;
