-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 88C.1 — Secure share-token and recipient-access foundation
--
-- Target path:
-- ROMDOC/database/101-medical-folder-share-tokens.sql
--
-- Requires:
--   - 98-manual-permanent-user-erasure.sql
--   - 100-medical-folder-share-grants.sql
--
-- Adds:
--   - hashed Medical Folder share tokens
--   - hashed short-lived recipient sessions
--   - patient-only token issuance and rotation
--   - service-only share-token exchange
--   - service-only recipient-session validation
--   - service-only view/download event recording
--
-- Does NOT add:
--   - public recipient pages
--   - QR-code rendering
--   - email delivery
--   - PIN verification
--   - signed document-download URLs
--
-- Security rules:
--   - raw share and session tokens are returned once and never stored
--   - only SHA-256 hashes are stored
--   - recipient sessions last at most 15 minutes and never outlive the grant
--   - a one-time grant creates only one recipient session
--   - Emergency Summary QR access may be anonymous, without login or PIN
--   - Emergency Summary access never binds the grant to a Doctor
--   - non-emergency Doctor-bound grants cannot be used anonymously or by another Doctor
--   - recipient access remains view-only
-- =====================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

create schema if not exists extensions;
create extension if not exists pgcrypto
  with schema extensions;


-- =====================================================
-- 1. SHARE TOKENS
-- =====================================================

create table if not exists public.medical_folder_share_tokens (
  id uuid primary key default gen_random_uuid(),

  share_grant_id uuid not null
    references public.medical_folder_share_grants(id)
    on update cascade
    on delete cascade,

  token_hash text not null
    constraint medical_folder_share_tokens_hash_check
    check (
      token_hash ~ '^[a-f0-9]{64}$'
    ),

  token_hint text not null
    constraint medical_folder_share_tokens_hint_check
    check (
      token_hint ~ '^rdsh_[a-f0-9]{8}$'
    ),

  issued_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  issued_at timestamptz not null default now(),

  exchange_count integer not null default 0,
  last_exchanged_at timestamptz,

  invalidated_at timestamptz,
  invalidation_reason text
    constraint medical_folder_share_tokens_invalidation_reason_check
    check (
      invalidation_reason is null
      or invalidation_reason in (
        'rotated',
        'grant_revoked',
        'grant_expired',
        'grant_consumed',
        'manual'
      )
    ),

  updated_at timestamptz not null default now(),

  constraint medical_folder_share_tokens_hash_unique
    unique (token_hash),

  constraint medical_folder_share_tokens_exchange_count_check
    check (
      exchange_count >= 0
    ),

  constraint medical_folder_share_tokens_exchange_time_check
    check (
      (
        exchange_count = 0
        and last_exchanged_at is null
      )
      or (
        exchange_count > 0
        and last_exchanged_at is not null
        and last_exchanged_at >= issued_at
      )
    ),

  constraint medical_folder_share_tokens_invalidation_check
    check (
      (
        invalidated_at is null
        and invalidation_reason is null
      )
      or (
        invalidated_at is not null
        and invalidation_reason is not null
        and invalidated_at >= issued_at
      )
    ),

  constraint medical_folder_share_tokens_updated_check
    check (
      updated_at >= issued_at
    )
);

comment on table public.medical_folder_share_tokens is
  'Hashed recipient share tokens. The raw rdsh_ token is returned only once and is never stored.';

comment on column public.medical_folder_share_tokens.token_hint is
  'Non-secret display hint containing only the rdsh_ prefix and the first eight random hexadecimal characters.';

create unique index if not exists
  idx_medical_folder_share_tokens_one_active_per_grant
on public.medical_folder_share_tokens (
  share_grant_id
)
where invalidated_at is null;

create index if not exists
  idx_medical_folder_share_tokens_grant_issued
on public.medical_folder_share_tokens (
  share_grant_id,
  issued_at desc
);

create index if not exists
  idx_medical_folder_share_tokens_active_hash
on public.medical_folder_share_tokens (
  token_hash
)
where invalidated_at is null;


-- =====================================================
-- 2. RECIPIENT SESSIONS
-- =====================================================

create table if not exists public.medical_folder_recipient_sessions (
  id uuid primary key default gen_random_uuid(),

  share_grant_id uuid not null
    references public.medical_folder_share_grants(id)
    on update cascade
    on delete cascade,

  share_token_id uuid not null
    references public.medical_folder_share_tokens(id)
    on update cascade
    on delete cascade,

  session_hash text not null
    constraint medical_folder_recipient_sessions_hash_check
    check (
      session_hash ~ '^[a-f0-9]{64}$'
    ),

  session_hint text not null
    constraint medical_folder_recipient_sessions_hint_check
    check (
      session_hint ~ '^rdsess_[a-f0-9]{8}$'
    ),

  recipient_type text not null
    constraint medical_folder_recipient_sessions_type_check
    check (
      recipient_type in (
        'anonymous',
        'doctor',
        'external_provider'
      )
    ),

  actor_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  actor_doctor_id uuid
    references public.doctors(id)
    on update cascade
    on delete set null,

  access_channel text not null
    constraint medical_folder_recipient_sessions_channel_check
    check (
      access_channel in (
        'secure_link',
        'qr',
        'email',
        'nfc',
        'doctor_mobile'
      )
    ),

  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),

  closed_at timestamptz,
  close_reason text
    constraint medical_folder_recipient_sessions_close_reason_check
    check (
      close_reason is null
      or close_reason in (
        'expired',
        'grant_revoked',
        'manual'
      )
    ),

  updated_at timestamptz not null default now(),

  constraint medical_folder_recipient_sessions_hash_unique
    unique (session_hash),

  constraint medical_folder_recipient_sessions_expiry_check
    check (
      expires_at > started_at
      and expires_at <=
        started_at + interval '15 minutes'
    ),

  constraint medical_folder_recipient_sessions_seen_check
    check (
      last_seen_at >= started_at
    ),

  constraint medical_folder_recipient_sessions_identity_check
    check (
      (
        recipient_type = 'anonymous'
        and actor_profile_id is null
        and actor_doctor_id is null
      )
      or (
        recipient_type = 'doctor'
        and actor_profile_id is not null
        and actor_doctor_id is not null
      )
      or (
        recipient_type = 'external_provider'
        and actor_doctor_id is null
      )
    ),

  constraint medical_folder_recipient_sessions_close_check
    check (
      (
        closed_at is null
        and close_reason is null
      )
      or (
        closed_at is not null
        and close_reason is not null
        and closed_at >= started_at
      )
    ),

  constraint medical_folder_recipient_sessions_updated_check
    check (
      updated_at >= started_at
    )
);

comment on table public.medical_folder_recipient_sessions is
  'Hashed short-lived recipient sessions created only after a valid share-token exchange.';

create index if not exists
  idx_medical_folder_recipient_sessions_grant_started
on public.medical_folder_recipient_sessions (
  share_grant_id,
  started_at desc
);

create index if not exists
  idx_medical_folder_recipient_sessions_token_started
on public.medical_folder_recipient_sessions (
  share_token_id,
  started_at desc
);

create index if not exists
  idx_medical_folder_recipient_sessions_active_hash
on public.medical_folder_recipient_sessions (
  session_hash
)
where closed_at is null;

create index if not exists
  idx_medical_folder_recipient_sessions_expiration
on public.medical_folder_recipient_sessions (
  expires_at
)
where closed_at is null;


-- =====================================================
-- 3. EXPAND IMMUTABLE SHARE EVENT TYPES
-- =====================================================

alter table public.medical_folder_share_events
  drop constraint if exists
    medical_folder_share_events_type_check;

alter table public.medical_folder_share_events
  add constraint
    medical_folder_share_events_type_check
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
      'revoked',
      'expired',
      'consumed',
      'access_denied',
      'pin_failed'
    )
  );


-- =====================================================
-- 4. TOKEN AND SESSION IMMUTABILITY
-- =====================================================

create or replace function
  public.prepare_medical_folder_share_token_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
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
      'medical_folder_share_tokens_are_not_deleted'
      using errcode = '55000';
  end if;

  if new.id <> old.id
    or new.share_grant_id <> old.share_grant_id
    or new.token_hash <> old.token_hash
    or new.token_hint <> old.token_hint
    or new.issued_by_profile_id is distinct from
      old.issued_by_profile_id
    or new.issued_at <> old.issued_at
  then
    raise exception
      'medical_folder_share_token_identity_is_immutable'
      using errcode = '55000';
  end if;

  if new.exchange_count < old.exchange_count then
    raise exception
      'medical_folder_share_token_exchange_count_cannot_decrease'
      using errcode = '55000';
  end if;

  if old.last_exchanged_at is not null
    and (
      new.last_exchanged_at is null
      or new.last_exchanged_at < old.last_exchanged_at
    )
  then
    raise exception
      'medical_folder_share_token_exchange_time_cannot_move_backwards'
      using errcode = '55000';
  end if;

  if old.invalidated_at is not null
    and (
      new.invalidated_at is distinct from old.invalidated_at
      or new.invalidation_reason is distinct from
        old.invalidation_reason
    )
  then
    raise exception
      'medical_folder_share_token_invalidation_is_immutable'
      using errcode = '55000';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists
  prepare_medical_folder_share_token_change_trigger
on public.medical_folder_share_tokens;

create trigger
  prepare_medical_folder_share_token_change_trigger
before update or delete
on public.medical_folder_share_tokens
for each row
execute function
  public.prepare_medical_folder_share_token_change();


create or replace function
  public.prepare_medical_folder_recipient_session_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
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
      'medical_folder_recipient_sessions_are_not_deleted'
      using errcode = '55000';
  end if;

  if new.id <> old.id
    or new.share_grant_id <> old.share_grant_id
    or new.share_token_id <> old.share_token_id
    or new.session_hash <> old.session_hash
    or new.session_hint <> old.session_hint
    or new.recipient_type <> old.recipient_type
    or new.actor_profile_id is distinct from
      old.actor_profile_id
    or new.actor_doctor_id is distinct from
      old.actor_doctor_id
    or new.access_channel <> old.access_channel
    or new.started_at <> old.started_at
    or new.expires_at <> old.expires_at
  then
    raise exception
      'medical_folder_recipient_session_identity_is_immutable'
      using errcode = '55000';
  end if;

  if new.last_seen_at < old.last_seen_at then
    raise exception
      'medical_folder_recipient_session_seen_time_cannot_move_backwards'
      using errcode = '55000';
  end if;

  if old.closed_at is not null
    and (
      new.closed_at is distinct from old.closed_at
      or new.close_reason is distinct from old.close_reason
    )
  then
    raise exception
      'medical_folder_recipient_session_close_is_immutable'
      using errcode = '55000';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists
  prepare_medical_folder_recipient_session_change_trigger
on public.medical_folder_recipient_sessions;

create trigger
  prepare_medical_folder_recipient_session_change_trigger
before update or delete
on public.medical_folder_recipient_sessions
for each row
execute function
  public.prepare_medical_folder_recipient_session_change();


-- =====================================================
-- 5. SYNCHRONISE REVOCATION AND RECORDED EXPIRATION
-- =====================================================

create or replace function
  public.synchronise_medical_folder_share_secret_state()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  closure_time timestamptz;
  closure_reason text;
begin
  if old.revoked_at is null
    and new.revoked_at is not null
  then
    closure_time := new.revoked_at;
    closure_reason := 'grant_revoked';
  elsif old.expiration_recorded_at is null
    and new.expiration_recorded_at is not null
  then
    closure_time := new.expiration_recorded_at;
    closure_reason := 'expired';
  else
    return new;
  end if;

  update public.medical_folder_share_tokens
  set
    invalidated_at = closure_time,
    invalidation_reason =
      case
        when closure_reason = 'grant_revoked'
          then 'grant_revoked'
        else 'grant_expired'
      end
  where share_grant_id = new.id
    and invalidated_at is null;

  with closed_sessions as (
    update public.medical_folder_recipient_sessions
    set
      closed_at = closure_time,
      close_reason = closure_reason
    where share_grant_id = new.id
      and closed_at is null
    returning id
  )
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
  select
    new.id,
    new.patient_profile_id,
    'recipient_session_closed',
    null,
    null,
    'system',
    'system',
    jsonb_build_object(
      'session_id',
      closed_session.id,
      'reason',
      closure_reason
    )
  from closed_sessions as closed_session;

  return new;
end;
$function$;

drop trigger if exists
  synchronise_medical_folder_share_secret_state_trigger
on public.medical_folder_share_grants;

create trigger
  synchronise_medical_folder_share_secret_state_trigger
after update of revoked_at, expiration_recorded_at
on public.medical_folder_share_grants
for each row
execute function
  public.synchronise_medical_folder_share_secret_state();


-- =====================================================
-- 6. PATIENT-ONLY TOKEN ISSUANCE AND ROTATION
-- =====================================================

create or replace function
  public.issue_own_medical_folder_share_token(
    target_share_grant_id uuid
  )
returns table (
  share_token text,
  token_hint text,
  issued_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  patient_id uuid;
  grant_row public.medical_folder_share_grants%rowtype;
  previous_token public.medical_folder_share_tokens%rowtype;
  raw_token text;
  raw_token_hash text;
  raw_token_hint text;
  issued_at_value timestamptz;
  attempt_count integer := 0;
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

  select *
  into grant_row
  from public.medical_folder_share_grants
  where id = target_share_grant_id
    and patient_profile_id = patient_id
  for update;

  if not found then
    raise exception 'medical_folder_share_grant_not_found'
      using errcode = 'P0002';
  end if;

  if grant_row.revoked_at is not null then
    raise exception 'medical_folder_share_grant_revoked'
      using errcode = '55000';
  end if;

  if grant_row.expires_at <= now() then
    raise exception 'medical_folder_share_grant_expired'
      using errcode = '55000';
  end if;

  if grant_row.consumed_at is not null then
    raise exception 'medical_folder_share_grant_consumed'
      using errcode = '55000';
  end if;

  select *
  into previous_token
  from public.medical_folder_share_tokens
  where share_grant_id = grant_row.id
    and invalidated_at is null
  for update;

  if found then
    update public.medical_folder_share_tokens
    set
      invalidated_at = now(),
      invalidation_reason = 'rotated'
    where id = previous_token.id;

    insert into public.medical_folder_share_events (
      share_grant_id,
      patient_profile_id,
      event_type,
      actor_profile_id,
      actor_role,
      access_channel,
      metadata
    )
    values (
      grant_row.id,
      patient_id,
      'token_rotated',
      patient_id,
      'patient',
      'patient_dashboard',
      jsonb_build_object(
        'previous_token_hint',
        previous_token.token_hint
      )
    );
  end if;

  loop
    attempt_count := attempt_count + 1;

    raw_token :=
      'rdsh_' ||
      encode(
        gen_random_bytes(32),
        'hex'
      );

    raw_token_hash :=
      encode(
        digest(
          convert_to(
            raw_token,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      );

    raw_token_hint :=
      left(raw_token, 13);

    issued_at_value := now();

    begin
      insert into public.medical_folder_share_tokens (
        share_grant_id,
        token_hash,
        token_hint,
        issued_by_profile_id,
        issued_at,
        updated_at
      )
      values (
        grant_row.id,
        raw_token_hash,
        raw_token_hint,
        patient_id,
        issued_at_value,
        issued_at_value
      );

      exit;
    exception
      when unique_violation then
        if attempt_count >= 3 then
          raise exception 'medical_folder_share_token_generation_failed'
            using errcode = '55000';
        end if;
    end;
  end loop;

  insert into public.medical_folder_share_events (
    share_grant_id,
    patient_profile_id,
    event_type,
    actor_profile_id,
    actor_role,
    access_channel,
    metadata
  )
  values (
    grant_row.id,
    patient_id,
    'token_issued',
    patient_id,
    'patient',
    'patient_dashboard',
    jsonb_build_object(
      'token_hint',
      raw_token_hint,
      'rotated_existing_token',
      previous_token.id is not null
    )
  );

  share_token := raw_token;
  token_hint := raw_token_hint;
  issued_at := issued_at_value;

  return next;
end;
$function$;


-- =====================================================
-- 7. SERVICE-ONLY SHARE-TOKEN EXCHANGE
-- =====================================================

create or replace function
  public.begin_medical_folder_recipient_session(
    target_share_token text,
    target_channel text,
    target_actor_profile_id uuid default null,
    target_actor_doctor_id uuid default null
  )
returns table (
  recipient_session_token text,
  session_expires_at timestamptz,
  share_grant_id uuid,
  share_scope text,
  access_mode text,
  allow_document_downloads boolean,
  recipient_type text
)
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  token_row public.medical_folder_share_tokens%rowtype;
  grant_row public.medical_folder_share_grants%rowtype;
  resolved_recipient_type text;
  raw_session_token text;
  raw_session_hash text;
  raw_session_hint text;
  started_at_value timestamptz;
  session_expires_at_value timestamptz;
  session_id_value uuid;
  attempt_count integer := 0;
  channel_event_type text;
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
    'nfc',
    'doctor_mobile'
  ) then
    raise exception 'invalid_medical_folder_recipient_channel'
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

  select *
  into grant_row
  from public.medical_folder_share_grants
  where id = token_row.share_grant_id
  for update;

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

  if (
    target_actor_profile_id is null
    and target_actor_doctor_id is not null
  )
    or (
      target_actor_profile_id is not null
      and target_actor_doctor_id is null
    )
  then
    raise exception 'incomplete_medical_folder_recipient_identity'
      using errcode = '22023';
  end if;

  if target_actor_doctor_id is not null then
    if not exists (
      select 1
      from public.doctors as doctor
      join public.profiles as profile
        on profile.id = doctor.profile_id
      where doctor.id = target_actor_doctor_id
        and doctor.profile_id = target_actor_profile_id
        and doctor.status = 'active'
        and profile.role = 'doctor'
        and profile.account_status = 'active'
    ) then
      raise exception 'invalid_medical_folder_recipient_doctor'
        using errcode = '42501';
    end if;

    resolved_recipient_type := 'doctor';

    -- Emergency Summary QR access stays frictionless.
    -- A verified Doctor may be recorded as the actor, but the
    -- grant is not permanently bound and anonymous access remains valid.
    if grant_row.share_scope <> 'emergency_summary' then
      if grant_row.bound_doctor_id is null then
        update public.medical_folder_share_grants
        set
          bound_doctor_id = target_actor_doctor_id,
          bound_at = now()
        where id = grant_row.id;

        grant_row.bound_doctor_id := target_actor_doctor_id;
        grant_row.bound_at := now();

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
          'bound_to_doctor',
          target_actor_profile_id,
          target_actor_doctor_id,
          'doctor',
          target_channel,
          jsonb_build_object(
            'doctor_id',
            target_actor_doctor_id
          )
        );
      elsif grant_row.bound_doctor_id <>
        target_actor_doctor_id
      then
        raise exception 'medical_folder_share_bound_to_another_doctor'
          using errcode = '42501';
      end if;
    end if;
  else
    resolved_recipient_type := 'anonymous';

    if grant_row.share_scope <> 'emergency_summary'
      and grant_row.bound_doctor_id is not null
    then
      raise exception 'medical_folder_share_requires_bound_doctor'
        using errcode = '42501';
    end if;
  end if;

  started_at_value := now();

  session_expires_at_value :=
    least(
      grant_row.expires_at,
      started_at_value +
        interval '15 minutes'
    );

  if session_expires_at_value <= started_at_value then
    raise exception 'medical_folder_share_grant_expired'
      using errcode = '42501';
  end if;

  loop
    attempt_count := attempt_count + 1;

    raw_session_token :=
      'rdsess_' ||
      encode(
        gen_random_bytes(32),
        'hex'
      );

    raw_session_hash :=
      encode(
        digest(
          convert_to(
            raw_session_token,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      );

    raw_session_hint :=
      left(raw_session_token, 15);

    begin
      insert into public.medical_folder_recipient_sessions (
        share_grant_id,
        share_token_id,
        session_hash,
        session_hint,
        recipient_type,
        actor_profile_id,
        actor_doctor_id,
        access_channel,
        started_at,
        expires_at,
        last_seen_at,
        updated_at
      )
      values (
        grant_row.id,
        token_row.id,
        raw_session_hash,
        raw_session_hint,
        resolved_recipient_type,
        target_actor_profile_id,
        target_actor_doctor_id,
        target_channel,
        started_at_value,
        session_expires_at_value,
        started_at_value,
        started_at_value
      )
      returning id into session_id_value;

      exit;
    exception
      when unique_violation then
        if attempt_count >= 3 then
          raise exception 'medical_folder_recipient_session_generation_failed'
            using errcode = '55000';
        end if;
    end;
  end loop;

  update public.medical_folder_share_tokens
  set
    exchange_count = exchange_count + 1,
    last_exchanged_at = started_at_value
  where id = token_row.id;

  update public.medical_folder_share_grants
  set
    access_count = access_count + 1,
    last_accessed_at = started_at_value,
    consumed_at =
      case
        when access_mode = 'one_time'
          then started_at_value
        else consumed_at
      end
  where id = grant_row.id;

  if grant_row.access_mode = 'one_time' then
    update public.medical_folder_share_tokens
    set
      invalidated_at = started_at_value,
      invalidation_reason = 'grant_consumed'
    where id = token_row.id;

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
      target_actor_profile_id,
      target_actor_doctor_id,
      case
        when resolved_recipient_type = 'doctor'
          then 'doctor'
        else 'anonymous'
      end,
      target_channel,
      jsonb_build_object(
        'session_id',
        session_id_value
      )
    );
  end if;

  channel_event_type :=
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
    channel_event_type,
    target_actor_profile_id,
    target_actor_doctor_id,
    case
      when resolved_recipient_type = 'doctor'
        then 'doctor'
      else 'anonymous'
    end,
    target_channel,
    jsonb_build_object(
      'session_id',
      session_id_value,
      'token_hint',
      token_row.token_hint
    )
  );

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
    'recipient_session_started',
    target_actor_profile_id,
    target_actor_doctor_id,
    case
      when resolved_recipient_type = 'doctor'
        then 'doctor'
      else 'anonymous'
    end,
    target_channel,
    jsonb_build_object(
      'session_id',
      session_id_value,
      'session_expires_at',
      session_expires_at_value
    )
  );

  recipient_session_token := raw_session_token;
  session_expires_at := session_expires_at_value;
  share_grant_id := grant_row.id;
  share_scope := grant_row.share_scope;
  access_mode := grant_row.access_mode;
  allow_document_downloads :=
    grant_row.allow_document_downloads;
  recipient_type := resolved_recipient_type;

  return next;
end;
$function$;


-- =====================================================
-- 8. SERVICE-ONLY SESSION VALIDATION
-- =====================================================

create or replace function
  public.resolve_medical_folder_recipient_session(
    target_recipient_session_token text
  )
returns table (
  recipient_session_id uuid,
  share_grant_id uuid,
  patient_profile_id uuid,
  share_scope text,
  access_mode text,
  allow_document_downloads boolean,
  recipient_type text,
  actor_profile_id uuid,
  actor_doctor_id uuid,
  access_channel text,
  session_expires_at timestamptz,
  selected_document_ids uuid[]
)
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  session_row public.medical_folder_recipient_sessions%rowtype;
  grant_row public.medical_folder_share_grants%rowtype;
  session_hash_value text;
  selected_ids uuid[];
begin
  if target_recipient_session_token is null
    or target_recipient_session_token !~
      '^rdsess_[a-f0-9]{64}$'
  then
    raise exception 'invalid_medical_folder_recipient_session'
      using errcode = '22023';
  end if;

  session_hash_value :=
    encode(
      digest(
        convert_to(
          target_recipient_session_token,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

  select session.*
  into session_row
  from public.medical_folder_recipient_sessions as session
  where session.session_hash = session_hash_value
  for update;

  if not found
    or session_row.closed_at is not null
  then
    raise exception 'invalid_medical_folder_recipient_session'
      using errcode = '42501';
  end if;

  select *
  into grant_row
  from public.medical_folder_share_grants
  where id = session_row.share_grant_id;

  if grant_row.revoked_at is not null then
    raise exception 'medical_folder_share_grant_revoked'
      using errcode = '42501';
  end if;

  if grant_row.expires_at <= now()
    or session_row.expires_at <= now()
  then
    raise exception 'medical_folder_recipient_session_expired'
      using errcode = '42501';
  end if;

  if grant_row.share_scope <> 'emergency_summary'
    and grant_row.bound_doctor_id is not null
    and session_row.actor_doctor_id is distinct from
      grant_row.bound_doctor_id
  then
    raise exception 'medical_folder_share_requires_bound_doctor'
      using errcode = '42501';
  end if;

  update public.medical_folder_recipient_sessions
  set last_seen_at = now()
  where id = session_row.id;

  if grant_row.share_scope = 'selected_documents' then
    select coalesce(
      array_agg(
        selected_document.document_id
        order by selected_document.created_at asc
      ),
      array[]::uuid[]
    )
    into selected_ids
    from public.medical_folder_share_grant_documents
      as selected_document
    join public.patient_medical_documents as document
      on document.id = selected_document.document_id
    where selected_document.share_grant_id = grant_row.id
      and document.patient_profile_id =
        grant_row.patient_profile_id
      and document.deleted_at is null;
  else
    selected_ids := array[]::uuid[];
  end if;

  recipient_session_id := session_row.id;
  share_grant_id := grant_row.id;
  patient_profile_id := grant_row.patient_profile_id;
  share_scope := grant_row.share_scope;
  access_mode := grant_row.access_mode;
  allow_document_downloads :=
    grant_row.allow_document_downloads;
  recipient_type := session_row.recipient_type;
  actor_profile_id := session_row.actor_profile_id;
  actor_doctor_id := session_row.actor_doctor_id;
  access_channel := session_row.access_channel;
  session_expires_at := session_row.expires_at;
  selected_document_ids := selected_ids;

  return next;
end;
$function$;


-- =====================================================
-- 9. SERVICE-ONLY VIEW AND DOWNLOAD EVENT RECORDING
-- =====================================================

create or replace function
  public.record_medical_folder_recipient_access(
    target_recipient_session_token text,
    target_event_type text,
    target_document_id uuid default null
  )
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  session_row public.medical_folder_recipient_sessions%rowtype;
  grant_row public.medical_folder_share_grants%rowtype;
  session_hash_value text;
  event_actor_role text;
begin
  if target_event_type not in (
    'folder_viewed',
    'document_viewed',
    'document_downloaded'
  ) then
    raise exception 'invalid_medical_folder_recipient_event'
      using errcode = '22023';
  end if;

  if target_recipient_session_token is null
    or target_recipient_session_token !~
      '^rdsess_[a-f0-9]{64}$'
  then
    raise exception 'invalid_medical_folder_recipient_session'
      using errcode = '22023';
  end if;

  session_hash_value :=
    encode(
      digest(
        convert_to(
          target_recipient_session_token,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

  select session.*
  into session_row
  from public.medical_folder_recipient_sessions as session
  where session.session_hash = session_hash_value
  for update;

  if not found
    or session_row.closed_at is not null
  then
    raise exception 'invalid_medical_folder_recipient_session'
      using errcode = '42501';
  end if;

  select *
  into grant_row
  from public.medical_folder_share_grants
  where id = session_row.share_grant_id;

  if grant_row.revoked_at is not null then
    raise exception 'medical_folder_share_grant_revoked'
      using errcode = '42501';
  end if;

  if grant_row.expires_at <= now()
    or session_row.expires_at <= now()
  then
    raise exception 'medical_folder_recipient_session_expired'
      using errcode = '42501';
  end if;

  if grant_row.share_scope <> 'emergency_summary'
    and grant_row.bound_doctor_id is not null
    and session_row.actor_doctor_id is distinct from
      grant_row.bound_doctor_id
  then
    raise exception 'medical_folder_share_requires_bound_doctor'
      using errcode = '42501';
  end if;

  if target_event_type = 'folder_viewed' then
    if target_document_id is not null then
      raise exception 'folder_view_event_cannot_reference_document'
        using errcode = '22023';
    end if;
  else
    if target_document_id is null then
      raise exception 'document_event_requires_document'
        using errcode = '22023';
    end if;

    if grant_row.share_scope not in (
      'complete_folder',
      'selected_documents'
    ) then
      raise exception 'medical_folder_share_scope_excludes_documents'
        using errcode = '42501';
    end if;

    if grant_row.share_scope = 'selected_documents'
      and not exists (
        select 1
        from public.medical_folder_share_grant_documents
          as selected_document
        where selected_document.share_grant_id =
          grant_row.id
          and selected_document.document_id =
            target_document_id
      )
    then
      raise exception 'medical_folder_document_not_shared'
        using errcode = '42501';
    end if;

    if not exists (
      select 1
      from public.patient_medical_documents as document
      where document.id = target_document_id
        and document.patient_profile_id =
          grant_row.patient_profile_id
        and document.deleted_at is null
    ) then
      raise exception 'medical_folder_document_not_available'
        using errcode = '42501';
    end if;

    if target_event_type = 'document_downloaded'
      and not grant_row.allow_document_downloads
    then
      raise exception 'medical_folder_document_download_not_allowed'
        using errcode = '42501';
    end if;
  end if;

  update public.medical_folder_recipient_sessions
  set last_seen_at = now()
  where id = session_row.id;

  event_actor_role :=
    case session_row.recipient_type
      when 'doctor' then 'doctor'
      when 'external_provider' then 'external_provider'
      else 'anonymous'
    end;

  insert into public.medical_folder_share_events (
    share_grant_id,
    patient_profile_id,
    document_id,
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
    target_document_id,
    target_event_type,
    session_row.actor_profile_id,
    session_row.actor_doctor_id,
    event_actor_role,
    session_row.access_channel,
    jsonb_build_object(
      'session_id',
      session_row.id
    )
  );

  return true;
end;
$function$;


-- =====================================================
-- 10. ROW LEVEL SECURITY
-- =====================================================

alter table public.medical_folder_share_tokens
  enable row level security;

alter table public.medical_folder_recipient_sessions
  enable row level security;

drop policy if exists
  "Patients can read own Medical Folder share token metadata"
on public.medical_folder_share_tokens;

create policy
  "Patients can read own Medical Folder share token metadata"
on public.medical_folder_share_tokens
for select
to authenticated
using (
  exists (
    select 1
    from public.medical_folder_share_grants as share
    where share.id = share_grant_id
      and share.patient_profile_id = auth.uid()
      and public.is_active_patient_profile(auth.uid())
  )
);

drop policy if exists
  "Patients can read own Medical Folder recipient sessions"
on public.medical_folder_recipient_sessions;

create policy
  "Patients can read own Medical Folder recipient sessions"
on public.medical_folder_recipient_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.medical_folder_share_grants as share
    where share.id = share_grant_id
      and share.patient_profile_id = auth.uid()
      and public.is_active_patient_profile(auth.uid())
  )
);

revoke all
on table public.medical_folder_share_tokens
from public, anon, authenticated, service_role;

revoke all
on table public.medical_folder_recipient_sessions
from public, anon, authenticated, service_role;

grant select (
  id,
  share_grant_id,
  token_hint,
  issued_by_profile_id,
  issued_at,
  exchange_count,
  last_exchanged_at,
  invalidated_at,
  invalidation_reason,
  updated_at
)
on public.medical_folder_share_tokens
to authenticated;

grant select (
  id,
  share_grant_id,
  share_token_id,
  session_hint,
  recipient_type,
  actor_profile_id,
  actor_doctor_id,
  access_channel,
  started_at,
  expires_at,
  last_seen_at,
  closed_at,
  close_reason,
  updated_at
)
on public.medical_folder_recipient_sessions
to authenticated;

grant select, insert, update
on table public.medical_folder_share_tokens
to service_role;

grant select, insert, update
on table public.medical_folder_recipient_sessions
to service_role;


-- =====================================================
-- 11. FUNCTION PERMISSIONS
-- =====================================================

revoke all
on function public.prepare_medical_folder_share_token_change()
from public, anon, authenticated, service_role;

revoke all
on function public.prepare_medical_folder_recipient_session_change()
from public, anon, authenticated, service_role;

revoke all
on function public.synchronise_medical_folder_share_secret_state()
from public, anon, authenticated, service_role;

revoke all
on function public.issue_own_medical_folder_share_token(uuid)
from public, anon, authenticated, service_role;

revoke all
on function public.begin_medical_folder_recipient_session(
  text,
  text,
  uuid,
  uuid
)
from public, anon, authenticated, service_role;

revoke all
on function public.resolve_medical_folder_recipient_session(text)
from public, anon, authenticated, service_role;

revoke all
on function public.record_medical_folder_recipient_access(
  text,
  text,
  uuid
)
from public, anon, authenticated, service_role;

grant execute
on function public.issue_own_medical_folder_share_token(uuid)
to authenticated;

grant execute
on function public.begin_medical_folder_recipient_session(
  text,
  text,
  uuid,
  uuid
)
to service_role;

grant execute
on function public.resolve_medical_folder_recipient_session(text)
to service_role;

grant execute
on function public.record_medical_folder_recipient_access(
  text,
  text,
  uuid
)
to service_role;


commit;


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'medical_folder_share_tokens',
    'medical_folder_recipient_sessions'
  )
order by table_name;

select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'issue_own_medical_folder_share_token',
    'begin_medical_folder_recipient_session',
    'resolve_medical_folder_recipient_session',
    'record_medical_folder_recipient_access'
  )
order by routine_name;

select
  policyname,
  tablename,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'medical_folder_share_tokens',
    'medical_folder_recipient_sessions'
  )
order by tablename, policyname;

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'medical_folder_share_tokens',
    'medical_folder_recipient_sessions'
  )
order by table_name, grantee, privilege_type;
