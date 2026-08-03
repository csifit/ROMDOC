-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 88D — Doctor linked devices
--
-- Target path:
-- ROMDOC/database/104-doctor-linked-devices.sql
--
-- Requires:
--   - Existing profiles and doctors tables
--   - Step 88C Medical Folder sharing migrations
--
-- Adds:
--   - one-time Doctor device pairing codes
--   - up to three active linked devices per Doctor
--   - hashed device credentials only
--   - immediate Doctor-controlled revocation
--   - service-only device credential resolution for Step 88E
--
-- Does NOT add:
--   - camera access
--   - QR scanning of Patient shares
--   - Medical Folder access through a device
--
-- Step 88E will reuse resolve_doctor_linked_device(...).
-- =====================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';


-- =====================================================
-- 1. LINKED DEVICES
-- =====================================================

create table if not exists public.doctor_linked_devices (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on update cascade
    on delete cascade,

  doctor_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete cascade,

  device_name text not null,

  credential_hash text not null unique,
  credential_hint text not null,

  user_agent_summary text,

  status text not null default 'active'
    constraint doctor_linked_devices_status_check
    check (status in ('active', 'revoked')),

  linked_at timestamptz not null default now(),
  last_used_at timestamptz,

  revoked_at timestamptz,
  revoked_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint doctor_linked_devices_name_check
    check (
      char_length(btrim(device_name)) between 2 and 80
    ),

  constraint doctor_linked_devices_hash_check
    check (
      credential_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint doctor_linked_devices_hint_check
    check (
      char_length(credential_hint) between 6 and 16
    ),

  constraint doctor_linked_devices_user_agent_check
    check (
      user_agent_summary is null
      or char_length(user_agent_summary) <= 255
    ),

  constraint doctor_linked_devices_revocation_check
    check (
      (
        status = 'active'
        and revoked_at is null
        and revoked_by_profile_id is null
      )
      or (
        status = 'revoked'
        and revoked_at is not null
      )
    ),

  constraint doctor_linked_devices_last_used_check
    check (
      last_used_at is null
      or last_used_at >= linked_at
    ),

  constraint doctor_linked_devices_updated_check
    check (
      updated_at >= created_at
    )
);

comment on table public.doctor_linked_devices is
  'Doctor-owned trusted browser devices. Only SHA-256 credential hashes are stored. Device credentials are revocable and never grant clinical editing rights by themselves.';

comment on column public.doctor_linked_devices.credential_hash is
  'SHA-256 hash of the opaque rddv_ device credential. The raw credential is stored only in an HttpOnly browser cookie.';

create index if not exists
  idx_doctor_linked_devices_doctor_status
on public.doctor_linked_devices (
  doctor_id,
  status,
  linked_at desc
);

create index if not exists
  idx_doctor_linked_devices_profile_status
on public.doctor_linked_devices (
  doctor_profile_id,
  status,
  linked_at desc
);

create index if not exists
  idx_doctor_linked_devices_last_used
on public.doctor_linked_devices (
  doctor_id,
  last_used_at desc nulls last
)
where status = 'active';


-- =====================================================
-- 2. ONE-TIME PAIRING CODES
-- =====================================================

create table if not exists public.doctor_device_pairing_codes (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on update cascade
    on delete cascade,

  doctor_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete cascade,

  token_hash text not null unique,
  token_hint text not null,

  expires_at timestamptz not null,
  consumed_at timestamptz,
  invalidated_at timestamptz,

  linked_device_id uuid
    references public.doctor_linked_devices(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now(),

  constraint doctor_device_pairing_codes_hash_check
    check (
      token_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint doctor_device_pairing_codes_hint_check
    check (
      char_length(token_hint) between 6 and 16
    ),

  constraint doctor_device_pairing_codes_expiry_check
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '2 minutes 10 seconds'
    ),

  constraint doctor_device_pairing_codes_state_check
    check (
      not (
        consumed_at is not null
        and invalidated_at is not null
      )
    ),

  constraint doctor_device_pairing_codes_consumption_check
    check (
      (
        consumed_at is null
        and linked_device_id is null
      )
      or (
        consumed_at is not null
        and linked_device_id is not null
        and consumed_at >= created_at
      )
    ),

  constraint doctor_device_pairing_codes_invalidation_check
    check (
      invalidated_at is null
      or invalidated_at >= created_at
    )
);

comment on table public.doctor_device_pairing_codes is
  'Single-use two-minute pairing challenges created by an authenticated Doctor dashboard. Raw rdpair_ values are never stored.';

create index if not exists
  idx_doctor_device_pairing_codes_doctor_created
on public.doctor_device_pairing_codes (
  doctor_id,
  created_at desc
);

create index if not exists
  idx_doctor_device_pairing_codes_active
on public.doctor_device_pairing_codes (
  doctor_profile_id,
  expires_at
)
where consumed_at is null
  and invalidated_at is null;


-- =====================================================
-- 3. DIRECT ACCESS RESTRICTIONS
-- =====================================================

alter table public.doctor_linked_devices
  enable row level security;

alter table public.doctor_device_pairing_codes
  enable row level security;

revoke all
on table public.doctor_linked_devices
from public, anon, authenticated;

revoke all
on table public.doctor_device_pairing_codes
from public, anon, authenticated;

grant select, insert, update, delete
on table public.doctor_linked_devices
to service_role;

grant select, insert, update, delete
on table public.doctor_device_pairing_codes
to service_role;

-- All normal application access is through the functions below
-- or protected server code using the service role.


-- =====================================================
-- 4. CREATE A PAIRING CODE
-- =====================================================

create or replace function public.create_own_doctor_device_pairing_code(
  target_token_hash text,
  target_token_hint text
)
returns table (
  pairing_code_id uuid,
  pairing_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  requesting_profile_id uuid := auth.uid();
  owned_doctor_id uuid;
  active_device_count integer;
  created_pairing_id uuid;
  created_expiry timestamptz := now() + interval '2 minutes';
begin
  if requesting_profile_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  if target_token_hash is null
    or target_token_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid_doctor_device_pairing_hash'
      using errcode = '22023';
  end if;

  if target_token_hint is null
    or char_length(target_token_hint) not between 6 and 16
  then
    raise exception 'invalid_doctor_device_pairing_hint'
      using errcode = '22023';
  end if;

  select doctor.id
  into owned_doctor_id
  from public.doctors as doctor
  join public.profiles as profile
    on profile.id = doctor.profile_id
  where doctor.profile_id = requesting_profile_id
    and doctor.status = 'active'
    and profile.role = 'doctor'
    and profile.account_status = 'active'
  limit 1;

  if owned_doctor_id is null then
    raise exception 'active_doctor_account_required'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owned_doctor_id::text, 0)
  );

  select count(*)::integer
  into active_device_count
  from public.doctor_linked_devices as device
  where device.doctor_id = owned_doctor_id
    and device.status = 'active';

  if active_device_count >= 3 then
    raise exception 'doctor_device_limit_reached'
      using errcode = '22023';
  end if;

  update public.doctor_device_pairing_codes
  set invalidated_at = now()
  where doctor_id = owned_doctor_id
    and consumed_at is null
    and invalidated_at is null;

  insert into public.doctor_device_pairing_codes (
    doctor_id,
    doctor_profile_id,
    token_hash,
    token_hint,
    expires_at
  )
  values (
    owned_doctor_id,
    requesting_profile_id,
    target_token_hash,
    target_token_hint,
    created_expiry
  )
  returning id
  into created_pairing_id;

  return query
  select
    created_pairing_id,
    created_expiry;
end;
$function$;


-- =====================================================
-- 5. COMPLETE PAIRING ON THE PHONE
-- =====================================================

create or replace function public.complete_own_doctor_device_pairing(
  target_pairing_token_hash text,
  target_credential_hash text,
  target_credential_hint text,
  target_device_name text,
  target_user_agent_summary text default null
)
returns table (
  linked_device_id uuid,
  linked_device_name text,
  linked_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  requesting_profile_id uuid := auth.uid();
  owned_doctor_id uuid;
  pairing_row public.doctor_device_pairing_codes%rowtype;
  active_device_count integer;
  created_device_id uuid;
  linked_time timestamptz := now();
  normalized_name text := btrim(coalesce(target_device_name, ''));
  normalized_user_agent text := nullif(
    left(btrim(coalesce(target_user_agent_summary, '')), 255),
    ''
  );
begin
  if requesting_profile_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  if target_pairing_token_hash is null
    or target_pairing_token_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid_doctor_device_pairing_token'
      using errcode = '22023';
  end if;

  if target_credential_hash is null
    or target_credential_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid_doctor_device_credential_hash'
      using errcode = '22023';
  end if;

  if target_credential_hint is null
    or char_length(target_credential_hint) not between 6 and 16
  then
    raise exception 'invalid_doctor_device_credential_hint'
      using errcode = '22023';
  end if;

  if char_length(normalized_name) not between 2 and 80 then
    raise exception 'invalid_doctor_device_name'
      using errcode = '22023';
  end if;

  select doctor.id
  into owned_doctor_id
  from public.doctors as doctor
  join public.profiles as profile
    on profile.id = doctor.profile_id
  where doctor.profile_id = requesting_profile_id
    and doctor.status = 'active'
    and profile.role = 'doctor'
    and profile.account_status = 'active'
  limit 1;

  if owned_doctor_id is null then
    raise exception 'active_doctor_account_required'
      using errcode = '42501';
  end if;

  select pairing.*
  into pairing_row
  from public.doctor_device_pairing_codes as pairing
  where pairing.token_hash = target_pairing_token_hash
  for update;

  if pairing_row.id is null then
    raise exception 'doctor_device_pairing_not_found'
      using errcode = '22023';
  end if;

  if pairing_row.doctor_id <> owned_doctor_id
    or pairing_row.doctor_profile_id <> requesting_profile_id
  then
    raise exception 'doctor_device_pairing_account_mismatch'
      using errcode = '42501';
  end if;

  if pairing_row.invalidated_at is not null then
    raise exception 'doctor_device_pairing_invalidated'
      using errcode = '22023';
  end if;

  if pairing_row.consumed_at is not null then
    raise exception 'doctor_device_pairing_already_used'
      using errcode = '22023';
  end if;

  if pairing_row.expires_at <= now() then
    raise exception 'doctor_device_pairing_expired'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owned_doctor_id::text, 0)
  );

  select count(*)::integer
  into active_device_count
  from public.doctor_linked_devices as device
  where device.doctor_id = owned_doctor_id
    and device.status = 'active';

  if active_device_count >= 3 then
    raise exception 'doctor_device_limit_reached'
      using errcode = '22023';
  end if;

  insert into public.doctor_linked_devices (
    doctor_id,
    doctor_profile_id,
    device_name,
    credential_hash,
    credential_hint,
    user_agent_summary,
    linked_at
  )
  values (
    owned_doctor_id,
    requesting_profile_id,
    normalized_name,
    target_credential_hash,
    target_credential_hint,
    normalized_user_agent,
    linked_time
  )
  returning id
  into created_device_id;

  update public.doctor_device_pairing_codes
  set
    consumed_at = linked_time,
    linked_device_id = created_device_id
  where id = pairing_row.id;

  return query
  select
    created_device_id,
    normalized_name,
    linked_time;
end;
$function$;


-- =====================================================
-- 6. DOCTOR DASHBOARD REVOCATION
-- =====================================================

create or replace function public.revoke_own_doctor_linked_device(
  target_device_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  requesting_profile_id uuid := auth.uid();
  owned_doctor_id uuid;
  revoked_device_id uuid;
  action_time timestamptz := now();
begin
  if requesting_profile_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  select doctor.id
  into owned_doctor_id
  from public.doctors as doctor
  join public.profiles as profile
    on profile.id = doctor.profile_id
  where doctor.profile_id = requesting_profile_id
    and doctor.status = 'active'
    and profile.role = 'doctor'
    and profile.account_status = 'active'
  limit 1;

  if owned_doctor_id is null then
    raise exception 'active_doctor_account_required'
      using errcode = '42501';
  end if;

  update public.doctor_linked_devices
  set
    status = 'revoked',
    revoked_at = action_time,
    revoked_by_profile_id = requesting_profile_id,
    updated_at = action_time
  where id = target_device_id
    and doctor_id = owned_doctor_id
    and doctor_profile_id = requesting_profile_id
    and status = 'active'
  returning id
  into revoked_device_id;

  if revoked_device_id is null then
    raise exception 'doctor_linked_device_not_found'
      using errcode = '22023';
  end if;

  return revoked_device_id;
end;
$function$;


create or replace function public.revoke_all_own_doctor_linked_devices()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  requesting_profile_id uuid := auth.uid();
  owned_doctor_id uuid;
  revoked_count integer := 0;
  action_time timestamptz := now();
begin
  if requesting_profile_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  select doctor.id
  into owned_doctor_id
  from public.doctors as doctor
  join public.profiles as profile
    on profile.id = doctor.profile_id
  where doctor.profile_id = requesting_profile_id
    and doctor.status = 'active'
    and profile.role = 'doctor'
    and profile.account_status = 'active'
  limit 1;

  if owned_doctor_id is null then
    raise exception 'active_doctor_account_required'
      using errcode = '42501';
  end if;

  update public.doctor_linked_devices
  set
    status = 'revoked',
    revoked_at = action_time,
    revoked_by_profile_id = requesting_profile_id,
    updated_at = action_time
  where doctor_id = owned_doctor_id
    and doctor_profile_id = requesting_profile_id
    and status = 'active';

  get diagnostics revoked_count = row_count;

  update public.doctor_device_pairing_codes
  set invalidated_at = action_time
  where doctor_id = owned_doctor_id
    and doctor_profile_id = requesting_profile_id
    and consumed_at is null
    and invalidated_at is null;

  return revoked_count;
end;
$function$;


-- =====================================================
-- 7. SERVICE-ONLY DEVICE RESOLUTION FOR MOBILE ROUTES
-- =====================================================

create or replace function public.resolve_doctor_linked_device(
  target_credential_hash text
)
returns table (
  linked_device_id uuid,
  doctor_id uuid,
  doctor_profile_id uuid,
  device_name text,
  credential_hint text,
  linked_at timestamptz,
  last_used_at timestamptz,
  doctor_slug text,
  doctor_first_name text,
  doctor_last_name text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  resolved_device public.doctor_linked_devices%rowtype;
  resolved_doctor_slug text;
  resolved_first_name text;
  resolved_last_name text;
  usage_time timestamptz := now();
begin
  if target_credential_hash is null
    or target_credential_hash !~ '^[0-9a-f]{64}$'
  then
    return;
  end if;

  select device.*
  into resolved_device
  from public.doctor_linked_devices as device
  join public.doctors as doctor
    on doctor.id = device.doctor_id
  join public.profiles as profile
    on profile.id = device.doctor_profile_id
  where device.credential_hash = target_credential_hash
    and device.status = 'active'
    and device.revoked_at is null
    and doctor.profile_id = device.doctor_profile_id
    and doctor.status = 'active'
    and profile.role = 'doctor'
    and profile.account_status = 'active'
  for update of device;

  if resolved_device.id is null then
    return;
  end if;

  update public.doctor_linked_devices
  set
    last_used_at = usage_time,
    updated_at = usage_time
  where id = resolved_device.id;

  select
    doctor.slug,
    profile.first_name,
    profile.last_name
  into
    resolved_doctor_slug,
    resolved_first_name,
    resolved_last_name
  from public.doctors as doctor
  join public.profiles as profile
    on profile.id = doctor.profile_id
  where doctor.id = resolved_device.doctor_id;

  return query
  select
    resolved_device.id,
    resolved_device.doctor_id,
    resolved_device.doctor_profile_id,
    resolved_device.device_name,
    resolved_device.credential_hint,
    resolved_device.linked_at,
    usage_time,
    resolved_doctor_slug,
    resolved_first_name,
    resolved_last_name;
end;
$function$;


create or replace function public.revoke_doctor_linked_device_by_credential(
  target_credential_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  revoked_device_id uuid;
  action_time timestamptz := now();
begin
  if target_credential_hash is null
    or target_credential_hash !~ '^[0-9a-f]{64}$'
  then
    return null;
  end if;

  update public.doctor_linked_devices
  set
    status = 'revoked',
    revoked_at = action_time,
    revoked_by_profile_id = doctor_profile_id,
    updated_at = action_time
  where credential_hash = target_credential_hash
    and status = 'active'
  returning id
  into revoked_device_id;

  return revoked_device_id;
end;
$function$;


-- =====================================================
-- 8. FUNCTION PERMISSIONS
-- =====================================================

revoke all
on function public.create_own_doctor_device_pairing_code(text, text)
from public, anon, authenticated, service_role;

grant execute
on function public.create_own_doctor_device_pairing_code(text, text)
to authenticated;

revoke all
on function public.complete_own_doctor_device_pairing(
  text,
  text,
  text,
  text,
  text
)
from public, anon, authenticated, service_role;

grant execute
on function public.complete_own_doctor_device_pairing(
  text,
  text,
  text,
  text,
  text
)
to authenticated;

revoke all
on function public.revoke_own_doctor_linked_device(uuid)
from public, anon, authenticated, service_role;

grant execute
on function public.revoke_own_doctor_linked_device(uuid)
to authenticated;

revoke all
on function public.revoke_all_own_doctor_linked_devices()
from public, anon, authenticated, service_role;

grant execute
on function public.revoke_all_own_doctor_linked_devices()
to authenticated;

revoke all
on function public.resolve_doctor_linked_device(text)
from public, anon, authenticated, service_role;

grant execute
on function public.resolve_doctor_linked_device(text)
to service_role;

revoke all
on function public.revoke_doctor_linked_device_by_credential(text)
from public, anon, authenticated, service_role;

grant execute
on function public.revoke_doctor_linked_device_by_credential(text)
to service_role;


commit;


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

select
  to_regclass('public.doctor_linked_devices')
    as doctor_linked_devices_table,
  to_regclass('public.doctor_device_pairing_codes')
    as doctor_device_pairing_codes_table;

select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_own_doctor_device_pairing_code',
    'complete_own_doctor_device_pairing',
    'revoke_own_doctor_linked_device',
    'revoke_all_own_doctor_linked_devices',
    'resolve_doctor_linked_device',
    'revoke_doctor_linked_device_by_credential'
  )
order by routine_name;
