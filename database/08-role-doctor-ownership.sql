-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 39: Roles and doctor ownership
--
-- File:
-- ROMDOC/database/08-role-doctor-ownership.sql
--
-- Purpose:
-- 1. Add the patient role.
-- 2. Change the default profile role from doctor to patient.
-- 3. Normalize any existing role values.
-- 4. Ensure one authenticated profile can own only one doctor record.
-- 5. Add indexes needed for secure role and ownership checks.
-- =====================================================

begin;

-- =====================================================
-- VERIFY REQUIRED TABLES
-- =====================================================

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception
      'Migration 08 cannot continue because public.profiles does not exist.';
  end if;

  if to_regclass('public.doctors') is null then
    raise exception
      'Migration 08 cannot continue because public.doctors does not exist.';
  end if;
end;
$$;

-- =====================================================
-- NORMALIZE EXISTING PROFILE ROLES
-- =====================================================
--
-- The original schema used doctor as the default role.
-- From this migration forward, new ordinary accounts start
-- with the patient role.
--
-- Existing valid doctor accounts remain doctors.
-- Existing admins and staff retain their roles.
-- Older "user" values are converted to "patient".
-- NULL or unknown values are converted to "patient".
-- =====================================================

update public.profiles
set role = case
  when role is null then 'patient'
  when lower(trim(role)) = 'user' then 'patient'
  when lower(trim(role)) in (
    'patient',
    'doctor',
    'staff',
    'admin'
  ) then lower(trim(role))
  else 'patient'
end;

-- =====================================================
-- REPLACE THE OLD ROLE CONSTRAINT
-- =====================================================

do $$
declare
  role_constraint record;
begin
  for role_constraint in
    select
      conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format(
      'alter table public.profiles drop constraint %I',
      role_constraint.conname
    );
  end loop;
end;
$$;

alter table public.profiles
  alter column role set default 'patient';

alter table public.profiles
  alter column role set not null;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'patient',
      'doctor',
      'staff',
      'admin'
    )
  );

-- =====================================================
-- VERIFY DOCTOR OWNERSHIP COLUMN
-- =====================================================
--
-- profile_id already exists in the consolidated schema.
-- "if not exists" keeps this migration safe if the column
-- has not yet been added to another environment.
-- =====================================================

alter table public.doctors
  add column if not exists profile_id uuid;

-- Remove the existing foreign key so that its behavior is
-- explicitly and consistently recreated.

alter table public.doctors
  drop constraint if exists doctors_profile_id_fkey;

alter table public.doctors
  add constraint doctors_profile_id_fkey
  foreign key (profile_id)
  references public.profiles(id)
  on update cascade
  on delete set null;

-- =====================================================
-- ONE PROFILE MAY OWN ONLY ONE DOCTOR RECORD
-- =====================================================
--
-- PostgreSQL unique indexes allow multiple NULL values.
--
-- This means:
--
-- - Multiple unclaimed doctor listings may have profile_id NULL.
-- - A claimed profile can be linked to only one doctor record.
-- =====================================================

create unique index if not exists
  idx_doctors_profile_unique
on public.doctors(profile_id)
where profile_id is not null;

-- =====================================================
-- ROLE AND OWNERSHIP LOOKUP INDEXES
-- =====================================================

create index if not exists
  idx_profiles_role
on public.profiles(role);

-- The unique profile index above can already be used for
-- profile_id lookups, so a second doctors.profile_id index
-- is not necessary.

-- =====================================================
-- COLUMN DOCUMENTATION
-- =====================================================

comment on column public.profiles.role is
  'RomDoc application role: patient, doctor, staff, or admin.';

comment on column public.doctors.profile_id is
  'Authenticated profile that owns this doctor record. NULL means that the doctor listing has not been connected to a dashboard account.';
-- =====================================================
-- APPOINTMENT AUTHORIZATION LOOKUP INDEX
-- =====================================================
--
-- Step 40 will frequently filter appointments by doctor_id
-- when verifying that a doctor owns an appointment.
-- =====================================================

create index if not exists
  idx_appointments_doctor
on public.appointments(doctor_id);

commit;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

select
  role,
  count(*) as profile_count
from public.profiles
group by role
order by role;

select
  d.id as doctor_id,
  d.slug as doctor_slug,
  d.profile_id,
  p.role as profile_role
from public.doctors as d
left join public.profiles as p
  on p.id = d.profile_id
order by d.slug;