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
  