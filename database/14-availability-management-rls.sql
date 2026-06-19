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