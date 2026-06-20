-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 53B: Doctor clinic proposals
--
-- File:
-- ROMDOC/database/20-doctor-clinic-proposals.sql
-- =====================================================

begin;

-- =====================================================
-- 1. CLINIC APPROVAL WORKFLOW
-- =====================================================

alter table public.clinics
  add column if not exists status text;

alter table public.clinics
  add column if not exists proposed_by_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.clinics
  add column if not exists approved_by_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.clinics
  add column if not exists approved_at timestamptz;

alter table public.clinics
  add column if not exists rejected_at timestamptz;

alter table public.clinics
  add column if not exists rejection_reason text;

-- Clinics created before this workflow are considered approved.
update public.clinics
set
  status = 'approved',
  approved_at = coalesce(
    approved_at,
    created_at,
    now()
  )
where status is null;

alter table public.clinics
  alter column status
  set default 'pending';

alter table public.clinics
  alter column status
  set not null;

alter table public.clinics
  drop constraint if exists clinics_status_check;

alter table public.clinics
  add constraint clinics_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected'
    )
  );

-- =====================================================
-- 2. GOOGLE PLACE DUPLICATE PROTECTION
-- =====================================================

create unique index if not exists
  idx_clinics_unique_google_place_id
on public.clinics (
  google_place_id
)
where google_place_id is not null;

create index if not exists
  idx_clinics_status
on public.clinics (
  status,
  created_at desc
);

create index if not exists
  idx_clinics_proposed_by_profile
on public.clinics (
  proposed_by_profile_id,
  status
);

create index if not exists
  idx_clinics_city_status
on public.clinics (
  city_id,
  status
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clinics'
order by ordinal_position;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'clinics'
order by indexname;