-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 110: Patient Database RLS fix + contact audit retirement
--
-- File:
-- ROMDOC/database/110-patient-database-rls-and-contact-audit-retirement.sql
--
-- Requires:
--   108-doctor-patient-database-foundation.sql
--   109-doctor-patient-contact-and-invite.sql
--
-- Fixes:
--   1. Restores Doctor SELECT / INSERT RLS policies on doctor_patients.
--      Migration 108 enabled RLS and dropped these policies, but did not
--      recreate them. The SECURITY DEFINER appointment trigger could still
--      synchronize a patient successfully, while the Doctor dashboard could
--      not read the synchronized row.
--
--   2. Stops generating NEW contact/address audit rows.
--      Existing doctor_patient_contact_history rows are preserved.
--
-- Important:
--   - No Staff capability changes.
--   - No Medical Folder authorization changes.
--   - No existing patient rows are deleted.
--   - No existing contact audit rows are deleted.
-- =====================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- =====================================================
-- 1. RESTORE DOCTOR PATIENT CRM RLS
-- =====================================================

alter table public.doctor_patients
  enable row level security;

drop policy if exists
  "Doctors can read own patient CRM"
on public.doctor_patients;

create policy
  "Doctors can read own patient CRM"
on public.doctor_patients
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id = doctor_patients.doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
);

drop policy if exists
  "Doctors can create own patient CRM entries"
on public.doctor_patients;

create policy
  "Doctors can create own patient CRM entries"
on public.doctor_patients
for insert
to authenticated
with check (
  exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id = doctor_patients.doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
);

-- Direct arbitrary UPDATE remains intentionally unavailable.
drop policy if exists
  "Doctors can update own patient CRM entries"
on public.doctor_patients;

revoke all
on table public.doctor_patients
from public, anon, authenticated;

grant select, insert
on table public.doctor_patients
to authenticated;

-- =====================================================
-- 2. RETIRE FUTURE CONTACT / ADDRESS AUDIT WRITES
-- =====================================================
-- The administrative contact fields remain editable.
-- contact_updated_at and contact_updated_by_profile_id remain useful
-- lightweight metadata.
--
-- The immutable doctor_patient_contact_history table is retained only
-- for historical rows already written before this migration.
-- =====================================================

create or replace function
  public.update_doctor_patient_contact_details(
    target_doctor_patient_id uuid,
    target_display_name text,
    target_email text,
    target_phone text,
    target_address_line_1 text,
    target_address_line_2 text,
    target_city text,
    target_county text,
    target_postal_code text,
    target_country text
  )
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  actor_profile_id uuid := auth.uid();
  actor_doctor_id uuid;
  current_row public.doctor_patients%rowtype;

  normalized_name text;
  normalized_email text;
  normalized_phone text;
  normalized_address_line_1 text;
  normalized_address_line_2 text;
  normalized_city text;
  normalized_county text;
  normalized_postal_code text;
  normalized_country text;

  unchanged boolean;
begin
  if actor_profile_id is null then
    raise exception
      'authentication_required'
      using errcode = '42501';
  end if;

  select doctor.id
  into actor_doctor_id
  from public.doctors as doctor
  join public.profiles as profile
    on profile.id = doctor.profile_id
  where doctor.profile_id = actor_profile_id
    and profile.role = 'doctor'
    and profile.account_status = 'active'
  limit 1;

  if actor_doctor_id is null then
    raise exception
      'active_doctor_profile_required'
      using errcode = '42501';
  end if;

  select *
  into current_row
  from public.doctor_patients
  where id = target_doctor_patient_id
    and doctor_id = actor_doctor_id
    and archived_at is null
  for update;

  if not found then
    raise exception
      'doctor_patient_not_found'
      using errcode = '42501';
  end if;

  normalized_name :=
    nullif(trim(coalesce(target_display_name, '')), '');

  normalized_email :=
    nullif(lower(trim(coalesce(target_email, ''))), '');

  normalized_phone :=
    nullif(trim(coalesce(target_phone, '')), '');

  normalized_address_line_1 :=
    nullif(trim(coalesce(target_address_line_1, '')), '');

  normalized_address_line_2 :=
    nullif(trim(coalesce(target_address_line_2, '')), '');

  normalized_city :=
    nullif(trim(coalesce(target_city, '')), '');

  normalized_county :=
    nullif(trim(coalesce(target_county, '')), '');

  normalized_postal_code :=
    nullif(trim(coalesce(target_postal_code, '')), '');

  normalized_country :=
    nullif(trim(coalesce(target_country, '')), '');

  if normalized_name is null
    or char_length(normalized_name) < 2
    or char_length(normalized_name) > 200
  then
    raise exception
      'invalid_patient_name'
      using errcode = '22023';
  end if;

  if normalized_email is null
    and (
      normalized_phone is null
      or char_length(
        regexp_replace(
          normalized_phone,
          '[^0-9]',
          '',
          'g'
        )
      ) < 7
    )
  then
    raise exception
      'patient_contact_required'
      using errcode = '22023';
  end if;

  if normalized_email is not null
    and (
      char_length(normalized_email) > 320
      or position('@' in normalized_email) <= 1
      or position('.' in split_part(normalized_email, '@', 2)) <= 1
    )
  then
    raise exception
      'invalid_patient_email'
      using errcode = '22023';
  end if;

  if normalized_phone is not null
    and char_length(
      regexp_replace(
        normalized_phone,
        '[^0-9]',
        '',
        'g'
      )
    ) < 7
  then
    raise exception
      'invalid_patient_phone'
      using errcode = '22023';
  end if;

  if char_length(coalesce(normalized_address_line_1, '')) > 300
    or char_length(coalesce(normalized_address_line_2, '')) > 300
    or char_length(coalesce(normalized_city, '')) > 150
    or char_length(coalesce(normalized_county, '')) > 150
    or char_length(coalesce(normalized_postal_code, '')) > 30
    or char_length(coalesce(normalized_country, '')) > 100
  then
    raise exception
      'patient_address_too_long'
      using errcode = '22023';
  end if;

  unchanged :=
    current_row.display_name is not distinct from normalized_name
    and current_row.email is not distinct from normalized_email
    and current_row.phone is not distinct from normalized_phone
    and current_row.address_line_1 is not distinct from normalized_address_line_1
    and current_row.address_line_2 is not distinct from normalized_address_line_2
    and current_row.city is not distinct from normalized_city
    and current_row.county is not distinct from normalized_county
    and current_row.postal_code is not distinct from normalized_postal_code
    and current_row.country is not distinct from normalized_country;

  if unchanged then
    return current_row.id;
  end if;

  update public.doctor_patients
  set
    display_name = normalized_name,
    email = normalized_email,
    phone = normalized_phone,
    address_line_1 = normalized_address_line_1,
    address_line_2 = normalized_address_line_2,
    city = normalized_city,
    county = normalized_county,
    postal_code = normalized_postal_code,
    country = normalized_country,
    contact_updated_at = now(),
    contact_updated_by_profile_id = actor_profile_id,
    invite_token_hash = case
      when current_row.email is distinct from normalized_email
        then null
      else current_row.invite_token_hash
    end,
    invite_expires_at = case
      when current_row.email is distinct from normalized_email
        then null
      else current_row.invite_expires_at
    end,
    updated_at = now()
  where id = current_row.id;

  -- Deliberately NO INSERT into doctor_patient_contact_history.

  return current_row.id;
end;
$function$;

revoke all
on function
  public.update_doctor_patient_contact_details(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
from public, anon;

grant execute
on function
  public.update_doctor_patient_contact_details(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
to authenticated;

comment on function
  public.update_doctor_patient_contact_details(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
is
  'Updates Doctor-owned administrative Patient CRM contact/address data. From migration 110 onward, contact/address edits are not added to clinical-style immutable audit history.';

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'doctor_patients'
order by policyname;

select
  count(*) as doctor_patient_rows,
  count(*) filter (
    where archived_at is null
  ) as active_doctor_patient_rows,
  count(*) filter (
    where archived_at is null
      and patient_profile_id is not null
  ) as linked_romdoc_patients,
  count(*) filter (
    where archived_at is null
      and patient_profile_id is null
  ) as contact_only_patients
from public.doctor_patients;
