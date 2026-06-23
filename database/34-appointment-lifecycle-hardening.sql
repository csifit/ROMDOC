-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 62A: Canonical appointment statuses and transition engine
--
-- File:
-- ROMDOC/database/34-appointment-lifecycle-hardening.sql
--
-- Adds:
--   - canonical appointment statuses, including no_show
--   - terminal-status protection
--   - lifecycle timestamps and reasons
--   - database transition validation trigger
--   - authenticated atomic transition RPC
--   - lifecycle query indexes
--
-- Important:
--   Appointment creation remains in the existing patient,
--   doctor, and staff creation routes. All later status
--   changes should migrate to transition_own_appointment().
-- =====================================================

begin;

-- =====================================================
-- 1. LIFECYCLE COLUMNS
-- =====================================================

alter table public.appointments
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_changed_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists no_show_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists completion_note text;

comment on column public.appointments.status_changed_at is
  'Timestamp of the most recent appointment status transition.';

comment on column public.appointments.status_changed_by_profile_id is
  'Authenticated profile that performed the most recent status transition. Null only for trusted system operations or legacy data.';

comment on column public.appointments.cancelled_at is
  'Timestamp when the appointment entered the terminal cancelled status.';

comment on column public.appointments.completed_at is
  'Timestamp when the appointment entered the terminal completed status.';

comment on column public.appointments.no_show_at is
  'Timestamp when the appointment entered the terminal no_show status.';

comment on column public.appointments.cancellation_reason is
  'Optional reason supplied when the appointment is cancelled.';

comment on column public.appointments.completion_note is
  'Optional operational note supplied when completing or marking a no-show. This is not a medical record.';

alter table public.appointments
  drop constraint if exists appointments_cancellation_reason_length_check;

alter table public.appointments
  add constraint appointments_cancellation_reason_length_check
  check (
    cancellation_reason is null
    or char_length(trim(cancellation_reason)) between 1 and 1000
  );

alter table public.appointments
  drop constraint if exists appointments_completion_note_length_check;

alter table public.appointments
  add constraint appointments_completion_note_length_check
  check (
    completion_note is null
    or char_length(trim(completion_note)) between 1 and 2000
  );

-- =====================================================
-- 2. CANONICAL STATUS SET
-- =====================================================

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (
    status in (
      'pending',
      'confirmed',
      'rescheduled',
      'cancelled',
      'completed',
      'no_show'
    )
  )
  not valid;

alter table public.appointments
  validate constraint appointments_status_check;

-- Backfill lifecycle timestamps for existing terminal rows.
update public.appointments
set
  status_changed_at = coalesce(status_changed_at, updated_at, created_at),
  cancelled_at = case
    when status = 'cancelled'
      then coalesce(cancelled_at, updated_at, created_at)
    else cancelled_at
  end,
  completed_at = case
    when status = 'completed'
      then coalesce(completed_at, updated_at, created_at)
    else completed_at
  end,
  no_show_at = case
    when status = 'no_show'
      then coalesce(no_show_at, updated_at, created_at)
    else no_show_at
  end
where
  status_changed_at is null
  or (status = 'cancelled' and cancelled_at is null)
  or (status = 'completed' and completed_at is null)
  or (status = 'no_show' and no_show_at is null);

-- =====================================================
-- 3. CANONICAL TRANSITION VALIDATION
-- =====================================================

create or replace function public.is_valid_appointment_transition(
  previous_status text,
  next_status text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    -- Same-status data edits are not lifecycle transitions.
    when previous_status = next_status then true

    -- A patient request can be accepted, counter-proposed,
    -- or cancelled.
    when previous_status = 'pending'
      and next_status in (
        'confirmed',
        'rescheduled',
        'cancelled'
      )
      then true

    -- A confirmed appointment may be moved or finalized.
    when previous_status = 'confirmed'
      and next_status in (
        'rescheduled',
        'cancelled',
        'completed',
        'no_show'
      )
      then true

    -- A rescheduled appointment may be accepted again,
    -- moved again, or finalized.
    when previous_status = 'rescheduled'
      and next_status in (
        'confirmed',
        'cancelled',
        'completed',
        'no_show'
      )
      then true

    -- Terminal statuses never return to an active state.
    when previous_status in (
      'cancelled',
      'completed',
      'no_show'
    )
      then false

    else false
  end;
$$;

revoke all
on function public.is_valid_appointment_transition(text, text)
from public;

grant execute
on function public.is_valid_appointment_transition(text, text)
to authenticated, service_role;

comment on function public.is_valid_appointment_transition(text, text) is
  'Returns whether an appointment may move from one canonical status to another. Cancelled, completed, and no_show are terminal.';

-- =====================================================
-- 4. TRANSITION GUARD TRIGGER
-- =====================================================

create or replace function public.guard_appointment_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_actor uuid;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if not public.is_valid_appointment_transition(
    old.status,
    new.status
  ) then
    raise exception
      'invalid_appointment_transition:%->%',
      old.status,
      new.status
      using errcode = '23514';
  end if;

  -- Confirmed, rescheduled, completed, and no-show records
  -- must have an actual scheduled date and time.
  if new.status in (
    'confirmed',
    'rescheduled',
    'completed',
    'no_show'
  ) and (
    new.scheduled_date is null
    or new.scheduled_time is null
  ) then
    raise exception
      'scheduled_date_and_time_required_for_status:%',
      new.status
      using errcode = '23514';
  end if;

  -- A reschedule must actually change the scheduled slot.
  if new.status = 'rescheduled'
    and old.scheduled_date is not null
    and old.scheduled_time is not null
    and new.scheduled_date = old.scheduled_date
    and new.scheduled_time = old.scheduled_time
  then
    raise exception
      'rescheduled_appointment_requires_a_new_slot'
      using errcode = '23514';
  end if;

  resolved_actor := auth.uid();

  new.status_changed_at := now();
  new.status_changed_by_profile_id := resolved_actor;

  if new.status = 'cancelled' then
    new.cancelled_at := now();
  elsif new.status = 'completed' then
    new.completed_at := now();
  elsif new.status = 'no_show' then
    new.no_show_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists
  guard_appointment_lifecycle_transition
on public.appointments;

create trigger
  guard_appointment_lifecycle_transition
before update of
  status,
  scheduled_date,
  scheduled_time
on public.appointments
for each row
execute function public.guard_appointment_lifecycle();

comment on function public.guard_appointment_lifecycle() is
  'Rejects invalid status transitions, requires scheduled fields for operational statuses, protects terminal appointments, and records lifecycle timestamps.';

-- =====================================================
-- 5. AUTHENTICATED ATOMIC TRANSITION RPC
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

  if current_profile_role is null then
    raise exception 'active_profile_required'
      using errcode = '42501';
  end if;

  if current_account_status is distinct from 'active' then
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

  -- Administrators may intervene in any appointment.
  if current_profile_role = 'admin' then
    is_authorized := true;

  -- Doctors may transition only their own appointments.
  elsif current_profile_role = 'doctor' then
    select exists (
      select 1
      from public.doctors as doctor
      where doctor.id = current_appointment.doctor_id
        and doctor.profile_id = current_profile_id
    )
    into is_authorized;

  -- Staff may transition only appointments for an active
  -- doctor + clinic assignment.
  elsif current_profile_role = 'staff' then
    is_authorized :=
      current_appointment.clinic_id is not null
      and public.is_staff_for_doctor_clinic(
        current_profile_id,
        current_appointment.doctor_id,
        current_appointment.clinic_id
      );

  -- Patients may only cancel their own appointment.
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

  normalized_reason := nullif(trim(transition_reason), '');

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
    -- Confirmation may explicitly supply a slot, reuse an
    -- existing scheduled slot, or promote the requested slot.
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
  'Atomically transitions an appointment after validating canonical status rules and actor permissions. Patient access is cancellation-only.';

-- =====================================================
-- 6. LIFECYCLE INDEXES
-- =====================================================

create index if not exists
  idx_appointments_doctor_status_schedule
on public.appointments (
  doctor_id,
  status,
  scheduled_date,
  scheduled_time
);

create index if not exists
  idx_appointments_patient_status_schedule
on public.appointments (
  patient_profile_id,
  status,
  scheduled_date,
  scheduled_time
);

create index if not exists
  idx_appointments_status_changed_at
on public.appointments (
  status,
  status_changed_at desc
);

create index if not exists
  idx_appointments_status_changed_by
on public.appointments (
  status_changed_by_profile_id,
  status_changed_at desc
)
where status_changed_by_profile_id is not null;

commit;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after the migration if desired.
-- =====================================================

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'appointments'
  and column_name in (
    'status_changed_at',
    'status_changed_by_profile_id',
    'cancelled_at',
    'completed_at',
    'no_show_at',
    'cancellation_reason',
    'completion_note'
  )
order by ordinal_position;

select
  proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'is_valid_appointment_transition',
    'guard_appointment_lifecycle',
    'transition_own_appointment'
  )
order by proname;
