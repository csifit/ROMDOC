-- Step 1H-A — Patient saved doctors
-- Exact project path:
-- ROMDOC/database/87-patient-saved-doctors.sql

begin;

create table if not exists public.patient_saved_doctors (
  id uuid primary key default gen_random_uuid(),
  patient_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,
  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  constraint patient_saved_doctors_patient_doctor_unique
    unique (patient_profile_id, doctor_id)
);

comment on table public.patient_saved_doctors is
  'Private patient favourite-doctor relationships. One row means one patient saved one doctor.';

create index if not exists
  idx_patient_saved_doctors_patient_created_at
on public.patient_saved_doctors (
  patient_profile_id,
  created_at desc
);

create index if not exists
  idx_patient_saved_doctors_doctor_id
on public.patient_saved_doctors (
  doctor_id
);

alter table public.patient_saved_doctors
  enable row level security;

alter table public.patient_saved_doctors
  force row level security;

revoke all
on table public.patient_saved_doctors
from anon, authenticated;

grant select, insert, delete
on table public.patient_saved_doctors
to authenticated;

drop policy if exists
  "Patients can view own saved doctors"
on public.patient_saved_doctors;

create policy
  "Patients can view own saved doctors"
on public.patient_saved_doctors
for select
to authenticated
using (
  patient_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'patient'
      and profiles.account_status = 'active'
  )
);

drop policy if exists
  "Patients can save doctors for themselves"
on public.patient_saved_doctors;

create policy
  "Patients can save doctors for themselves"
on public.patient_saved_doctors
for insert
to authenticated
with check (
  patient_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'patient'
      and profiles.account_status = 'active'
  )
  and exists (
    select 1
    from public.doctors
    where doctors.id = patient_saved_doctors.doctor_id
      and doctors.status = 'active'
  )
);

drop policy if exists
  "Patients can remove own saved doctors"
on public.patient_saved_doctors;

create policy
  "Patients can remove own saved doctors"
on public.patient_saved_doctors
for delete
to authenticated
using (
  patient_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'patient'
      and profiles.account_status = 'active'
  )
);

create or replace function public.get_doctor_saved_count(
  target_doctor_id uuid
)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when exists (
        select 1
        from public.doctors
        where doctors.id = target_doctor_id
          and doctors.status = 'active'
      )
      then (
        select count(*)::bigint
        from public.patient_saved_doctors
        where patient_saved_doctors.doctor_id = target_doctor_id
      )
      else 0::bigint
    end;
$$;

comment on function public.get_doctor_saved_count(uuid) is
  'Returns only the aggregate number of patient favourite lists containing one active doctor.';

revoke all
on function public.get_doctor_saved_count(uuid)
from public;

grant execute
on function public.get_doctor_saved_count(uuid)
to anon, authenticated;

commit;

-- Verification queries

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'patient_saved_doctors';

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'patient_saved_doctors'
order by policyname;

select
  routine_schema,
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'get_doctor_saved_count';
