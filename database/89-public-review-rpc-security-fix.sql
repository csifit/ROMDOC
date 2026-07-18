-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 3C security correction:
-- Replace SECURITY DEFINER public view with a scoped RPC
--
-- Exact path:
-- ROMDOC/database/89-public-review-rpc-security-fix.sql
--
-- Run after:
-- ROMDOC/database/88-public-review-privacy-and-verification.sql
-- =====================================================

begin;

-- -----------------------------------------------------
-- 1. Remove the public view flagged by Supabase.
-- -----------------------------------------------------

revoke all
on table public.public_doctor_reviews
from public, anon, authenticated;

drop view if exists
  public.public_doctor_reviews;

-- -----------------------------------------------------
-- 2. Keep the private reviews table inaccessible through
--    the public Data API.
-- -----------------------------------------------------

revoke all
on table public.reviews
from public, anon, authenticated;

-- -----------------------------------------------------
-- 3. Create a narrowly scoped public RPC.
--
-- SECURITY DEFINER is intentional here because callers
-- must not receive direct SELECT privileges on reviews,
-- appointments, Patient identity columns, or appointment IDs.
--
-- Security controls:
-- - fixed empty search_path
-- - every relation is schema-qualified
-- - SQL-only, STABLE function
-- - returns only safe public columns
-- - accepts only a Doctor UUID
-- -----------------------------------------------------

drop function if exists
  public.get_public_doctor_reviews(uuid);

create function
  public.get_public_doctor_reviews(
    target_doctor_id uuid
  )
returns table (
  id uuid,
  rating integer,
  review_text text,
  created_at timestamptz,
  verified_appointment boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    r.id,
    r.rating,
    r.review_text,
    r.created_at,

    exists (
      select 1
      from public.appointments as a
      where a.id = r.appointment_id
        and a.doctor_id = r.doctor_id
        and a.patient_profile_id = r.patient_profile_id
        and a.status = 'completed'
    ) as verified_appointment

  from public.reviews as r

  where r.doctor_id = target_doctor_id
    and r.status = 'published'
    and r.approved = true

  order by r.created_at desc;
$function$;

comment on function
  public.get_public_doctor_reviews(uuid)
is
  'Returns public-safe Doctor reviews without Patient identity fields or appointment identifiers.';

-- Functions receive PUBLIC execute permission by default,
-- so revoke broadly before granting the required roles.

revoke all
on function public.get_public_doctor_reviews(uuid)
from public;

revoke all
on function public.get_public_doctor_reviews(uuid)
from anon, authenticated;

grant execute
on function public.get_public_doctor_reviews(uuid)
to anon, authenticated;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  routine_schema,
  routine_name,
  security_type,
  data_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'get_public_doctor_reviews';

select
  grantee,
  privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name = 'get_public_doctor_reviews'
order by grantee, privilege_type;

select
  table_name
from information_schema.views
where table_schema = 'public'
  and table_name = 'public_doctor_reviews';
