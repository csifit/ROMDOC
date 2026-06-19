-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 43: Appointment origin and creator
--
-- File:
-- ROMDOC/database/09-appointment-origin.sql
--
-- Purpose:
-- 1. Record how an appointment was received.
-- 2. Record which authenticated profile created it.
-- 3. Prepare appointments for doctor, staff, and admin
--    manual scheduling.
--
-- Appointment source answers:
-- "How did this appointment reach RomDoc?"
--
-- created_by_profile_id answers:
-- "Which authenticated user entered the appointment?"
-- =====================================================

begin;

-- =====================================================
-- VERIFY REQUIRED TABLES
-- =====================================================

do $$
begin
  if to_regclass('public.appointments') is null then
    raise exception
      'Migration 09 cannot continue because public.appointments does not exist.';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception
      'Migration 09 cannot continue because public.profiles does not exist.';
  end if;
end;
$$;

-- =====================================================
-- ADD APPOINTMENT SOURCE
-- =====================================================
--
-- Existing appointments were submitted through the public
-- appointment request form, so they are assigned "online".
--
-- Supported values:
--
-- online   = submitted through the public RomDoc form
-- phone    = received by telephone
-- walk_in  = patient appeared directly at the clinic
-- email    = received by email
-- other    = another manually recorded source
-- =====================================================

alter table public.appointments
  add column if not exists source text;

update public.appointments
set source = case
  when source is null then 'online'
  when lower(trim(source)) in (
    'online',
    'phone',
    'walk_in',
    'email',
    'other'
  ) then lower(trim(source))
  else 'other'
end;

alter table public.appointments
  alter column source set default 'online';

alter table public.appointments
  alter column source set not null;

-- Remove an older constraint with the same name if this
-- migration is rerun during development.

alter table public.appointments
  drop constraint if exists appointments_source_check;

alter table public.appointments
  add constraint appointments_source_check
  check (
    source in (
      'online',
      'phone',
      'walk_in',
      'email',
      'other'
    )
  );

-- =====================================================
-- ADD APPOINTMENT CREATOR
-- =====================================================
--
-- This column is nullable because public online appointment
-- requests may be submitted without authentication.
--
-- Manually created appointments will store the profile ID of
-- the doctor, staff member, or administrator who created them.
-- =====================================================

alter table public.appointments
  add column if not exists created_by_profile_id uuid;

alter table public.appointments
  drop constraint if exists appointments_created_by_profile_id_fkey;

alter table public.appointments
  add constraint appointments_created_by_profile_id_fkey
  foreign key (created_by_profile_id)
  references public.profiles(id)
  on update cascade
  on delete set null;

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists
  idx_appointments_source
on public.appointments(source);

create index if not exists
  idx_appointments_created_by_profile
on public.appointments(created_by_profile_id);

-- =====================================================
-- DOCUMENTATION
-- =====================================================

comment on column public.appointments.source is
  'How the appointment was received: online, phone, walk_in, email, or other.';

comment on column public.appointments.created_by_profile_id is
  'Authenticated profile that manually created the appointment. NULL for unauthenticated public requests or when the creator no longer exists.';

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  source,
  count(*) as appointment_count
from public.appointments
group by source
order by source;

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'appointments'
  and column_name in (
    'source',
    'created_by_profile_id'
  )
order by column_name;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'appointments'
  and indexname in (
    'idx_appointments_source',
    'idx_appointments_created_by_profile'
  )
order by indexname;