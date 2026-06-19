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
  