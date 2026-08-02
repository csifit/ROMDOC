-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 88A.1 — Expanded Patient Medical Profile
--
-- Target path:
-- ROMDOC/database/99-expanded-patient-medical-profile.sql
--
-- Adds:
--   - doctor-authored medical alerts
--   - patient-authored organ-donation preference
--   - immutable audit history for both kinds of updates
--
-- Preserves:
--   - existing profile entries and history
--   - patient read access
--   - doctor appointment-scoped clinical editing
--   - staff read-only access through protected server routes
-- =====================================================

begin;

-- =====================================================
-- 1. EXPAND THE ALLOWED FIELD KEYS
-- =====================================================

alter table
  public.patient_medical_profile_entries
  drop constraint if exists
    patient_medical_profile_entries_field_key_check;

alter table
  public.patient_medical_profile_entries
  add constraint
    patient_medical_profile_entries_field_key_check
  check (
    field_key in (
      'date_of_birth',
      'sex',
      'blood_group',
      'medical_alerts',
      'allergies',
      'current_medications',
      'chronic_conditions',
      'previous_surgeries',
      'implants_and_medical_devices',
      'emergency_contact',
      'family_doctor',
      'organ_donation_preference'
    )
  );

comment on constraint
  patient_medical_profile_entries_field_key_check
on public.patient_medical_profile_entries
is
  'Allows Doctor-authored clinical profile fields and the Patient-authored organ-donation preference.';

-- =====================================================
-- 2. DOCTOR-ONLY CLINICAL UPDATE FUNCTION
-- =====================================================
-- The Patient declaration is deliberately excluded from this function.

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
set search_path = public, pg_catalog
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
    'medical_alerts',
    'allergies',
    'current_medications',
    'chronic_conditions',
    'previous_surgeries',
    'implants_and_medical_devices',
    'emergency_contact',
    'family_doctor'
  ) then
    raise exception
      'invalid_or_patient_owned_medical_profile_field'
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

comment on function
  public.update_patient_medical_profile_entry(
    uuid,
    uuid,
    text,
    jsonb
  )
is
  'Allows an active Doctor to update Doctor-authored clinical profile fields through an eligible owned appointment. Patient declarations are excluded.';

-- =====================================================
-- 3. PATIENT-ONLY ORGAN-DONATION DECLARATION
-- =====================================================

create or replace function
  public.update_own_organ_donation_preference(
    target_value jsonb
  )
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  actor_profile_id uuid;
  existing_entry
    public.patient_medical_profile_entries%rowtype;
  saved_entry_id uuid;
  preference_value text;
begin
  actor_profile_id := auth.uid();

  if actor_profile_id is null then
    raise exception
      'authentication_required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = actor_profile_id
      and profile.role = 'patient'
      and profile.account_status = 'active'
  ) then
    raise exception
      'active_patient_profile_required'
      using errcode = '42501';
  end if;

  if target_value is null
    or jsonb_typeof(target_value) <> 'object'
    or target_value - 'preference' <> '{}'::jsonb
  then
    raise exception
      'invalid_organ_donation_preference_value'
      using errcode = '22023';
  end if;

  preference_value :=
    coalesce(
      target_value ->> 'preference',
      ''
    );

  if preference_value not in (
    'not_specified',
    'wishes_to_donate',
    'does_not_wish_to_donate',
    'undecided'
  ) then
    raise exception
      'invalid_organ_donation_preference'
      using errcode = '22023';
  end if;

  select *
  into existing_entry
  from public.patient_medical_profile_entries
  where patient_profile_id =
      actor_profile_id
    and field_key =
      'organ_donation_preference'
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
      actor_profile_id,
      'organ_donation_preference',
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
      actor_profile_id,
      'organ_donation_preference',
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
      actor_profile_id,
      'organ_donation_preference',
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
  public.update_own_organ_donation_preference(
    jsonb
  )
from public;

grant execute
on function
  public.update_own_organ_donation_preference(
    jsonb
  )
to authenticated;

comment on function
  public.update_own_organ_donation_preference(
    jsonb
  )
is
  'Allows only an active Patient to update their own non-official organ-donation preference declaration and records immutable history.';

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  constraint_name,
  check_clause
from information_schema.check_constraints
where constraint_name =
  'patient_medical_profile_entries_field_key_check';

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'update_patient_medical_profile_entry',
    'update_own_organ_donation_preference'
  )
order by routine_name;
