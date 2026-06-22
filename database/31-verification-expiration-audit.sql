-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 60E: Verification expiration and audit history
--
-- File:
-- ROMDOC/database/31-verification-expiration-audit.sql
--
-- Adds:
--   - immutable verification status audit events
--   - automatic expiration function
--   - admin-only audit visibility
--   - service-role execution for the daily expiration job
-- =====================================================

begin;

-- =====================================================
-- 1. IMMUTABLE VERIFICATION AUDIT EVENTS
-- =====================================================

create table if not exists public.doctor_verification_audit_events (
  id uuid primary key default gen_random_uuid(),

  submission_id uuid not null
    references public.doctor_verification_submissions(id)
    on delete cascade,

  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  event_type text not null
    constraint doctor_verification_audit_event_type_check
    check (
      event_type in (
        'draft_created',
        'submitted',
        'review_started',
        'approved',
        'rejected',
        'expired_manual',
        'expired_automatic',
        'withdrawn'
      )
    ),

  from_status text,
  to_status text not null,

  actor_profile_id uuid
    references public.profiles(id)
    on delete set null,

  source text not null default 'application'
    constraint doctor_verification_audit_source_check
    check (
      source in (
        'application',
        'admin',
        'system'
      )
    ),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

comment on table public.doctor_verification_audit_events is
  'Immutable status-transition history for doctor professional verification submissions.';

comment on column public.doctor_verification_audit_events.actor_profile_id is
  'Authenticated doctor or administrator who caused the event. Null for automated system expiration.';

create index if not exists
  idx_doctor_verification_audit_submission_created
on public.doctor_verification_audit_events (
  submission_id,
  created_at asc
);

create index if not exists
  idx_doctor_verification_audit_doctor_created
on public.doctor_verification_audit_events (
  doctor_id,
  created_at desc
);

alter table public.doctor_verification_audit_events
  enable row level security;

drop policy if exists
  "Admins can read verification audit events"
on public.doctor_verification_audit_events;

create policy
  "Admins can read verification audit events"
on public.doctor_verification_audit_events
for select
to authenticated
using (
  public.is_admin()
);

-- Audit rows are written only by the database trigger below.
-- No direct INSERT, UPDATE, or DELETE policy is intentionally created.

-- =====================================================
-- 2. STATUS-TRANSITION AUDIT TRIGGER
-- =====================================================

create or replace function public.record_doctor_verification_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_event_type text;
  resolved_source text;
  resolved_actor uuid;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      return new;
    end if;

    resolved_event_type := 'draft_created';
  else
    if old.status is not distinct from new.status then
      return new;
    end if;

    resolved_event_type := case
      when new.status = 'submitted' then 'submitted'
      when new.status = 'under_review' then 'review_started'
      when new.status = 'verified' then 'approved'
      when new.status = 'rejected' then 'rejected'
      when new.status = 'withdrawn' then 'withdrawn'
      when new.status = 'expired'
        and auth.uid() is null then 'expired_automatic'
      when new.status = 'expired' then 'expired_manual'
      else null
    end;
  end if;

  if resolved_event_type is null then
    return new;
  end if;

  resolved_actor := auth.uid();

  resolved_source := case
    when resolved_actor is null then 'system'
    when public.is_admin() then 'admin'
    else 'application'
  end;

  insert into public.doctor_verification_audit_events (
    submission_id,
    doctor_id,
    event_type,
    from_status,
    to_status,
    actor_profile_id,
    source,
    metadata
  )
  values (
    new.id,
    new.doctor_id,
    resolved_event_type,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    resolved_actor,
    resolved_source,
    jsonb_strip_nulls(
      jsonb_build_object(
        'registration_expires_at',
        new.registration_expires_at,
        'reviewed_by_profile_id',
        new.reviewed_by_profile_id
      )
    )
  );

  return new;
end;
$$;

drop trigger if exists
  doctor_verification_status_audit
on public.doctor_verification_submissions;

create trigger
  doctor_verification_status_audit
after insert or update of status
on public.doctor_verification_submissions
for each row
execute function public.record_doctor_verification_audit_event();

-- Backfill one current-state event for existing non-draft submissions.
-- This does not attempt to reconstruct historical timestamps that were
-- not previously stored as separate events.
insert into public.doctor_verification_audit_events (
  submission_id,
  doctor_id,
  event_type,
  from_status,
  to_status,
  actor_profile_id,
  source,
  metadata,
  created_at
)
select
  submission.id,
  submission.doctor_id,
  case submission.status
    when 'submitted' then 'submitted'
    when 'under_review' then 'review_started'
    when 'verified' then 'approved'
    when 'rejected' then 'rejected'
    when 'expired' then 'expired_manual'
    when 'withdrawn' then 'withdrawn'
  end,
  null,
  submission.status,
  submission.reviewed_by_profile_id,
  case
    when submission.reviewed_by_profile_id is null
      then 'system'
    else 'admin'
  end,
  jsonb_build_object(
    'backfilled', true,
    'registration_expires_at',
    submission.registration_expires_at
  ),
  coalesce(
    submission.reviewed_at,
    submission.submitted_at,
    submission.created_at
  )
from public.doctor_verification_submissions as submission
where submission.status <> 'draft'
  and not exists (
    select 1
    from public.doctor_verification_audit_events as event
    where event.submission_id = submission.id
  );

-- =====================================================
-- 3. AUTOMATIC EXPIRATION
-- =====================================================

create or replace function public.expire_due_doctor_verifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
begin
  with due_submissions as (
    select submission.id, submission.doctor_id
    from public.doctor_verification_submissions as submission
    join public.doctors as doctor
      on doctor.id = submission.doctor_id
    where submission.status = 'verified'
      and submission.registration_expires_at is not null
      and submission.registration_expires_at < current_date
      and doctor.verification_status = 'verified'
      and doctor.verification_expires_at is not null
      and doctor.verification_expires_at < current_date
    for update of submission, doctor
  ),
  expired_submissions as (
    update public.doctor_verification_submissions as submission
    set
      status = 'expired',
      reviewed_at = now()
    from due_submissions
    where submission.id = due_submissions.id
    returning submission.doctor_id
  ),
  expired_doctors as (
    update public.doctors as doctor
    set
      verification_status = 'expired',
      verified_at = null,
      verified_by_profile_id = null
    where doctor.id in (
      select expired_submissions.doctor_id
      from expired_submissions
    )
    returning doctor.id
  )
  select count(*)
  into expired_count
  from expired_doctors;

  return expired_count;
end;
$$;

revoke all
on function public.expire_due_doctor_verifications()
from public, anon, authenticated;

grant execute
on function public.expire_due_doctor_verifications()
to service_role;

comment on function public.expire_due_doctor_verifications() is
  'Expires due verified submissions and removes the public verification badge. Intended for a trusted daily service-role job.';

commit;
