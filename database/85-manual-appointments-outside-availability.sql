-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- UX Step 1C: Allow manual appointment creation outside
-- configured public Availability
--
-- File:
-- ROMDOC/database/85-manual-appointments-outside-availability.sql
--
-- Business rule:
-- - Patient online requests must use public Availability.
-- - Doctor/Staff manual appointments may be inserted even
--   when no Availability is configured, or outside working
--   hours, breaks, and days off.
-- - Doctor-clinic association remains required.
-- - Date, time, and duration remain required/validated.
-- - Database overlap prevention remains active for every
--   pending, confirmed, and rescheduled appointment.
-- - This exception applies only when a manual appointment is
--   first inserted. Later rescheduling still uses the normal
--   availability rules.
-- =====================================================

begin;

create or replace function public.validate_appointment_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  slot_date date;
  slot_start time;
  slot_end time;
  slot_weekday integer;
  matching_availability public.availability%rowtype;
  is_manual_creation boolean;
begin
  -- Cancelled, completed, and no-show appointments do not
  -- need active schedule validation.
  if new.status not in (
    'pending',
    'confirmed',
    'rescheduled'
  ) then
    return new;
  end if;

  slot_date := coalesce(
    new.scheduled_date,
    new.requested_date
  );

  slot_start := coalesce(
    new.scheduled_time,
    new.requested_time
  );

  if slot_date is null or slot_start is null then
    raise exception
      'Appointment date and time are required.';
  end if;

  if new.clinic_id is null then
    raise exception
      'A clinic is required for scheduled appointments.';
  end if;

  if new.duration_minutes is null then
    new.duration_minutes := 30;
  end if;

  slot_end :=
    slot_start
    +
    make_interval(
      mins => new.duration_minutes
    );

  -- Verify doctor-clinic ownership for every appointment,
  -- including manual phone/walk-in/email appointments.
  if not exists (
    select 1
    from public.doctor_clinics as dc
    where dc.doctor_id = new.doctor_id
      and dc.clinic_id = new.clinic_id
  ) then
    raise exception
      'The selected clinic is not associated with this doctor.';
  end if;

  -- A doctor/staff-created appointment is already agreed
  -- operationally with the patient. On INSERT only, manual
  -- sources may bypass public working hours, breaks, days off,
  -- and configured slot-duration alignment.
  --
  -- The exclusion constraint appointments_no_doctor_overlap
  -- still executes independently after this trigger and blocks
  -- overlapping active appointments.
  is_manual_creation :=
    tg_op = 'INSERT'
    and coalesce(new.source, '') in (
      'phone',
      'walk_in',
      'email',
      'other'
    );

  if is_manual_creation then
    return new;
  end if;

  -- PostgreSQL weekday:
  -- Sunday = 0
  -- Monday = 1
  -- ...
  -- Saturday = 6
  slot_weekday :=
    extract(
      dow from slot_date
    )::integer;

  -- Find a weekly working interval that contains the complete
  -- appointment. This remains mandatory for public online
  -- requests and for later rescheduling operations.
  select a.*
  into matching_availability
  from public.availability as a
  where a.doctor_id = new.doctor_id
    and a.clinic_id = new.clinic_id
    and a.weekday = slot_weekday
    and a.is_active = true
    and slot_start >= a.start_time
    and slot_end <= a.end_time
  order by a.start_time
  limit 1;

  if matching_availability.id is null then
    raise exception
      'The appointment is outside the doctor''s working hours.';
  end if;

  -- Appointment duration must align with the doctor's
  -- configured public slot duration.
  if (
    new.duration_minutes
    %
    matching_availability.appointment_duration_minutes
  ) <> 0 then
    raise exception
      'The appointment duration does not match the configured slot duration.';
  end if;

  -- Recurring break validation.
  if exists (
    select 1
    from public.availability_breaks as ab
    where ab.availability_id =
      matching_availability.id
      and slot_start < ab.end_time
      and slot_end > ab.start_time
  ) then
    raise exception
      'The appointment overlaps a configured break.';
  end if;

  -- Exceptional day-off validation.
  if exists (
    select 1
    from public.doctor_days_off as ddo
    where ddo.doctor_id = new.doctor_id
      and ddo.date = slot_date
      and (
        ddo.clinic_id is null
        or ddo.clinic_id = new.clinic_id
      )
      and (
        ddo.is_all_day = true
        or (
          slot_start < ddo.end_time
          and slot_end > ddo.start_time
        )
      )
  ) then
    raise exception
      'The doctor is unavailable during the selected period.';
  end if;

  return new;
end;
$$;

revoke all
on function public.validate_appointment_schedule()
from public;

comment on function public.validate_appointment_schedule() is
  'Validates public online appointments and reschedules against doctor Availability. Manual phone, walk-in, email, and other appointments may be inserted outside Availability, while clinic ownership and overlap prevention remain enforced.';

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name =
    'validate_appointment_schedule';

select
  trigger_name,
  event_manipulation,
  action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'appointments'
  and trigger_name =
    'validate_appointment_schedule_trigger'
order by event_manipulation;
