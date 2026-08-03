-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 88C Simplification — Direct QR and secure-link access
--
-- Target path:
-- ROMDOC/database/102-simplify-medical-folder-sharing.sql
--
-- Requires:
--   - 100-medical-folder-share-grants.sql
--   - 101-medical-folder-share-tokens.sql
--
-- Keeps:
--   - medical_folder_share_grants
--   - medical_folder_share_grant_documents
--   - medical_folder_share_events
--   - medical_folder_share_tokens
--   - existing token hashes and active links
--
-- Removes:
--   - medical_folder_recipient_sessions
--   - recipient-session RPC functions
--   - recipient-session triggers and helpers
--
-- Adds:
--   - one direct service-only token validation/open function
--
-- Core rule:
--   QR/link -> one server request -> permitted read-only content.
--   No login, PIN, Doctor binding or second recipient token is
--   required for Emergency Summary access.
-- =====================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';


-- =====================================================
-- 1. REMOVE THE UNUSED RECIPIENT-SESSION LAYER
-- =====================================================

drop function if exists
  public.record_medical_folder_recipient_access(
    text,
    text,
    uuid
  );

drop function if exists
  public.resolve_medical_folder_recipient_session(
    text
  );

drop function if exists
  public.begin_medical_folder_recipient_session(
    text,
    text,
    uuid,
    uuid
  );

drop table if exists
  public.medical_folder_recipient_sessions
cascade;

drop function if exists
  public.prepare_medical_folder_recipient_session_change();


-- =====================================================
-- 2. KEEP REVOCATION AND EXPIRATION SYNCHRONISATION SIMPLE
-- =====================================================

create or replace function
  public.synchronise_medical_folder_share_secret_state()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  invalidation_time timestamptz;
  invalidation_reason_value text;
begin
  if old.revoked_at is null
    and new.revoked_at is not null
  then
    invalidation_time := new.revoked_at;
    invalidation_reason_value := 'grant_revoked';
  elsif old.expiration_recorded_at is null
    and new.expiration_recorded_at is not null
  then
    invalidation_time := new.expiration_recorded_at;
    invalidation_reason_value := 'grant_expired';
  else
    return new;
  end if;

  update public.medical_folder_share_tokens
  set
    invalidated_at = invalidation_time,
    invalidation_reason = invalidation_reason_value
  where share_grant_id = new.id
    and invalidated_at is null;

  return new;
end;
$function$;


-- =====================================================
-- 3. DIRECT SERVICE-ONLY TOKEN OPENING
-- =====================================================

create or replace function
  public.open_medical_folder_share_token(
    target_share_token text,
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
  selected_document_ids uuid[]
)
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  token_row public.medical_folder_share_tokens%rowtype;
  grant_row public.medical_folder_share_grants%rowtype;
  selected_ids uuid[];
  access_time timestamptz;
  event_type_value text;
begin
  if target_share_token is null
    or target_share_token !~ '^rdsh_[a-f0-9]{64}$'
  then
    raise exception 'invalid_medical_folder_share_token'
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

  select token.*
  into token_row
  from public.medical_folder_share_tokens as token
  where token.token_hash = encode(
    digest(
      convert_to(
        target_share_token,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
  for update;

  if not found
    or token_row.invalidated_at is not null
  then
    raise exception 'invalid_medical_folder_share_token'
      using errcode = '42501';
  end if;

  select share.*
  into grant_row
  from public.medical_folder_share_grants as share
  where share.id = token_row.share_grant_id
  for update;

  if not found then
    raise exception 'medical_folder_share_grant_not_found'
      using errcode = 'P0002';
  end if;

  if grant_row.revoked_at is not null then
    raise exception 'medical_folder_share_grant_revoked'
      using errcode = '42501';
  end if;

  if grant_row.expires_at <= now() then
    raise exception 'medical_folder_share_grant_expired'
      using errcode = '42501';
  end if;

  if grant_row.consumed_at is not null then
    raise exception 'medical_folder_share_grant_consumed'
      using errcode = '42501';
  end if;

  access_time := now();

  update public.medical_folder_share_tokens
  set
    exchange_count = exchange_count + 1,
    last_exchanged_at = access_time,
    invalidated_at =
      case
        when grant_row.access_mode = 'one_time'
          then access_time
        else invalidated_at
      end,
    invalidation_reason =
      case
        when grant_row.access_mode = 'one_time'
          then 'grant_consumed'
        else invalidation_reason
      end
  where id = token_row.id;

  update public.medical_folder_share_grants
  set
    access_count = access_count + 1,
    last_accessed_at = access_time,
    consumed_at =
      case
        when access_mode = 'one_time'
          then access_time
        else consumed_at
      end
  where id = grant_row.id;

  event_type_value :=
    case
      when target_channel = 'qr'
        then 'qr_scanned'
      else 'link_opened'
    end;

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
      'token_hint',
      token_row.token_hint,
      'direct_access',
      true
    )
  );

  if grant_row.access_mode = 'one_time' then
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
      'consumed',
      null,
      null,
      'anonymous',
      target_channel,
      jsonb_build_object(
        'token_hint',
        token_row.token_hint,
        'direct_access',
        true
      )
    );
  end if;

  if grant_row.share_scope = 'selected_documents' then
    select coalesce(
      array_agg(
        membership.document_id
        order by membership.created_at asc
      ),
      array[]::uuid[]
    )
    into selected_ids
    from public.medical_folder_share_grant_documents
      as membership
    join public.patient_medical_documents as document
      on document.id = membership.document_id
    where membership.share_grant_id = grant_row.id
      and document.patient_profile_id =
        grant_row.patient_profile_id
      and document.deleted_at is null;
  else
    selected_ids := array[]::uuid[];
  end if;

  share_grant_id := grant_row.id;
  patient_profile_id := grant_row.patient_profile_id;
  share_scope := grant_row.share_scope;
  access_mode := grant_row.access_mode;
  allow_document_downloads :=
    grant_row.allow_document_downloads;
  expires_at := grant_row.expires_at;
  token_hint := token_row.token_hint;
  selected_document_ids := selected_ids;

  return next;
end;
$function$;


-- =====================================================
-- 4. PERMISSIONS
-- =====================================================

revoke all
on function public.open_medical_folder_share_token(
  text,
  text
)
from public, anon, authenticated, service_role;

grant execute
on function public.open_medical_folder_share_token(
  text,
  text
)
to service_role;


commit;


-- =====================================================
-- VERIFICATION
-- =====================================================

select to_regclass(
  'public.medical_folder_recipient_sessions'
) as recipient_sessions_should_be_null;

select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'issue_own_medical_folder_share_token',
    'open_medical_folder_share_token',
    'begin_medical_folder_recipient_session',
    'resolve_medical_folder_recipient_session',
    'record_medical_folder_recipient_access'
  )
order by routine_name;

select
  grantee,
  routine_name,
  privilege_type
from information_schema.role_routine_grants
where specific_schema = 'public'
  and routine_name =
    'open_medical_folder_share_token'
order by grantee;
