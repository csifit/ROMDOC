-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 55A: Admin specialties management
--
-- File:
-- ROMDOC/database/23-admin-specialties.sql
-- =====================================================

begin;

alter table public.specialties
  add column if not exists is_active boolean;

update public.specialties
set is_active = true
where is_active is null;

alter table public.specialties
  alter column is_active
  set default true;

alter table public.specialties
  alter column is_active
  set not null;

create index if not exists
  idx_specialties_active_slug
on public.specialties (
  is_active,
  slug
);

create index if not exists
  idx_specialty_translations_locale_name
on public.specialty_translations (
  locale,
  lower(name)
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  id,
  slug,
  icon,
  is_active,
  created_at,
  updated_at
from public.specialties
order by slug;