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