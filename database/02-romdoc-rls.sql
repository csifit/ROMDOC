-- =====================================================
-- ROMDOC RLS
-- =====================================================

-- =====================================================
-- CLEANUP (safe re-run)
-- =====================================================

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "cities_public_read" on public.cities;
drop policy if exists "city_translations_public_read" on public.city_translations;

drop policy if exists "specialties_public_read" on public.specialties;
drop policy if exists "specialty_translations_public_read" on public.specialty_translations;

drop policy if exists "clinics_public_read" on public.clinics;
drop policy if exists "clinic_translations_public_read" on public.clinic_translations;

drop policy if exists "doctors_public_read" on public.doctors;
drop policy if exists "doctor_translations_public_read" on public.doctor_translations;

drop policy if exists "reviews_public_read" on public.reviews;

drop policy if exists "admin_all_profiles" on public.profiles;
drop policy if exists "admin_all_doctors" on public.doctors;
drop policy if exists "admin_all_clinics" on public.clinics;
drop policy if exists "admin_all_reviews" on public.reviews;
drop policy if exists "admin_all_appointments" on public.appointments;

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table public.profiles enable row level security;

alter table public.cities enable row level security;
alter table public.city_translations enable row level security;

alter table public.specialties enable row level security;
alter table public.specialty_translations enable row level security;

alter table public.clinics enable row level security;
alter table public.clinic_translations enable row level security;

alter table public.doctors enable row level security;
alter table public.doctor_translations enable row level security;

alter table public.doctor_specialties enable row level security;
alter table public.doctor_clinics enable row level security;

alter table public.reviews enable row level security;
alter table public.availability enable row level security;
alter table public.appointments enable row level security;

-- =====================================================
-- IS_ADMIN HELPER
-- =====================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- =====================================================
-- PROFILES
-- =====================================================

create policy "profiles_select_own"
on public.profiles
for select
using (
  auth.uid() = id
);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (
  auth.uid() = id
);

create policy "profiles_update_own"
on public.profiles
for update
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);

-- =====================================================
-- PUBLIC DIRECTORY READ ACCESS
-- =====================================================

create policy "cities_public_read"
on public.cities
for select
using (true);

create policy "city_translations_public_read"
on public.city_translations
for select
using (true);

create policy "specialties_public_read"
on public.specialties
for select
using (true);

create policy "specialty_translations_public_read"
on public.specialty_translations
for select
using (true);

create policy "clinics_public_read"
on public.clinics
for select
using (true);

create policy "clinic_translations_public_read"
on public.clinic_translations
for select
using (true);

create policy "doctors_public_read"
on public.doctors
for select
using (true);

create policy "doctor_translations_public_read"
on public.doctor_translations
for select
using (true);

create policy "reviews_public_read"
on public.reviews
for select
using (
  approved = true
);

-- =====================================================
-- ADMIN ACCESS
-- =====================================================

create policy "admin_all_profiles"
on public.profiles
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

create policy "admin_all_doctors"
on public.doctors
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

create policy "admin_all_clinics"
on public.clinics
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

create policy "admin_all_reviews"
on public.reviews
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

create policy "admin_all_appointments"
on public.appointments
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);