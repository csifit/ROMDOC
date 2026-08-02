-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 88B.1 — Secure Medical Folder share-grant foundation
--
-- Target path:
-- ROMDOC/database/100-medical-folder-share-grants.sql
--
-- Requires:
--   - 39-patient-medical-folder-foundation.sql
--   - 40-doctor-medical-folder-workflow.sql
--   - 98-manual-permanent-user-erasure.sql
--   - 99-expanded-patient-medical-profile.sql
--
-- Adds:
--   - temporary, patient-controlled Medical Folder share grants
--   - selected-document membership for limited shares
--   - immutable share-event history
--   - patient-only create and revoke functions
--   - service-only natural-expiration recording
--
-- Does NOT add:
--   - public share tokens
--   - QR codes
--   - email delivery
--   - PIN verification
--   - doctor linked devices
--
-- Core security rule:
--   A share grants view-only access.
--   It never grants edit, upload, delete or signing permission.
-- =====================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- =====================================================
-- 1. SHARE GRANTS
-- =====================================================

create table if not exists public.medical_folder_share_grants (
  id uuid primary key default gen_random_uuid(),

  patient_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete cascade,

  share_scope text not null
    constraint medical_folder_share_grants_scope_check
    check (
      share_scope in (
        'emergency_summary',
        'medical_profile',
        'complete_folder',
        'selected_documents'
      )
    ),

  access_mode text not null default 'one_time'
    constraint medical_folder_share_grants_access_mode_check
    check (
      access_mode in (
        'one_time',
        'multiple'
      )
    ),

  allow_document_downloads boolean not null default false,

  expires_at timestamptz not null,

  bound_doctor_id uuid
    references public.doctors(id)
    on update cascade
    on delete set null,

  bound_at timestamptz,

  access_count integer not null default 0,
  last_accessed_at timestamptz,
  consumed_at timestamptz,

  revoked_at timestamptz,
  revoked_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  expiration_recorded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medical_folder_share_grants_expiry_check
    check (
      expires_at - created_at in (
        interval '10 minutes',
        interval '1 hour',
        interval '24 hours',
        interval '7 days'
      )
    ),

  constraint medical_folder_share_grants_download_scope_check
    check (
      allow_document_downloads = false
      or share_scope in (
        'complete_folder',
        'selected_documents'
      )
    ),

  constraint medical_folder_share_grants_binding_check
    check (
      (
        bound_doctor_id is null
        and bound_at is null
      )
      or (
        bound_doctor_id is not null
        and bound_at is not null
      )
    ),

  constraint medical_folder_share_grants_access_count_check
    check (
      access_count >= 0
      and (
        access_mode = 'multiple'
        or access_count <= 1
      )
    ),

  constraint medical_folder_share_grants_last_access_check
    check (
      (
        access_count = 0
        and last_accessed_at is null
      )
      or (
        access_count > 0
        and last_accessed_at is not null
        and last_accessed_at >= created_at
      )
    ),

  constraint medical_folder_share_grants_consumed_check
    check (
      (
        access_mode = 'multiple'
        and consumed_at is null
      )
      or (
        access_mode = 'one_time'
        and (
          (
            access_count = 0
            and consumed_at is null
          )
          or (
            access_count = 1
            and consumed_at is not null
            and consumed_at >= created_at
          )
        )
      )
    ),

  constraint medical_folder_share_grants_revocation_check
    check (
      revoked_at is not null
      or revoked_by_profile_id is null
    ),

  constraint medical_folder_share_grants_expiration_record_check
    check (
      expiration_recorded_at is null
      or expiration_recorded_at >= expires_at
    ),

  constraint medical_folder_share_grants_updated_check
    check (
      updated_at >= created_at
    )
);

comment on table public.medical_folder_share_grants is
  'Temporary patient-controlled, view-only Medical Folder access grants. Secure tokens are added separately in Step 88C.';

comment on column public.medical_folder_share_grants.share_scope is
  'Emergency summary, complete medical profile, complete folder, or selected documents.';

comment on column public.medical_folder_share_grants.bound_doctor_id is
  'Optional RomDoc doctor permanently bound to the grant after secure verification. Binding never creates editing permission.';

comment on column public.medical_folder_share_grants.expiration_recorded_at is
  'Timestamp when the natural expiration was written to immutable audit history. Access is denied by expires_at even before this marker is populated.';

create index if not exists
  idx_medical_folder_share_grants_patient_created
on public.medical_folder_share_grants (
  patient_profile_id,
  created_at desc
);

create index if not exists
  idx_medical_folder_share_grants_patient_active
on public.medical_folder_share_grants (
  patient_profile_id,
  expires_at
)
where revoked_at is null
  and consumed_at is null;

create index if not exists
  idx_medical_folder_share_grants_bound_doctor
on public.medical_folder_share_grants (
  bound_doctor_id,
  expires_at
)
where bound_doctor_id is not null
  and revoked_at is null
  and consumed_at is null;

create index if not exists
  idx_medical_folder_share_grants_expiration_queue
on public.medical_folder_share_grants (
  expires_at
)
where revoked_at is null
  and consumed_at is null
  and expiration_recorded_at is null;


-- =====================================================
-- 2. SELECTED-DOCUMENT MEMBERSHIP
-- =====================================================

create table if not exists
  public.medical_folder_share_grant_documents (
    share_grant_id uuid not null
      references public.medical_folder_share_grants(id)
      on update cascade
      on delete cascade,

    document_id uuid not null
      references public.patient_medical_documents(id)
      on update cascade
      on delete cascade,

    created_at timestamptz not null default now(),

    primary key (
      share_grant_id,
      document_id
    )
  );

comment on table public.medical_folder_share_grant_documents is
  'Documents included when a Medical Folder share grant uses selected_documents scope.';

create index if not exists
  idx_medical_folder_share_grant_documents_document
on public.medical_folder_share_grant_documents (
  document_id,
  share_grant_id
);


-- =====================================================
-- 3. IMMUTABLE SHARE EVENTS
-- =====================================================

create table if not exists public.medical_folder_share_events (
  id uuid primary key default gen_random_uuid(),

  share_grant_id uuid not null
    references public.medical_folder_share_grants(id)
    on update cascade
    on delete cascade,

  patient_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete cascade,

  document_id uuid
    references public.patient_medical_documents(id)
    on update cascade
    on delete set null,

  event_type text not null
    constraint medical_folder_share_events_type_check
    check (
      event_type in (
        'created',
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
    ),

  actor_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  actor_doctor_id uuid
    references public.doctors(id)
    on update cascade
    on delete set null,

  actor_role text not null
    constraint medical_folder_share_events_actor_role_check
    check (
      actor_role in (
        'patient',
        'doctor',
        'staff',
        'system',
        'anonymous',
        'external_provider'
      )
    ),

  access_channel text not null
    constraint medical_folder_share_events_channel_check
    check (
      access_channel in (
        'patient_dashboard',
        'secure_link',
        'qr',
        'email',
        'nfc',
        'doctor_mobile',
        'system'
      )
    ),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint medical_folder_share_events_metadata_check
    check (
      jsonb_typeof(metadata) = 'object'
    )
);

comment on table public.medical_folder_share_events is
  'Append-only history for creation, access, download, binding, revocation, expiration and denied-access events.';

create index if not exists
  idx_medical_folder_share_events_grant_created
on public.medical_folder_share_events (
  share_grant_id,
  created_at desc
);

create index if not exists
  idx_medical_folder_share_events_patient_created
on public.medical_folder_share_events (
  patient_profile_id,
  created_at desc
);

create index if not exists
  idx_medical_folder_share_events_document_created
on public.medical_folder_share_events (
  document_id,
  created_at desc
)
where document_id is not null;


-- =====================================================
-- 4. INTEGRITY AND IMMUTABILITY TRIGGERS
-- =====================================================

create or replace function
  public.prepare_medical_folder_share_grant_change()
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
    or new.allow_document_downloads <>
      old.allow_document_downloads
    or new.expires_at <> old.expires_at
    or new.created_at <> old.created_at
  then
    raise exception
      'medical_folder_share_grant_identity_is_immutable'
      using errcode = '55000';
  end if;

  if old.bound_doctor_id is not null
    and new.bound_doctor_id is distinct from
      old.bound_doctor_id
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
    and new.revoked_by_profile_id is distinct from
      old.revoked_by_profile_id
  then
    raise exception
      'medical_folder_share_grant_revoker_is_immutable'
      using errcode = '55000';
  end if;

  if old.expiration_recorded_at is not null
    and new.expiration_recorded_at is distinct from
      old.expiration_recorded_at
  then
    raise exception
      'medical_folder_share_grant_expiration_marker_is_immutable'
      using errcode = '55000';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists
  prepare_medical_folder_share_grant_change_trigger
on public.medical_folder_share_grants;

create trigger
  prepare_medical_folder_share_grant_change_trigger
before update or delete
on public.medical_folder_share_grants
for each row
execute function
  public.prepare_medical_folder_share_grant_change();


create or replace function
  public.validate_medical_folder_share_grant_document()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  grant_patient_id uuid;
  grant_scope text;
  document_patient_id uuid;
  document_deleted_at timestamptz;
begin
  if public.privacy_erasure_context_active()
    and tg_op = 'DELETE'
  then
    return old;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    raise exception
      'medical_folder_share_grant_documents_are_immutable'
      using errcode = '55000';
  end if;

  select
    share.patient_profile_id,
    share.share_scope
  into
    grant_patient_id,
    grant_scope
  from public.medical_folder_share_grants as share
  where share.id = new.share_grant_id;

  if grant_patient_id is null then
    raise exception
      'medical_folder_share_grant_not_found'
      using errcode = '23503';
  end if;

  if grant_scope <> 'selected_documents' then
    raise exception
      'documents_require_selected_documents_scope'
      using errcode = '23514';
  end if;

  select
    document.patient_profile_id,
    document.deleted_at
  into
    document_patient_id,
    document_deleted_at
  from public.patient_medical_documents as document
  where document.id = new.document_id;

  if document_patient_id is null
    or document_patient_id <> grant_patient_id
    or document_deleted_at is not null
  then
    raise exception
      'selected_document_is_not_available_for_patient'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

drop trigger if exists
  validate_medical_folder_share_grant_document_trigger
on public.medical_folder_share_grant_documents;

create trigger
  validate_medical_folder_share_grant_document_trigger
before insert or update or delete
on public.medical_folder_share_grant_documents
for each row
execute function
  public.validate_medical_folder_share_grant_document();


create or replace function
  public.prepare_medical_folder_share_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  grant_patient_id uuid;
  grant_scope text;
  document_patient_id uuid;
begin
  if public.privacy_erasure_context_active()
    and tg_op = 'DELETE'
  then
    return old;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    raise exception
      'medical_folder_share_events_are_immutable'
      using errcode = '55000';
  end if;

  select
    share.patient_profile_id,
    share.share_scope
  into
    grant_patient_id,
    grant_scope
  from public.medical_folder_share_grants as share
  where share.id = new.share_grant_id;

  if grant_patient_id is null then
    raise exception
      'medical_folder_share_grant_not_found'
      using errcode = '23503';
  end if;

  if new.patient_profile_id <> grant_patient_id then
    raise exception
      'medical_folder_share_event_patient_mismatch'
      using errcode = '23514';
  end if;

  if new.document_id is not null then
    select document.patient_profile_id
    into document_patient_id
    from public.patient_medical_documents as document
    where document.id = new.document_id;

    if document_patient_id is null
      or document_patient_id <> grant_patient_id
    then
      raise exception
        'medical_folder_share_event_document_mismatch'
        using errcode = '23514';
    end if;

    if grant_scope = 'selected_documents'
      and not exists (
        select 1
        from public.medical_folder_share_grant_documents
          as selected_document
        where selected_document.share_grant_id =
          new.share_grant_id
          and selected_document.document_id =
            new.document_id
      )
    then
      raise exception
        'document_is_not_in_selected_share_scope'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists
  prepare_medical_folder_share_event_trigger
on public.medical_folder_share_events;

create trigger
  prepare_medical_folder_share_event_trigger
before insert or update or delete
on public.medical_folder_share_events
for each row
execute function
  public.prepare_medical_folder_share_event();


-- =====================================================
-- 5. PATIENT CREATE AND REVOKE FUNCTIONS
-- =====================================================

create or replace function
  public.create_own_medical_folder_share_grant(
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
declare
  patient_id uuid;
  grant_id uuid;
  expires_at_value timestamptz;
  normalized_document_ids uuid[];
  selected_document_count integer := 0;
  matched_document_count integer := 0;
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

  if target_scope is null
    or target_scope not in (
    'emergency_summary',
    'medical_profile',
    'complete_folder',
    'selected_documents'
  ) then
    raise exception 'invalid_medical_folder_share_scope'
      using errcode = '22023';
  end if;

  if target_duration_seconds is null
    or target_duration_seconds not in (
    600,
    3600,
    86400,
    604800
  ) then
    raise exception 'invalid_medical_folder_share_duration'
      using errcode = '22023';
  end if;

  if target_access_mode is null
    or target_access_mode not in (
    'one_time',
    'multiple'
  ) then
    raise exception 'invalid_medical_folder_share_access_mode'
      using errcode = '22023';
  end if;

  if target_allow_document_downloads is null then
    raise exception 'download_permission_must_be_boolean'
      using errcode = '22023';
  end if;

  if target_allow_document_downloads
    and target_scope not in (
      'complete_folder',
      'selected_documents'
    )
  then
    raise exception 'downloads_are_not_available_for_this_scope'
      using errcode = '22023';
  end if;

  select coalesce(
    array_agg(distinct document_id),
    array[]::uuid[]
  )
  into normalized_document_ids
  from unnest(
    coalesce(target_document_ids, array[]::uuid[])
  ) as supplied(document_id)
  where document_id is not null;

  selected_document_count :=
    coalesce(cardinality(normalized_document_ids), 0);

  if target_scope = 'selected_documents' then
    if selected_document_count = 0 then
      raise exception 'selected_documents_are_required'
        using errcode = '22023';
    end if;

    if selected_document_count > 50 then
      raise exception 'too_many_selected_documents'
        using errcode = '22023';
    end if;

    select count(*)::integer
    into matched_document_count
    from public.patient_medical_documents as document
    where document.id = any(normalized_document_ids)
      and document.patient_profile_id = patient_id
      and document.deleted_at is null;

    if matched_document_count <> selected_document_count then
      raise exception
        'one_or_more_selected_documents_are_unavailable'
        using errcode = '22023';
    end if;
  elsif selected_document_count > 0 then
    raise exception
      'document_selection_requires_selected_documents_scope'
      using errcode = '22023';
  end if;

  expires_at_value :=
    now() +
    make_interval(secs => target_duration_seconds);

  insert into public.medical_folder_share_grants (
    patient_profile_id,
    share_scope,
    access_mode,
    allow_document_downloads,
    expires_at
  )
  values (
    patient_id,
    target_scope,
    target_access_mode,
    target_allow_document_downloads,
    expires_at_value
  )
  returning id into grant_id;

  if target_scope = 'selected_documents' then
    insert into public.medical_folder_share_grant_documents (
      share_grant_id,
      document_id
    )
    select
      grant_id,
      document_id
    from unnest(normalized_document_ids)
      as selected(document_id);
  end if;

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
    grant_id,
    patient_id,
    'created',
    patient_id,
    'patient',
    'patient_dashboard',
    jsonb_build_object(
      'share_scope',
      target_scope,
      'duration_seconds',
      target_duration_seconds,
      'access_mode',
      target_access_mode,
      'allow_document_downloads',
      target_allow_document_downloads,
      'selected_document_count',
      selected_document_count
    )
  );

  return grant_id;
end;
$function$;


create or replace function
  public.revoke_own_medical_folder_share_grant(
    target_share_grant_id uuid
  )
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  patient_id uuid;
  grant_row public.medical_folder_share_grants%rowtype;
  revoked_at_value timestamptz;
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
    return false;
  end if;

  revoked_at_value := now();

  update public.medical_folder_share_grants
  set
    revoked_at = revoked_at_value,
    revoked_by_profile_id = patient_id
  where id = grant_row.id;

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
    'revoked',
    patient_id,
    'patient',
    'patient_dashboard',
    jsonb_build_object(
      'share_scope',
      grant_row.share_scope,
      'access_count',
      grant_row.access_count,
      'was_bound_to_doctor',
      grant_row.bound_doctor_id is not null
    )
  );

  return true;
end;
$function$;


-- =====================================================
-- 6. SERVICE-ONLY NATURAL EXPIRATION RECORDING
-- =====================================================

create or replace function
  public.record_expired_medical_folder_share_grants(
    target_limit integer default 500
  )
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  grant_row record;
  processed_count integer := 0;
  recorded_at_value timestamptz;
begin
  if target_limit < 1 or target_limit > 5000 then
    raise exception 'invalid_expiration_batch_limit'
      using errcode = '22023';
  end if;

  for grant_row in
    select share.*
    from public.medical_folder_share_grants as share
    where share.expires_at <= now()
      and share.revoked_at is null
      and share.consumed_at is null
      and share.expiration_recorded_at is null
    order by share.expires_at asc
    limit target_limit
    for update skip locked
  loop
    recorded_at_value := now();

    update public.medical_folder_share_grants
    set expiration_recorded_at = recorded_at_value
    where id = grant_row.id;

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
      grant_row.patient_profile_id,
      'expired',
      null,
      'system',
      'system',
      jsonb_build_object(
        'share_scope',
        grant_row.share_scope,
        'access_mode',
        grant_row.access_mode,
        'access_count',
        grant_row.access_count,
        'expires_at',
        grant_row.expires_at
      )
    );

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$function$;


-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

alter table public.medical_folder_share_grants
  enable row level security;

alter table public.medical_folder_share_grant_documents
  enable row level security;

alter table public.medical_folder_share_events
  enable row level security;

drop policy if exists
  "Patients can read own Medical Folder share grants"
on public.medical_folder_share_grants;

create policy
  "Patients can read own Medical Folder share grants"
on public.medical_folder_share_grants
for select
to authenticated
using (
  patient_profile_id = auth.uid()
  and public.is_active_patient_profile(auth.uid())
);

drop policy if exists
  "Patients can read own Medical Folder selected documents"
on public.medical_folder_share_grant_documents;

create policy
  "Patients can read own Medical Folder selected documents"
on public.medical_folder_share_grant_documents
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
  "Patients can read own Medical Folder share events"
on public.medical_folder_share_events;

create policy
  "Patients can read own Medical Folder share events"
on public.medical_folder_share_events
for select
to authenticated
using (
  patient_profile_id = auth.uid()
  and public.is_active_patient_profile(auth.uid())
);

-- No doctor, staff, administrator or clinic-manager browse policy is added.
-- Future secure-link routes must validate each grant server-side.

revoke all
on table public.medical_folder_share_grants
from public, anon, authenticated, service_role;

revoke all
on table public.medical_folder_share_grant_documents
from public, anon, authenticated, service_role;

revoke all
on table public.medical_folder_share_events
from public, anon, authenticated, service_role;

grant select
on table public.medical_folder_share_grants
to authenticated;

grant select
on table public.medical_folder_share_grant_documents
to authenticated;

grant select
on table public.medical_folder_share_events
to authenticated;

grant select, update
on table public.medical_folder_share_grants
to service_role;

grant select
on table public.medical_folder_share_grant_documents
to service_role;

grant select, insert
on table public.medical_folder_share_events
to service_role;


-- =====================================================
-- 8. FUNCTION PERMISSIONS
-- =====================================================

revoke all
on function public.prepare_medical_folder_share_grant_change()
from public, anon, authenticated, service_role;

revoke all
on function public.validate_medical_folder_share_grant_document()
from public, anon, authenticated, service_role;

revoke all
on function public.prepare_medical_folder_share_event()
from public, anon, authenticated, service_role;

revoke all
on function public.create_own_medical_folder_share_grant(
  text,
  integer,
  text,
  boolean,
  uuid[]
)
from public, anon, authenticated, service_role;

revoke all
on function public.revoke_own_medical_folder_share_grant(uuid)
from public, anon, authenticated, service_role;

revoke all
on function public.record_expired_medical_folder_share_grants(integer)
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

grant execute
on function public.revoke_own_medical_folder_share_grant(uuid)
to authenticated;

grant execute
on function public.record_expired_medical_folder_share_grants(integer)
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
    'medical_folder_share_grants',
    'medical_folder_share_grant_documents',
    'medical_folder_share_events'
  )
order by table_name;

select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_own_medical_folder_share_grant',
    'revoke_own_medical_folder_share_grant',
    'record_expired_medical_folder_share_grants'
  )
order by routine_name;

select
  policyname,
  tablename,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'medical_folder_share_grants',
    'medical_folder_share_grant_documents',
    'medical_folder_share_events'
  )
order by tablename, policyname;
