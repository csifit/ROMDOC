-- =========================================================
-- RomDoc Group 8C
-- Read-only verification: Clinic Organisation usage blockers
--
-- This file does not modify data or schema.
-- =========================================================

-- 1. Both values must be NULL after migration 87.
select
  to_regprocedure(
    'public.consume_api_rate_limit(text,integer,integer)'
  ) as rate_limit_function,
  to_regclass(
    'public.api_rate_limits'
  ) as rate_limit_table;

-- 2. Review organisation statuses.
-- Operational use is available only while status = 'active'.
select
  organization.status,
  count(*) as organization_count
from public.clinic_organizations as organization
group by
  organization.status
order by
  organization.status;

-- 3. Review active Manager memberships.
select
  organization.id as organization_id,
  organization.name as organization_name,
  organization.status as organization_status,
  count(*) filter (
    where membership.status = 'active'
  ) as active_manager_memberships
from public.clinic_organizations as organization
left join public.clinic_organization_members as membership
  on membership.organization_id = organization.id
group by
  organization.id,
  organization.name,
  organization.status
order by
  organization.name;

-- 4. Commercial fields are reported, not interpreted as usage quotas.
select
  relationship.organization_id,
  count(*) as relationship_count,
  count(*) filter (
    where relationship.payment_responsibility = 'clinic_paid'
  ) as clinic_paid_count,
  count(*) filter (
    where relationship.coverage_status = 'active'
  ) as active_coverage_count
from public.clinic_doctor_relationships as relationship
group by
  relationship.organization_id
order by
  relationship.organization_id;
