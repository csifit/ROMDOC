-- =====================================================
-- ROMDOC — CLINIC GEOSPATIAL SEARCH
-- File: ROMDOC/database/21-clinic-geospatial-search.sql
-- Purpose:
--   1. Enable PostGIS in Supabase.
--   2. Add an indexed geography point generated from clinic coordinates.
--   3. Add a public-safe radius-search function for approved clinics.
-- =====================================================

begin;

-- Supabase convention: install database extensions in the extensions schema.
create schema if not exists extensions;

create extension if not exists postgis
with schema extensions;

-- The geography point is generated automatically whenever latitude or
-- longitude changes. Longitude must be the first ST_MakePoint argument.
alter table public.clinics
add column if not exists location
extensions.geography(Point, 4326)
generated always as (
  case
    when latitude is null or longitude is null then null
    when latitude < -90 or latitude > 90 then null
    when longitude < -180 or longitude > 180 then null
    else extensions.st_setsrid(
      extensions.st_makepoint(
        longitude::double precision,
        latitude::double precision
      ),
      4326
    )::extensions.geography
  end
) stored;

create index if not exists idx_clinics_location_gist
on public.clinics
using gist (location);

create index if not exists idx_clinics_approved_location
on public.clinics (status)
where status = 'approved'
  and location is not null;

-- Returns only approved clinic identifiers and their distance from the
-- selected point. Public doctor details remain controlled by the API layer.
create or replace function public.find_approved_clinics_nearby(
  search_latitude double precision,
  search_longitude double precision,
  radius_kilometres double precision default 10
)
returns table (
  clinic_id uuid,
  distance_metres double precision
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  search_point extensions.geography(Point, 4326);
  radius_metres double precision;
begin
  if search_latitude is null
    or search_latitude < -90
    or search_latitude > 90 then
    raise exception 'Invalid latitude';
  end if;

  if search_longitude is null
    or search_longitude < -180
    or search_longitude > 180 then
    raise exception 'Invalid longitude';
  end if;

  if radius_kilometres is null
    or radius_kilometres <= 0
    or radius_kilometres > 500 then
    raise exception 'Radius must be greater than 0 and no more than 500 kilometres';
  end if;

  radius_metres := radius_kilometres * 1000;

  search_point := extensions.st_setsrid(
    extensions.st_makepoint(
      search_longitude,
      search_latitude
    ),
    4326
  )::extensions.geography;

  return query
  select
    clinics.id,
    extensions.st_distance(
      clinics.location,
      search_point
    )::double precision
  from public.clinics
  where clinics.status = 'approved'
    and clinics.location is not null
    and extensions.st_dwithin(
      clinics.location,
      search_point,
      radius_metres
    )
  order by
    extensions.st_distance(
      clinics.location,
      search_point
    ) asc;
end;
$$;

revoke all
on function public.find_approved_clinics_nearby(
  double precision,
  double precision,
  double precision
)
from public;

grant execute
on function public.find_approved_clinics_nearby(
  double precision,
  double precision,
  double precision
)
to anon, authenticated, service_role;

comment on function public.find_approved_clinics_nearby(
  double precision,
  double precision,
  double precision
) is
'Returns approved clinics within a radius of a latitude/longitude point, ordered by distance.';

commit;
