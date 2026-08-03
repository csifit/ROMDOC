-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 88C — Permanent Emergency QR and Lock-Screen Card
--
-- Target path:
-- ROMDOC/database/103-permanent-emergency-medical-summary-share.sql
--
-- Requires:
--   - 100-medical-folder-share-grants.sql
--   - 101-medical-folder-share-tokens.sql
--   - 102-simplify-medical-folder-sharing.sql
--
-- Adds one permanent, revocable Emergency Medical Summary
-- share per Patient. Permanent shares never expire, are always
-- multiple-use, never allow document downloads and remain
-- view-only. Temporary sharing stays unchanged for all other
-- scopes.
-- =====================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';


-- =====================================================
-- 1. PERMANENT-GRANT STATE
-- =====================================================

alter table public.medical_folder_share_grants
  add column if not exists is_permanent boolean not null default false;

alter table public.medical_folder_share_grants
  add column if not exists disabled_at timestamptz;

alter table public.medical_folder_share_grants
  alter column expires_at drop not null;

alter table public.medical_folder_share_grants
  drop constraint if exists medical_folder_share_grants_expiry_check;

alter table public.medical_folder_share_grants
  add constraint medical_folder_share_grants_expiry_check
  check (
    (
      is_permanent = false
      and expires_at is not null
      and expires_at - created_at in (
        interval '10 minutes',
        interval '1 hour',
        interval '24 hours',
        interval '7 days'
      )
    )
    or (
      is_permanent = true
      and expires_at is null
    )
  );

alter table public.medical_folder_share_grants
  add constraint medical_folder_share_grants_permanent_emergency_check
  check (
    is_permanent = false
    or (
      share_scope = 'emergency_summary'
      and access_mode = 'multiple'
      and allow_document_downloads = false
      and expires_at is null
      and consumed_at is null
      and expiration_recorded_at is null
      and bound_doctor_id is null
      and bound_at is null
    )
  );

alter table public.medical_folder_share_grants
  add constraint medical_folder_share_grants_disabled_check
  check (
    disabled_at is null
    or disabled_at >= created_at
  );

alter table public.medical_folder_share_grants
  drop constraint if exists medical_folder_share_grants_expiration_record_check;

alter table public.medical_folder_share_grants
  add constraint medical_folder_share_grants_expiration_record_check
  check (
    expiration_recorded_at is null
    or (
      expires_at is not null
      and expiration_recorded_at >= expires_at
    )
  );

comment on column public.medical_folder_share_grants.is_permanent is
  'True only for the Patient permanent Emergency Medical Summary credential.';

comment on column public.medical_folder_share_grants.disabled_at is
  'Temporary deactivation timestamp. Clearing it reactivates the same permanent Emergency QR.';

create unique index if not exists
  idx_medical_folder_share_grants_one_current_permanent_emergency
on public.medical_folder_share_grants (
  patient_profile_id
)
where is_permanent = true
  and revoked_at is null;

create index if not exists
  idx_medical_folder_share_grants_permanent_emergency_status
on public.medical_folder_share_grants (
  patient_profile_id,
  disabled_at
)
where is_permanent = true
  and revoked_at is null;


-- =====================================================
-- 2. EVENT TYPES
-- =====================================================

alter table public.medical_folder_share_events
  drop constraint if exists medical_folder_share_events_type_check;

alter table public.medical_folder_share_events
  add constraint medical_folder_share_events_type_check
  check (
    event_type in (
      'created',
      'token_issued',
      'token_rotated',
      'recipient_session_started',
      'recipient_session_closed',
      'bound_to_doctor',
      'qr_scanned',
      'link_opened',
      'folder_viewed',
      'document_viewed',
      'document_downloaded',
      'email_sent',
      'deactivated',
      'reactivated',
      'revoked',
      'expired',
      'consumed',
      'access_denied',
      'pin_failed'
    )
  );


-- =====================================================
-- 3. UPDATE GRANT IMMUTABILITY FOR NULL EXPIRY
-- =====================================================

create or replace function public.prepare_medical_folder_share_grant_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return case
      when tg_op = 'DELETE' then old
      else new
    end;
  end if;

  if tg_op = 'DELETE' then
    raise exception
      'medical_folder_share_grants_must_be_revoked_not_deleted'
      using errcode = '55000';
  end if;

  if new.id <> old.id
    or new.patient_profile_id <> old.patient_profile_id
    or new.share_scope <> old.share_scope
    or new.access_mode <> old.access_mode
    or new.allow_document_downloads <> old.allow_document_downloads
    or new.expires_at is distinct from old.expires_at
    or new.is_permanent <> old.is_permanent
    or new.created_at <> old.created_at
  then
    raise exception
      'medical_folder_share_grant_identity_is_immutable'
      using errcode = '55000';
  end if;

  if old.bound_doctor_id is not null
    and new.bound_doctor_id is distinct from old.bound_doctor_id
  then
    raise exception
      'medical_folder_share_grant_doctor_binding_is_immutable'
      using errcode = '55000';
  end if;

  if old.bound_at is not null
    and new.bound_at is distinct from old.bound_at
  then
    raise exception
      'medical_folder_share_grant_binding_time_is_immutable'
      using errcode = '55000';
  end if;

  if new.access_count < old.access_count then
    raise exception
      'medical_folder_share_grant_access_count_cannot_decrease'
      using errcode = '55000';
  end if;

  if old.last_accessed_at is not null
    and (
      new.last_accessed_at is null
      or new.last_accessed_at < old.last_accessed_at
    )
  then
    raise exception
      'medical_folder_share_grant_last_access_cannot_move_backwards'
      using errcode = '55000';
  end if;

  if old.consumed_at is not null
    and new.consumed_at is distinct from old.consumed_at
  then
    raise exception
      'medical_folder_share_grant_consumption_is_immutable'
      using errcode = '55000';
  end if;

  if old.revoked_at is not null
    and new.revoked_at is distinct from old.revoked_at
  then
    raise exception
      'medical_folder_share_grant_revocation_is_immutable'
      using errcode = '55000';
  end if;

  if old.revoked_by_profile_id is not null
    and new.revoked_by_profile_id is distinct from old.revoked_by_profile_id
  then
    raise exception
      'medical_folder_share_grant_revoker_is_immutable'
      using errcode = '55000';
  end if;

  if old.expiration_recorded_at is not null
    and new.expiration_recorded_at is distinct from old.expiration_recorded_at
  then
    raise exception
      'medical_folder_share_grant_expiration_marker_is_immutable'
      using errcode = '55000';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;


-- =====================================================
-- 4. KEEP EMERGENCY SUMMARY OUT OF TEMPORARY CREATION
-- =====================================================

alter function public.create_own_medical_folder_share_grant(
  text,
  integer,
  text,
  boolean,
  uuid[]
)
rename to create_temporary_medical_folder_share_grant_legacy;

revoke all
on function public.create_temporary_medical_folder_share_grant_legacy(
  text,
  integer,
  text,
  boolean,
  uuid[]
)
from public, anon, authenticated, service_role;

create function public.create_own_medical_folder_share_grant(
  target_scope text,
  target_duration_seconds integer,
  target_access_mode text default 'one_time',
  target_allow_document_downloads boolean default false,
  target_document_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
begin
  if target_scope = 'emergency_summary' then
    raise exception 'emergency_summary_requires_permanent_share'
      using errcode = '22023';
  end if;

  return public.create_temporary_medical_folder_share_grant_legacy(
    target_scope,
    target_duration_seconds,
    target_access_mode,
    target_allow_document_downloads,
    target_document_ids
  );
end;
$function$;

revoke all
on function public.create_own_medical_folder_share_grant(
  text,
  integer,
  text,
  boolean,
  uuid[]
)
from public, anon, authenticated, service_role;

grant execute
on function public.create_own_medical_folder_share_grant(
  text,
  integer,
  text,
  boolean,
  uuid[]
)
to authenticated;


-- Prevent the temporary rdsh_ token system from being used
-- for a permanent Emergency grant. The permanent credential
-- uses the signed rdem_ format generated by the server.
create or replace function public.prevent_temporary_token_for_permanent_share()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
begin
  if exists (
    select 1
    from public.medical_folder_share_grants as share
    where share.id = new.share_grant_id
      and share.is_permanent = true
  ) then
    raise exception 'permanent_emergency_share_uses_signed_token'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

drop trigger if exists
  prevent_temporary_token_for_permanent_share_trigger
on public.medical_folder_share_tokens;

create trigger
  prevent_temporary_token_for_permanent_share_trigger
before insert
on public.medical_folder_share_tokens
for each row
execute function public.prevent_temporary_token_for_permanent_share();


-- =====================================================
-- 5. PATIENT PERMANENT-EMERGENCY ACTIONS
-- =====================================================

create or replace function public.create_own_permanent_emergency_share_grant()
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  patient_id uuid;
  grant_id uuid;
begin
  patient_id := auth.uid();

  if patient_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  if not public.is_active_patient_profile(patient_id) then
    raise exception 'active_patient_account_required'
      using errcode = '42501';
  end if;

  select share.id
  into grant_id
  from public.medical_folder_share_grants as share
  where share.patient_profile_id = patient_id
    and share.is_permanent = true
    and share.revoked_at is null
  order by share.created_at desc
  limit 1
  for update;

  if grant_id is not null then
    return grant_id;
  end if;

  insert into public.medical_folder_share_grants (
    patient_profile_id,
    share_scope,
    access_mode,
    allow_document_downloads,
    expires_at,
    is_permanent
  )
  values (
    patient_id,
    'emergency_summary',
    'multiple',
    false,
    null,
    true
  )
  returning id into grant_id;

  insert into public.medical_folder_share_events (
    share_grant_id,
    patient_profile_id,
    event_type,
    actor_profile_id,
    actor_doctor_id,
    actor_role,
    access_channel,
    metadata
  )
  values (
    grant_id,
    patient_id,
    'created',
    patient_id,
    null,
    'patient',
    'patient_dashboard',
    jsonb_build_object(
      'permanent_emergency_share', true
    )
  );

  return grant_id;
end;
$function$;


create or replace function public.replace_own_permanent_emergency_share_grant()
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  patient_id uuid;
  old_grant_id uuid;
  new_grant_id uuid;
  action_time timestamptz := now();
begin
  patient_id := auth.uid();

  if patient_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  if not public.is_active_patient_profile(patient_id) then
    raise exception 'active_patient_account_required'
      using errcode = '42501';
  end if;

  select share.id
  into old_grant_id
  from public.medical_folder_share_grants as share
  where share.patient_profile_id = patient_id
    and share.is_permanent = true
    and share.revoked_at is null
  order by share.created_at desc
  limit 1
  for update;

  if old_grant_id is not null then
    update public.medical_folder_share_grants
    set
      revoked_at = action_time,
      revoked_by_profile_id = patient_id
    where id = old_grant_id;

    insert into public.medical_folder_share_events (
      share_grant_id,
      patient_profile_id,
      event_type,
      actor_profile_id,
      actor_doctor_id,
      actor_role,
      access_channel,
      metadata
    )
    values (
      old_grant_id,
      patient_id,
      'revoked',
      patient_id,
      null,
      'patient',
      'patient_dashboard',
      jsonb_build_object(
        'permanent_emergency_share', true,
        'reason', 'replaced'
      )
    );
  end if;

  insert into public.medical_folder_share_grants (
    patient_profile_id,
    share_scope,
    access_mode,
    allow_document_downloads,
    expires_at,
    is_permanent
  )
  values (
    patient_id,
    'emergency_summary',
    'multiple',
    false,
    null,
    true
  )
  returning id into new_grant_id;

  insert into public.medical_folder_share_events (
    share_grant_id,
    patient_profile_id,
    event_type,
    actor_profile_id,
    actor_doctor_id,
    actor_role,
    access_channel,
    metadata
  )
  values (
    new_grant_id,
    patient_id,
    'created',
    patient_id,
    null,
    'patient',
    'patient_dashboard',
    jsonb_build_object(
      'permanent_emergency_share', true,
      'replaces_share_grant_id', old_grant_id
    )
  );

  return new_grant_id;
end;
$function$;


create or replace function public.set_own_permanent_emergency_share_enabled(
  target_enabled boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  patient_id uuid;
  grant_id uuid;
  current_disabled_at timestamptz;
  action_time timestamptz := now();
begin
  patient_id := auth.uid();

  if patient_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  if not public.is_active_patient_profile(patient_id) then
    raise exception 'active_patient_account_required'
      using errcode = '42501';
  end if;

  if target_enabled is null then
    raise exception 'invalid_permanent_emergency_share_state'
      using errcode = '22023';
  end if;

  select share.id, share.disabled_at
  into grant_id, current_disabled_at
  from public.medical_folder_share_grants as share
  where share.patient_profile_id = patient_id
    and share.is_permanent = true
    and share.revoked_at is null
  order by share.created_at desc
  limit 1
  for update;

  if grant_id is null then
    raise exception 'permanent_emergency_share_not_found'
      using errcode = 'P0002';
  end if;

  if target_enabled and current_disabled_at is null then
    return grant_id;
  end if;

  if not target_enabled and current_disabled_at is not null then
    return grant_id;
  end if;

  update public.medical_folder_share_grants
  set disabled_at = case
    when target_enabled then null
    else action_time
  end
  where id = grant_id;

  insert into public.medical_folder_share_events (
    share_grant_id,
    patient_profile_id,
    event_type,
    actor_profile_id,
    actor_doctor_id,
    actor_role,
    access_channel,
    metadata
  )
  values (
    grant_id,
    patient_id,
    case
      when target_enabled then 'reactivated'
      else 'deactivated'
    end,
    patient_id,
    null,
    'patient',
    'patient_dashboard',
    jsonb_build_object(
      'permanent_emergency_share', true
    )
  );

  return grant_id;
end;
$function$;


-- =====================================================
-- 6. DIRECT PERMANENT-EMERGENCY OPENING
-- =====================================================

create or replace function public.open_permanent_emergency_share_grant(
  target_share_grant_id uuid,
  target_channel text default 'secure_link'
)
returns table (
  share_grant_id uuid,
  patient_profile_id uuid,
  share_scope text,
  access_mode text,
  allow_document_downloads boolean,
  expires_at timestamptz,
  token_hint text,
  selected_document_ids uuid[],
  is_permanent boolean
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  grant_row public.medical_folder_share_grants%rowtype;
  access_time timestamptz := now();
  event_type_value text;
  hint_value text;
begin
  if target_share_grant_id is null then
    raise exception 'invalid_permanent_emergency_share_token'
      using errcode = '22023';
  end if;

  if target_channel not in (
    'secure_link',
    'qr',
    'email',
    'nfc'
  ) then
    raise exception 'invalid_medical_folder_share_channel'
      using errcode = '22023';
  end if;

  select share.*
  into grant_row
  from public.medical_folder_share_grants as share
  where share.id = target_share_grant_id
  for update;

  if not found
    or grant_row.is_permanent is not true
    or grant_row.share_scope <> 'emergency_summary'
  then
    raise exception 'permanent_emergency_share_not_found'
      using errcode = 'P0002';
  end if;

  if grant_row.revoked_at is not null then
    raise exception 'medical_folder_share_grant_revoked'
      using errcode = '42501';
  end if;

  if grant_row.disabled_at is not null then
    raise exception 'permanent_emergency_share_disabled'
      using errcode = '42501';
  end if;

  update public.medical_folder_share_grants
  set
    access_count = access_count + 1,
    last_accessed_at = access_time
  where id = grant_row.id;

  event_type_value := case
    when target_channel = 'qr' then 'qr_scanned'
    else 'link_opened'
  end;

  hint_value :=
    'rdem_' || left(replace(grant_row.id::text, '-', ''), 8);

  insert into public.medical_folder_share_events (
    share_grant_id,
    patient_profile_id,
    event_type,
    actor_profile_id,
    actor_doctor_id,
    actor_role,
    access_channel,
    metadata
  )
  values (
    grant_row.id,
    grant_row.patient_profile_id,
    event_type_value,
    null,
    null,
    'anonymous',
    target_channel,
    jsonb_build_object(
      'token_hint', hint_value,
      'direct_access', true,
      'permanent_emergency_share', true
    )
  );

  share_grant_id := grant_row.id;
  patient_profile_id := grant_row.patient_profile_id;
  share_scope := 'emergency_summary';
  access_mode := 'multiple';
  allow_document_downloads := false;
  expires_at := null;
  token_hint := hint_value;
  selected_document_ids := array[]::uuid[];
  is_permanent := true;

  return next;
end;
$function$;


-- =====================================================
-- 7. PERMISSIONS
-- =====================================================

revoke all
on function public.create_own_permanent_emergency_share_grant()
from public, anon, authenticated, service_role;

grant execute
on function public.create_own_permanent_emergency_share_grant()
to authenticated;

revoke all
on function public.replace_own_permanent_emergency_share_grant()
from public, anon, authenticated, service_role;

grant execute
on function public.replace_own_permanent_emergency_share_grant()
to authenticated;

revoke all
on function public.set_own_permanent_emergency_share_enabled(boolean)
from public, anon, authenticated, service_role;

grant execute
on function public.set_own_permanent_emergency_share_enabled(boolean)
to authenticated;

revoke all
on function public.open_permanent_emergency_share_grant(uuid, text)
from public, anon, authenticated, service_role;

grant execute
on function public.open_permanent_emergency_share_grant(uuid, text)
to service_role;

commit;


-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  is_nullable,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'medical_folder_share_grants'
  and column_name in (
    'expires_at',
    'is_permanent',
    'disabled_at'
  )
order by column_name;

select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_own_permanent_emergency_share_grant',
    'replace_own_permanent_emergency_share_grant',
    'set_own_permanent_emergency_share_enabled',
    'open_permanent_emergency_share_grant'
  )
order by routine_name;
