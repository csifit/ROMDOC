-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 62E: Atomic slot validation and concurrency-safe rescheduling
--
-- File:
-- ROMDOC/database/37-atomic-appointment-slot-transitions.sql
--
-- Requires:
--   34-appointment-lifecycle-hardening.sql
--   35-appointment-audit-history.sql
--   36-patient-cancellation-timeline.sql
--
-- Existing protections retained:
--   - appointments_no_doctor_overlap GiST exclusion constraint
--   - validate_appointment_schedule() trigger
--   - availability, breaks, days-off and duration validation
--
-- Adds:
--   - reusable slot assertion function
--   - doctor/date transaction advisory locking
--   - atomic transition RPC with explicit slot validation
--   - clearer database errors for API mapping
-- =====================================================

begin;

-- =====================================================
-- 1. REUSABLE SLOT ASSERTION
-- =====================================================

create or replace function public.assert_appointment_slot_available(
  target_appointment_id uuid,
  target_doctor_id uuid,
  target_clinic_id uuid,
  target_date date,
  target_time time,
  target_duration_minutes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  slot_end time;
  slot_weekday integer;
  matching_availability public.availability%rowtype;
begin
  if target_doctor_id is null
    or target_clinic_id is null
    or target_date is null
    or target_time is null
  then
    raise exception 'appointment_slot_fields_required'
      using errcode = '23514';
  end if;

  if target_duration_minutes is null
    or target_duration_minutes < 5
    or target_duration_minutes > 480
  then
    raise exception 'invalid_appointment_duration'
      using errcode = '23514';
  end if;

  if target_date < current_date then
    raise exception 'appointment_date_is_in_the_past'
      using errcode = '23514';
  end if;

  if target_date > current_date + 180 then
    raise exception 'appointment_date_exceeds_advance_limit'
      using errcode = '23514';
  end if;

  slot_end :=
    target_time
    +
    make_interval(
      mins => target_duration_minutes
    );

  slot_weekday :=
    extract(
      dow from target_date
    )::integer;

  if not exists (
    select 1
    from public.doctor_clinics as relation
    join public.clinics as clinic
      on clinic.id = relation.clinic_id
    where relation.doctor_id = target_doctor_id
      and relation.clinic_id = target_clinic_id
      and clinic.status = 'approved'
  ) then
    raise exception 'doctor_clinic_not_available'
      using errcode = '23514';
  end if;

  select availability_row.*
  into matching_availability
  from public.availability as availability_row
  where availability_row.doctor_id = target_doctor_id
    and availability_row.clinic_id = target_clinic_id
    and availability_row.weekday = slot_weekday
    and availability_row.is_active = true
    and target_time >= availability_row.start_time
    and slot_end <= availability_row.end_time
  order by availability_row.start_time
  limit 1;

  if matching_availability.id is null then
    raise exception 'appointment_outside_working_hours'
      using errcode = '23514';
  end if;

  if (
    target_duration_minutes
    %
    matching_availability.appointment_duration_minutes
  ) <> 0 then
    raise exception 'appointment_duration_mismatch'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.availability_breaks as appointment_break
    where appointment_break.availability_id =
      matching_availability.id
      and target_time < appointment_break.end_time
      and slot_end > appointment_break.start_time
  ) then
    raise exception 'appointment_overlaps_break'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.doctor_days_off as day_off
    where day_off.doctor_id = target_doctor_id
      and day_off.date = target_date
      and (
        day_off.clinic_id is null
        or day_off.clinic_id = target_clinic_id
      )
      and (
        day_off.is_all_day = true
        or (
          target_time < day_off.end_time
          and slot_end > day_off.start_time
        )
      )
  ) then
    raise exception 'doctor_unavailable_for_period'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.appointments as conflicting
    where conflicting.doctor_id = target_doctor_id
      and conflicting.id is distinct from target_appointment_id
      and conflicting.status in (
        'pending',
        'confirmed',
        'rescheduled'
      )
      and conflicting.appointment_range is not null
      and conflicting.appointment_range
        &&
        tsrange(
          target_date::timestamp + target_time,
          target_date::timestamp
            + target_time
            + make_interval(
                mins => target_duration_minutes
              ),
          '[)'
        )
  ) then
    raise exception 'appointment_slot_conflict'
      using errcode = '23P01';
  end if;
end;
$$;

revoke all
on function public.assert_appointment_slot_available(
  uuid,
  uuid,
  uuid,
  date,
  time,
  integer
)
from public, anon;

grant execute
on function public.assert_appointment_slot_available(
  uuid,
  uuid,
  uuid,
  date,
  time,
  integer
)
to authenticated, service_role;

comment on function public.assert_appointment_slot_available(
  uuid,
  uuid,
  uuid,
  date,
  time,
  integer
) is
  'Validates doctor-clinic ownership, approved clinic, advance window, availability, duration alignment, breaks, days off, and appointment overlap.';

-- =====================================================
-- 2. ATOMIC TRANSITION RPC
-- =====================================================

create or replace function public.transition_own_appointment(
  target_appointment_id uuid,
  target_status text,
  target_scheduled_date date default null,
  target_scheduled_time time default null,
  transition_reason text default null
)
returns table (
  appointment_id uuid,
  previous_status text,
  current_status text,
  scheduled_date date,
  scheduled_time time,
  status_changed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid;
  current_profile_role text;
  current_account_status text;
  current_appointment public.appointments%rowtype;
  next_scheduled_date date;
  next_scheduled_time time;
  normalized_reason text;
  is_authorized boolean := false;
  lock_key bigint;
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
    current_profile_role,
    current_account_status
  from public.profiles as profile
  where profile.id = current_profile_id;

  if current_profile_role is null
    or current_account_status is distinct from 'active'
  then
    raise exception 'active_profile_required'
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

  if target_status not in (
    'confirmed',
    'rescheduled',
    'cancelled',
    'completed',
    'no_show'
  ) then
    raise exception 'unsupported_target_status:%', target_status
      using errcode = '22023';
  end if;

  if current_profile_role = 'admin' then
    is_authorized := true;

  elsif current_profile_role = 'doctor' then
    select exists (
      select 1
      from public.doctors as doctor
      where doctor.id = current_appointment.doctor_id
        and doctor.profile_id = current_profile_id
    )
    into is_authorized;

  elsif current_profile_role = 'staff' then
    is_authorized :=
      current_appointment.clinic_id is not null
      and public.is_staff_for_doctor_clinic(
        current_profile_id,
        current_appointment.doctor_id,
        current_appointment.clinic_id
      );

  elsif current_profile_role in ('patient', 'user') then
    is_authorized :=
      target_status = 'cancelled'
      and current_appointment.patient_profile_id =
        current_profile_id;
  end if;

  if not is_authorized then
    raise exception 'appointment_transition_not_permitted'
      using errcode = '42501';
  end if;

  if not public.is_valid_appointment_transition(
    current_appointment.status,
    target_status
  ) then
    raise exception
      'invalid_appointment_transition:%->%',
      current_appointment.status,
      target_status
      using errcode = '23514';
  end if;

  normalized_reason :=
    nullif(trim(transition_reason), '');

  if normalized_reason is not null
    and char_length(normalized_reason) > 2000
  then
    raise exception 'transition_reason_too_long'
      using errcode = '22001';
  end if;

  if target_status = 'rescheduled' then
    if target_scheduled_date is null
      or target_scheduled_time is null
    then
      raise exception 'reschedule_requires_date_and_time'
        using errcode = '23514';
    end if;

    next_scheduled_date := target_scheduled_date;
    next_scheduled_time := target_scheduled_time;

    if current_appointment.scheduled_date is not null
      and current_appointment.scheduled_time is not null
      and next_scheduled_date =
        current_appointment.scheduled_date
      and next_scheduled_time =
        current_appointment.scheduled_time
    then
      raise exception 'reschedule_requires_new_slot'
        using errcode = '23514';
    end if;

  elsif target_status = 'confirmed' then
    next_scheduled_date := coalesce(
      target_scheduled_date,
      current_appointment.scheduled_date,
      current_appointment.requested_date
    );

    next_scheduled_time := coalesce(
      target_scheduled_time,
      current_appointment.scheduled_time,
      current_appointment.requested_time
    );

    if next_scheduled_date is null
      or next_scheduled_time is null
    then
      raise exception 'confirmation_requires_date_and_time'
        using errcode = '23514';
    end if;

  else
    next_scheduled_date := coalesce(
      current_appointment.scheduled_date,
      current_appointment.requested_date
    );

    next_scheduled_time := coalesce(
      current_appointment.scheduled_time,
      current_appointment.requested_time
    );
  end if;

  -- Confirmation and rescheduling reserve a real active slot.
  if target_status in ('confirmed', 'rescheduled') then
    if current_appointment.clinic_id is null then
      raise exception 'appointment_clinic_required'
        using errcode = '23514';
    end if;

    -- Serialize all slot reservations for the same doctor/date.
    -- The lock lasts until the surrounding transaction commits.
    lock_key :=
      hashtextextended(
        current_appointment.doctor_id::text
          || ':'
          || next_scheduled_date::text,
        0
      );

    perform pg_advisory_xact_lock(lock_key);

    perform public.assert_appointment_slot_available(
      current_appointment.id,
      current_appointment.doctor_id,
      current_appointment.clinic_id,
      next_scheduled_date,
      next_scheduled_time,
      current_appointment.duration_minutes
    );
  end if;

  update public.appointments as appointment
  set
    status = target_status,
    scheduled_date = next_scheduled_date,
    scheduled_time = next_scheduled_time,
    reschedule_reason = case
      when target_status = 'rescheduled'
        then normalized_reason
      else appointment.reschedule_reason
    end,
    cancellation_reason = case
      when target_status = 'cancelled'
        then normalized_reason
      else appointment.cancellation_reason
    end,
    completion_note = case
      when target_status in ('completed', 'no_show')
        then normalized_reason
      else appointment.completion_note
    end
  where appointment.id = target_appointment_id;

  return query
  select
    appointment.id,
    current_appointment.status,
    appointment.status,
    appointment.scheduled_date,
    appointment.scheduled_time,
    appointment.status_changed_at
  from public.appointments as appointment
  where appointment.id = target_appointment_id;
end;
$$;

revoke all
on function public.transition_own_appointment(
  uuid,
  text,
  date,
  time,
  text
)
from public, anon;

grant execute
on function public.transition_own_appointment(
  uuid,
  text,
  date,
  time,
  text
)
to authenticated;

comment on function public.transition_own_appointment(
  uuid,
  text,
  date,
  time,
  text
) is
  'Atomically authorizes, serializes, validates, and applies appointment lifecycle transitions. Confirm and reschedule lock the doctor/date before reserving a slot.';

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  proname,
  pg_get_function_identity_arguments(oid)
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'assert_appointment_slot_available',
    'transition_own_appointment'
  )
order by proname;
