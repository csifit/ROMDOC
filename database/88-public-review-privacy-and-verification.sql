-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 3C: Verified appointment label + public review privacy
--
-- Exact path:
-- ROMDOC/database/88-public-review-privacy-and-verification.sql
-- =====================================================

begin;

-- -----------------------------------------------------
-- 1. Remove direct public access to the reviews table.
--
-- RLS controls rows, not which columns are visible.
-- The reviews table contains Patient identity fields such as:
-- - patient_profile_id
-- - patient_name
-- - appointment_id
--
-- Public clients must never query those fields directly.
-- -----------------------------------------------------

revoke all
on table public.reviews
from anon, authenticated;

-- -----------------------------------------------------
-- 2. Create a public-safe review view.
--
-- This view deliberately exposes only:
-- - review ID
-- - Doctor ID
-- - rating
-- - review text
-- - publication date
-- - derived verified-appointment status
--
-- It exposes no Patient identity or appointment identifier.
-- -----------------------------------------------------

drop view if exists
  public.public_doctor_reviews;

create view
  public.public_doctor_reviews
with (
  security_barrier = true
)
as
select
  r.id,
  r.doctor_id,
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
where r.status = 'published'
  and r.approved = true;

comment on view
  public.public_doctor_reviews
is
  'Public-safe Doctor reviews. Contains no Patient identity fields or appointment identifiers.';

revoke all
on table public.public_doctor_reviews
from public;

grant select
on table public.public_doctor_reviews
to anon, authenticated;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'public_doctor_reviews'
order by ordinal_position;

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'reviews',
    'public_doctor_reviews'
  )
order by table_name, grantee, privilege_type;
