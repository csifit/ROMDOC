-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 64A: Appointment reminder schema and scheduling rules
--
-- File:
-- ROMDOC/database/43-appointment-reminder-scheduling.sql
--
-- Requires:
--   appointments lifecycle migrations through Step 62
--   appointment_notification_deliveries from migration 38
--
-- Scope:
--   - schedules 48-hour and 24-hour email reminders
--   - uses Europe/Bucharest for appointment local time
--   - schedules only confirmed/rescheduled appointments
--   - cancels pending reminder rows when appointment becomes
--     cancelled, completed, no_show, or otherwise ineligible
--   - preserves old reminder rows when an appointment is moved
--   - leaves actual sending for Step 64B
-- =====================================================

begin;

-- =====================================================
-- 1. REMINDER SCHEDULE TABLE
-- =====================================================

create table if not exists public.appointment_reminder_schedules (
  id uuid primary key default gen_random_uuid(),

  appointment_id uuid not null
    references public.appointments(id)
    on update cascade
    on delete restrict,

  reminder_type text not null
    constraint appointment_reminder_type_check
    check (
      reminder_type in (
        '48_hours',
        '24_hours'
      )
    ),

  channel text not null default 'email'
    constraint appointment_reminder_channel_check
    check (
      channel in (
        'email'
      )
    ),

  appointment_occurrence_at timestamptz not null,
  scheduled_for timestamptz not null,

  schedule_status text not null default 'scheduled'
    constraint appointment_reminder_schedule_status_check
    check (
      schedule_status in (
        'scheduled',
        'processing',
        'sent',
        'failed',
        'skipped',
        'cancelled'
      )
    ),

  attempt_count integer not null default 0
    constraint appointment_reminder_attempt_count_check
    check (
      attempt_count >= 0
    ),

  locked_at timestamptz,
  locked_by text,

  sent_at timestamptz,
  skipped_at timestamptz,
  cancelled_at timestamptz,

  last_error_code text,
  last_error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointment_reminder_schedule_unique
    unique (
      appointment_id,
      reminder_type,
      channel,
      appointment_occurrence_at
    ),

  constraint appointment_reminder_schedule_before_appointment
    check (
      scheduled_for < appointment_occurrence_at
    ),

  constraint appointment_reminder_schedule_error_length
    check (
      last_error_message is null
      or char_length(last_error_message) <= 2000
    ),

  constraint appointment_reminder_schedule_lock_pair
    check (
      (
        locked_at is null
        and locked_by is null
      )
      or (
        locked_at is not null
        and locked_by is not null
      )
    )
);

comment on table public.appointment_reminder_schedules is
  'Scheduling state for appointment reminders. Actual provider delivery attempts remain in appointment_notification_deliveries.';

comment on column public.appointment_reminder_schedules.appointment_occurrence_at is
  'Appointment date and time converted from Europe/Bucharest local time to timestamptz.';

comment on column public.appointment_reminder_schedules.scheduled_for is
  'UTC instant at which the reminder becomes eligible for processing.';

create index if not exists
  idx_appointment_reminder_due
on public.appointment_reminder_schedules (
  scheduled_for,
  id
)
where schedule_status = 'scheduled';

create index if not exists
  idx_appointment_reminder_appointment_created
on public.appointment_reminder_schedules (
  appointment_id,
  created_at desc
);

create index if not exists
  idx_appointment_reminder_status_updated
on public.appointment_reminder_schedules (
  schedule_status,
  updated_at desc
);

-- =====================================================
-- 2. UPDATED_AT TRIGGER
-- =====================================================

create or replace function
  public.set_appointment_reminder_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists
  appointment_reminder_updated_at
on public.appointment_reminder_schedules;

create trigger
  appointment_reminder_updated_at
before update
on public.appointment_reminder_schedules
for each row
execute function
  public.set_appointment_reminder_updated_at();

-- =====================================================
-- 3. LOCAL APPOINTMENT TIME HELPER
-- =====================================================

create or replace function
  public.appointment_occurrence_instant(
    appointment_date date,
    appointment_time time
  )
returns timestamptz
language sql
immutable
set search_path = public
as $$
  select
    (
      appointment_date +
      appointment_time
    )
    at time zone 'Europe/Bucharest';
$$;

comment on function
  public.appointment_occurrence_instant(date, time)
is
  'Converts a Romania-local appointment date/time into an absolute timestamptz instant.';

-- =====================================================
-- 4. REMINDER SYNCHRONIZATION FUNCTION
-- =====================================================

create or replace function
  public.sync_appointment_reminder_schedules(
    target_appointment_id uuid
  )
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record public.appointments%rowtype;
  occurrence_at timestamptz;
  changed_count integer := 0;
  inserted_count integer := 0;
begin
  select *
  into appointment_record
  from public.appointments
  where id = target_appointment_id
  for update;

  if not found then
    raise exception 'appointment_not_found'
      using errcode = 'P0002';
  end if;

  -- Existing unsent reminder rows must stop when the appointment
  -- is no longer eligible or its occurrence changes.
  if (
    appointment_record.status not in (
      'confirmed',
      'rescheduled'
    )
    or appointment_record.scheduled_date is null
    or appointment_record.scheduled_time is null
    or nullif(
      trim(
        appointment_record.patient_email
      ),
      ''
    ) is null
  ) then
    update public.appointment_reminder_schedules
    set
      schedule_status = 'cancelled',
      cancelled_at = coalesce(
        cancelled_at,
        now()
      ),
      locked_at = null,
      locked_by = null
    where appointment_id =
      target_appointment_id
      and schedule_status in (
        'scheduled',
        'processing',
        'failed'
      );

    get diagnostics changed_count =
      row_count;

    return changed_count;
  end if;

  occurrence_at :=
    public.appointment_occurrence_instant(
      appointment_record.scheduled_date,
      appointment_record.scheduled_time
    );

  -- A reschedule creates a new occurrence identity. Any unsent rows
  -- for the previous occurrence are cancelled but kept for audit.
  update public.appointment_reminder_schedules
  set
    schedule_status = 'cancelled',
    cancelled_at = coalesce(
      cancelled_at,
      now()
    ),
    locked_at = null,
    locked_by = null
  where appointment_id =
    target_appointment_id
    and appointment_occurrence_at
      is distinct from occurrence_at
    and schedule_status in (
      'scheduled',
      'processing',
      'failed'
    );

  get diagnostics changed_count =
    row_count;

  -- Only future reminder instants are scheduled. A reminder whose
  -- due time has already passed is not backfilled automatically.
  if occurrence_at - interval '48 hours' > now() then
    insert into public.appointment_reminder_schedules (
      appointment_id,
      reminder_type,
      channel,
      appointment_occurrence_at,
      scheduled_for,
      schedule_status
    )
    values (
      target_appointment_id,
      '48_hours',
      'email',
      occurrence_at,
      occurrence_at - interval '48 hours',
      'scheduled'
    )
    on conflict (
      appointment_id,
      reminder_type,
      channel,
      appointment_occurrence_at
    )
    do nothing;

    get diagnostics inserted_count =
      row_count;

    changed_count :=
      changed_count +
      inserted_count;
  end if;

  if occurrence_at - interval '24 hours' > now() then
    insert into public.appointment_reminder_schedules (
      appointment_id,
      reminder_type,
      channel,
      appointment_occurrence_at,
      scheduled_for,
      schedule_status
    )
    values (
      target_appointment_id,
      '24_hours',
      'email',
      occurrence_at,
      occurrence_at - interval '24 hours',
      'scheduled'
    )
    on conflict (
      appointment_id,
      reminder_type,
      channel,
      appointment_occurrence_at
    )
    do nothing;

    get diagnostics inserted_count =
      row_count;

    changed_count :=
      changed_count +
      inserted_count;
  end if;

  return changed_count;
end;
$$;

revoke all
on function
  public.sync_appointment_reminder_schedules(uuid)
from public, anon, authenticated;

grant execute
on function
  public.sync_appointment_reminder_schedules(uuid)
to service_role;

comment on function
  public.sync_appointment_reminder_schedules(uuid)
is
  'Synchronizes future 48-hour and 24-hour reminder rows for one appointment. Intended for triggers and trusted server-side use.';

-- =====================================================
-- 5. APPOINTMENT TRIGGER
-- =====================================================

create or replace function
  public.handle_appointment_reminder_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform
    public.sync_appointment_reminder_schedules(
      new.id
    );

  return new;
end;
$$;

drop trigger if exists
  sync_appointment_reminders_after_change
on public.appointments;

create trigger
  sync_appointment_reminders_after_change
after insert or update of
  status,
  scheduled_date,
  scheduled_time,
  patient_email
on public.appointments
for each row
execute function
  public.handle_appointment_reminder_schedule_change();

-- =====================================================
-- 6. BACKFILL CURRENT ELIGIBLE APPOINTMENTS
-- =====================================================

do $$
declare
  appointment_row record;
begin
  for appointment_row in
    select appointment.id
    from public.appointments
      as appointment
    where appointment.status in (
      'confirmed',
      'rescheduled'
    )
      and appointment.scheduled_date
        is not null
      and appointment.scheduled_time
        is not null
      and nullif(
        trim(
          appointment.patient_email
        ),
        ''
      ) is not null
  loop
    perform
      public.sync_appointment_reminder_schedules(
        appointment_row.id
      );
  end loop;
end;
$$;

-- =====================================================
-- 7. RLS AND ACCESS
-- =====================================================

alter table
  public.appointment_reminder_schedules
enable row level security;

create policy
  "Admins can read appointment reminder schedules"
on public.appointment_reminder_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'active'
  )
);

create policy
  "Doctors can read own appointment reminder schedules"
on public.appointment_reminder_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments appointment
    join public.doctors doctor
      on doctor.id =
        appointment.doctor_id
    join public.profiles profile
      on profile.id =
        doctor.profile_id
    where appointment.id =
      appointment_reminder_schedules.appointment_id
      and doctor.profile_id =
        auth.uid()
      and profile.account_status =
        'active'
  )
);

create policy
  "Staff can read assigned appointment reminder schedules"
on public.appointment_reminder_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments appointment
    where appointment.id =
      appointment_reminder_schedules.appointment_id
      and appointment.clinic_id
        is not null
      and public.is_staff_for_doctor_clinic(
        auth.uid(),
        appointment.doctor_id,
        appointment.clinic_id
      )
  )
);

revoke all
on table
  public.appointment_reminder_schedules
from public, anon, authenticated;

grant select
on table
  public.appointment_reminder_schedules
to authenticated;

-- Inserts and updates are intentionally restricted to trusted
-- database functions and the service role.

commit;
