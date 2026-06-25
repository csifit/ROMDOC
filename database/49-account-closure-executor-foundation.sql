-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 68B-4: Reviewed account-closure executor foundation
--
-- File:
-- ROMDOC/database/49-account-closure-executor-foundation.sql
--
-- Requires:
--   41-medical-document-sharing-audit.sql
--   48-privacy-retention-and-account-closure.sql
--
-- Purpose:
-- - atomically claim closure requests whose cooling-off period ended;
-- - re-check legal holds;
-- - restrict the profile;
-- - revoke patient-controlled medical-document shares;
-- - create a reviewed execution plan;
-- - do NOT delete or anonymize personal/medical data yet.
-- =====================================================

begin;

-- =====================================================
-- 1. PROCESSING LOCK FIELDS
-- =====================================================

alter table public.privacy_account_closure_requests
  add column if not exists
  processing_worker_id text;

alter table public.privacy_account_closure_requests
  add column if not exists
  processing_locked_at timestamptz;

alter table public.privacy_account_closure_requests
  add column if not exists
  processing_attempt_count integer not null default 0;

alter table public.privacy_account_closure_requests
  add column if not exists
  processing_last_error text;

alter table public.privacy_account_closure_requests
  add constraint privacy_account_closure_attempt_count_check
  check (processing_attempt_count >= 0)
  not valid;

alter table public.privacy_account_closure_requests
  validate constraint privacy_account_closure_attempt_count_check;

create index if not exists
  privacy_account_closure_processing_lock_idx
on public.privacy_account_closure_requests (
  processing_locked_at
)
where status = 'processing';

-- =====================================================
-- 2. REVIEWED EXECUTION PLAN
-- =====================================================

create table if not exists
  public.privacy_account_closure_plan_items (
    id uuid primary key default gen_random_uuid(),

    closure_request_id uuid not null
      references public.privacy_account_closure_requests(id)
      on delete cascade,

    profile_id uuid not null
      references public.profiles(id)
      on delete restrict,

    action_type text not null
      constraint privacy_closure_plan_action_type_check
      check (
        action_type in (
          'revoke_document_shares',
          'revoke_auth_sessions',
          'stop_optional_communications',
          'unlist_public_profile',
          'anonymize_profile',
          'anonymize_reviews',
          'delete_eligible_storage_files',
          'retain_appointment_records',
          'retain_medical_records',
          'retain_billing_records',
          'retain_security_audit',
          'delete_auth_user',
          'send_completion_notice'
        )
      ),

    action_status text not null default 'pending'
      constraint privacy_closure_plan_status_check
      check (
        action_status in (
          'pending',
          'completed',
          'skipped',
          'retained',
          'failed',
          'manual_review'
        )
      ),

    reason_code text,
    legal_basis_note text,
    completed_at timestamptz,
    error_message text,
    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint privacy_closure_plan_unique_action
      unique (
        closure_request_id,
        action_type
      ),

    constraint privacy_closure_plan_error_length
      check (
        error_message is null
        or char_length(error_message) <= 2000
      ),

    constraint privacy_closure_plan_legal_note_length
      check (
        legal_basis_note is null
        or char_length(legal_basis_note) <= 4000
      )
  );

create index if not exists
  privacy_closure_plan_request_idx
on public.privacy_account_closure_plan_items (
  closure_request_id,
  action_status,
  created_at
);

create index if not exists
  privacy_closure_plan_profile_idx
on public.privacy_account_closure_plan_items (
  profile_id,
  action_status
);

drop trigger if exists
  set_privacy_closure_plan_updated_at
on public.privacy_account_closure_plan_items;

create trigger
  set_privacy_closure_plan_updated_at
before update
on public.privacy_account_closure_plan_items
for each row
execute function public.handle_updated_at();

alter table
  public.privacy_account_closure_plan_items
enable row level security;

revoke all
on table public.privacy_account_closure_plan_items
from public, anon, authenticated;

grant all
on table public.privacy_account_closure_plan_items
to service_role;

comment on table
  public.privacy_account_closure_plan_items
is
  'Reviewed per-account closure plan. Pending items are not authority to delete medical or legally retained records without an approved handler.';

-- =====================================================
-- 3. STALE LOCK RELEASE
-- =====================================================

create or replace function
  public.release_stale_account_closure_locks(
    maximum_lock_age interval default interval '2 hours'
  )
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  released_count integer;
begin
  update public.privacy_account_closure_requests
  set
    status = 'cooling_off',
    processing_worker_id = null,
    processing_locked_at = null,
    processing_last_error =
      coalesce(
        processing_last_error,
        'A stale processing lock was released.'
      ),
    updated_at = now()
  where status = 'processing'
    and processing_locked_at is not null
    and processing_locked_at <
      now() - maximum_lock_age
    and processing_started_at is null;

  get diagnostics
    released_count = row_count;

  return released_count;
end;
$$;

revoke all
on function public.release_stale_account_closure_locks(interval)
from public, anon, authenticated;

grant execute
on function public.release_stale_account_closure_locks(interval)
to service_role;

-- =====================================================
-- 4. ATOMIC PREPARATION / CLAIM RPC
-- =====================================================

create or replace function
  public.prepare_due_account_closures(
    worker_id text,
    batch_size integer default 25
  )
returns table (
  closure_request_id uuid,
  profile_id uuid,
  revoked_share_count integer,
  prepared_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  candidate record;
  share_count integer;
  prepared_timestamp timestamptz;
begin
  if worker_id is null
     or btrim(worker_id) = '' then
    raise exception
      using
        errcode = '22023',
        message = 'worker_id is required.';
  end if;

  if batch_size < 1
     or batch_size > 100 then
    raise exception
      using
        errcode = '22023',
        message = 'batch_size must be between 1 and 100.';
  end if;

  for candidate in
    select request.id,
           request.profile_id,
           request.status
    from public.privacy_account_closure_requests request
    join public.profiles profile
      on profile.id = request.profile_id
    where request.status = 'cooling_off'
      and request.cooling_off_ends_at is not null
      and request.cooling_off_ends_at <= now()
      and profile.account_status = 'closure_requested'
      and not public.has_active_privacy_legal_hold(
        request.profile_id,
        'all_subject_data',
        null
      )
    order by request.cooling_off_ends_at asc
    for update of request skip locked
    limit batch_size
  loop
    prepared_timestamp := now();

    update public.privacy_account_closure_requests
    set
      status = 'processing',
      restricted_at = prepared_timestamp,
      processing_started_at = prepared_timestamp,
      processing_worker_id = worker_id,
      processing_locked_at = prepared_timestamp,
      processing_attempt_count =
        processing_attempt_count + 1,
      processing_last_error = null,
      updated_at = prepared_timestamp
    where id = candidate.id;

    update public.profiles
    set
      account_status = 'restricted',
      restricted_at = prepared_timestamp,
      privacy_status_updated_at = prepared_timestamp,
      updated_at = prepared_timestamp
    where id = candidate.profile_id
      and account_status = 'closure_requested';

    update public.patient_medical_document_shares
    set
      revoked_at = prepared_timestamp,
      revoked_by_profile_id = candidate.profile_id,
      updated_at = prepared_timestamp
    where patient_profile_id = candidate.profile_id
      and revoked_at is null;

    get diagnostics
      share_count = row_count;

    insert into public.privacy_account_closure_plan_items (
      closure_request_id,
      profile_id,
      action_type,
      action_status,
      reason_code,
      completed_at,
      metadata
    )
    values (
      candidate.id,
      candidate.profile_id,
      'revoke_document_shares',
      'completed',
      'ACCOUNT_CLOSURE_PROCESSING_STARTED',
      prepared_timestamp,
      jsonb_build_object(
        'revoked_share_count',
        share_count
      )
    )
    on conflict (
      closure_request_id,
      action_type
    )
    do update set
      action_status = 'completed',
      reason_code =
        excluded.reason_code,
      completed_at =
        excluded.completed_at,
      error_message = null,
      metadata =
        excluded.metadata,
      updated_at = now();

    insert into public.privacy_account_closure_plan_items (
      closure_request_id,
      profile_id,
      action_type,
      action_status,
      reason_code,
      legal_basis_note
    )
    values
      (
        candidate.id,
        candidate.profile_id,
        'revoke_auth_sessions',
        'pending',
        'REQUIRES_AUTH_ADMIN_HANDLER',
        'Must be executed through a protected server route using Supabase Auth Admin.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'stop_optional_communications',
        'pending',
        'REQUIRES_COMMUNICATION_PREFERENCE_HANDLER',
        'Transactional and legally required communications must remain distinguishable from optional communications.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'unlist_public_profile',
        'manual_review',
        'ROLE_DEPENDENT',
        'Patient profiles are not public. Doctor or staff closure requires a separate reviewed workflow.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'anonymize_profile',
        'pending',
        'REQUIRES_APPROVED_ANONYMIZATION_HANDLER',
        'Ordinary profile identifiers may be anonymized only after record-class and legal-hold checks.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'anonymize_reviews',
        'pending',
        'REQUIRES_APPROVED_REVIEW_HANDLER',
        'Review content and publication status require moderation and legal assessment before anonymization.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'delete_eligible_storage_files',
        'manual_review',
        'DOCUMENT_CLASSIFICATION_REQUIRED',
        'Medical and legally retained files must not be deleted through a generic account-closure handler.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'retain_appointment_records',
        'retained',
        'RETENTION_SCHEDULE_REVIEW_REQUIRED',
        'Appointment scheduling and dispute records remain restricted pending approved retention periods.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'retain_medical_records',
        'retained',
        'MEDICAL_RECORD_DUTY_REVIEW_REQUIRED',
        'Medical notes and documents remain restricted according to the responsible provider''s legal duties.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'retain_billing_records',
        'retained',
        'ACCOUNTING_DUTY_REVIEW_REQUIRED',
        'Billing and tax records remain restricted for the applicable statutory period.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'retain_security_audit',
        'retained',
        'SECURITY_AND_CLAIMS_RETENTION',
        'Minimum audit evidence may remain restricted for security, fraud prevention, or legal claims.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'delete_auth_user',
        'manual_review',
        'FINAL_STEP_AFTER_DEPENDENCY_CHECKS',
        'Auth deletion must occur only after approved anonymization, retention, and rollback checks.'
      ),
      (
        candidate.id,
        candidate.profile_id,
        'send_completion_notice',
        'pending',
        'AFTER_PROCESSING_COMPLETES',
        'The completion notice must accurately describe deleted, anonymized, and retained categories.'
      )
    on conflict (
      closure_request_id,
      action_type
    )
    do nothing;

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
      candidate.id,
      candidate.profile_id,
      null,
      'system',
      'restricted',
      'cooling_off',
      'processing',
      jsonb_build_object(
        'worker_id',
        worker_id,
        'revoked_share_count',
        share_count,
        'destructive_deletion_performed',
        false
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
      candidate.id,
      candidate.profile_id,
      null,
      'system',
      'processing_started',
      'cooling_off',
      'processing',
      jsonb_build_object(
        'worker_id',
        worker_id,
        'prepared_at',
        prepared_timestamp
      )
    );

    closure_request_id :=
      candidate.id;
    profile_id :=
      candidate.profile_id;
    revoked_share_count :=
      share_count;
    prepared_at :=
      prepared_timestamp;

    return next;
  end loop;
end;
$$;

revoke all
on function public.prepare_due_account_closures(text, integer)
from public, anon, authenticated;

grant execute
on function public.prepare_due_account_closures(text, integer)
to service_role;

-- =====================================================
-- 5. CLEAR COMPLETED PREPARATION LOCK
-- =====================================================

create or replace function
  public.complete_account_closure_preparation(
    target_closure_request_id uuid,
    worker_id text
  )
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  update public.privacy_account_closure_requests
  set
    processing_worker_id = null,
    processing_locked_at = null,
    updated_at = now()
  where id = target_closure_request_id
    and status = 'processing'
    and processing_worker_id = worker_id;

  get diagnostics
    updated_count = row_count;

  return updated_count = 1;
end;
$$;

revoke all
on function public.complete_account_closure_preparation(uuid, text)
from public, anon, authenticated;

grant execute
on function public.complete_account_closure_preparation(uuid, text)
to service_role;

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
  and table_name = 'privacy_account_closure_requests'
  and column_name in (
    'processing_worker_id',
    'processing_locked_at',
    'processing_attempt_count',
    'processing_last_error'
  )
order by ordinal_position;

select
  table_name,
  row_security
from information_schema.tables
where table_schema = 'public'
  and table_name =
    'privacy_account_closure_plan_items';

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'release_stale_account_closure_locks',
    'prepare_due_account_closures',
    'complete_account_closure_preparation'
  )
order by routine_name;
