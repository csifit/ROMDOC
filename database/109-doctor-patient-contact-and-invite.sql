-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 109: Patient contact/address details + RomDoc invite
--
-- File:
-- ROMDOC/database/109-doctor-patient-contact-and-invite.sql
--
-- Requires:
--   108-doctor-patient-database-foundation.sql
--
-- Adds:
--   - Doctor-maintained administrative contact/address details
--   - Immutable audit history for explicit Doctor edits
--   - Secure Doctor-only update RPC
--   - Single-use, expiring patient registration invite token
--   - Secure Patient claim RPC after authentication
--   - Conservative merge support if a linked CRM row already exists
--
-- Important:
--   - This does NOT modify Staff permissions.
--   - This does NOT change Medical Folder authorization.
--   - Contact/address details are administrative CRM data,
--     not clinical Medical Profile data.
-- =====================================================

begin;

-- =====================================================
-- 1. EXTEND DOCTOR PATIENT CRM
-- =====================================================

alter table public.doctor_patients
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists city text,
  add column if not exists county text,
  add column if not exists postal_code text,
  add column if not exists country text,
  add column if not exists contact_updated_at timestamptz,
  add column if not exists contact_updated_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,
  add column if not exists invite_last_sent_at timestamptz,
  add column if not exists invite_count integer not null default 0,
  add column if not exists invite_token_hash text,
  add column if not exists invite_expires_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists merged_into_doctor_patient_id uuid
    references public.doctor_patients(id)
    on update cascade
    on delete set null;

alter table public.doctor_patients
  drop constraint if exists doctor_patients_address_line_1_length_check;

alter table public.doctor_patients
  add constraint doctor_patients_address_line_1_length_check
  check (
    address_line_1 is null
    or char_length(trim(address_line_1)) <= 300
  );

alter table public.doctor_patients
  drop constraint if exists doctor_patients_address_line_2_length_check;

alter table public.doctor_patients
  add constraint doctor_patients_address_line_2_length_check
  check (
    address_line_2 is null
    or char_length(trim(address_line_2)) <= 300
  );

alter table public.doctor_patients
  drop constraint if exists doctor_patients_city_length_check;

alter table public.doctor_patients
  add constraint doctor_patients_city_length_check
  check (
    city is null
    or char_length(trim(city)) <= 150
  );

alter table public.doctor_patients
  drop constraint if exists doctor_patients_county_length_check;

alter table public.doctor_patients
  add constraint doctor_patients_county_length_check
  check (
    county is null
    or char_length(trim(county)) <= 150
  );

alter table public.doctor_patients
  drop constraint if exists doctor_patients_postal_code_length_check;

alter table public.doctor_patients
  add constraint doctor_patients_postal_code_length_check
  check (
    postal_code is null
    or char_length(trim(postal_code)) <= 30
  );

alter table public.doctor_patients
  drop constraint if exists doctor_patients_country_length_check;

alter table public.doctor_patients
  add constraint doctor_patients_country_length_check
  check (
    country is null
    or char_length(trim(country)) <= 100
  );

alter table public.doctor_patients
  drop constraint if exists doctor_patients_invite_count_check;

alter table public.doctor_patients
  add constraint doctor_patients_invite_count_check
  check (invite_count >= 0);

create unique index if not exists
  idx_doctor_patients_invite_token_hash_unique
on public.doctor_patients (
  invite_token_hash
)
where invite_token_hash is not null;

create index if not exists
  idx_doctor_patients_active_doctor_name
on public.doctor_patients (
  doctor_id,
  lower(display_name)
)
where archived_at is null;

comment on column public.doctor_patients.address_line_1 is
  'Doctor-maintained administrative patient address. This is not a clinical Medical Profile field.';

comment on column public.doctor_patients.invite_token_hash is
  'SHA-256 hash of a short-lived single-use RomDoc registration-link token. Plain token is never stored.';

-- =====================================================
-- 2. IMMUTABLE CONTACT / ADDRESS AUDIT HISTORY
-- =====================================================

create table if not exists
  public.doctor_patient_contact_history (
    id uuid primary key default gen_random_uuid(),

    doctor_patient_id uuid not null
      references public.doctor_patients(id)
      on update cascade
      on delete restrict,

    doctor_id uuid not null
      references public.doctors(id)
      on update cascade
      on delete restrict,

    previous_details jsonb not null,
    new_details jsonb not null,

    changed_by_profile_id uuid not null
      references public.profiles(id)
      on update cascade
      on delete restrict,

    changed_at timestamptz not null default now(),

    constraint doctor_patient_contact_history_previous_object_check
      check (
        jsonb_typeof(previous_details) = 'object'
      ),

    constraint doctor_patient_contact_history_new_object_check
      check (
        jsonb_typeof(new_details) = 'object'
      )
  );

create index if not exists
  idx_doctor_patient_contact_history_patient
on public.doctor_patient_contact_history (
  doctor_patient_id,
  changed_at desc
);

create index if not exists
  idx_doctor_patient_contact_history_doctor
on public.doctor_patient_contact_history (
  doctor_id,
  changed_at desc
);

create or replace function
  public.prevent_doctor_patient_contact_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  raise exception
    'doctor_patient_contact_history_is_immutable'
    using errcode = '55000';
end;
$function$;

drop trigger if exists
  prevent_doctor_patient_contact_history_update
on public.doctor_patient_contact_history;

create trigger
  prevent_doctor_patient_contact_history_update
before update
on public.doctor_patient_contact_history
for each row
execute function
  public.prevent_doctor_patient_contact_history_mutation();

drop trigger if exists
  prevent_doctor_patient_contact_history_delete
on public.doctor_patient_contact_history;

create trigger
  prevent_doctor_patient_contact_history_delete
before delete
on public.doctor_patient_contact_history
for each row
execute function
  public.prevent_doctor_patient_contact_history_mutation();

-- =====================================================
-- 3. SECURE DOCTOR CONTACT / ADDRESS UPDATE
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
set search_path = public
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
  previous_json jsonb;
  next_json jsonb;
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

  previous_json :=
    jsonb_build_object(
      'display_name', current_row.display_name,
      'email', current_row.email,
      'phone', current_row.phone,
      'address_line_1', current_row.address_line_1,
      'address_line_2', current_row.address_line_2,
      'city', current_row.city,
      'county', current_row.county,
      'postal_code', current_row.postal_code,
      'country', current_row.country
    );

  next_json :=
    jsonb_build_object(
      'display_name', normalized_name,
      'email', normalized_email,
      'phone', normalized_phone,
      'address_line_1', normalized_address_line_1,
      'address_line_2', normalized_address_line_2,
      'city', normalized_city,
      'county', normalized_county,
      'postal_code', normalized_postal_code,
      'country', normalized_country
    );

  if previous_json = next_json then
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

  insert into public.doctor_patient_contact_history (
    doctor_patient_id,
    doctor_id,
    previous_details,
    new_details,
    changed_by_profile_id
  )
  values (
    current_row.id,
    actor_doctor_id,
    previous_json,
    next_json,
    actor_profile_id
  );

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

-- =====================================================
-- 4. SECURE DOCTOR INVITE TOKEN STORAGE
-- =====================================================

create or replace function
  public.store_doctor_patient_invite(
    target_doctor_patient_id uuid,
    target_token_hash text,
    target_expires_at timestamptz
  )
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor_profile_id uuid := auth.uid();
  actor_doctor_id uuid;
  patient_row public.doctor_patients%rowtype;
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
  into patient_row
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

  if patient_row.patient_profile_id is not null then
    raise exception
      'patient_already_linked'
      using errcode = '23514';
  end if;

  if nullif(trim(coalesce(patient_row.email, '')), '') is null then
    raise exception
      'patient_email_required_for_invite'
      using errcode = '23514';
  end if;

  if target_token_hash is null
    or char_length(trim(target_token_hash)) <> 64
  then
    raise exception
      'invalid_invite_token_hash'
      using errcode = '22023';
  end if;

  if target_expires_at is null
    or target_expires_at <= now()
  then
    raise exception
      'invalid_invite_expiration'
      using errcode = '22023';
  end if;

  update public.doctor_patients
  set
    invite_token_hash = lower(trim(target_token_hash)),
    invite_expires_at = target_expires_at,
    updated_at = now()
  where id = patient_row.id;

  return lower(trim(patient_row.email));
end;
$function$;

revoke all
on function
  public.store_doctor_patient_invite(
    uuid,
    text,
    timestamptz
  )
from public, anon;

grant execute
on function
  public.store_doctor_patient_invite(
    uuid,
    text,
    timestamptz
  )
to authenticated;

create or replace function
  public.mark_doctor_patient_invite_sent(
    target_doctor_patient_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor_profile_id uuid := auth.uid();
  actor_doctor_id uuid;
  saved_id uuid;
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

  update public.doctor_patients
  set
    invite_last_sent_at = now(),
    invite_count = invite_count + 1,
    updated_at = now()
  where id = target_doctor_patient_id
    and doctor_id = actor_doctor_id
    and archived_at is null
    and invite_token_hash is not null
  returning id
  into saved_id;

  if saved_id is null then
    raise exception
      'doctor_patient_invite_not_ready'
      using errcode = '42501';
  end if;

  return saved_id;
end;
$function$;

revoke all
on function
  public.mark_doctor_patient_invite_sent(uuid)
from public, anon;

grant execute
on function
  public.mark_doctor_patient_invite_sent(uuid)
to authenticated;

-- =====================================================
-- 5. SECURE PATIENT INVITE CLAIM
-- =====================================================

create or replace function
  public.claim_doctor_patient_invite(
    target_token_hash text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_profile_id uuid := auth.uid();
  current_email text :=
    lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  patient_row public.doctor_patients%rowtype;
  existing_linked_row public.doctor_patients%rowtype;
begin
  if current_profile_id is null
    or current_email = ''
  then
    raise exception
      'authentication_required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = current_profile_id
      and profile.role = 'patient'
      and profile.account_status = 'active'
  ) then
    raise exception
      'active_patient_profile_required'
      using errcode = '42501';
  end if;

  select *
  into patient_row
  from public.doctor_patients
  where invite_token_hash =
      lower(trim(target_token_hash))
    and invite_expires_at > now()
    and archived_at is null
  limit 1
  for update;

  if not found then
    raise exception
      'patient_invite_not_found_or_expired'
      using errcode = '42501';
  end if;

  if lower(trim(coalesce(patient_row.email, ''))) <>
    current_email
  then
    raise exception
      'patient_invite_email_mismatch'
      using errcode = '42501';
  end if;

  if patient_row.patient_profile_id = current_profile_id then
    update public.doctor_patients
    set
      invite_token_hash = null,
      invite_expires_at = null,
      updated_at = now()
    where id = patient_row.id;

    return patient_row.id;
  end if;

  if patient_row.patient_profile_id is not null
    and patient_row.patient_profile_id <> current_profile_id
  then
    raise exception
      'patient_invite_already_claimed'
      using errcode = '42501';
  end if;

  select *
  into existing_linked_row
  from public.doctor_patients
  where doctor_id = patient_row.doctor_id
    and patient_profile_id = current_profile_id
    and id <> patient_row.id
    and archived_at is null
  limit 1
  for update;

  if found then
    update public.doctor_patients
    set
      email = coalesce(email, patient_row.email),
      phone = coalesce(phone, patient_row.phone),
      address_line_1 =
        coalesce(address_line_1, patient_row.address_line_1),
      address_line_2 =
        coalesce(address_line_2, patient_row.address_line_2),
      city = coalesce(city, patient_row.city),
      county = coalesce(county, patient_row.county),
      postal_code =
        coalesce(postal_code, patient_row.postal_code),
      country = coalesce(country, patient_row.country),
      updated_at = now()
    where id = existing_linked_row.id;

    update public.doctor_patients
    set
      invite_token_hash = null,
      invite_expires_at = null,
      archived_at = now(),
      merged_into_doctor_patient_id =
        existing_linked_row.id,
      updated_at = now()
    where id = patient_row.id;

    return existing_linked_row.id;
  end if;

  update public.doctor_patients
  set
    patient_profile_id = current_profile_id,
    invite_token_hash = null,
    invite_expires_at = null,
    updated_at = now()
  where id = patient_row.id;

  return patient_row.id;
end;
$function$;

revoke all
on function
  public.claim_doctor_patient_invite(text)
from public, anon;

grant execute
on function
  public.claim_doctor_patient_invite(text)
to authenticated;

-- =====================================================
-- 6. DO NOT OVERWRITE EXPLICIT DOCTOR CONTACT EDITS
-- =====================================================
-- Step 108 synchronized appointment contact snapshots.
-- From Step 109 onward, an appointment may fill missing CRM
-- contact values, but it does not overwrite Doctor-edited data.
-- =====================================================

create or replace function
  public.sync_doctor_patient_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  target_patient_id uuid;
  normalized_name text;
  normalized_email text;
  normalized_phone text;
begin
  if new.doctor_id is null then
    return new;
  end if;

  normalized_name :=
    lower(trim(coalesce(new.patient_name, '')));

  normalized_email :=
    lower(trim(coalesce(new.patient_email, '')));

  normalized_phone :=
    regexp_replace(
      coalesce(new.patient_phone, ''),
      '[^0-9]',
      '',
      'g'
    );

  if char_length(normalized_name) < 2 then
    return new;
  end if;

  if normalized_email = ''
    and normalized_phone = ''
  then
    return new;
  end if;

  if new.patient_profile_id is not null then
    select patient.id
    into target_patient_id
    from public.doctor_patients as patient
    where patient.doctor_id = new.doctor_id
      and patient.patient_profile_id =
        new.patient_profile_id
      and patient.archived_at is null
    limit 1;
  end if;

  if target_patient_id is null then
    select patient.id
    into target_patient_id
    from public.doctor_patients as patient
    where patient.doctor_id = new.doctor_id
      and patient.archived_at is null
      and lower(trim(patient.display_name)) =
        normalized_name
      and (
        (
          normalized_email <> ''
          and lower(trim(coalesce(patient.email, ''))) =
            normalized_email
        )
        or
        (
          normalized_phone <> ''
          and regexp_replace(
            coalesce(patient.phone, ''),
            '[^0-9]',
            '',
            'g'
          ) = normalized_phone
        )
      )
    order by
      patient.patient_profile_id is not null desc,
      patient.created_at asc
    limit 1;
  end if;

  if target_patient_id is not null then
    update public.doctor_patients
    set
      patient_profile_id =
        coalesce(
          patient_profile_id,
          new.patient_profile_id
        ),
      email =
        coalesce(
          email,
          nullif(lower(trim(new.patient_email)), '')
        ),
      phone =
        coalesce(
          phone,
          nullif(trim(new.patient_phone), '')
        ),
      updated_at = now()
    where id = target_patient_id;

    return new;
  end if;

  insert into public.doctor_patients (
    doctor_id,
    patient_profile_id,
    display_name,
    email,
    phone,
    source,
    created_by_profile_id
  )
  values (
    new.doctor_id,
    new.patient_profile_id,
    trim(new.patient_name),
    nullif(lower(trim(coalesce(new.patient_email, ''))), ''),
    nullif(trim(coalesce(new.patient_phone, '')), ''),
    'appointment',
    new.created_by_profile_id
  )
  on conflict (
    doctor_id,
    patient_profile_id
  )
  where patient_profile_id is not null
  do update
  set
    email = coalesce(
      public.doctor_patients.email,
      excluded.email
    ),
    phone = coalesce(
      public.doctor_patients.phone,
      excluded.phone
    ),
    updated_at = now();

  return new;
end;
$function$;

-- =====================================================
-- 7. RLS FOR CONTACT HISTORY
-- =====================================================

alter table public.doctor_patient_contact_history
  enable row level security;

drop policy if exists
  "Doctors can read own patient contact audit"
on public.doctor_patient_contact_history;

create policy
  "Doctors can read own patient contact audit"
on public.doctor_patient_contact_history
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id =
      doctor_patient_contact_history.doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
);

revoke all
on table public.doctor_patient_contact_history
from public, anon, authenticated;

grant select
on table public.doctor_patient_contact_history
to authenticated;

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
  and table_name = 'doctor_patients'
  and column_name in (
    'address_line_1',
    'address_line_2',
    'city',
    'county',
    'postal_code',
    'country',
    'contact_updated_at',
    'contact_updated_by_profile_id',
    'invite_last_sent_at',
    'invite_count',
    'invite_token_hash',
    'invite_expires_at',
    'archived_at',
    'merged_into_doctor_patient_id'
  )
order by ordinal_position;

select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename =
    'doctor_patient_contact_history'
order by policyname;

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'update_doctor_patient_contact_details',
    'store_doctor_patient_invite',
    'mark_doctor_patient_invite_sent',
    'claim_doctor_patient_invite'
  )
order by routine_name;
