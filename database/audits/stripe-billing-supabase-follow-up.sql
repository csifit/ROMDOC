-- ============================================================
-- RomDoc — Supabase billing audit follow-up
--
-- Exact project path:
-- ROMDOC/database/audits/stripe-billing-supabase-follow-up.sql
--
-- READ-ONLY: SELECT statements only.
--
-- Run Sections 10, 12 and 14 separately in Supabase SQL Editor
-- and send the result grids back to ChatGPT.
-- ============================================================


-- ============================================================
-- SECTION 10 — CORRECTED LIVE DOCTOR COMMERCIAL STATE
--
-- The original audit used "grant" as a table alias. PostgreSQL
-- parsed it as the GRANT keyword. This version uses "dag".
-- ============================================================

with latest_complimentary as (
  select distinct on (dag.doctor_id)
    dag.doctor_id,
    dag.id,
    dag.status,
    dag.starts_at,
    dag.ends_at,
    dag.invitation_id,
    dag.created_at
  from public.doctor_access_grants as dag
  where dag.grant_type = 'admin_complimentary'
  order by
    dag.doctor_id,
    dag.created_at desc
)
select
  left(doctor.id::text, 8) as doctor_ref,
  left(doctor.profile_id::text, 8) as profile_ref,
  doctor.account_type,
  doctor.status as doctor_status,
  profile.role as profile_role,
  profile.account_status as profile_account_status,

  complimentary.status as complimentary_status,
  complimentary.starts_at as complimentary_starts_at,
  complimentary.ends_at as complimentary_ends_at,

  subscription.status as stripe_subscription_status,
  subscription.billing_interval as stripe_billing_interval,
  subscription.stripe_customer_id is not null as has_stripe_customer,
  subscription.stripe_subscription_id is not null as has_stripe_subscription,
  subscription.current_period_start as stripe_period_start,
  subscription.current_period_end as stripe_period_end,
  subscription.last_payment_at as stripe_last_payment_at,
  subscription.cancel_at_period_end

from public.doctors as doctor
left join public.profiles as profile
  on profile.id = doctor.profile_id
left join latest_complimentary as complimentary
  on complimentary.doctor_id = doctor.id
left join public.doctor_subscriptions as subscription
  on (
    subscription.doctor_id = doctor.id
    or (
      subscription.doctor_id is null
      and subscription.profile_id = doctor.profile_id
    )
  )
order by
  doctor.account_type,
  doctor.created_at desc;


-- ============================================================
-- SECTION 12 — STRIPE WEBHOOK PROCESSING HISTORY
--
-- No Stripe IDs or secrets are returned.
-- ============================================================

select
  event_type,
  count(*) as processed_count,
  min(processed_at) as first_processed_at,
  max(processed_at) as last_processed_at
from public.stripe_webhook_events
group by event_type
order by
  last_processed_at desc nulls last,
  event_type;


-- ============================================================
-- SECTION 14 — SAFE PG_CRON JOB INVENTORY
--
-- pg_cron is installed in the live database. This query DOES NOT
-- return the SQL command itself, because a cron command can contain
-- URLs, tokens or other sensitive configuration.
--
-- Instead it tells us whether each command contains commercial or
-- account-enforcement keywords. If any relevant_* column is TRUE,
-- we can inspect that particular job safely in a second step.
-- ============================================================

select
  jobid,
  jobname,
  schedule,
  active,
  database,
  username,

  (
    command ilike '%stripe%'
    or command ilike '%subscription%'
    or command ilike '%payment%'
    or command ilike '%billing%'
    or command ilike '%invoice%'
  ) as relevant_to_payments,

  (
    command ilike '%doctor_access_grants%'
    or command ilike '%complimentary%'
  ) as relevant_to_complimentary_access,

  (
    command ilike '%account_status%'
    or command ilike '%suspend%'
    or command ilike '%blocked%'
    or command ilike '%past_due%'
    or command ilike '%unpaid%'
  ) as relevant_to_account_enforcement

from cron.job
order by jobid;


-- ============================================================
-- END
-- ============================================================
