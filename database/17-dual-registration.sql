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