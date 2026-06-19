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