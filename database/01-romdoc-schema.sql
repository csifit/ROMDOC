-- =====================================================
-- ROMDOC MVP DATABASE SCHEMA
-- Version: 1.2
--
-- File:
-- ROMDOC/database/01-romdoc-schema.sql
--
-- Consolidated schema for creating a new RomDoc
-- database from scratch.
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================
-- PROFILES
-- =====================================================

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  role text not null default 'patient'
    constraint profiles_role_check
    check (
      role in (
        'patient',
        'doctor',
        'doctor_applicant',
        'staff',
        'admin'
      )
    ),

  first_name text,
  last_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'RomDoc application role: patient, doctor, staff, or admin.';

-- =====================================================
-- CITIES
-- =====================================================

create table public.cities (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  country_code text not null default 'RO',

  latitude numeric(10,7),
  longitude numeric(10,7),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- CITY TRANSLATIONS
-- =====================================================

create table public.city_translations (
  id uuid primary key default gen_random_uuid(),

  city_id uuid not null
    references public.cities(id)
    on delete cascade,

  locale text not null,

  name text not null,

  unique(city_id, locale)
);

-- =====================================================
-- SPECIALTIES
-- =====================================================

create table public.specialties (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  icon text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- SPECIALTY TRANSLATIONS
-- =====================================================

create table public.specialty_translations (
  id uuid primary key default gen_random_uuid(),

  specialty_id uuid not null
    references public.specialties(id)
    on delete cascade,

  locale text not null,

  name text not null,

  meta_title text,
  meta_description text,

  unique(specialty_id, locale)
);

-- =====================================================
-- CLINICS
-- =====================================================

create table public.clinics (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  city_id uuid
    references public.cities(id)
    on delete set null,

  email text,
  phone text,
  website text,
  
  formatted_address text,
  address_line_1 text,
  address_line_2 text,
  postal_code text,
  county_name text,
  country_code text not null default 'RO',
  google_place_id text,
  google_maps_uri text,
  address_verified_at timestamptz,

  street_address text,

  latitude numeric(10,7),
  longitude numeric(10,7),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- CLINIC TRANSLATIONS
-- =====================================================

create table public.clinic_translations (
  id uuid primary key default gen_random_uuid(),

  clinic_id uuid not null
    references public.clinics(id)
    on delete cascade,

  locale text not null,

  name text not null,

  description text,

  meta_title text,
  meta_description text,

  unique(clinic_id, locale)
);

-- =====================================================
-- DOCTORS
-- =====================================================

create table public.doctors (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  city_id uuid
    references public.cities(id)
    on delete set null,

  slug text not null unique,

  photo_url text,

  years_experience integer,

  consultation_price numeric(10,2),

  phone text,
  email text,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'active',
        'suspended',
        'rejected'
      )
    ),

  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.doctors.profile_id is
  'Authenticated profile that owns this doctor record. NULL means the doctor listing has not been connected to a dashboard account.';

-- =====================================================
-- DOCTOR TRANSLATIONS
-- =====================================================

create table public.doctor_translations (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  locale text not null,

  title text,

  biography text,

  meta_title text,
  meta_description text,

  unique(doctor_id, locale)
);

-- =====================================================
-- DOCTOR SPECIALTIES
-- =====================================================

create table public.doctor_specialties (
  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  specialty_id uuid not null
    references public.specialties(id)
    on delete cascade,

  primary key (
    doctor_id,
    specialty_id
  )
);

-- =====================================================
-- DOCTOR CLINICS
-- =====================================================

create table public.doctor_clinics (
  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  clinic_id uuid not null
    references public.clinics(id)
    on delete cascade,

  primary key (
    doctor_id,
    clinic_id
  )
);

-- =====================================================
-- REVIEWS
-- =====================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  patient_name text not null,

  rating integer not null
    check (rating between 1 and 5),

  review_text text,

  approved boolean not null default false,

  created_at timestamptz not null default now()
);

-- =====================================================
-- AVAILABILITY
-- =====================================================

create table public.availability (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  weekday integer not null
    check (weekday between 0 and 6),

  start_time time not null,
  end_time time not null
);

-- =====================================================
-- APPOINTMENTS
-- =====================================================

create table public.appointments (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  clinic_id uuid
    references public.clinics(id)
    on delete set null,

  created_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  source text not null default 'online'
    constraint appointments_source_check
    check (
      source in (
        'online',
        'phone',
        'walk_in',
        'email',
        'other'
      )
    ),

  patient_name text not null,

  patient_email text not null,

  patient_phone text not null
    check (
      char_length(trim(patient_phone)) >= 7
    ),

  requested_date date,
  scheduled_date date,

  requested_time time,
  scheduled_time time,

  reschedule_reason text,

  notes text,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'confirmed',
        'rescheduled',
        'cancelled',
        'completed'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.appointments.source is
  'How the appointment was received: online, phone, walk_in, email, or other.';

comment on column public.appointments.created_by_profile_id is
  'Authenticated profile that manually created the appointment. NULL for unauthenticated public requests or when the creator no longer exists.';

-- =====================================================
-- INDEXES
-- =====================================================

create index idx_profiles_role
on public.profiles(role);

create index idx_city_slug
on public.cities(slug);

create index idx_specialty_slug
on public.specialties(slug);

create index idx_doctor_slug
on public.doctors(slug);

create index idx_doctor_city
on public.doctors(city_id);

create index idx_doctor_status
on public.doctors(status);

create index idx_doctor_rating
on public.doctors(average_rating);

create unique index idx_doctors_profile_unique
on public.doctors(profile_id)
where profile_id is not null;

create index idx_appointments_status
on public.appointments(status);

create index idx_appointments_doctor
on public.appointments(doctor_id);

create index idx_appointments_clinic
on public.appointments(clinic_id);

create index idx_appointments_source
on public.appointments(source);

create index idx_appointments_created_by_profile
on public.appointments(created_by_profile_id);

create index idx_reviews_doctor
on public.reviews(doctor_id);

create index idx_doctor_specialties_specialty
on public.doctor_specialties(specialty_id);

create index idx_doctor_clinics_clinic
on public.doctor_clinics(clinic_id);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

create trigger cities_updated_at
before update on public.cities
for each row
execute function public.handle_updated_at();

create trigger specialties_updated_at
before update on public.specialties
for each row
execute function public.handle_updated_at();

create trigger clinics_updated_at
before update on public.clinics
for each row
execute function public.handle_updated_at();

create trigger doctors_updated_at
before update on public.doctors
for each row
execute function public.handle_updated_at();

create trigger appointments_updated_at
before update on public.appointments
for each row
execute function public.handle_updated_at();

-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 51A: Doctor services and prices
--
-- File:
-- ROMDOC/database/11-doctor-services.sql
-- =====================================================

begin;

-- =====================================================
-- DOCTOR SERVICES
-- =====================================================
--
-- Stores price and presentation settings that are common
-- across all languages.
-- =====================================================

create table if not exists public.doctor_services (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  price numeric(10,2) not null
    check (price >= 0),

  currency text not null default 'RON'
    check (
      currency in (
        'RON',
        'EUR'
      )
    ),

  sort_order integer not null default 0
    check (sort_order >= 0),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- DOCTOR SERVICE TRANSLATIONS
-- =====================================================
--
-- The service name is translated independently.
--
-- The doctor interface will initially manage Romanian.
-- English translations can be added manually or through
-- AI-assisted translation later.
-- =====================================================

create table if not exists public.doctor_service_translations (
  id uuid primary key default gen_random_uuid(),

  doctor_service_id uuid not null
    references public.doctor_services(id)
    on delete cascade,

  locale text not null
    check (
      locale in (
        'ro',
        'en'
      )
    ),

  name text not null
    check (
      char_length(trim(name)) between 2 and 200
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    doctor_service_id,
    locale
  )
);

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists
  idx_doctor_services_doctor
on public.doctor_services(doctor_id);

create index if not exists
  idx_doctor_services_active
on public.doctor_services(
  doctor_id,
  is_active,
  sort_order
);

create index if not exists
  idx_doctor_service_translations_service
on public.doctor_service_translations(
  doctor_service_id
);

create index if not exists
  idx_doctor_service_translations_locale
on public.doctor_service_translations(locale);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

drop trigger if exists
  doctor_services_updated_at
on public.doctor_services;

create trigger doctor_services_updated_at
before update on public.doctor_services
for each row
execute function public.handle_updated_at();

drop trigger if exists
  doctor_service_translations_updated_at
on public.doctor_service_translations;

create trigger doctor_service_translations_updated_at
before update on public.doctor_service_translations
for each row
execute function public.handle_updated_at();

-- =====================================================
-- OWNERSHIP HELPERS
-- =====================================================

create or replace function public.owns_doctor_service(
  target_service_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctor_services as ds
    inner join public.doctors as d
      on d.id = ds.doctor_id
    where ds.id = target_service_id
      and d.profile_id = auth.uid()
  );
$$;

revoke all
on function public.owns_doctor_service(uuid)
from public;

grant execute
on function public.owns_doctor_service(uuid)
to authenticated;

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table public.doctor_services
  enable row level security;

alter table public.doctor_service_translations
  enable row level security;

-- =====================================================
-- REMOVE OLD POLICIES IF MIGRATION IS RE-RUN
-- =====================================================

drop policy if exists
  "Public can view active doctor services"
on public.doctor_services;

drop policy if exists
  "Doctors can view their own services"
on public.doctor_services;

drop policy if exists
  "Doctors can create their own services"
on public.doctor_services;

drop policy if exists
  "Doctors can update their own services"
on public.doctor_services;

drop policy if exists
  "Doctors can delete their own services"
on public.doctor_services;

drop policy if exists
  "Public can view active service translations"
on public.doctor_service_translations;

drop policy if exists
  "Doctors can view their own service translations"
on public.doctor_service_translations;

drop policy if exists
  "Doctors can create their own service translations"
on public.doctor_service_translations;

drop policy if exists
  "Doctors can update their own service translations"
on public.doctor_service_translations;

drop policy if exists
  "Doctors can delete their own service translations"
on public.doctor_service_translations;

-- =====================================================
-- DOCTOR SERVICES: PUBLIC READ
-- =====================================================

create policy
  "Public can view active doctor services"
on public.doctor_services
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.doctors as d
    where d.id = doctor_services.doctor_id
      and d.status = 'active'
  )
);

-- =====================================================
-- DOCTOR SERVICES: OWNER ACCESS
-- =====================================================

create policy
  "Doctors can view their own services"
on public.doctor_services
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_services.doctor_id
      and d.profile_id = auth.uid()
  )
);

create policy
  "Doctors can create their own services"
on public.doctor_services
for insert
to authenticated
with check (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_services.doctor_id
      and d.profile_id = auth.uid()
  )
);

create policy
  "Doctors can update their own services"
on public.doctor_services
for update
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_services.doctor_id
      and d.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_services.doctor_id
      and d.profile_id = auth.uid()
  )
);

create policy
  "Doctors can delete their own services"
on public.doctor_services
for delete
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_services.doctor_id
      and d.profile_id = auth.uid()
  )
);

-- =====================================================
-- SERVICE TRANSLATIONS: PUBLIC READ
-- =====================================================

create policy
  "Public can view active service translations"
on public.doctor_service_translations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.doctor_services as ds
    inner join public.doctors as d
      on d.id = ds.doctor_id
    where ds.id =
      doctor_service_translations.doctor_service_id
      and ds.is_active = true
      and d.status = 'active'
  )
);

-- =====================================================
-- SERVICE TRANSLATIONS: OWNER ACCESS
-- =====================================================

create policy
  "Doctors can view their own service translations"
on public.doctor_service_translations
for select
to authenticated
using (
  public.owns_doctor_service(
    doctor_service_id
  )
);

create policy
  "Doctors can create their own service translations"
on public.doctor_service_translations
for insert
to authenticated
with check (
  public.owns_doctor_service(
    doctor_service_id
  )
);

create policy
  "Doctors can update their own service translations"
on public.doctor_service_translations
for update
to authenticated
using (
  public.owns_doctor_service(
    doctor_service_id
  )
)
with check (
  public.owns_doctor_service(
    doctor_service_id
  )
);

create policy
  "Doctors can delete their own service translations"
on public.doctor_service_translations
for delete
to authenticated
using (
  public.owns_doctor_service(
    doctor_service_id
  )
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'doctor_services',
    'doctor_service_translations'
  )
order by table_name;

select
  policyname,
  tablename,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'doctor_services',
    'doctor_service_translations'
  )
order by
  tablename,
  cmd,
  policyname;

  -- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 51C: Doctor-owned profile management
--
-- File:
-- ROMDOC/database/12-doctor-profile-management-rls.sql
-- =====================================================

begin;

alter table public.doctors
  enable row level security;

alter table public.doctor_translations
  enable row level security;

-- =====================================================
-- DOCTORS TABLE
-- =====================================================

drop policy if exists
  "Doctors can view their own doctor profile"
on public.doctors;

drop policy if exists
  "Doctors can update their own doctor profile"
on public.doctors;

create policy
  "Doctors can view their own doctor profile"
on public.doctors
for select
to authenticated
using (
  profile_id = auth.uid()
);

create policy
  "Doctors can update their own doctor profile"
on public.doctors
for update
to authenticated
using (
  profile_id = auth.uid()
)
with check (
  profile_id = auth.uid()
);

-- =====================================================
-- DOCTOR TRANSLATIONS
-- =====================================================

drop policy if exists
  "Doctors can view their own translations"
on public.doctor_translations;

drop policy if exists
  "Doctors can create their own translations"
on public.doctor_translations;

drop policy if exists
  "Doctors can update their own translations"
on public.doctor_translations;

drop policy if exists
  "Doctors can delete their own translations"
on public.doctor_translations;

create policy
  "Doctors can view their own translations"
on public.doctor_translations
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id =
      doctor_translations.doctor_id
      and d.profile_id = auth.uid()
  )
);

create policy
  "Doctors can create their own translations"
on public.doctor_translations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.doctors as d
    where d.id =
      doctor_translations.doctor_id
      and d.profile_id = auth.uid()
  )
);

create policy
  "Doctors can update their own translations"
on public.doctor_translations
for update
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id =
      doctor_translations.doctor_id
      and d.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.doctors as d
    where d.id =
      doctor_translations.doctor_id
      and d.profile_id = auth.uid()
  )
);

create policy
  "Doctors can delete their own translations"
on public.doctor_translations
for delete
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id =
      doctor_translations.doctor_id
      and d.profile_id = auth.uid()
  )
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'doctors',
    'doctor_translations'
  )
order by
  tablename,
  cmd,
  policyname;
  
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

  -- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 52E: Dual patient and doctor registration
--
-- File:
-- ROMDOC/database/17-dual-registration.sql
-- =====================================================

begin;

-- =====================================================
-- 1. PROFILE ROLES
-- =====================================================

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  alter column role
  set default 'patient';

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'admin',
      'doctor',
      'doctor_applicant',
      'staff',
      'patient'
    )
  );

-- Convert any older generic user role.
update public.profiles
set role = 'patient'
where role = 'user';

-- =====================================================
-- 2. DOCTOR APPLICATIONS
-- =====================================================

create table if not exists public.doctor_applications (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null unique
    references public.profiles(id)
    on delete cascade,

  phone text,

  specialty_id uuid
    references public.specialties(id)
    on delete set null,

  city_id uuid
    references public.cities(id)
    on delete set null,

  professional_registration_number text,

  message text,

  status text not null default 'pending_payment'
    check (
      status in (
        'pending_payment',
        'payment_processing',
        'paid',
        'approved',
        'rejected',
        'cancelled'
      )
    ),

  reviewed_by uuid
    references public.profiles(id)
    on delete set null,

  reviewed_at timestamptz,

  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  idx_doctor_applications_status
on public.doctor_applications (
  status,
  created_at desc
);

create index if not exists
  idx_doctor_applications_specialty
on public.doctor_applications (
  specialty_id
);

create index if not exists
  idx_doctor_applications_city
on public.doctor_applications (
  city_id
);

drop trigger if exists
  set_doctor_applications_updated_at
on public.doctor_applications;

create trigger set_doctor_applications_updated_at
before update
on public.doctor_applications
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 3. AUTH USER REGISTRATION TRIGGER
-- =====================================================
--
-- registration_type from browser metadata may be:
--
-- patient
-- doctor
--
-- It can never directly create role = doctor.
-- A doctor registration only becomes doctor_applicant.
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_registration_type text;
  assigned_role text;

  submitted_specialty_id uuid;
  submitted_city_id uuid;

  raw_specialty_id text;
  raw_city_id text;
begin
  requested_registration_type :=
    lower(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'registration_type',
          'patient'
        )
      )
    );

  assigned_role :=
    case
      when requested_registration_type = 'doctor'
        then 'doctor_applicant'
      else 'patient'
    end;

  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  values (
    new.id,
    assigned_role,

    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'first_name',
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'last_name',
          ''
        )
      ),
      ''
    ),

    now(),
    now()
  )
  on conflict (id) do update
  set
    first_name = coalesce(
      excluded.first_name,
      public.profiles.first_name
    ),

    last_name = coalesce(
      excluded.last_name,
      public.profiles.last_name
    ),

    updated_at = now();

  if assigned_role = 'doctor_applicant' then
    raw_specialty_id :=
      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data ->> 'specialty_id',
            ''
          )
        ),
        ''
      );

    raw_city_id :=
      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data ->> 'city_id',
            ''
          )
        ),
        ''
      );

    if (
      raw_specialty_id is not null
      and raw_specialty_id ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) then
      submitted_specialty_id :=
        raw_specialty_id::uuid;
    end if;

    if (
      raw_city_id is not null
      and raw_city_id ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) then
      submitted_city_id :=
        raw_city_id::uuid;
    end if;

    -- Verify that submitted foreign IDs really exist.
    if (
      submitted_specialty_id is not null
      and not exists (
        select 1
        from public.specialties
        where id = submitted_specialty_id
      )
    ) then
      submitted_specialty_id := null;
    end if;

    if (
      submitted_city_id is not null
      and not exists (
        select 1
        from public.cities
        where id = submitted_city_id
      )
    ) then
      submitted_city_id := null;
    end if;

    insert into public.doctor_applications (
      profile_id,
      phone,
      specialty_id,
      city_id,
      professional_registration_number,
      message,
      status,
      created_at,
      updated_at
    )
    values (
      new.id,

      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data ->> 'phone',
            ''
          )
        ),
        ''
      ),

      submitted_specialty_id,
      submitted_city_id,

      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data
              ->> 'professional_registration_number',
            ''
          )
        ),
        ''
      ),

      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data ->> 'message',
            ''
          )
        ),
        ''
      ),

      'pending_payment',
      now(),
      now()
    )
    on conflict (profile_id) do update
    set
      phone = coalesce(
        excluded.phone,
        public.doctor_applications.phone
      ),

      specialty_id = coalesce(
        excluded.specialty_id,
        public.doctor_applications.specialty_id
      ),

      city_id = coalesce(
        excluded.city_id,
        public.doctor_applications.city_id
      ),

      professional_registration_number = coalesce(
        excluded.professional_registration_number,
        public.doctor_applications
          .professional_registration_number
      ),

      message = coalesce(
        excluded.message,
        public.doctor_applications.message
      ),

      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists
  on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert
on auth.users
for each row
execute function public.handle_new_user();

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

alter table public.doctor_applications
  enable row level security;

drop policy if exists
  "Doctor applicants can view their own application"
on public.doctor_applications;

drop policy if exists
  "Admins can view all doctor applications"
on public.doctor_applications;

drop policy if exists
  "Admins can update doctor applications"
on public.doctor_applications;

create policy
  "Doctor applicants can view their own application"
on public.doctor_applications
for select
to authenticated
using (
  profile_id = auth.uid()
);

create policy
  "Admins can view all doctor applications"
on public.doctor_applications
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy
  "Admins can update doctor applications"
on public.doctor_applications
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

grant select
on public.doctor_applications
to authenticated;

grant update
on public.doctor_applications
to authenticated;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'role';

select
  constraint_name,
  check_clause
from information_schema.check_constraints
where constraint_name =
  'profiles_role_check';

select
  trigger_name,
  event_object_schema,
  event_object_table
from information_schema.triggers
where trigger_name =
  'on_auth_user_created';

select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename =
    'doctor_applications'
order by policyname;

-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 52F: Stripe doctor subscriptions
--
-- File:
-- ROMDOC/database/18-doctor-stripe-subscriptions.sql
-- =====================================================

begin;

-- =====================================================
-- 1. DOCTOR SUBSCRIPTIONS
-- =====================================================

create table if not exists public.doctor_subscriptions (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null unique
    references public.profiles(id)
    on delete cascade,

  doctor_application_id uuid unique
    references public.doctor_applications(id)
    on delete set null,

  doctor_id uuid unique
    references public.doctors(id)
    on delete set null,

  stripe_customer_id text unique,

  stripe_subscription_id text unique,

  stripe_price_id text,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'unpaid',
        'paused',
        'canceled'
      )
    ),

  current_period_start timestamptz,
  current_period_end timestamptz,

  cancel_at_period_end boolean not null default false,

  canceled_at timestamptz,
  last_payment_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  idx_doctor_subscriptions_status
on public.doctor_subscriptions (
  status
);

create index if not exists
  idx_doctor_subscriptions_customer
on public.doctor_subscriptions (
  stripe_customer_id
);

create index if not exists
  idx_doctor_subscriptions_subscription
on public.doctor_subscriptions (
  stripe_subscription_id
);

drop trigger if exists
  set_doctor_subscriptions_updated_at
on public.doctor_subscriptions;

create trigger set_doctor_subscriptions_updated_at
before update
on public.doctor_subscriptions
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 2. WEBHOOK EVENT LOG
-- =====================================================

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,

  event_type text not null,

  processed_at timestamptz not null default now()
);

-- =====================================================
-- 3. RLS
-- =====================================================

alter table public.doctor_subscriptions
  enable row level security;

alter table public.stripe_webhook_events
  enable row level security;

drop policy if exists
  "Users can view their own doctor subscription"
on public.doctor_subscriptions;

drop policy if exists
  "Admins can view doctor subscriptions"
on public.doctor_subscriptions;

create policy
  "Users can view their own doctor subscription"
on public.doctor_subscriptions
for select
to authenticated
using (
  profile_id = auth.uid()
);

create policy
  "Admins can view doctor subscriptions"
on public.doctor_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

grant select
on public.doctor_subscriptions
to authenticated;

-- No browser-facing policies are added for:
--
-- INSERT
-- UPDATE
-- DELETE
--
-- Those operations are performed only by trusted server
-- routes using the Supabase service-role client.

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'doctor_subscriptions'
order by ordinal_position;

select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'doctor_subscriptions';

  -- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 53B: Doctor clinic proposals
--
-- File:
-- ROMDOC/database/20-doctor-clinic-proposals.sql
-- =====================================================

begin;

-- =====================================================
-- 1. CLINIC APPROVAL WORKFLOW
-- =====================================================

alter table public.clinics
  add column if not exists status text;

alter table public.clinics
  add column if not exists proposed_by_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.clinics
  add column if not exists approved_by_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.clinics
  add column if not exists approved_at timestamptz;

alter table public.clinics
  add column if not exists rejected_at timestamptz;

alter table public.clinics
  add column if not exists rejection_reason text;

-- Clinics created before this workflow are considered approved.
update public.clinics
set
  status = 'approved',
  approved_at = coalesce(
    approved_at,
    created_at,
    now()
  )
where status is null;

alter table public.clinics
  alter column status
  set default 'pending';

alter table public.clinics
  alter column status
  set not null;

alter table public.clinics
  drop constraint if exists clinics_status_check;

alter table public.clinics
  add constraint clinics_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected'
    )
  );

-- =====================================================
-- 2. GOOGLE PLACE DUPLICATE PROTECTION
-- =====================================================

create unique index if not exists
  idx_clinics_unique_google_place_id
on public.clinics (
  google_place_id
)
where google_place_id is not null;

create index if not exists
  idx_clinics_status
on public.clinics (
  status,
  created_at desc
);

create index if not exists
  idx_clinics_proposed_by_profile
on public.clinics (
  proposed_by_profile_id,
  status
);

create index if not exists
  idx_clinics_city_status
on public.clinics (
  city_id,
  status
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clinics'
order by ordinal_position;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'clinics'
order by indexname;
-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 54A: Doctor-scoped clinic staff
--
-- File:
-- ROMDOC/database/21-doctor-staff.sql
-- =====================================================

begin;

-- =====================================================
-- 1. DOCTOR STAFF ASSIGNMENTS
-- =====================================================

create table if not exists public.doctor_staff (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  clinic_id uuid not null
    references public.clinics(id)
    on delete cascade,

  staff_profile_id uuid
    references public.profiles(id)
    on delete cascade,

  invited_email text not null,

  invited_by_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  status text not null default 'invited'
    check (
      status in (
        'invited',
        'active',
        'suspended',
        'revoked'
      )
    ),

  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint doctor_staff_email_not_empty
    check (
      length(trim(invited_email)) > 3
    ),

  constraint doctor_staff_unique_assignment
    unique (
      doctor_id,
      clinic_id,
      invited_email
    )
);

create index if not exists
  idx_doctor_staff_doctor_status
on public.doctor_staff (
  doctor_id,
  status
);

create index if not exists
  idx_doctor_staff_profile_status
on public.doctor_staff (
  staff_profile_id,
  status
);

create index if not exists
  idx_doctor_staff_clinic_status
on public.doctor_staff (
  clinic_id,
  status
);

create index if not exists
  idx_doctor_staff_invited_email
on public.doctor_staff (
  lower(invited_email)
);

drop trigger if exists
  set_doctor_staff_updated_at
on public.doctor_staff;

create trigger set_doctor_staff_updated_at
before update
on public.doctor_staff
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 2. STAFF ROLE ACTIVATION
-- =====================================================

create or replace function public.activate_doctor_staff_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    new.staff_profile_id is not null
    and new.status = 'active'
  ) then
    update public.profiles
    set
      role = 'staff',
      updated_at = now()
    where id = new.staff_profile_id
      and role not in (
        'admin',
        'doctor'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists
  activate_doctor_staff_role
on public.doctor_staff;

create trigger activate_doctor_staff_role
after insert or update
on public.doctor_staff
for each row
execute function public.activate_doctor_staff_assignment();

-- =====================================================
-- 3. APPOINTMENT ACCESS HELPER
-- =====================================================

create or replace function public.is_staff_for_doctor_clinic(
  requested_staff_profile_id uuid,
  requested_doctor_id uuid,
  requested_clinic_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.doctor_staff as ds
    where ds.staff_profile_id =
      requested_staff_profile_id
      and ds.doctor_id =
        requested_doctor_id
      and ds.clinic_id =
        requested_clinic_id
      and ds.status = 'active'
  );
$$;

revoke all
on function public.is_staff_for_doctor_clinic(
  uuid,
  uuid,
  uuid
)
from public;

grant execute
on function public.is_staff_for_doctor_clinic(
  uuid,
  uuid,
  uuid
)
to authenticated;

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

alter table public.doctor_staff
  enable row level security;

drop policy if exists
  "Doctors can view their own staff"
on public.doctor_staff;

drop policy if exists
  "Staff can view their own assignments"
on public.doctor_staff;

drop policy if exists
  "Admins can view all doctor staff"
on public.doctor_staff;

create policy
  "Doctors can view their own staff"
on public.doctor_staff
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_staff.doctor_id
      and d.profile_id = auth.uid()
  )
);

create policy
  "Staff can view their own assignments"
on public.doctor_staff
for select
to authenticated
using (
  auth.uid() is not null
  and staff_profile_id = auth.uid()
);

create policy
  "Admins can view all doctor staff"
on public.doctor_staff
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

grant select
on public.doctor_staff
to authenticated;

-- Inserts, updates and revocations are performed only
-- through secure server routes using the service-role client.

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'doctor_staff'
order by ordinal_position;

select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'doctor_staff'
order by policyname;

-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 55A: Admin specialties management
--
-- File:
-- ROMDOC/database/23-admin-specialties.sql
-- =====================================================

begin;

alter table public.specialties
  add column if not exists is_active boolean;

update public.specialties
set is_active = true
where is_active is null;

alter table public.specialties
  alter column is_active
  set default true;

alter table public.specialties
  alter column is_active
  set not null;

create index if not exists
  idx_specialties_active_slug
on public.specialties (
  is_active,
  slug
);

create index if not exists
  idx_specialty_translations_locale_name
on public.specialty_translations (
  locale,
  lower(name)
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  id,
  slug,
  icon,
  is_active,
  created_at,
  updated_at
from public.specialties
order by slug;

-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 55B: Admin cities management
--
-- File:
-- ROMDOC/database/24-admin-cities.sql
-- =====================================================

begin;

alter table public.cities
  add column if not exists is_active boolean;

update public.cities
set is_active = true
where is_active is null;

alter table public.cities
  alter column is_active
  set default true;

alter table public.cities
  alter column is_active
  set not null;

create index if not exists
  idx_cities_active_slug
on public.cities (
  is_active,
  slug
);

create index if not exists
  idx_cities_country_active
on public.cities (
  country_code,
  is_active
);

create index if not exists
  idx_city_translations_locale_name
on public.city_translations (
  locale,
  lower(name)
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  id,
  slug,
  country_code,
  latitude,
  longitude,
  is_active,
  created_at,
  updated_at
from public.cities
order by slug;

-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 55C: Reviews moderation and patient ownership
--
-- File:
-- ROMDOC/database/25-reviews-moderation.sql
-- =====================================================

begin;

-- =====================================================
-- 1. REVIEW OWNERSHIP
-- =====================================================

alter table public.reviews
  add column if not exists patient_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.reviews
  add column if not exists appointment_id uuid
    references public.appointments(id)
    on delete set null;

-- =====================================================
-- 2. MODERATION WORKFLOW
-- =====================================================

alter table public.reviews
  add column if not exists status text;

alter table public.reviews
  add column if not exists moderation_reason text;

alter table public.reviews
  add column if not exists moderated_by_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.reviews
  add column if not exists moderated_at timestamptz;

alter table public.reviews
  add column if not exists updated_at timestamptz
    not null default now();

-- Preserve the behavior of the former approved column.
update public.reviews
set status =
  case
    when approved = true then 'published'
    else 'hidden'
  end
where status is null;

alter table public.reviews
  alter column status
  set default 'published';

alter table public.reviews
  alter column status
  set not null;

alter table public.reviews
  drop constraint if exists reviews_status_check;

alter table public.reviews
  add constraint reviews_status_check
  check (
    status in (
      'published',
      'hidden',
      'removed'
    )
  );

-- Keep the legacy approved column synchronized for compatibility.
update public.reviews
set approved = (
  status = 'published'
);

-- =====================================================
-- 3. ONE REVIEW PER APPOINTMENT
-- =====================================================

create unique index if not exists
  idx_reviews_unique_appointment
on public.reviews (
  appointment_id
)
where appointment_id is not null;

create index if not exists
  idx_reviews_doctor_status_created
on public.reviews (
  doctor_id,
  status,
  created_at desc
);

create index if not exists
  idx_reviews_patient_created
on public.reviews (
  patient_profile_id,
  created_at desc
);

create index if not exists
  idx_reviews_status_created
on public.reviews (
  status,
  created_at desc
);

-- =====================================================
-- 4. UPDATED_AT TRIGGER
-- =====================================================

drop trigger if exists
  set_reviews_updated_at
on public.reviews;

create trigger set_reviews_updated_at
before update
on public.reviews
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

alter table public.reviews
  enable row level security;

drop policy if exists
  "Anyone can view approved reviews"
on public.reviews;

drop policy if exists
  "Anyone can view published reviews"
on public.reviews;

drop policy if exists
  "Patients can view their reviews"
on public.reviews;

drop policy if exists
  "Patients can create reviews"
on public.reviews;

drop policy if exists
  "Admins can view all reviews"
on public.reviews;

create policy
  "Anyone can view published reviews"
on public.reviews
for select
using (
  status = 'published'
  and approved = true
);

create policy
  "Patients can view their reviews"
on public.reviews
for select
to authenticated
using (
  patient_profile_id = auth.uid()
);

create policy
  "Admins can view all reviews"
on public.reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- Review creation and moderation are intentionally handled
-- by secure server routes using the service-role client.

grant select
on public.reviews
to anon, authenticated;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'reviews'
order by ordinal_position;

-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 56A: Admin users management and blocking
--
-- File:
-- ROMDOC/database/26-admin-users.sql
-- =====================================================

begin;

-- =====================================================
-- 1. ACCOUNT STATUS
-- =====================================================

alter table public.profiles
  add column if not exists account_status text;

update public.profiles
set account_status = 'active'
where account_status is null;

alter table public.profiles
  alter column account_status
  set default 'active';

alter table public.profiles
  alter column account_status
  set not null;

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (
    account_status in (
      'active',
      'blocked'
    )
  );

-- =====================================================
-- 2. BLOCKING AUDIT FIELDS
-- =====================================================

alter table public.profiles
  add column if not exists blocked_at timestamptz;

alter table public.profiles
  add column if not exists blocked_by_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.profiles
  add column if not exists blocked_reason text;

-- =====================================================
-- 3. INDEXES
-- =====================================================

create index if not exists
  idx_profiles_account_status
on public.profiles (
  account_status
);

create index if not exists
  idx_profiles_role_account_status
on public.profiles (
  role,
  account_status
);

create index if not exists
  idx_profiles_created_at
on public.profiles (
  created_at desc
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  id,
  role,
  first_name,
  last_name,
  account_status,
  blocked_at,
  blocked_by_profile_id,
  blocked_reason,
  created_at
from public.profiles
order by created_at desc;