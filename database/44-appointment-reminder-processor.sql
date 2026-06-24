-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 64B: Atomic reminder claiming and finalization
--
-- File:
-- ROMDOC/database/44-appointment-reminder-processor.sql
--
-- Requires:
--   43-appointment-reminder-scheduling.sql
-- =====================================================

begin;

create or replace function
  public.claim_due_appointment_reminders(
    worker_id text,
    batch_size integer default 25
  )
returns setof public.appointment_reminder_schedules
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(worker_id), '') is null then
    raise exception 'worker_id_required'
      using errcode = '22023';
  end if;

  if batch_size < 1 or batch_size > 100 then
    raise exception 'invalid_batch_size'
      using errcode = '22023';
  end if;

  return query
  with due as (
    select schedule.id
    from public.appointment_reminder_schedules as schedule
    where schedule.schedule_status = 'scheduled'
      and schedule.scheduled_for <= now()
      and schedule.appointment_occurrence_at > now()
    order by schedule.scheduled_for asc, schedule.id asc
    for update skip locked
    limit batch_size
  )
  update public.appointment_reminder_schedules as schedule
  set
    schedule_status = 'processing',
    attempt_count = schedule.attempt_count + 1,
    locked_at = now(),
    locked_by = worker_id,
    last_error_code = null,
    last_error_message = null
  from due
  where schedule.id = due.id
  returning schedule.*;
end;
$$;

revoke all
on function public.claim_due_appointment_reminders(text, integer)
from public, anon, authenticated;

grant execute
on function public.claim_due_appointment_reminders(text, integer)
to service_role;

create or replace function
  public.finalize_appointment_reminder(
    reminder_id uuid,
    worker_id text,
    final_status text,
    error_code text default null,
    error_message text default null
  )
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  if final_status not in (
    'sent',
    'failed',
    'skipped',
    'cancelled',
    'scheduled'
  ) then
    raise exception 'invalid_final_status'
      using errcode = '22023';
  end if;

  update public.appointment_reminder_schedules
  set
    schedule_status = final_status,
    sent_at = case
      when final_status = 'sent' then now()
      else sent_at
    end,
    skipped_at = case
      when final_status = 'skipped' then now()
      else skipped_at
    end,
    cancelled_at = case
      when final_status = 'cancelled' then now()
      else cancelled_at
    end,
    locked_at = null,
    locked_by = null,
    last_error_code = case
      when final_status in ('failed', 'skipped')
        then left(coalesce(error_code, 'REMINDER_PROCESSING_ERROR'), 200)
      else null
    end,
    last_error_message = case
      when final_status in ('failed', 'skipped')
        then left(coalesce(error_message, 'Reminder processing did not complete.'), 2000)
      else null
    end
  where id = reminder_id
    and schedule_status = 'processing'
    and locked_by = worker_id;

  get diagnostics updated_count = row_count;

  return updated_count = 1;
end;
$$;

revoke all
on function public.finalize_appointment_reminder(
  uuid,
  text,
  text,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.finalize_appointment_reminder(
  uuid,
  text,
  text,
  text,
  text
)
to service_role;

create or replace function
  public.release_stale_appointment_reminder_locks(
    stale_after interval default interval '20 minutes'
  )
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released_count integer := 0;
begin
  if stale_after < interval '5 minutes'
    or stale_after > interval '24 hours'
  then
    raise exception 'invalid_stale_after'
      using errcode = '22023';
  end if;

  update public.appointment_reminder_schedules
  set
    schedule_status = 'scheduled',
    locked_at = null,
    locked_by = null,
    last_error_code = 'STALE_PROCESSING_LOCK',
    last_error_message =
      'A previous reminder worker stopped before finalization.'
  where schedule_status = 'processing'
    and locked_at < now() - stale_after
    and appointment_occurrence_at > now();

  get diagnostics released_count = row_count;

  return released_count;
end;
$$;

revoke all
on function public.release_stale_appointment_reminder_locks(interval)
from public, anon, authenticated;

grant execute
on function public.release_stale_appointment_reminder_locks(interval)
to service_role;

commit;
