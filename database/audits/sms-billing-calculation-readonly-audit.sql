-- =====================================================
-- ROMDOC READ-ONLY AUDIT
-- SMS billing / calculation inventory
--
-- Suggested project path:
-- ROMDOC/database/audits/sms-billing-calculation-readonly-audit.sql
--
-- PURPOSE
-- Verify the LIVE Supabase database before removing or simplifying
-- per-SMS monetary billing for Independent Doctors and Clinic Organisations.
--
-- SAFETY
-- - SELECT statements only.
-- - No INSERT / UPDATE / DELETE.
-- - No CREATE / ALTER / DROP.
-- - No patient phone numbers, SMS bodies, provider message IDs, or secrets.
-- - Run sections one by one in Supabase SQL Editor and keep the results.
-- =====================================================


-- =====================================================
-- SECTION 1 — SMS / BILLING OBJECT INVENTORY
-- Shows public tables/views that may participate in SMS, billing,
-- invoicing, pricing, or payment flows.
-- =====================================================
select
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'public'
  and (
    table_name ilike '%sms%'
    or table_name ilike '%billing%'
    or table_name ilike '%invoice%'
    or table_name ilike '%payment%'
  )
order by table_type, table_name;


-- =====================================================
-- SECTION 2 — RELEVANT TABLE COLUMNS
-- Confirms which monetary / operational fields are actually live.
-- =====================================================
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'sms_platform_settings',
    'sms_delivery_logs',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items',
    'clinic_billing_settings',
    'client_billing_terms',
    'client_billing_invoice_records',
    'clinic_invoices'
  )
order by table_name, ordinal_position;


-- =====================================================
-- SECTION 3 — CONSTRAINTS ON SMS / BILLING TABLES
-- Useful before removing billing columns or tables later.
-- =====================================================
select
  cls.relname as table_name,
  con.conname as constraint_name,
  case con.contype
    when 'p' then 'PRIMARY KEY'
    when 'f' then 'FOREIGN KEY'
    when 'u' then 'UNIQUE'
    when 'c' then 'CHECK'
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
    'sms_platform_settings',
    'sms_delivery_logs',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items',
    'clinic_billing_settings',
    'client_billing_terms',
    'client_billing_invoice_records',
    'clinic_invoices'
  )
order by cls.relname, constraint_type, con.conname;


-- =====================================================
-- SECTION 4 — TRIGGERS ON SMS / BILLING TABLES
-- Identifies hidden write-time behavior such as currency enforcement.
-- =====================================================
select
  cls.relname as table_name,
  trg.tgname as trigger_name,
  pg_get_triggerdef(trg.oid, true) as trigger_definition
from pg_trigger as trg
join pg_class as cls
  on cls.oid = trg.tgrelid
join pg_namespace as ns
  on ns.oid = cls.relnamespace
where ns.nspname = 'public'
  and not trg.tgisinternal
  and cls.relname in (
    'sms_platform_settings',
    'sms_delivery_logs',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items',
    'clinic_billing_settings',
    'client_billing_terms',
    'client_billing_invoice_records',
    'clinic_invoices'
  )
order by cls.relname, trg.tgname;


-- =====================================================
-- SECTION 5 — LIVE DATABASE FUNCTIONS THAT REFERENCE SMS BILLING
-- Returns names and dependency flags only; it does NOT dump function source.
-- =====================================================
with function_definitions as (
  select
    ns.nspname as function_schema,
    proc.proname as function_name,
    pg_get_function_identity_arguments(proc.oid) as identity_arguments,
    pg_get_function_result(proc.oid) as result_type,
    lower(pg_get_functiondef(proc.oid)) as function_definition
  from pg_proc as proc
  join pg_namespace as ns
    on ns.oid = proc.pronamespace
  where ns.nspname = 'public'
)
select
  function_schema,
  function_name,
  identity_arguments,
  result_type,
  function_definition like '%sms_unit_price%' as mentions_sms_unit_price,
  function_definition like '%unit_cost_minor%' as mentions_unit_cost_minor,
  function_definition like '%sms_delivery_logs%' as mentions_sms_delivery_logs,
  function_definition like '%doctor_sms_billing_periods%' as mentions_sms_billing_periods,
  function_definition like '%doctor_sms_payments%' as mentions_sms_payments,
  function_definition like '%doctor_sms_payment_items%' as mentions_sms_payment_items,
  function_definition like '%invoice_status%' as mentions_invoice_status,
  function_definition like '%sms_subtotal%' as mentions_sms_subtotal,
  function_definition like '%account_status%' as mentions_account_status
from function_definitions
where
  function_definition like '%sms_unit_price%'
  or function_definition like '%unit_cost_minor%'
  or function_definition like '%sms_delivery_logs%'
  or function_definition like '%doctor_sms_billing_periods%'
  or function_definition like '%doctor_sms_payments%'
  or function_definition like '%doctor_sms_payment_items%'
  or function_definition like '%sms_subtotal%'
order by function_name, identity_arguments;


-- =====================================================
-- SECTION 6 — RLS POLICIES ON SMS / BILLING TABLES
-- =====================================================
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
    'sms_platform_settings',
    'sms_delivery_logs',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items',
    'clinic_billing_settings',
    'client_billing_terms',
    'client_billing_invoice_records',
    'clinic_invoices'
  )
order by tablename, policyname;


-- =====================================================
-- SECTION 7 — LIVE SMS SERVICE SETTINGS
-- Operational configuration only. No provider credentials are returned.
-- =====================================================
select
  id,
  sms_enabled,
  confirmation_sms_enabled,
  reminder_24h_sms_enabled,
  provider,
  updated_at
from public.sms_platform_settings
order by id;


-- =====================================================
-- SECTION 8 — LIVE GLOBAL SMS MONETARY RATE
-- This is the current per-SMS price source used by legacy/shared billing.
-- =====================================================
select
  id,
  clinic_doctor_monthly_price_ron as subscription_unit_price,
  sms_unit_price_ron as sms_unit_price,
  billing_currency,
  vat_rate,
  updated_at
from public.clinic_billing_settings
where id = 1;


-- =====================================================
-- SECTION 9A — SMS DELIVERY LOG BILLING FOOTPRINT
-- Aggregate only: no recipient, message text, or provider message ID.
-- =====================================================
select
  coalesce(event, '(null)') as event,
  coalesce(status, '(null)') as delivery_status,
  coalesce(invoice_status, '(null)') as invoice_status,
  coalesce(payer_type, '(null)') as payer_type,
  coalesce(currency, '(null)') as currency,
  count(*) as log_count,
  count(*) filter (where status = 'sent') as sent_count,
  coalesce(sum(unit_cost_minor) filter (where status = 'sent'), 0) as stored_sent_unit_cost_minor_total,
  min(created_at) as first_created_at,
  max(created_at) as last_created_at
from public.sms_delivery_logs
group by
  coalesce(event, '(null)'),
  coalesce(status, '(null)'),
  coalesce(invoice_status, '(null)'),
  coalesce(payer_type, '(null)'),
  coalesce(currency, '(null)')
order by event, delivery_status, invoice_status, payer_type, currency;


-- =====================================================
-- SECTION 9B — SMS DELIVERY LOG OVERALL BILLING COUNTS
-- Helps distinguish delivery telemetry from old invoice linkage.
-- =====================================================
select
  count(*) as total_logs,
  count(*) filter (where status = 'sent') as sent_logs,
  count(*) filter (where status = 'failed') as failed_logs,
  count(*) filter (where status = 'skipped') as skipped_logs,
  count(*) filter (where invoice_status = 'uninvoiced') as uninvoiced_logs,
  count(*) filter (where invoice_status = 'invoiced') as invoiced_logs,
  count(*) filter (where invoice_status = 'credited') as credited_logs,
  count(*) filter (where invoice_status = 'not_billable') as not_billable_logs,
  count(*) filter (where sms_billing_period_id is not null) as linked_to_legacy_billing_period,
  count(*) filter (where payer_type = 'doctor') as doctor_payer_logs,
  count(*) filter (where payer_type = 'clinic_organization') as clinic_organization_payer_logs,
  count(*) filter (where payer_type = 'romdoc') as romdoc_payer_logs,
  count(*) filter (where payer_type = 'not_billable') as explicitly_not_billable_payer_logs,
  min(created_at) as first_log_at,
  max(created_at) as last_log_at
from public.sms_delivery_logs;


-- =====================================================
-- SECTION 10 — LEGACY DOCTOR SMS BILLING PERIOD SUMMARY
-- No Doctor IDs are returned.
-- =====================================================
select
  payment_status,
  saga_invoice_status,
  currency,
  count(*) as billing_period_count,
  coalesce(sum(sms_count), 0) as sms_count,
  coalesce(sum(net_amount_minor), 0) as net_amount_minor,
  coalesce(sum(vat_amount_minor), 0) as vat_amount_minor,
  coalesce(sum(gross_amount_minor), 0) as gross_amount_minor,
  count(*) filter (where stripe_checkout_session_id is not null) as with_stripe_checkout_session,
  count(*) filter (where stripe_payment_intent_id is not null) as with_stripe_payment_intent,
  min(period_start) as earliest_period_start,
  max(period_end) as latest_period_end,
  min(paid_at) as earliest_paid_at,
  max(paid_at) as latest_paid_at
from public.doctor_sms_billing_periods
group by payment_status, saga_invoice_status, currency
order by payment_status, saga_invoice_status, currency;


-- =====================================================
-- SECTION 11 — LEGACY DOCTOR SMS PAYMENT SUMMARY
-- No Doctor IDs or Stripe object IDs are returned.
-- =====================================================
select
  payment_status,
  currency,
  count(*) as payment_count,
  coalesce(sum(period_count), 0) as period_count,
  coalesce(sum(sms_count), 0) as sms_count,
  coalesce(sum(net_amount_minor), 0) as net_amount_minor,
  coalesce(sum(vat_amount_minor), 0) as vat_amount_minor,
  coalesce(sum(gross_amount_minor), 0) as gross_amount_minor,
  count(*) filter (where stripe_checkout_session_id is not null) as with_stripe_checkout_session,
  count(*) filter (where stripe_payment_intent_id is not null) as with_stripe_payment_intent,
  min(created_at) as first_created_at,
  max(created_at) as last_created_at,
  min(paid_at) as earliest_paid_at,
  max(paid_at) as latest_paid_at
from public.doctor_sms_payments
group by payment_status, currency
order by payment_status, currency;


-- =====================================================
-- SECTION 12 — LEGACY SMS PAYMENT ITEM SUMMARY
-- =====================================================
select
  count(*) as payment_item_count,
  count(distinct payment_id) as distinct_payments,
  count(distinct billing_period_id) as distinct_billing_periods,
  coalesce(sum(net_amount_minor), 0) as net_amount_minor,
  coalesce(sum(vat_amount_minor), 0) as vat_amount_minor,
  coalesce(sum(gross_amount_minor), 0) as gross_amount_minor,
  min(created_at) as first_created_at,
  max(created_at) as last_created_at
from public.doctor_sms_payment_items;


-- =====================================================
-- SECTION 13 — CLIENT-SPECIFIC SMS PRICE OVERRIDES
-- Aggregate only. Applies to Independent Doctors and Clinic Organisations.
-- =====================================================
select
  client_type,
  currency,
  count(*) as terms_count,
  count(*) filter (where subscription_unit_price is not null) as subscription_price_overrides,
  count(*) filter (where sms_unit_price is not null) as sms_price_overrides,
  min(sms_unit_price) filter (where sms_unit_price is not null) as minimum_sms_unit_price,
  max(sms_unit_price) filter (where sms_unit_price is not null) as maximum_sms_unit_price,
  min(effective_from) as earliest_effective_from,
  max(effective_until) as latest_effective_until
from public.client_billing_terms
group by client_type, currency
order by client_type, currency;


-- =====================================================
-- SECTION 14A — SHARED CLIENT INVOICE HISTORY FOOTPRINT
-- These invoice totals may already include historical SMS-derived estimates,
-- even though the invoice table itself does not store an SMS line item.
-- =====================================================
select
  client_type,
  status,
  currency,
  count(*) as invoice_count,
  coalesce(sum(estimated_amount), 0) as estimated_amount_total,
  coalesce(sum(amount), 0) as amount_total,
  min(billing_period_start) as earliest_period_start,
  max(billing_period_end) as latest_period_end,
  min(issued_on) as earliest_issued_on,
  max(issued_on) as latest_issued_on,
  min(paid_on) as earliest_paid_on,
  max(paid_on) as latest_paid_on
from public.client_billing_invoice_records
group by client_type, status, currency
order by client_type, status, currency;


-- =====================================================
-- SECTION 14B — LEGACY CLINIC INVOICE HISTORY FOOTPRINT
-- =====================================================
select
  status,
  currency,
  count(*) as invoice_count,
  coalesce(sum(estimated_amount_ron), 0) as estimated_amount_total,
  coalesce(sum(amount_ron), 0) as amount_total,
  min(billing_period_start) as earliest_period_start,
  max(billing_period_end) as latest_period_end,
  min(issued_on) as earliest_issued_on,
  max(issued_on) as latest_issued_on,
  min(paid_on) as earliest_paid_on,
  max(paid_on) as latest_paid_on
from public.clinic_invoices
group by status, currency
order by status, currency;


-- =====================================================
-- SECTION 15 — VIEWS THAT STILL REFERENCE SMS BILLING CONCEPTS
-- Returns object names plus flags, not full view definitions.
-- =====================================================
with view_definitions as (
  select
    schemaname,
    viewname,
    lower(definition) as definition
  from pg_views
  where schemaname = 'public'
)
select
  schemaname,
  viewname,
  definition like '%sms_unit_price%' as mentions_sms_unit_price,
  definition like '%unit_cost_minor%' as mentions_unit_cost_minor,
  definition like '%sms_delivery_logs%' as mentions_sms_delivery_logs,
  definition like '%doctor_sms_billing_periods%' as mentions_sms_billing_periods,
  definition like '%doctor_sms_payments%' as mentions_sms_payments,
  definition like '%invoice_status%' as mentions_invoice_status
from view_definitions
where
  definition like '%sms_unit_price%'
  or definition like '%unit_cost_minor%'
  or definition like '%sms_delivery_logs%'
  or definition like '%doctor_sms_billing_periods%'
  or definition like '%doctor_sms_payments%'
  or definition like '%invoice_status%'
order by viewname;


-- =====================================================
-- SECTION 16 — INDEX INVENTORY FOR SMS BILLING TABLES
-- Helps plan dependency-safe column/table retirement later.
-- =====================================================
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'sms_delivery_logs',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items',
    'clinic_billing_settings',
    'client_billing_terms'
  )
order by tablename, indexname;


-- =====================================================
-- SECTION 17 — SAFE pg_cron INVENTORY
-- IMPORTANT: command text is intentionally NOT returned.
-- If any relevance flag is TRUE, inspect only that specific job later.
-- =====================================================
select
  jobid,
  jobname,
  schedule,
  active,
  database,
  username,
  lower(command) like '%sms%' as mentions_sms,
  (
    lower(command) like '%doctor_sms_billing%'
    or lower(command) like '%sms_unit_price%'
    or lower(command) like '%unit_cost_minor%'
  ) as mentions_sms_billing,
  lower(command) like '%invoice%' as mentions_invoice,
  lower(command) like '%payment%' as mentions_payment
from cron.job
order by jobid;


-- =====================================================
-- SECTION 18 — TABLE ROW ESTIMATES AND STORAGE SIZE
-- Gives a rough idea of how much historical SMS billing data exists.
-- =====================================================
select
  cls.relname as table_name,
  cls.reltuples::bigint as estimated_rows,
  pg_size_pretty(pg_relation_size(cls.oid)) as table_size,
  pg_size_pretty(pg_indexes_size(cls.oid)) as indexes_size,
  pg_size_pretty(pg_total_relation_size(cls.oid)) as total_size
from pg_class as cls
join pg_namespace as ns
  on ns.oid = cls.relnamespace
where ns.nspname = 'public'
  and cls.relkind = 'r'
  and cls.relname in (
    'sms_platform_settings',
    'sms_delivery_logs',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items',
    'clinic_billing_settings',
    'client_billing_terms',
    'client_billing_invoice_records',
    'clinic_invoices'
  )
order by cls.relname;


-- =====================================================
-- END OF READ-ONLY AUDIT
--
-- Please return the result sets for Sections 4, 5, 8, 9A, 9B,
-- 10, 11, 12, 13, 14A, 14B and 17 first. Those are sufficient to
-- design the dependency-safe SMS billing retirement migration.
-- =====================================================
