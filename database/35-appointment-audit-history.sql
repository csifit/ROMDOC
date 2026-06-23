-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 62B: Immutable appointment audit history
--
-- File:
-- ROMDOC/database/35-appointment-audit-history.sql
--
-- Adds:
--   - immutable appointment audit-event table
--   - automatic creation and lifecycle event recording
--   - actor role and ownership snapshots
--   - schedule and reason snapshots
--   - doctor, staff, and admin read policies
--   - backfill event for existing appointments
--
-- Important privacy rule:
--   Patients do not receive direct SELECT access to this
--   internal audit table. A later patient API may expose a
--   safe subset of lifecycle events.
-- =====================================================

begin;

-- =====================================================
-- 1. APPOINTMENT AUDIT EVENTS
-- =====================================================

create table if not exists public.appointment_audit_events (
  id uuid primary key default gen_random_uuid(),

  appointment_id uuid not null
    references public.appointments(id)
    on update cascade
    on delete restrict,

  doctor_id uuid not null
    references public.doctors(id)
    on update cascade
    on delete restrict,

  clinic_id uuid
    references public.clinics(id)
    on update cascade
    on delete set null,

  patient_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  event_type text not null
    constraint appointment_audit_event_type_check
    check (
      event_type in (
        'appointment_created',
        'confirmed',
        'rescheduled',
        'cancelled_by_patient',
        'cancelled_by_doctor',
        'cancelled_by_staff',
        'cancelled_by_admin',
        'cancelled_by_system',
        'completed',
        'marked_no_show',
        'schedule_changed',
        'notes_updated',
        'status_changed'
      )
    ),

  previous_status text,
  new_status text not null,

  actor_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  actor_role text not null
    constraint appointment_audit_actor_role_check
    check (
      actor_role in (
        'patient',
        'user',
        'doctor',
        'staff',
        'admin',
        'system'
      )
    ),

  reason text,

  previous_scheduled_date date,
  previous_scheduled_time time,
  new_scheduled_date date,
  new_scheduled_time time,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint appointment_audit_reason_length_check
    check (
      reason is null
      or char_length(trim(reason)) between 1 and 2000
    )
);

comment on table public.appointment_audit_events is
  'Immutable operational history for appointment creation, lifecycle transitions, schedule changes, and note-change indicators.';

comment on column public.appointment_audit_events.patient_profile_id is
  'Patient ownership snapshot used for authorization and future safe timeline APIs.';

comment on column public.appointment_audit_events.reason is
  'Operational transition reason. It is not a medical record or clinical note.';

comment on column public.appointment_audit_events.metadata is
  'Non-sensitive audit metadata. Patient contact details and full appointment notes must not be stored here.';

-- =====================================================
-- 2. INDEXES
-- =====================================================

create index if not exists
  idx_appointment_audit_appointment_created
on public.appointment_audit_events (
  appointment_id,
  created_at asc
);

create index if not exists
  idx_appointment_audit_doctor_created
on public.appointment_audit_events (
  doctor_id,
  created_at desc
);

create index if not exists
  idx_appointment_audit_patient_created
on public.appointment_audit_events (
  patient_profile_id,
  created_at desc
)
where patient_profile_id is not null;

create index if not exists
  idx_appointment_audit_actor_created
on public.appointment_audit_events (
  actor_profile_id,
  created_at desc
)
where actor_profile_id is not null;

create index if not exists
  idx_appointment_audit_event_type_created
on public.appointment_audit_events (
  event_type,
  created_at desc
);

-- =====================================================
-- 3. ACTOR AND EVENT HELPERS
-- =====================================================

create or replace function public.resolve_appointment_audit_actor_role(
  requested_actor_profile_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_role text;
begin
  if requested_actor_profile_id is null then
    return 'system';
  end if;

  select profile.role
  into resolved_role
  from public.profiles as profile
  where profile.id = requested_actor_profile_id;

  if resolved_role in (
    'patient',
    'user',
    'doctor',
    'staff',
    'admin'
  ) then
    return resolved_role;
  end if;

  return 'system';
end;
$$;

revoke all
on function public.resolve_appointment_audit_actor_role(uuid)
from public;

grant execute
on function public.resolve_appointment_audit_actor_role(uuid)
to authenticated, service_role;

comment on function public.resolve_appointment_audit_actor_role(uuid) is
  'Returns the supported appointment-audit role for a profile, or system when no supported actor can be resolved.';

create or replace function public.resolve_appointment_audit_event_type(
  requested_status text,
  requested_actor_role text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when requested_status = 'confirmed'
      then 'confirmed'

    when requested_status = 'rescheduled'
      then 'rescheduled'

    when requested_status = 'cancelled'
      and requested_actor_role in ('patient', 'user')
      then 'cancelled_by_patient'

    when requested_status = 'cancelled'
      and requested_actor_role = 'doctor'
      then 'cancelled_by_doctor'

    when requested_status = 'cancelled'
      and requested_actor_role = 'staff'
      then 'cancelled_by_staff'

    when requested_status = 'cancelled'
      and requested_actor_role = 'admin'
      then 'cancelled_by_admin'

    when requested_status = 'cancelled'
      then 'cancelled_by_system'

    when requested_status = 'completed'
      then 'completed'

    when requested_status = 'no_show'
      then 'marked_no_show'

    else 'status_changed'
  end;
$$;

revoke all
on function public.resolve_appointment_audit_event_type(text, text)
from public;

grant execute
on function public.resolve_appointment_audit_event_type(text, text)
to authenticated, service_role;

-- =====================================================
-- 4. AUTOMATIC AUDIT TRIGGER
-- =====================================================

create or replace function public.record_appointment_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_actor_profile_id uuid;
  resolved_actor_role text;
  resolved_event_type text;
  resolved_reason text;
  resolved_metadata jsonb;
begin
  if tg_op = 'INSERT' then
    resolved_actor_profile_id := coalesce(
      auth.uid(),
      new.created_by_profile_id
    );

    resolved_actor_role :=
      public.resolve_appointment_audit_actor_role(
        resolved_actor_profile_id
      );

    insert into public.appointment_audit_events (
      appointment_id,
      doctor_id,
      clinic_id,
      patient_profile_id,
      event_type,
      previous_status,
      new_status,
      actor_profile_id,
      actor_role,
      reason,
      previous_scheduled_date,
      previous_scheduled_time,
      new_scheduled_date,
      new_scheduled_time,
      metadata,
      created_at
    )
    values (
      new.id,
      new.doctor_id,
      new.clinic_id,
      new.patient_profile_id,
      'appointment_created',
      null,
      new.status,
      resolved_actor_profile_id,
      resolved_actor_role,
      null,
      null,
      null,
      new.scheduled_date,
      new.scheduled_time,
      jsonb_strip_nulls(
        jsonb_build_object(
          'source',
          new.source,
          'requested_date',
          new.requested_date,
          'requested_time',
          new.requested_time,
          'duration_minutes',
          new.duration_minutes
        )
      ),
      new.created_at
    );

    return new;
  end if;

  resolved_actor_profile_id := coalesce(
    auth.uid(),
    new.status_changed_by_profile_id,
    new.created_by_profile_id
  );

  resolved_actor_role :=
    public.resolve_appointment_audit_actor_role(
      resolved_actor_profile_id
    );

  if old.status is distinct from new.status then
    resolved_event_type :=
      public.resolve_appointment_audit_event_type(
        new.status,
        resolved_actor_role
      );

    resolved_reason := case
      when new.status = 'rescheduled'
        then nullif(trim(new.reschedule_reason), '')
      when new.status = 'cancelled'
        then nullif(trim(new.cancellation_reason), '')
      when new.status in ('completed', 'no_show')
        then nullif(trim(new.completion_note), '')
      else null
    end;

    resolved_metadata := jsonb_strip_nulls(
      jsonb_build_object(
        'source',
        new.source,
        'status_changed_at',
        new.status_changed_at,
        'cancelled_at',
        new.cancelled_at,
        'completed_at',
        new.completed_at,
        'no_show_at',
        new.no_show_at
      )
    );

  elsif
    old.scheduled_date is distinct from new.scheduled_date
    or old.scheduled_time is distinct from new.scheduled_time
  then
    resolved_event_type := 'schedule_changed';
    resolved_reason := nullif(trim(new.reschedule_reason), '');

    resolved_metadata := jsonb_build_object(
      'status_unchanged',
      true
    );

  elsif old.notes is distinct from new.notes then
    resolved_event_type := 'notes_updated';
    resolved_reason := null;

    -- Do not copy note contents into the audit table.
    resolved_metadata := jsonb_build_object(
      'notes_changed',
      true,
      'previous_notes_present',
      old.notes is not null
        and length(trim(old.notes)) > 0,
      'new_notes_present',
      new.notes is not null
        and length(trim(new.notes)) > 0
    );

  else
    return new;
  end if;

  insert into public.appointment_audit_events (
    appointment_id,
    doctor_id,
    clinic_id,
    patient_profile_id,
    event_type,
    previous_status,
    new_status,
    actor_profile_id,
    actor_role,
    reason,
    previous_scheduled_date,
    previous_scheduled_time,
    new_scheduled_date,
    new_scheduled_time,
    metadata,
    created_at
  )
  values (
    new.id,
    new.doctor_id,
    new.clinic_id,
    new.patient_profile_id,
    resolved_event_type,
    old.status,
    new.status,
    resolved_actor_profile_id,
    resolved_actor_role,
    resolved_reason,
    old.scheduled_date,
    old.scheduled_time,
    new.scheduled_date,
    new.scheduled_time,
    resolved_metadata,
    coalesce(
      new.status_changed_at,
      new.updated_at,
      now()
    )
  );

  return new;
end;
$$;

drop trigger if exists
  record_appointment_audit_event_trigger
on public.appointments;

create trigger
  record_appointment_audit_event_trigger
after insert or update of
  status,
  scheduled_date,
  scheduled_time,
  notes
on public.appointments
for each row
execute function public.record_appointment_audit_event();

comment on function public.record_appointment_audit_event() is
  'Writes immutable appointment audit events without copying patient contact details or full appointment notes.';

-- =====================================================
-- 5. BACKFILL EXISTING APPOINTMENTS
-- =====================================================

insert into public.appointment_audit_events (
  appointment_id,
  doctor_id,
  clinic_id,
  patient_profile_id,
  event_type,
  previous_status,
  new_status,
  actor_profile_id,
  actor_role,
  reason,
  previous_scheduled_date,
  previous_scheduled_time,
  new_scheduled_date,
  new_scheduled_time,
  metadata,
  created_at
)
select
  appointment.id,
  appointment.doctor_id,
  appointment.clinic_id,
  appointment.patient_profile_id,
  'appointment_created',
  null,
  appointment.status,
  appointment.created_by_profile_id,
  public.resolve_appointment_audit_actor_role(
    appointment.created_by_profile_id
  ),
  null,
  null,
  null,
  appointment.scheduled_date,
  appointment.scheduled_time,
  jsonb_strip_nulls(
    jsonb_build_object(
      'backfilled',
      true,
      'source',
      appointment.source,
      'requested_date',
      appointment.requested_date,
      'requested_time',
      appointment.requested_time,
      'duration_minutes',
      appointment.duration_minutes,
      'current_status_at_backfill',
      appointment.status
    )
  ),
  appointment.created_at
from public.appointments as appointment
where not exists (
  select 1
  from public.appointment_audit_events as event
  where event.appointment_id = appointment.id
);

-- =====================================================
-- 6. IMMUTABILITY GUARD
-- =====================================================

create or replace function public.prevent_appointment_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'appointment_audit_events_are_immutable'
    using errcode = '55000';
end;
$$;

drop trigger if exists
  prevent_appointment_audit_update
on public.appointment_audit_events;

create trigger
  prevent_appointment_audit_update
before update
on public.appointment_audit_events
for each row
execute function public.prevent_appointment_audit_mutation();

drop trigger if exists
  prevent_appointment_audit_delete
on public.appointment_audit_events;

create trigger
  prevent_appointment_audit_delete
before delete
on public.appointment_audit_events
for each row
execute function public.prevent_appointment_audit_mutation();

comment on function public.prevent_appointment_audit_mutation() is
  'Prevents updates and deletions of appointment audit events, including privileged accidental mutations.';

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

alter table public.appointment_audit_events
  enable row level security;

drop policy if exists
  "Admins can read all appointment audit events"
on public.appointment_audit_events;

drop policy if exists
  "Doctors can read own appointment audit events"
on public.appointment_audit_events;

drop policy if exists
  "Staff can read assigned appointment audit events"
on public.appointment_audit_events;

create policy
  "Admins can read all appointment audit events"
on public.appointment_audit_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'admin'
      and profile.account_status = 'active'
  )
);

create policy
  "Doctors can read own appointment audit events"
on public.appointment_audit_events
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id =
      appointment_audit_events.doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
);

create policy
  "Staff can read assigned appointment audit events"
on public.appointment_audit_events
for select
to authenticated
using (
  appointment_audit_events.clinic_id is not null
  and public.is_staff_for_doctor_clinic(
    auth.uid(),
    appointment_audit_events.doctor_id,
    appointment_audit_events.clinic_id
  )
  and exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'staff'
      and profile.account_status = 'active'
  )
);

revoke all
on table public.appointment_audit_events
from public, anon, authenticated;

grant select
on table public.appointment_audit_events
to authenticated;

-- Direct insert is intentionally unavailable. The
-- security-definer appointment trigger is the writer.
-- Direct update and delete are blocked by both privileges
-- and immutable-table triggers.

commit;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'appointment_audit_events'
order by ordinal_position;

select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'appointment_audit_events'
order by policyname;

select
  event_type,
  count(*) as event_count
from public.appointment_audit_events
group by event_type
order by event_type;
