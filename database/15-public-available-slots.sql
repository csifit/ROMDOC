-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 52C: Public available appointment slots
--
-- File:
-- ROMDOC/database/15-public-available-slots.sql
--
-- Purpose:
-- Return only valid, unoccupied appointment slots for a
-- doctor, clinic and date.
-- =====================================================

begin;

create or replace function public.get_available_appointment_slots(
  target_doctor_id uuid,
  target_clinic_id uuid,
  target_date date
)
returns table (
  slot_time time,
  duration_minutes integer
)
language sql
stable
security definer
set search_path = public
as $$
  with valid_doctor as (
    select d.id
    from public.doctors as d
    inner join public.doctor_clinics as dc
      on dc.doctor_id = d.id
    where d.id = target_doctor_id
      and d.status = 'active'
      and dc.clinic_id = target_clinic_id
  ),

  active_availability as (
    select
      a.id,
      a.start_time,
      a.end_time,
      a.appointment_duration_minutes
    from public.availability as a
    inner join valid_doctor as vd
      on vd.id = a.doctor_id
    where a.clinic_id = target_clinic_id
      and a.weekday = extract(
        dow from target_date
      )::integer
      and a.is_active = true
  ),

  generated_slots as (
    select
      a.id as availability_id,

      generated_slot::time
        as slot_time,

      a.appointment_duration_minutes
        as duration_minutes,

      generated_slot
        as slot_start_timestamp,

      generated_slot
        + make_interval(
            mins =>
              a.appointment_duration_minutes
          )
        as slot_end_timestamp

    from active_availability as a

    cross join lateral generate_series(
      target_date::timestamp
        + a.start_time,

      target_date::timestamp
        + a.end_time
        - make_interval(
            mins =>
              a.appointment_duration_minutes
          ),

      make_interval(
        mins =>
          a.appointment_duration_minutes
      )
    ) as generated_slot
  )

  select distinct
    gs.slot_time,
    gs.duration_minutes

  from generated_slots as gs

  where
    -- Do not expose slots during recurring breaks.
    not exists (
      select 1
      from public.availability_breaks as ab
      where ab.availability_id =
        gs.availability_id
        and gs.slot_time < ab.end_time
        and (
          gs.slot_time
          + make_interval(
              mins =>
                gs.duration_minutes
            )
        )::time > ab.start_time
    )

    -- Do not expose full or partial days off.
    and not exists (
      select 1
      from public.doctor_days_off as ddo
      where ddo.doctor_id =
        target_doctor_id
        and ddo.date =
          target_date
        and (
          ddo.clinic_id is null
          or ddo.clinic_id =
            target_clinic_id
        )
        and (
          ddo.is_all_day = true
          or (
            gs.slot_time <
              ddo.end_time
            and
            (
              gs.slot_time
              + make_interval(
                  mins =>
                    gs.duration_minutes
                )
            )::time >
              ddo.start_time
          )
        )
    )

    -- Do not expose slots overlapping active appointments.
    and not exists (
      select 1
      from public.appointments as ap
      where ap.doctor_id =
        target_doctor_id
        and ap.status in (
          'pending',
          'confirmed',
          'rescheduled'
        )
        and ap.appointment_range
          &&
          tsrange(
            gs.slot_start_timestamp,
            gs.slot_end_timestamp,
            '[)'
          )
    )

    -- A patient cannot book a time that has already passed.
    and (
      target_date > current_date
      or (
        target_date = current_date
        and gs.slot_time >
          localtime
      )
    )

  order by slot_time;
$$;

revoke all
on function public.get_available_appointment_slots(
  uuid,
  uuid,
  date
)
from public;

grant execute
on function public.get_available_appointment_slots(
  uuid,
  uuid,
  date
)
to anon, authenticated;

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
    'get_available_appointment_slots';