-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 62C: Patient cancellation hardening and safe timeline
--
-- File:
-- ROMDOC/database/36-patient-cancellation-timeline.sql
--
-- Requires:
--   34-appointment-lifecycle-hardening.sql
--   35-appointment-audit-history.sql
--
-- Adds:
--   - patient-only cancellation RPC
--   - cancellation-after-start protection
--   - safe patient lifecycle timeline RPC
-- =====================================================

begin;

-- =====================================================
-- 1. PATIENT-ONLY CANCELLATION
-- =====================================================

create or replace function public.patient_cancel_own_appointment(
  target_appointment_id uuid,
  cancellation_reason text default null
)
returns table (
  appointment_id uuid,
  previous_status text,
  current_status text,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid;
  current_role text;
  current_account_status text;
  current_appointment public.appointments%rowtype;
  appointment_local_start timestamp;
  normalized_reason text;
begin
  current_profile_id := auth.uid();

  if current_profile_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  select
    profile.role,
    profile.account_status
  into
    current_role,
    current_account_status
  from public.profiles as profile
  where profile.id = current_profile_id;

  if current_role not in ('patient', 'user')
    or current_account_status is distinct from 'active'
  then
    raise exception 'active_patient_profile_required'
      using errcode = '42501';
  end if;

  select appointment.*
  into current_appointment
  from public.appointments as appointment
  where appointment.id = target_appointment_id
  for update;

  if not found then
    raise exception 'appointment_not_found'
      using errcode = 'P0002';
  end if;

  if current_appointment.patient_profile_id
    is distinct from current_profile_id
  then
    raise exception 'appointment_not_owned_by_patient'
      using errcode = '42501';
  end if;

  if current_appointment.status not in (
    'pending',
    'confirmed',
    'rescheduled'
  ) then
    raise exception
      'patient_cannot_cancel_status:%',
      current_appointment.status
      using errcode = '23514';
  end if;

  if coalesce(
    current_appointment.scheduled_date,
    current_appointment.requested_date
  ) is null
    or coalesce(
      current_appointment.scheduled_time,
      current_appointment.requested_time
    ) is null
  then
    raise exception 'appointment_start_is_missing'
      using errcode = '23514';
  end if;

  appointment_local_start :=
    coalesce(
      current_appointment.scheduled_date,
      current_appointment.requested_date
    )::timestamp
    +
    coalesce(
      current_appointment.scheduled_time,
      current_appointment.requested_time
    );

  if appointment_local_start <=
    (now() at time zone 'Europe/Bucharest')
  then
    raise exception 'appointment_already_started'
      using errcode = '23514';
  end if;

  normalized_reason :=
    nullif(trim(cancellation_reason), '');

  if normalized_reason is not null
    and char_length(normalized_reason) > 1000
  then
    raise exception 'cancellation_reason_too_long'
      using errcode = '22001';
  end if;

  perform *
  from public.transition_own_appointment(
    target_appointment_id,
    'cancelled',
    null,
    null,
    normalized_reason
  );

  return query
  select
    appointment.id,
    current_appointment.status,
    appointment.status,
    appointment.cancelled_at
  from public.appointments as appointment
  where appointment.id = target_appointment_id;
end;
$$;

revoke all
on function public.patient_cancel_own_appointment(uuid, text)
from public, anon;

grant execute
on function public.patient_cancel_own_appointment(uuid, text)
to authenticated;

comment on function public.patient_cancel_own_appointment(uuid, text) is
  'Allows an active authenticated patient to cancel only their own pending, confirmed, or rescheduled future appointment.';

-- =====================================================
-- 2. SAFE PATIENT TIMELINE
-- =====================================================

create or replace function public.get_own_appointment_timeline(
  target_appointment_id uuid
)
returns table (
  event_id uuid,
  event_type text,
  status text,
  event_date date,
  event_time time,
  occurred_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_profile_id uuid;
  current_role text;
  current_account_status text;
begin
  current_profile_id := auth.uid();

  if current_profile_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  select
    profile.role,
    profile.account_status
  into
    current_role,
    current_account_status
  from public.profiles as profile
  where profile.id = current_profile_id;

  if current_role not in ('patient', 'user')
    or current_account_status is distinct from 'active'
  then
    raise exception 'active_patient_profile_required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.appointments as appointment
    where appointment.id = target_appointment_id
      and appointment.patient_profile_id =
        current_profile_id
  ) then
    raise exception 'appointment_not_owned_by_patient'
      using errcode = '42501';
  end if;

  return query
  select
    event.id,
    case
      when event.event_type = 'appointment_created'
        then 'requested'
      when event.event_type = 'confirmed'
        then 'confirmed'
      when event.event_type in (
        'rescheduled',
        'schedule_changed'
      )
        then 'rescheduled'
      when event.event_type like 'cancelled_%'
        then 'cancelled'
      when event.event_type = 'completed'
        then 'completed'
      when event.event_type = 'marked_no_show'
        then 'no_show'
      else 'updated'
    end as event_type,
    event.new_status as status,
    event.new_scheduled_date as event_date,
    event.new_scheduled_time as event_time,
    event.created_at as occurred_at
  from public.appointment_audit_events as event
  where event.appointment_id = target_appointment_id
    and event.event_type in (
      'appointment_created',
      'confirmed',
      'rescheduled',
      'schedule_changed',
      'cancelled_by_patient',
      'cancelled_by_doctor',
      'cancelled_by_staff',
      'cancelled_by_admin',
      'cancelled_by_system',
      'completed',
      'marked_no_show',
      'status_changed'
    )
  order by event.created_at asc, event.id asc;
end;
$$;

revoke all
on function public.get_own_appointment_timeline(uuid)
from public, anon;

grant execute
on function public.get_own_appointment_timeline(uuid)
to authenticated;

comment on function public.get_own_appointment_timeline(uuid) is
  'Returns a patient-safe lifecycle timeline for an appointment owned by the authenticated patient. Internal reasons, notes, actor identities, and metadata are excluded.';

commit;
