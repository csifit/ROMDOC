-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 68B-1: Privacy retention and account closure
--
-- File:
-- ROMDOC/database/48-privacy-retention-and-account-closure.sql
--
-- Purpose:
-- - extend profile account lifecycle states;
-- - record account-closure requests and events;
-- - provide narrowly scoped legal holds;
-- - record retention processor runs;
-- - expose safe self-service closure RPCs;
-- - keep all destructive retention execution disabled
--   until later reviewed migrations.
-- =====================================================

begin;

create extension if not exists pgcrypto;

-- =====================================================
-- 1. PROFILE ACCOUNT LIFECYCLE
-- =====================================================

alter table public.profiles
  add column if not exists account_status text;

update public.profiles
set account_status = 'active'
where account_status is null
   or btrim(account_status) = '';

alter table public.profiles
  alter column account_status
  set default 'active';

alter table public.profiles
  alter column account_status
  set not null;

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (
    account_status in (
      'active',
      'blocked',
      'closure_requested',
      'restricted',
      'anonymized'
    )
  );

alter table public.profiles
  add column if not exists
  closure_requested_at timestamptz;

alter table public.profiles
  add column if not exists
  restricted_at timestamptz;

alter table public.profiles
  add column if not exists
  anonymized_at timestamptz;

alter table public.profiles
  add column if not exists
  privacy_status_updated_at timestamptz;

comment on column public.profiles.account_status is
  'Account lifecycle: active, blocked, closure_requested, restricted, or anonymized.';

comment on column public.profiles.closure_requested_at is
  'Time at which the current account-closure workflow was requested.';

comment on column public.profiles.restricted_at is
  'Time at which ordinary platform access was restricted during closure or legal review.';

comment on column public.profiles.anonymized_at is
  'Time at which ordinary profile identifiers were anonymized.';

create index if not exists
  profiles_account_status_idx
on public.profiles (
  account_status,
  updated_at desc
);

create index if not exists
  profiles_closure_requested_idx
on public.profiles (
  closure_requested_at
)
where account_status = 'closure_requested';

-- =====================================================
-- 2. ACCOUNT-CLOSURE REQUESTS
-- =====================================================

create table if not exists
  public.privacy_account_closure_requests (
    id uuid primary key default gen_random_uuid(),

    profile_id uuid not null
      references public.profiles(id)
      on delete restrict,

    requested_by_profile_id uuid not null
      references public.profiles(id)
      on delete restrict,

    request_source text not null default 'self_service'
      constraint privacy_account_closure_source_check
      check (
        request_source in (
          'self_service',
          'privacy_request',
          'administrator'
        )
      ),

    status text not null default 'pending'
      constraint privacy_account_closure_status_check
      check (
        status in (
          'pending',
          'identity_verification_required',
          'verified',
          'cooling_off',
          'restricted',
          'processing',
          'completed',
          'cancelled',
          'rejected',
          'legal_hold'
        )
      ),

    reason text,

    requested_at timestamptz not null default now(),
    identity_verified_at timestamptz,
    cooling_off_ends_at timestamptz,
    restricted_at timestamptz,
    processing_started_at timestamptz,
    completed_at timestamptz,
    cancelled_at timestamptz,

    handled_by_profile_id uuid
      references public.profiles(id)
      on delete set null,

    rejection_reason text,
    completion_summary jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint privacy_account_closure_reason_length
      check (
        reason is null
        or char_length(reason) <= 2000
      ),

    constraint privacy_account_closure_rejection_length
      check (
        rejection_reason is null
        or char_length(rejection_reason) <= 2000
      ),

    constraint privacy_account_closure_cooling_off_order
      check (
        cooling_off_ends_at is null
        or cooling_off_ends_at >= requested_at
      )
  );

create unique index if not exists
  privacy_account_closure_one_open_request_idx
on public.privacy_account_closure_requests (
  profile_id
)
where status in (
  'pending',
  'identity_verification_required',
  'verified',
  'cooling_off',
  'restricted',
  'processing',
  'legal_hold'
);

create index if not exists
  privacy_account_closure_status_idx
on public.privacy_account_closure_requests (
  status,
  requested_at
);

create index if not exists
  privacy_account_closure_profile_idx
on public.privacy_account_closure_requests (
  profile_id,
  requested_at desc
);

drop trigger if exists
  set_privacy_account_closure_updated_at
on public.privacy_account_closure_requests;

create trigger
  set_privacy_account_closure_updated_at
before update
on public.privacy_account_closure_requests
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 3. ACCOUNT-CLOSURE EVENT LOG
-- =====================================================

create table if not exists
  public.privacy_account_closure_events (
    id uuid primary key default gen_random_uuid(),

    closure_request_id uuid not null
      references public.privacy_account_closure_requests(id)
      on delete restrict,

    profile_id uuid not null
      references public.profiles(id)
      on delete restrict,

    actor_profile_id uuid
      references public.profiles(id)
      on delete set null,

    actor_role text not null,

    event_type text not null
      constraint privacy_account_closure_event_type_check
      check (
        event_type in (
          'requested',
          'identity_verification_requested',
          'identity_verified',
          'cooling_off_started',
          'cancelled_by_user',
          'restricted',
          'legal_hold_applied',
          'legal_hold_released',
          'processing_started',
          'item_deleted',
          'item_anonymized',
          'item_retained',
          'completed',
          'rejected',
          'system_error'
        )
      ),

    previous_status text,
    new_status text,

    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

create index if not exists
  privacy_account_closure_events_request_idx
on public.privacy_account_closure_events (
  closure_request_id,
  created_at
);

create index if not exists
  privacy_account_closure_events_profile_idx
on public.privacy_account_closure_events (
  profile_id,
  created_at desc
);

-- =====================================================
-- 4. LEGAL HOLDS
-- =====================================================

create table if not exists
  public.privacy_legal_holds (
    id uuid primary key default gen_random_uuid(),

    subject_profile_id uuid
      references public.profiles(id)
      on delete restrict,

    resource_type text not null
      constraint privacy_legal_hold_resource_type_check
      check (
        resource_type in (
          'profile',
          'appointment',
          'medical_document',
          'medical_note',
          'professional_verification',
          'review',
          'billing_record',
          'security_event',
          'support_case',
          'privacy_request',
          'all_subject_data'
        )
      ),

    resource_id uuid,

    reason_category text not null
      constraint privacy_legal_hold_reason_category_check
      check (
        reason_category in (
          'legal_claim',
          'regulatory_request',
          'fraud_investigation',
          'security_incident',
          'medical_record_duty',
          'accounting_duty',
          'complaint',
          'other'
        )
      ),

    reason text not null,
    reference_number text,

    status text not null default 'active'
      constraint privacy_legal_hold_status_check
      check (
        status in (
          'active',
          'released',
          'expired'
        )
      ),

    created_by_profile_id uuid not null
      references public.profiles(id)
      on delete restrict,

    reviewed_by_profile_id uuid
      references public.profiles(id)
      on delete set null,

    starts_at timestamptz not null default now(),
    review_due_at timestamptz not null,
    expires_at timestamptz,
    released_at timestamptz,
    release_reason text,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint privacy_legal_hold_reason_length
      check (
        char_length(btrim(reason)) between 3 and 4000
      ),

    constraint privacy_legal_hold_reference_length
      check (
        reference_number is null
        or char_length(reference_number) <= 200
      ),

    constraint privacy_legal_hold_release_reason_length
      check (
        release_reason is null
        or char_length(release_reason) <= 2000
      ),

    constraint privacy_legal_hold_review_order
      check (
        review_due_at >= starts_at
      ),

    constraint privacy_legal_hold_expiry_order
      check (
        expires_at is null
        or expires_at >= starts_at
      ),

    constraint privacy_legal_hold_release_order
      check (
        released_at is null
        or released_at >= starts_at
      ),

    constraint privacy_legal_hold_resource_scope
      check (
        (
          resource_type in (
            'profile',
            'all_subject_data'
          )
          and subject_profile_id is not null
        )
        or (
          resource_type not in (
            'profile',
            'all_subject_data'
          )
          and (
            subject_profile_id is not null
            or resource_id is not null
          )
        )
      )
  );

create index if not exists
  privacy_legal_holds_subject_idx
on public.privacy_legal_holds (
  subject_profile_id,
  status,
  starts_at desc
);

create index if not exists
  privacy_legal_holds_resource_idx
on public.privacy_legal_holds (
  resource_type,
  resource_id,
  status
);

create index if not exists
  privacy_legal_holds_review_due_idx
on public.privacy_legal_holds (
  review_due_at
)
where status = 'active';

drop trigger if exists
  set_privacy_legal_holds_updated_at
on public.privacy_legal_holds;

create trigger
  set_privacy_legal_holds_updated_at
before update
on public.privacy_legal_holds
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 5. RETENTION PROCESSOR RUNS
-- =====================================================

create table if not exists
  public.privacy_retention_runs (
    id uuid primary key default gen_random_uuid(),

    run_type text not null
      constraint privacy_retention_run_type_check
      check (
        run_type in (
          'dry_run',
          'execute'
        )
      ),

    status text not null default 'running'
      constraint privacy_retention_run_status_check
      check (
        status in (
          'running',
          'completed',
          'completed_with_errors',
          'failed',
          'cancelled'
        )
      ),

    worker_id text not null,
    retention_class text,

    started_at timestamptz not null default now(),
    completed_at timestamptz,

    scanned_count integer not null default 0
      check (scanned_count >= 0),

    eligible_count integer not null default 0
      check (eligible_count >= 0),

    skipped_legal_hold_count integer not null default 0
      check (skipped_legal_hold_count >= 0),

    deleted_count integer not null default 0
      check (deleted_count >= 0),

    anonymized_count integer not null default 0
      check (anonymized_count >= 0),

    retained_count integer not null default 0
      check (retained_count >= 0),

    failed_count integer not null default 0
      check (failed_count >= 0),

    error_summary text,
    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint privacy_retention_run_completion_order
      check (
        completed_at is null
        or completed_at >= started_at
      ),

    constraint privacy_retention_run_error_length
      check (
        error_summary is null
        or char_length(error_summary) <= 4000
      )
  );

create index if not exists
  privacy_retention_runs_started_idx
on public.privacy_retention_runs (
  started_at desc
);

create index if not exists
  privacy_retention_runs_status_idx
on public.privacy_retention_runs (
  status,
  started_at desc
);

create table if not exists
  public.privacy_retention_run_items (
    id uuid primary key default gen_random_uuid(),

    retention_run_id uuid not null
      references public.privacy_retention_runs(id)
      on delete cascade,

    retention_class text not null,
    resource_type text not null,
    resource_id uuid,
    subject_profile_id uuid
      references public.profiles(id)
      on delete restrict,

    decision text not null
      constraint privacy_retention_run_item_decision_check
      check (
        decision in (
          'eligible',
          'skipped_legal_hold',
          'deleted',
          'anonymized',
          'retained',
          'failed'
        )
      ),

    reason_code text,
    error_code text,
    error_message text,

    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),

    constraint privacy_retention_item_error_length
      check (
        error_message is null
        or char_length(error_message) <= 2000
      )
  );

create index if not exists
  privacy_retention_run_items_run_idx
on public.privacy_retention_run_items (
  retention_run_id,
  created_at
);

create index if not exists
  privacy_retention_run_items_subject_idx
on public.privacy_retention_run_items (
  subject_profile_id,
  created_at desc
);

-- =====================================================
-- 6. LEGAL-HOLD CHECK FUNCTION
-- =====================================================

create or replace function
  public.has_active_privacy_legal_hold(
    target_profile_id uuid,
    target_resource_type text default null,
    target_resource_id uuid default null
  )
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.privacy_legal_holds hold
    where hold.status = 'active'
      and hold.starts_at <= now()
      and (
        hold.expires_at is null
        or hold.expires_at > now()
      )
      and (
        (
          target_profile_id is not null
          and hold.subject_profile_id = target_profile_id
          and hold.resource_type in (
            'profile',
            'all_subject_data'
          )
        )
        or (
          target_profile_id is not null
          and hold.subject_profile_id = target_profile_id
          and (
            target_resource_type is null
            or hold.resource_type = target_resource_type
          )
        )
        or (
          target_resource_type is not null
          and target_resource_id is not null
          and hold.resource_type = target_resource_type
          and hold.resource_id = target_resource_id
        )
      )
  );
$$;

revoke all
on function public.has_active_privacy_legal_hold(
  uuid,
  text,
  uuid
)
from public, anon, authenticated;

-- Service-role code may call this function through PostgREST.
grant execute
on function public.has_active_privacy_legal_hold(
  uuid,
  text,
  uuid
)
to service_role;

-- =====================================================
-- 7. SELF-SERVICE ACCOUNT-CLOSURE RPC
-- =====================================================

create or replace function
  public.request_own_account_closure(
    request_reason text default null
  )
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_profile public.profiles%rowtype;
  existing_request_id uuid;
  new_request_id uuid;
  normalized_reason text;
begin
  if auth.uid() is null then
    raise exception
      using
        errcode = '42501',
        message = 'Authentication is required.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then
    raise exception
      using
        errcode = 'P0002',
        message = 'Profile not found.';
  end if;

  if current_profile.role in (
    'admin',
    'manager'
  ) then
    raise exception
      using
        errcode = '42501',
        message = 'Privileged operator accounts require a reviewed closure process.';
  end if;

  if current_profile.account_status = 'anonymized' then
    raise exception
      using
        errcode = '23514',
        message = 'The account is already anonymized.';
  end if;

  select id
  into existing_request_id
  from public.privacy_account_closure_requests
  where profile_id = auth.uid()
    and status in (
      'pending',
      'identity_verification_required',
      'verified',
      'cooling_off',
      'restricted',
      'processing',
      'legal_hold'
    )
  order by requested_at desc
  limit 1;

  if existing_request_id is not null then
    return existing_request_id;
  end if;

  normalized_reason :=
    nullif(
      left(
        btrim(
          coalesce(
            request_reason,
            ''
          )
        ),
        2000
      ),
      ''
    );

  insert into public.privacy_account_closure_requests (
    profile_id,
    requested_by_profile_id,
    request_source,
    status,
    reason,
    requested_at,
    identity_verified_at,
    cooling_off_ends_at
  )
  values (
    auth.uid(),
    auth.uid(),
    'self_service',
    'cooling_off',
    normalized_reason,
    now(),
    now(),
    now() + interval '30 days'
  )
  returning id
  into new_request_id;

  update public.profiles
  set
    account_status = 'closure_requested',
    closure_requested_at = now(),
    privacy_status_updated_at = now(),
    updated_at = now()
  where id = auth.uid();

  insert into public.privacy_account_closure_events (
    closure_request_id,
    profile_id,
    actor_profile_id,
    actor_role,
    event_type,
    previous_status,
    new_status,
    metadata
  )
  values (
    new_request_id,
    auth.uid(),
    auth.uid(),
    current_profile.role,
    'requested',
    current_profile.account_status,
    'closure_requested',
    jsonb_build_object(
      'source',
      'self_service',
      'cooling_off_days',
      30
    )
  );

  insert into public.privacy_account_closure_events (
    closure_request_id,
    profile_id,
    actor_profile_id,
    actor_role,
    event_type,
    previous_status,
    new_status,
    metadata
  )
  values (
    new_request_id,
    auth.uid(),
    auth.uid(),
    current_profile.role,
    'cooling_off_started',
    'cooling_off',
    'cooling_off',
    jsonb_build_object(
      'cooling_off_ends_at',
      now() + interval '30 days'
    )
  );

  return new_request_id;
end;
$$;

revoke all
on function public.request_own_account_closure(text)
from public, anon;

grant execute
on function public.request_own_account_closure(text)
to authenticated;

-- =====================================================
-- 8. CANCEL OWN CLOSURE DURING COOLING-OFF
-- =====================================================

create or replace function
  public.cancel_own_account_closure()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_profile public.profiles%rowtype;
  open_request
    public.privacy_account_closure_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception
      using
        errcode = '42501',
        message = 'Authentication is required.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then
    raise exception
      using
        errcode = 'P0002',
        message = 'Profile not found.';
  end if;

  select *
  into open_request
  from public.privacy_account_closure_requests
  where profile_id = auth.uid()
    and status in (
      'pending',
      'identity_verification_required',
      'verified',
      'cooling_off'
    )
  order by requested_at desc
  limit 1
  for update;

  if not found then
    return false;
  end if;

  update public.privacy_account_closure_requests
  set
    status = 'cancelled',
    cancelled_at = now(),
    updated_at = now()
  where id = open_request.id;

  update public.profiles
  set
    account_status = case
      when current_profile.blocked_at is not null
        then 'blocked'
      else 'active'
    end,
    closure_requested_at = null,
    privacy_status_updated_at = now(),
    updated_at = now()
  where id = auth.uid();

  insert into public.privacy_account_closure_events (
    closure_request_id,
    profile_id,
    actor_profile_id,
    actor_role,
    event_type,
    previous_status,
    new_status,
    metadata
  )
  values (
    open_request.id,
    auth.uid(),
    auth.uid(),
    current_profile.role,
    'cancelled_by_user',
    open_request.status,
    'cancelled',
    '{}'::jsonb
  );

  return true;
end;
$$;

revoke all
on function public.cancel_own_account_closure()
from public, anon;

grant execute
on function public.cancel_own_account_closure()
to authenticated;

-- =====================================================
-- 9. READ OWN CLOSURE STATUS
-- =====================================================

create or replace function
  public.get_own_account_closure_status()
returns table (
  request_id uuid,
  status text,
  requested_at timestamptz,
  cooling_off_ends_at timestamptz,
  restricted_at timestamptz,
  processing_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  legal_hold_active boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    request.id as request_id,
    request.status,
    request.requested_at,
    request.cooling_off_ends_at,
    request.restricted_at,
    request.processing_started_at,
    request.completed_at,
    request.cancelled_at,
    public.has_active_privacy_legal_hold(
      request.profile_id,
      'all_subject_data',
      null
    ) as legal_hold_active
  from public.privacy_account_closure_requests request
  where request.profile_id = auth.uid()
  order by request.requested_at desc
  limit 1;
$$;

revoke all
on function public.get_own_account_closure_status()
from public, anon;

grant execute
on function public.get_own_account_closure_status()
to authenticated;

-- The status RPC needs access to the legal-hold helper under
-- SECURITY DEFINER. Authenticated users still cannot call the
-- legal-hold helper directly.

-- =====================================================
-- 10. RLS AND DIRECT PRIVILEGES
-- =====================================================

alter table
  public.privacy_account_closure_requests
enable row level security;

alter table
  public.privacy_account_closure_events
enable row level security;

alter table
  public.privacy_legal_holds
enable row level security;

alter table
  public.privacy_retention_runs
enable row level security;

alter table
  public.privacy_retention_run_items
enable row level security;

-- Direct access is intentionally denied.
-- Users interact through narrowly scoped SECURITY DEFINER RPCs.
-- Protected server routes use the service role.

revoke all
on table public.privacy_account_closure_requests
from anon, authenticated;

revoke all
on table public.privacy_account_closure_events
from anon, authenticated;

revoke all
on table public.privacy_legal_holds
from anon, authenticated;

revoke all
on table public.privacy_retention_runs
from anon, authenticated;

revoke all
on table public.privacy_retention_run_items
from anon, authenticated;

grant all
on table public.privacy_account_closure_requests
to service_role;

grant all
on table public.privacy_account_closure_events
to service_role;

grant all
on table public.privacy_legal_holds
to service_role;

grant all
on table public.privacy_retention_runs
to service_role;

grant all
on table public.privacy_retention_run_items
to service_role;

-- =====================================================
-- 11. COMMENTS
-- =====================================================

comment on table
  public.privacy_account_closure_requests
is
  'Reviewed account-closure workflows. No row in this table directly deletes an Auth user or medical record.';

comment on table
  public.privacy_account_closure_events
is
  'Append-oriented audit events for account-closure processing.';

comment on table
  public.privacy_legal_holds
is
  'Narrow legal, regulatory, medical, accounting, fraud, security, complaint, or claims holds that pause eligible deletion.';

comment on table
  public.privacy_retention_runs
is
  'Summary of dry-run or execute retention processor runs.';

comment on table
  public.privacy_retention_run_items
is
  'Per-resource retention decisions without storing document content, medical notes, secrets, or signed URLs.';

commit;

-- =====================================================
-- VERIFICATION QUERIES
-- Run separately after the migration succeeds.
-- =====================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'account_status',
    'closure_requested_at',
    'restricted_at',
    'anonymized_at',
    'privacy_status_updated_at'
  )
order by ordinal_position;

select
  table_name,
  row_security
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'privacy_account_closure_requests',
    'privacy_account_closure_events',
    'privacy_legal_holds',
    'privacy_retention_runs',
    'privacy_retention_run_items'
  )
order by table_name;

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'request_own_account_closure',
    'cancel_own_account_closure',
    'get_own_account_closure_status',
    'has_active_privacy_legal_hold'
  )
order by routine_name;
