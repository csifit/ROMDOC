-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 53A: Google clinic addresses
--
-- File:
-- ROMDOC/database/19-clinic-google-addresses.sql
-- =====================================================

begin;

-- =====================================================
-- 1. STRUCTURED CLINIC ADDRESS FIELDS
-- =====================================================

alter table public.clinics
  add column if not exists formatted_address text;

alter table public.clinics
  add column if not exists address_line_1 text;

alter table public.clinics
  add column if not exists address_line_2 text;

alter table public.clinics
  add column if not exists postal_code text;

alter table public.clinics
  add column if not exists county_name text;

alter table public.clinics
  add column if not exists country_code text
    not null default 'RO';

alter table public.clinics
  add column if not exists google_place_id text;

alter table public.clinics
  add column if not exists google_maps_uri text;

alter table public.clinics
  add column if not exists address_verified_at timestamptz;

-- Existing street_address remains temporarily for
-- backward compatibility with existing clinic pages.

create index if not exists
  idx_clinics_google_place_id
on public.clinics (
  google_place_id
);

create index if not exists
  idx_clinics_city_id
on public.clinics (
  city_id
);

create index if not exists
  idx_clinics_country_code
on public.clinics (
  country_code
);

-- =====================================================
-- 2. CITY LOOKUP SUPPORT
-- =====================================================

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
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clinics'
order by ordinal_position;