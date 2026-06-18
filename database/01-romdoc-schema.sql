-- =====================================================
-- ROMDOC MVP DATABASE SCHEMA
-- Version: 1.0
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- UPDATED_AT TRIGGER
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

  role text not null default 'doctor'
    check (role in ('admin', 'doctor', 'staff')),

  first_name text,
  last_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  
  patient_name text not null,

  patient_email text not null,

  patient_phone text not null
    check (char_length(trim(patient_phone)) >= 7),

  requested_date date,
  requested_time time,

  notes text,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'confirmed',
        'cancelled',
        'completed'
      )
    ),

  created_at timestamptz not null default now()
);

-- =====================================================
-- INDEXES
-- =====================================================

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

create index idx_appointments_status
on public.appointments(status);

create index idx_reviews_doctor
on public.reviews(doctor_id);

create index idx_doctor_specialties_specialty
on public.doctor_specialties(specialty_id);

create index idx_doctor_clinics_clinic
on public.doctor_clinics(clinic_id);

-- =====================================================
-- Trigger sections
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