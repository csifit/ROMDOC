-- ============================================================
-- RomDoc — Supabase / Stripe billing read-only audit
--
-- Suggested project path:
-- ROMDOC/database/audits/stripe-billing-supabase-readonly-audit.sql
--
-- PURPOSE
-- Inspect the LIVE Supabase database for:
--   - Stripe/subscription/billing/payment tables
--   - possible Stripe FDW / wrapper configuration
--   - doctor subscription state
--   - complimentary-access state
--   - clinic/manual billing state
--   - triggers/functions that could affect account access
--   - RLS policies around billing
--   - Stripe webhook processing history
--
-- SAFETY
-- READ-ONLY. Every statement below is SELECT-only.
-- It does not INSERT, UPDATE, DELETE, ALTER, CREATE, DROP,
-- call mutation RPCs, or expose stored secret values.
--
-- Please run the COMPLETE file in Supabase SQL Editor.
-- Send ChatGPT the result grids (or screenshots/text exports) in
-- section order: 1, 2, 3 ... 13.
-- ============================================================

-- 1. DATABASE / EXTENSION INVENTORY
select
  extname as extension_name,
  extversion as extension_version
from pg_extension
where
  extname ilike '%stripe%'
  or extname ilike '%wrapper%'
  or extname in ('pg_cron','pg_net','http')
order by extname;

-- 2. FOREIGN DATA WRAPPERS / FOREIGN SERVERS
select
  fdw.fdwname as foreign_data_wrapper,
  srv.srvname as foreign_server
from pg_foreign_server as srv
join pg_foreign_data_wrapper as fdw
  on fdw.oid = srv.srvfdw
where
  fdw.fdwname ilike '%stripe%'
  or srv.srvname ilike '%stripe%'
  or fdw.fdwname ilike '%wrapper%'
order by fdw.fdwname, srv.srvname;

-- 3. PAYMENT / BILLING TABLE INVENTORY
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and (
    table_name ilike '%stripe%'
    or table_name ilike '%subscription%'
    or table_name ilike '%billing%'
    or table_name ilike '%invoice%'
    or table_name ilike '%payment%'
    or table_name ilike '%access_grant%'
    or table_name ilike '%reminder%'
  )
order by table_name;

-- 4. PAYMENT / BILLING COLUMNS
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    table_name ilike '%stripe%'
    or table_name ilike '%subscription%'
    or table_name ilike '%billing%'
    or table_name ilike '%invoice%'
    or table_name ilike '%payment%'
    or table_name ilike '%access_grant%'
    or table_name ilike '%reminder%'
  )
order by table_name, ordinal_position;

-- 5. CONSTRAINTS ON CORE COMMERCIAL TABLES
select
  cls.relname as table_name,
  con.conname as constraint_name,
  case con.contype
    when 'c' then 'CHECK'
    when 'f' then 'FOREIGN KEY'
    when 'p' then 'PRIMARY KEY'
    when 'u' then 'UNIQUE'
    when 'x' then 'EXCLUSION'
    else con.contype::text
  end as constraint_type,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint as con
join pg_class as cls
  on cls.oid = con.conrelid
join pg_namespace as ns
  on ns.oid = cls.relnamespace
where ns.nspname = 'public'
  and cls.relname in (
    'profiles',
    'doctors',
    'doctor_subscriptions',
    'doctor_access_grants',
    'doctor_access_reminders',
    'doctor_invitations',
    'clinic_organizations',
    'clinic_doctor_relationships',
    'clinic_billing_settings',
    'clinic_invoices',
    'client_billing_terms',
    'client_billing_invoice_records',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'stripe_webhook_events'
  )
order by cls.relname, con.conname;

-- 6. TRIGGERS + THEIR FUNCTION DEFINITIONS
select
  cls.relname as table_name,
  trg.tgname as trigger_name,
  pg_get_triggerdef(trg.oid, true) as trigger_definition,
  proc.proname as trigger_function,
  pg_get_functiondef(proc.oid) as function_definition
from pg_trigger as trg
join pg_class as cls
  on cls.oid = trg.tgrelid
join pg_namespace as ns
  on ns.oid = cls.relnamespace
join pg_proc as proc
  on proc.oid = trg.tgfoid
where
  not trg.tgisinternal
  and ns.nspname = 'public'
  and cls.relname in (
    'profiles',
    'doctors',
    'doctor_subscriptions',
    'doctor_access_grants',
    'doctor_access_reminders',
    'doctor_invitations',
    'clinic_organizations',
    'clinic_doctor_relationships',
    'clinic_billing_settings',
    'clinic_invoices',
    'client_billing_terms',
    'client_billing_invoice_records',
    'doctor_sms_billing_periods',
    'doctor_sms_payments'
  )
order by cls.relname, trg.tgname;

-- 7. BILLING / ACCESS FUNCTIONS FOUND BY SOURCE TEXT
select
  ns.nspname as function_schema,
  proc.proname as function_name,
  pg_get_function_identity_arguments(proc.oid) as arguments,
  pg_get_functiondef(proc.oid) as function_definition
from pg_proc as proc
join pg_namespace as ns
  on ns.oid = proc.pronamespace
where ns.nspname = 'public'
  and (
    proc.proname ilike '%stripe%'
    or proc.proname ilike '%subscription%'
    or proc.proname ilike '%billing%'
    or proc.proname ilike '%invoice%'
    or proc.proname ilike '%payment%'
    or proc.proname ilike '%complimentary%'
    or proc.prosrc ilike '%doctor_subscriptions%'
    or proc.prosrc ilike '%doctor_access_grants%'
    or proc.prosrc ilike '%clinic_invoices%'
    or proc.prosrc ilike '%client_billing_invoice_records%'
    or proc.prosrc ilike '%past_due%'
    or proc.prosrc ilike '%unpaid%'
    or proc.prosrc ilike '%account_status%'
    or proc.prosrc ilike '%suspended%'
    or proc.prosrc ilike '%blocked%'
  )
order by proc.proname;

-- 8. RLS POLICIES ON COMMERCIAL TABLES
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'doctor_subscriptions',
    'doctor_access_grants',
    'doctor_access_reminders',
    'doctor_invitations',
    'clinic_billing_settings',
    'clinic_invoices',
    'client_billing_terms',
    'client_billing_invoice_records',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'stripe_webhook_events'
  )
order by tablename, policyname;

-- 9. LIVE DOCTOR STRIPE SUBSCRIPTION SUMMARY
select
  status,
  billing_interval,
  count(*) as subscription_rows,
  count(*) filter (where stripe_customer_id is not null) as with_stripe_customer,
  count(*) filter (where stripe_subscription_id is not null) as with_stripe_subscription,
  count(*) filter (where stripe_price_id is not null) as with_stripe_price,
  min(current_period_start) as earliest_period_start,
  max(current_period_end) as latest_period_end,
  max(last_payment_at) as latest_recorded_payment
from public.doctor_subscriptions
group by status, billing_interval
order by status, billing_interval;

-- 10. LIVE DOCTOR COMMERCIAL STATE
with latest_complimentary as (
  select distinct on (grant.doctor_id)
    grant.doctor_id,
    grant.id,
    grant.status,
    grant.starts_at,
    grant.ends_at,
    grant.invitation_id,
    grant.created_at
  from public.doctor_access_grants as grant
  where grant.grant_type = 'admin_complimentary'
  order by grant.doctor_id, grant.created_at desc
)
select
  left(doctor.id::text, 8) as doctor_ref,
  left(doctor.profile_id::text, 8) as profile_ref,
  doctor.account_type,
  doctor.status as doctor_status,
  profile.role as profile_role,
  profile.account_status as profile_account_status,
  grant.status as complimentary_status,
  grant.starts_at as complimentary_starts_at,
  grant.ends_at as complimentary_ends_at,
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
left join latest_complimentary as grant
  on grant.doctor_id = doctor.id
left join public.doctor_subscriptions as subscription
  on (
    subscription.doctor_id = doctor.id
    or (
      subscription.doctor_id is null
      and subscription.profile_id = doctor.profile_id
    )
  )
order by doctor.account_type, doctor.created_at desc;

-- 11. COMPLIMENTARY ACCESS SUMMARY
select
  grant_type,
  status,
  count(*) as grant_count,
  min(starts_at) as earliest_start,
  max(ends_at) as latest_end
from public.doctor_access_grants
group by grant_type, status
order by grant_type, status;

-- 12. STRIPE WEBHOOK PROCESSING HISTORY
select
  event_type,
  count(*) as processed_count,
  min(processed_at) as first_processed_at,
  max(processed_at) as last_processed_at
from public.stripe_webhook_events
group by event_type
order by last_processed_at desc nulls last, event_type;

-- 13A. GLOBAL BILLING CONFIGURATION
select
  id,
  clinic_doctor_monthly_price_ron as subscription_unit_price,
  sms_unit_price_ron as sms_unit_price,
  billing_currency,
  vat_rate,
  updated_at
from public.clinic_billing_settings
order by id;

-- 13B. SHARED BILLING INVOICE STATUS TOTALS
select
  client_type,
  status,
  currency,
  count(*) as invoice_count,
  sum(amount) as total_amount,
  min(billing_period_start) as earliest_period,
  max(billing_period_end) as latest_period,
  max(paid_on) as latest_paid_on
from public.client_billing_invoice_records
group by client_type, status, currency
order by client_type, status, currency;

-- 13C. LEGACY CLINIC INVOICE STATUS TOTALS
select
  status,
  currency,
  count(*) as invoice_count,
  sum(amount_ron) as total_amount,
  min(billing_period_start) as earliest_period,
  max(billing_period_end) as latest_period,
  max(paid_on) as latest_paid_on
from public.clinic_invoices
group by status, currency
order by status, currency;

-- 13D. CLIENT-SPECIFIC BILLING OVERRIDES
select
  client_type,
  currency,
  count(*) as override_count,
  count(*) filter (where subscription_unit_price is not null)
    as with_subscription_override,
  count(*) filter (where sms_unit_price is not null)
    as with_sms_override,
  min(effective_from) as earliest_effective_from,
  max(effective_until) as latest_effective_until
from public.client_billing_terms
group by client_type, currency
order by client_type, currency;

-- ============================================================
-- END OF READ-ONLY AUDIT
-- ============================================================
