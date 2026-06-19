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

drop policy if exists "doctor_specialties_public_read" on public.doctor_specialties;
drop policy if exists "doctor_clinics_public_read" on public.doctor_clinics;
drop policy if exists "availability_public_read" on public.availability;

drop policy if exists "appointments_public_insert" on public.appointments;

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

create policy "doctor_specialties_public_read"
on public.doctor_specialties
for select
using (true);

create policy "doctor_clinics_public_read"
on public.doctor_clinics
for select
using (true);

create policy "availability_public_read"
on public.availability
for select
using (true);

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

-- =====================================================
-- PUBLIC APPOINTMENT REQUESTS
-- =====================================================

create policy "appointments_public_insert"
on public.appointments
for insert
to anon, authenticated
with check (
  status = 'pending'
  and patient_name is not null
  and patient_email is not null
  and patient_phone is not null
  and char_length(trim(patient_phone)) >= 7
  and requested_date is not null
  and doctor_id is not null
  and clinic_id is not null 
);

-- =====================================================
-- DOCTOR-CREATED APPOINTMENTS
-- =====================================================

create or replace function public.can_doctor_create_appointment(
  target_doctor_id uuid,
  target_clinic_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctors as d
    join public.doctor_clinics as dc
      on dc.doctor_id = d.id
    where d.id = target_doctor_id
      and d.profile_id = auth.uid()
      and dc.clinic_id = target_clinic_id
  );
$$;

revoke all
on function public.can_doctor_create_appointment(uuid, uuid)
from public;

grant execute
on function public.can_doctor_create_appointment(uuid, uuid)
to authenticated;

drop policy if exists
  "Doctors can create their own appointments"
on public.appointments;

create policy
  "Doctors can create their own appointments"
on public.appointments
for insert
to authenticated
with check (
  public.can_doctor_create_appointment(
    doctor_id,
    clinic_id
  )
  and created_by_profile_id = auth.uid()
  and source in (
    'phone',
    'walk_in',
    'email',
    'other'
  )
  and status = 'confirmed'
  and requested_date is not null
  and requested_time is not null
  and scheduled_date is not null
  and scheduled_time is not null
  and requested_date = scheduled_date
  and requested_time = scheduled_time
);

-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 52B: Doctor availability management RLS
--
-- File:
-- ROMDOC/database/14-availability-management-rls.sql
-- =====================================================

begin;

alter table public.availability
  enable row level security;

alter table public.availability_breaks
  enable row level security;

alter table public.doctor_days_off
  enable row level security;

-- =====================================================
-- OWNERSHIP HELPERS
-- =====================================================

create or replace function public.owns_availability(
  target_availability_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.availability as a
    inner join public.doctors as d
      on d.id = a.doctor_id
    where a.id = target_availability_id
      and d.profile_id = auth.uid()
  );
$$;

revoke all
on function public.owns_availability(uuid)
from public;

grant execute
on function public.owns_availability(uuid)
to authenticated;

-- =====================================================
-- REMOVE OLD POLICIES
-- =====================================================

drop policy if exists
  "Doctors can view their own availability"
on public.availability;

drop policy if exists
  "Doctors can create their own availability"
on public.availability;

drop policy if exists
  "Doctors can update their own availability"
on public.availability;

drop policy if exists
  "Doctors can delete their own availability"
on public.availability;

drop policy if exists
  "Doctors can view their own availability breaks"
on public.availability_breaks;

drop policy if exists
  "Doctors can create their own availability breaks"
on public.availability_breaks;

drop policy if exists
  "Doctors can update their own availability breaks"
on public.availability_breaks;

drop policy if exists
  "Doctors can delete their own availability breaks"
on public.availability_breaks;

drop policy if exists
  "Doctors can view their own days off"
on public.doctor_days_off;

drop policy if exists
  "Doctors can create their own days off"
on public.doctor_days_off;

drop policy if exists
  "Doctors can update their own days off"
on public.doctor_days_off;

drop policy if exists
  "Doctors can delete their own days off"
on public.doctor_days_off;

-- =====================================================
-- WEEKLY AVAILABILITY
-- =====================================================

create policy
  "Doctors can view their own availability"
on public.availability
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = availability.doctor_id
      and d.profile_id = auth.uid()
  )
);

create policy
  "Doctors can create their own availability"
on public.availability
for insert
to authenticated
with check (
  exists (
    select 1
    from public.doctors as d
    where d.id = availability.doctor_id
      and d.profile_id = auth.uid()
  )
  and exists (
    select 1
    from public.doctor_clinics as dc
    where dc.doctor_id = availability.doctor_id
      and dc.clinic_id = availability.clinic_id
  )
);

create policy
  "Doctors can update their own availability"
on public.availability
for update
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = availability.doctor_id
      and d.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.doctors as d
    where d.id = availability.doctor_id
      and d.profile_id = auth.uid()
  )
  and exists (
    select 1
    from public.doctor_clinics as dc
    where dc.doctor_id = availability.doctor_id
      and dc.clinic_id = availability.clinic_id
  )
);

create policy
  "Doctors can delete their own availability"
on public.availability
for delete
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = availability.doctor_id
      and d.profile_id = auth.uid()
  )
);

-- =====================================================
-- RECURRING BREAKS
-- =====================================================

create policy
  "Doctors can view their own availability breaks"
on public.availability_breaks
for select
to authenticated
using (
  public.owns_availability(
    availability_id
  )
);

create policy
  "Doctors can create their own availability breaks"
on public.availability_breaks
for insert
to authenticated
with check (
  public.owns_availability(
    availability_id
  )
);

create policy
  "Doctors can update their own availability breaks"
on public.availability_breaks
for update
to authenticated
using (
  public.owns_availability(
    availability_id
  )
)
with check (
  public.owns_availability(
    availability_id
  )
);

create policy
  "Doctors can delete their own availability breaks"
on public.availability_breaks
for delete
to authenticated
using (
  public.owns_availability(
    availability_id
  )
);

-- =====================================================
-- DAYS OFF
-- =====================================================

create policy
  "Doctors can view their own days off"
on public.doctor_days_off
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_days_off.doctor_id
      and d.profile_id = auth.uid()
  )
);

create policy
  "Doctors can create their own days off"
on public.doctor_days_off
for insert
to authenticated
with check (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_days_off.doctor_id
      and d.profile_id = auth.uid()
  )
  and (
    doctor_days_off.clinic_id is null
    or exists (
      select 1
      from public.doctor_clinics as dc
      where dc.doctor_id =
        doctor_days_off.doctor_id
        and dc.clinic_id =
          doctor_days_off.clinic_id
    )
  )
);

create policy
  "Doctors can update their own days off"
on public.doctor_days_off
for update
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_days_off.doctor_id
      and d.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_days_off.doctor_id
      and d.profile_id = auth.uid()
  )
  and (
    doctor_days_off.clinic_id is null
    or exists (
      select 1
      from public.doctor_clinics as dc
      where dc.doctor_id =
        doctor_days_off.doctor_id
        and dc.clinic_id =
          doctor_days_off.clinic_id
    )
  )
);

create policy
  "Doctors can delete their own days off"
on public.doctor_days_off
for delete
to authenticated
using (
  exists (
    select 1
    from public.doctors as d
    where d.id = doctor_days_off.doctor_id
      and d.profile_id = auth.uid()
  )
);

commit;

select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'availability',
    'availability_breaks',
    'doctor_days_off'
  )
order by
  tablename,
  cmd,
  policyname;

  -- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 52C: Public available appointment slots
--
-- File:
-- ROMDOC/database/15-public-available-slots.sql
--
-- Purpose:
-- Return only valid, unoccupied appointment slots for a
-- doctor, clinic and date.
-- =====================================================

begin;

create or replace function public.get_available_appointment_slots(
  target_doctor_id uuid,
  target_clinic_id uuid,
  target_date date
)
returns table (
  slot_time time,
  duration_minutes integer
)
language sql
stable
security definer
set search_path = public
as $$
  with valid_doctor as (
    select d.id
    from public.doctors as d
    inner join public.doctor_clinics as dc
      on dc.doctor_id = d.id
    where d.id = target_doctor_id
      and d.status = 'active'
      and dc.clinic_id = target_clinic_id
  ),

  active_availability as (
    select
      a.id,
      a.start_time,
      a.end_time,
      a.appointment_duration_minutes
    from public.availability as a
    inner join valid_doctor as vd
      on vd.id = a.doctor_id
    where a.clinic_id = target_clinic_id
      and a.weekday = extract(
        dow from target_date
      )::integer
      and a.is_active = true
  ),

  generated_slots as (
    select
      a.id as availability_id,

      generated_slot::time
        as slot_time,

      a.appointment_duration_minutes
        as duration_minutes,

      generated_slot
        as slot_start_timestamp,

      generated_slot
        + make_interval(
            mins =>
              a.appointment_duration_minutes
          )
        as slot_end_timestamp

    from active_availability as a

    cross join lateral generate_series(
      target_date::timestamp
        + a.start_time,

      target_date::timestamp
        + a.end_time
        - make_interval(
            mins =>
              a.appointment_duration_minutes
          ),

      make_interval(
        mins =>
          a.appointment_duration_minutes
      )
    ) as generated_slot
  )

  select distinct
    gs.slot_time,
    gs.duration_minutes

  from generated_slots as gs

  where
    -- Do not expose slots during recurring breaks.
    not exists (
      select 1
      from public.availability_breaks as ab
      where ab.availability_id =
        gs.availability_id
        and gs.slot_time < ab.end_time
        and (
          gs.slot_time
          + make_interval(
              mins =>
                gs.duration_minutes
            )
        )::time > ab.start_time
    )

    -- Do not expose full or partial days off.
    and not exists (
      select 1
      from public.doctor_days_off as ddo
      where ddo.doctor_id =
        target_doctor_id
        and ddo.date =
          target_date
        and (
          ddo.clinic_id is null
          or ddo.clinic_id =
            target_clinic_id
        )
        and (
          ddo.is_all_day = true
          or (
            gs.slot_time <
              ddo.end_time
            and
            (
              gs.slot_time
              + make_interval(
                  mins =>
                    gs.duration_minutes
                )
            )::time >
              ddo.start_time
          )
        )
    )

    -- Do not expose slots overlapping active appointments.
    and not exists (
      select 1
      from public.appointments as ap
      where ap.doctor_id =
        target_doctor_id
        and ap.status in (
          'pending',
          'confirmed',
          'rescheduled'
        )
        and ap.appointment_range
          &&
          tsrange(
            gs.slot_start_timestamp,
            gs.slot_end_timestamp,
            '[)'
          )
    )

    -- A patient cannot book a time that has already passed.
    and (
      target_date > current_date
      or (
        target_date = current_date
        and gs.slot_time >
          localtime
      )
    )

  order by slot_time;
$$;

revoke all
on function public.get_available_appointment_slots(
  uuid,
  uuid,
  date
)
from public;

grant execute
on function public.get_available_appointment_slots(
  uuid,
  uuid,
  date
)
to anon, authenticated;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name =
    'get_available_appointment_slots';