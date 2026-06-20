-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 55B: Admin cities management
--
-- File:
-- ROMDOC/database/24-admin-cities.sql
-- =====================================================

begin;

alter table public.cities
  add column if not exists is_active boolean;

update public.cities
set is_active = true
where is_active is null;

alter table public.cities
  alter column is_active
  set default true;

alter table public.cities
  alter column is_active
  set not null;

create index if not exists
  idx_cities_active_slug
on public.cities (
  is_active,
  slug
);

create index if not exists
  idx_cities_country_active
on public.cities (
  country_code,
  is_active
);

create index if not exists
  idx_city_translations_locale_name
on public.city_translations (
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
  country_code,
  latitude,
  longitude,
  is_active,
  created_at,
  updated_at
from public.cities
order by slug;