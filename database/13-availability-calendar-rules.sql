-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 52A: Availability and calendar rules
--
-- File:
-- ROMDOC/database/13-availability-calendar-rules.sql
--
-- Adds:
-- - clinic-specific weekly availability
-- - appointment duration
-- - recurring breaks
-- - exceptional days off
-- - effective appointment ranges
-- - overlap prevention
-- - working-hour validation
-- =====================================================

begin;

-- Required for exclusion constraints involving UUID equality.
create extension if not exists btree_gist;

-- =====================================================
-- 1. UPGRADE WEEKLY AVAILABILITY
-- =====================================================

alter table public.availability
  add column if not exists clinic_id uuid
    references public.clinics(id)
    on delete cascade;

alter table public.availability
  add column if not exists appointment_duration_minutes integer
    not null default 30;

alter table public.availability
  add column if not exists is_active boolean
    not null default true;

alter table public.availability
  add column if not exists created_at timestamptz
    not null default now();

alter table public.availability
  add column if not exists updated_at timestamptz
    not null default now();

-- Ensure start is before end.
alter table public.availability
  drop constraint if exists availability_valid_time_range;

alter table public.availability
  add constraint availability_valid_time_range
  check (
    start_time < end_time
  );

-- Limit normal appointment duration.
alter table public.availability
  drop constraint if exists availability_valid_duration;

alter table public.availability
  add constraint availability_valid_duration
  check (
    appointment_duration_minutes between 5 and 480
  );

-- One weekly working interval for the same doctor, clinic,
-- weekday and start time.
create unique index if not exists
  idx_availability_unique_weekly_interval
on public.availability (
  doctor_id,
  clinic_id,
  weekday,
  start_time
)
where clinic_id is not null;

create index if not exists
  idx_availability_doctor_weekday
on public.availability (
  doctor_id,
  weekday,
  is_active
);

create index if not exists
  idx_availability_doctor_clinic_weekday
on public.availability (
  doctor_id,
  clinic_id,
  weekday,
  is_active
);

-- =====================================================
-- 2. RECURRING BREAKS
-- =====================================================

create table if not exists public.availability_breaks (
  id uuid primary key default gen_random_uuid(),

  availability_id uuid not null
    references public.availability(id)
    on delete cascade,

  start_time time not null,
  end_time time not null,

  label text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint availability_breaks_valid_time_range
    check (
      start_time < end_time
    )
);

create index if not exists
  idx_availability_breaks_availability
on public.availability_breaks (
  availability_id,
  start_time
);

-- =====================================================
-- 3. EXCEPTIONAL DAYS OFF
-- =====================================================

create table if not exists public.doctor_days_off (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  clinic_id uuid
    references public.clinics(id)
    on delete cascade,

  date date not null,

  is_all_day boolean not null default true,

  start_time time,
  end_time time,

  reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint doctor_days_off_partial_time_valid
    check (
      (
        is_all_day = true
        and start_time is null
        and end_time is null
      )
      or
      (
        is_all_day = false
        and start_time is not null
        and end_time is not null
        and start_time < end_time
      )
    )
);

create index if not exists
  idx_doctor_days_off_doctor_date
on public.doctor_days_off (
  doctor_id,
  date
);

create index if not exists
  idx_doctor_days_off_doctor_clinic_date
on public.doctor_days_off (
  doctor_id,
  clinic_id,
  date
);

-- =====================================================
-- 4. APPOINTMENT DURATION AND EFFECTIVE SLOT
-- =====================================================

alter table public.appointments
  add column if not exists duration_minutes integer
    not null default 30;

alter table public.appointments
  drop constraint if exists appointments_valid_duration;

alter table public.appointments
  add constraint appointments_valid_duration
  check (
    duration_minutes between 5 and 480
  );

-- Remove generated columns if the migration is rerun after
-- a development change.
alter table public.appointments
  drop column if exists effective_start;

alter table public.appointments
  drop column if exists effective_end;

alter table public.appointments
  drop column if exists appointment_range;

-- Pending appointments use requested date/time.
-- Confirmed and rescheduled appointments normally use
-- scheduled date/time.
alter table public.appointments
  add column effective_start timestamp
  generated always as (
    (
      coalesce(
        scheduled_date,
        requested_date
      )::timestamp
      +
      coalesce(
        scheduled_time,
        requested_time
      )
    )
  ) stored;

alter table public.appointments
  add column effective_end timestamp
  generated always as (
    (
      coalesce(
        scheduled_date,
        requested_date
      )::timestamp
      +
      coalesce(
        scheduled_time,
        requested_time
      )
      +
      make_interval(
        mins => duration_minutes
      )
    )
  ) stored;

alter table public.appointments
  add column appointment_range tsrange
  generated always as (
    tsrange(
      (
        coalesce(
          scheduled_date,
          requested_date
        )::timestamp
        +
        coalesce(
          scheduled_time,
          requested_time
        )
      ),
      (
        coalesce(
          scheduled_date,
          requested_date
        )::timestamp
        +
        coalesce(
          scheduled_time,
          requested_time
        )
        +
        make_interval(
          mins => duration_minutes
        )
      ),
      '[)'
    )
  ) stored;

create index if not exists
  idx_appointments_effective_start
on public.appointments (
  doctor_id,
  effective_start
);

-- =====================================================
-- 5. CHECK FOR EXISTING OVERLAPS
-- =====================================================
--
-- The migration stops with a clear message if existing
-- active appointments overlap.
-- =====================================================

do $$
declare
  overlap_count integer;
begin
  select count(*)
  into overlap_count
  from public.appointments as a
  join public.appointments as b
    on b.doctor_id = a.doctor_id
   and b.id > a.id
   and b.status in (
     'pending',
     'confirmed',
     'rescheduled'
   )
   and a.status in (
     'pending',
     'confirmed',
     'rescheduled'
   )
   and a.appointment_range is not null
   and b.appointment_range is not null
   and a.appointment_range && b.appointment_range;

  if overlap_count > 0 then
    raise exception
      'Cannot enable overlap prevention: % existing appointment overlap(s) were found.',
      overlap_count;
  end if;
end;
$$;

-- =====================================================
-- 6. DATABASE-LEVEL OVERLAP PREVENTION
-- =====================================================

alter table public.appointments
  drop constraint if exists appointments_no_doctor_overlap;

alter table public.appointments
  add constraint appointments_no_doctor_overlap
  exclude using gist (
    doctor_id with =,
    appointment_range with &&
  )
  where (
    status in (
      'pending',
      'confirmed',
      'rescheduled'
    )
    and appointment_range is not null
  );

-- =====================================================
-- 7. SCHEDULING VALIDATION FUNCTION
-- =====================================================

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
begin
  -- Cancelled and completed appointments do not need
  -- future schedule validation.
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

  -- PostgreSQL weekday:
  -- Sunday = 0
  -- Monday = 1
  -- ...
  -- Saturday = 6
  slot_weekday :=
    extract(
      dow from slot_date
    )::integer;

  -- Verify doctor-clinic ownership.
  if not exists (
    select 1
    from public.doctor_clinics as dc
    where dc.doctor_id = new.doctor_id
      and dc.clinic_id = new.clinic_id
  ) then
    raise exception
      'The selected clinic is not associated with this doctor.';
  end if;

  -- Find a weekly working interval that contains the
  -- complete appointment.
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
  -- configured slot duration.
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

-- Trigger functions do not need direct client execution.

drop trigger if exists
  validate_appointment_schedule_trigger
on public.appointments;

create trigger
  validate_appointment_schedule_trigger
before insert or update of
  doctor_id,
  clinic_id,
  requested_date,
  requested_time,
  scheduled_date,
  scheduled_time,
  duration_minutes,
  status
on public.appointments
for each row
execute function public.validate_appointment_schedule();

-- =====================================================
-- 8. UPDATED_AT TRIGGERS
-- =====================================================

drop trigger if exists
  availability_updated_at
on public.availability;

create trigger availability_updated_at
before update on public.availability
for each row
execute function public.handle_updated_at();

drop trigger if exists
  availability_breaks_updated_at
on public.availability_breaks;

create trigger availability_breaks_updated_at
before update on public.availability_breaks
for each row
execute function public.handle_updated_at();

drop trigger if exists
  doctor_days_off_updated_at
on public.doctor_days_off;

create trigger doctor_days_off_updated_at
before update on public.doctor_days_off
for each row
execute function public.handle_updated_at();

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'availability',
    'availability_breaks',
    'doctor_days_off',
    'appointments'
  )
order by table_name;

select
  column_name,
  data_type,
  is_generated
from information_schema.columns
where table_schema = 'public'
  and table_name = 'appointments'
  and column_name in (
    'duration_minutes',
    'effective_start',
    'effective_end',
    'appointment_range'
  )
order by ordinal_position;

select
  constraint_name,
  constraint_type
from information_schema.table_constraints
where table_schema = 'public'
  and table_name = 'appointments'
  and constraint_name in (
    'appointments_valid_duration',
    'appointments_no_doctor_overlap'
  );