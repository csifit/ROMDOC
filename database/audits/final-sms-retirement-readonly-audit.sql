-- =====================================================
-- ROMDOC FINAL SMS BILLING RETIREMENT - READ-ONLY AUDIT
--
-- Target project path:
-- ROMDOC/database/audits/final-sms-retirement-readonly-audit.sql
--
-- PURPOSE
-- Confirm what still depends on the obsolete per-SMS monetary billing layer
-- before any destructive/deprecating migration is written.
--
-- THIS FILE IS READ-ONLY.
-- It contains SELECT statements only.
-- It does NOT alter, update, delete, drop, grant or revoke anything.
--
-- KEEP OPERATIONAL SMS:
--   public.sms_platform_settings
--   public.sms_delivery_logs delivery/provider/status data
--   delivery report fields
--   doctor/clinic usage attribution where useful
--
-- CANDIDATES FOR RETIREMENT AFTER THIS AUDIT IS CLEAN:
--   public.doctor_sms_billing_periods
--   public.doctor_sms_payments
--   public.doctor_sms_payment_items
--   per-SMS monetary columns on public.sms_delivery_logs
--   public.clinic_billing_settings.sms_unit_price_ron
--   public.client_billing_terms.sms_unit_price
--   SMS-only monetary functions/triggers/indexes/policies
--
-- PRESERVE:
--   historical invoice/payment evidence in shared invoice/history tables
--   operational SMS delivery records
-- =====================================================

-- =====================================================
-- SECTION 1 - TARGET OBJECT PRESENCE
-- =====================================================
select
  n.nspname as schema_name,
  c.relname as object_name,
  case c.relkind
    when 'r' then 'table'
    when 'p' then 'partitioned_table'
    when 'v' then 'view'
    when 'm' then 'materialized_view'
    else c.relkind::text
  end as object_type
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
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
order by c.relname;

-- =====================================================
-- SECTION 2 - LEGACY STANDALONE SMS BILLING ROW COUNTS
-- Expected from the earlier audit: all three should be 0.
-- =====================================================
select
  'doctor_sms_billing_periods' as object_name,
  count(*)::bigint as row_count
from public.doctor_sms_billing_periods
union all
select
  'doctor_sms_payments',
  count(*)::bigint
from public.doctor_sms_payments
union all
select
  'doctor_sms_payment_items',
  count(*)::bigint
from public.doctor_sms_payment_items;

-- =====================================================
-- SECTION 3 - LEGACY STANDALONE SMS BILLING MONEY
-- Any non-zero result must be reviewed before dropping tables.
-- =====================================================
select
  count(*)::bigint as billing_period_count,
  coalesce(sum(sms_count), 0)::bigint as sms_count,
  coalesce(sum(net_amount_minor), 0)::bigint as net_amount_minor,
  coalesce(sum(vat_amount_minor), 0)::bigint as vat_amount_minor,
  coalesce(sum(gross_amount_minor), 0)::bigint as gross_amount_minor,
  count(*) filter (where payment_status = 'paid')::bigint as paid_periods,
  count(*) filter (where saga_invoice_status = 'issued')::bigint as saga_issued_periods
from public.doctor_sms_billing_periods;

select
  count(*)::bigint as payment_count,
  coalesce(sum(sms_count), 0)::bigint as sms_count,
  coalesce(sum(net_amount_minor), 0)::bigint as net_amount_minor,
  coalesce(sum(vat_amount_minor), 0)::bigint as vat_amount_minor,
  coalesce(sum(gross_amount_minor), 0)::bigint as gross_amount_minor,
  count(*) filter (where payment_status = 'paid')::bigint as paid_payments
from public.doctor_sms_payments;

select
  count(*)::bigint as payment_item_count,
  count(distinct payment_id)::bigint as distinct_payments,
  count(distinct billing_period_id)::bigint as distinct_billing_periods,
  coalesce(sum(net_amount_minor), 0)::bigint as net_amount_minor,
  coalesce(sum(vat_amount_minor), 0)::bigint as vat_amount_minor,
  coalesce(sum(gross_amount_minor), 0)::bigint as gross_amount_minor
from public.doctor_sms_payment_items;

-- =====================================================
-- SECTION 4 - SMS DELIVERY LOG LEGACY MONETARY FOOTPRINT
-- Historical values are evidence only. They should not be rewritten here.
-- =====================================================
select
  count(*)::bigint as total_logs,
  count(*) filter (where status = 'sent')::bigint as sent_logs,
  count(*) filter (where invoice_status = 'uninvoiced')::bigint as uninvoiced_logs,
  count(*) filter (where invoice_status = 'invoiced')::bigint as invoiced_logs,
  count(*) filter (where invoice_status = 'credited')::bigint as credited_logs,
  count(*) filter (where invoice_status = 'not_billable')::bigint as not_billable_logs,
  count(*) filter (where unit_cost_minor > 0)::bigint as positive_unit_cost_logs,
  coalesce(sum(unit_cost_minor) filter (where status = 'sent'), 0)::bigint as stored_sent_unit_cost_minor_total,
  count(*) filter (where sms_billing_period_id is not null)::bigint as linked_to_legacy_billing_period,
  min(created_at) as first_log_at,
  max(created_at) as last_log_at
from public.sms_delivery_logs;

-- Detailed historical monetary metadata, grouped without exposing recipients.
select
  event,
  status,
  invoice_status,
  payer_type,
  currency,
  count(*)::bigint as log_count,
  coalesce(sum(unit_cost_minor), 0)::bigint as stored_unit_cost_minor_total,
  min(created_at) as first_log_at,
  max(created_at) as last_log_at
from public.sms_delivery_logs
group by
  event,
  status,
  invoice_status,
  payer_type,
  currency
order by max(created_at) desc;

-- =====================================================
-- SECTION 5 - VERIFY NEW APPLICATION INSERTS ARE NEUTRAL
-- Run this after deploying the cleaned send-appointment-sms.ts and after at
-- least one new SMS attempt. New rows should show:
--   invoice_status = not_billable
--   unit_cost_minor = 0
--   sms_billing_period_id = null
-- payer_type may remain doctor/clinic_organization as usage attribution.
-- =====================================================
select
  id,
  created_at,
  event,
  status,
  delivery_report_status,
  invoice_status,
  unit_cost_minor,
  currency,
  sms_billing_period_id,
  payer_type,
  payer_clinic_organization_id,
  payer_note
from public.sms_delivery_logs
order by created_at desc
limit 25;

-- =====================================================
-- SECTION 6 - LEGACY MONETARY COLUMN DEFINITIONS
-- Shows nullability/defaults so the retirement migration can safely remove
-- compatibility writes in the application afterward.
-- =====================================================
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (
      table_name = 'sms_delivery_logs'
      and column_name in (
        'invoice_status',
        'unit_cost_minor',
        'currency',
        'invoiced_at',
        'invoice_reference',
        'invoiced_by_profile_id',
        'sms_billing_period_id'
      )
    )
    or (
      table_name = 'clinic_billing_settings'
      and column_name = 'sms_unit_price_ron'
    )
    or (
      table_name = 'client_billing_terms'
      and column_name = 'sms_unit_price'
    )
  )
order by table_name, ordinal_position;

-- =====================================================
-- SECTION 7 - CURRENT GLOBAL / CLIENT SMS PRICE VALUES
-- These are configuration remnants, not authoritative future package prices.
-- =====================================================
select
  id,
  clinic_doctor_monthly_price_ron as subscription_unit_price,
  sms_unit_price_ron as legacy_sms_unit_price,
  billing_currency,
  vat_rate,
  updated_at
from public.clinic_billing_settings
where id = 1;

select
  id,
  client_type,
  doctor_id,
  clinic_organization_id,
  subscription_unit_price,
  sms_unit_price as legacy_sms_unit_price,
  currency,
  vat_rate,
  effective_from,
  effective_until,
  updated_at
from public.client_billing_terms
where sms_unit_price is not null
   or subscription_unit_price is not null
order by updated_at desc;

-- =====================================================
-- SECTION 8 - FOREIGN KEYS / CONSTRAINTS TOUCHING LEGACY OBJECTS
-- =====================================================
select
  con.conname as constraint_name,
  con.contype as constraint_type,
  con.conrelid::regclass::text as on_object,
  case
    when con.confrelid <> 0 then con.confrelid::regclass::text
    else null
  end as references_object,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
where con.conrelid in (
    'public.sms_delivery_logs'::regclass,
    'public.doctor_sms_billing_periods'::regclass,
    'public.doctor_sms_payments'::regclass,
    'public.doctor_sms_payment_items'::regclass,
    'public.clinic_billing_settings'::regclass,
    'public.client_billing_terms'::regclass
  )
   or con.confrelid in (
    'public.sms_delivery_logs'::regclass,
    'public.doctor_sms_billing_periods'::regclass,
    'public.doctor_sms_payments'::regclass,
    'public.doctor_sms_payment_items'::regclass
  )
order by on_object, constraint_name;

-- =====================================================
-- SECTION 9 - INDEXES TOUCHING SMS BILLING FIELDS / TABLES
-- Operational delivery indexes should be distinguished from monetary indexes.
-- =====================================================
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and (
    tablename in (
      'doctor_sms_billing_periods',
      'doctor_sms_payments',
      'doctor_sms_payment_items'
    )
    or (
      tablename = 'sms_delivery_logs'
      and (
        indexdef ilike '%invoice_status%'
        or indexdef ilike '%sms_billing_period_id%'
        or indexdef ilike '%unit_cost_minor%'
      )
    )
  )
order by tablename, indexname;

-- =====================================================
-- SECTION 10 - TRIGGERS ON LEGACY / SMS DELIVERY TABLES
-- =====================================================
select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid, true) as trigger_definition,
  p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and n.nspname = 'public'
  and c.relname in (
    'sms_delivery_logs',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items'
  )
order by c.relname, t.tgname;

-- =====================================================
-- SECTION 11 - FUNCTIONS/RPCS THAT STILL MENTION LEGACY SMS MONEY
-- A clean result for destructive retirement means every returned function is
-- either intentionally replaced first or intentionally preserved.
-- =====================================================
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  case
    when pg_get_functiondef(p.oid) ilike '%doctor_sms_billing_periods%' then true
    else false
  end as mentions_billing_periods,
  case
    when pg_get_functiondef(p.oid) ilike '%doctor_sms_payments%' then true
    else false
  end as mentions_sms_payments,
  case
    when pg_get_functiondef(p.oid) ilike '%doctor_sms_payment_items%' then true
    else false
  end as mentions_sms_payment_items,
  case
    when pg_get_functiondef(p.oid) ilike '%sms_unit_price%' then true
    else false
  end as mentions_sms_unit_price,
  case
    when pg_get_functiondef(p.oid) ilike '%unit_cost_minor%' then true
    else false
  end as mentions_unit_cost_minor,
  case
    when pg_get_functiondef(p.oid) ilike '%invoice_status%' then true
    else false
  end as mentions_invoice_status,
  case
    when pg_get_functiondef(p.oid) ilike '%sms_billing_period_id%' then true
    else false
  end as mentions_sms_billing_period_id
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and (
    pg_get_functiondef(p.oid) ilike '%doctor_sms_billing_periods%'
    or pg_get_functiondef(p.oid) ilike '%doctor_sms_payments%'
    or pg_get_functiondef(p.oid) ilike '%doctor_sms_payment_items%'
    or pg_get_functiondef(p.oid) ilike '%sms_unit_price%'
    or pg_get_functiondef(p.oid) ilike '%unit_cost_minor%'
    or pg_get_functiondef(p.oid) ilike '%invoice_status%'
    or pg_get_functiondef(p.oid) ilike '%sms_billing_period_id%'
  )
order by p.proname, arguments;

-- Full definitions for the matching functions above.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and (
    pg_get_functiondef(p.oid) ilike '%doctor_sms_billing_periods%'
    or pg_get_functiondef(p.oid) ilike '%doctor_sms_payments%'
    or pg_get_functiondef(p.oid) ilike '%doctor_sms_payment_items%'
    or pg_get_functiondef(p.oid) ilike '%sms_unit_price%'
    or pg_get_functiondef(p.oid) ilike '%unit_cost_minor%'
    or pg_get_functiondef(p.oid) ilike '%invoice_status%'
    or pg_get_functiondef(p.oid) ilike '%sms_billing_period_id%'
  )
order by p.proname, arguments;

-- =====================================================
-- SECTION 12 - VIEWS / MATERIALIZED VIEWS WITH LEGACY REFERENCES
-- Earlier audit found none; verify again immediately before retirement.
-- =====================================================
select
  schemaname,
  viewname as object_name,
  definition
from pg_views
where schemaname = 'public'
  and (
    definition ilike '%doctor_sms_billing_periods%'
    or definition ilike '%doctor_sms_payments%'
    or definition ilike '%doctor_sms_payment_items%'
    or definition ilike '%sms_unit_price%'
    or definition ilike '%unit_cost_minor%'
    or definition ilike '%invoice_status%'
    or definition ilike '%sms_billing_period_id%'
  )
union all
select
  schemaname,
  matviewname as object_name,
  definition
from pg_matviews
where schemaname = 'public'
  and (
    definition ilike '%doctor_sms_billing_periods%'
    or definition ilike '%doctor_sms_payments%'
    or definition ilike '%doctor_sms_payment_items%'
    or definition ilike '%sms_unit_price%'
    or definition ilike '%unit_cost_minor%'
    or definition ilike '%invoice_status%'
    or definition ilike '%sms_billing_period_id%'
  )
order by object_name;

-- =====================================================
-- SECTION 13 - RLS POLICIES ON LEGACY / OPERATIONAL SMS OBJECTS
-- Operational SMS policies may remain; policies on retired tables disappear
-- with those tables.
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
    'sms_delivery_logs',
    'sms_platform_settings',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items'
  )
order by tablename, policyname;

-- =====================================================
-- SECTION 14 - DIRECT CATALOG DEPENDENCIES ON LEGACY TABLES
-- pg_describe_object makes hidden dependencies easier to inspect.
-- =====================================================
select distinct
  pg_describe_object(
    d.classid,
    d.objid,
    d.objsubid
  ) as dependent_object,
  pg_describe_object(
    d.refclassid,
    d.refobjid,
    d.refobjsubid
  ) as referenced_object,
  d.deptype
from pg_depend d
where d.refobjid in (
  'public.doctor_sms_billing_periods'::regclass,
  'public.doctor_sms_payments'::regclass,
  'public.doctor_sms_payment_items'::regclass
)
order by referenced_object, dependent_object;

-- =====================================================
-- SECTION 15 - GRANTS ON LEGACY TABLES
-- =====================================================
select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items'
  )
order by table_name, grantee, privilege_type;

-- =====================================================
-- SECTION 16 - PG_CRON JOBS THAT MENTION SMS BILLING / LEGACY TABLES
-- Returns no rows if cron is absent or no relevant jobs exist.
-- NOTE: Run only if the cron extension/schema exists in this Supabase project.
-- If Supabase says relation cron.job does not exist, skip this section.
-- =====================================================
select
  jobid,
  schedule,
  command,
  active,
  jobname
from cron.job
where command ilike '%sms%'
   or command ilike '%doctor_sms_billing_periods%'
   or command ilike '%doctor_sms_payments%'
   or command ilike '%doctor_sms_payment_items%'
order by jobid;

-- =====================================================
-- SECTION 17 - HISTORICAL SHARED INVOICE EVIDENCE TO PRESERVE
-- These tables are NOT retirement targets in this cleanup.
-- =====================================================
select
  client_type,
  status,
  currency,
  count(*)::bigint as invoice_count,
  coalesce(sum(estimated_amount), 0) as estimated_amount_total,
  coalesce(sum(amount), 0) as actual_amount_total,
  min(billing_period_start) as first_period_start,
  max(billing_period_end) as last_period_end,
  min(issued_on) as first_issued_on,
  max(issued_on) as last_issued_on,
  min(paid_on) as first_paid_on,
  max(paid_on) as last_paid_on
from public.client_billing_invoice_records
group by client_type, status, currency
order by client_type, status, currency;

select
  status,
  currency,
  count(*)::bigint as invoice_count,
  coalesce(sum(estimated_amount_ron), 0) as estimated_amount_total,
  coalesce(sum(amount_ron), 0) as actual_amount_total,
  min(billing_period_start) as first_period_start,
  max(billing_period_end) as last_period_end,
  min(issued_on) as first_issued_on,
  max(issued_on) as last_issued_on,
  min(paid_on) as first_paid_on,
  max(paid_on) as last_paid_on
from public.clinic_invoices
group by status, currency
order by status, currency;

-- =====================================================
-- SECTION 18 - TABLE SIZES BEFORE RETIREMENT
-- =====================================================
select
  c.relname as table_name,
  pg_total_relation_size(c.oid) as total_bytes,
  pg_relation_size(c.oid) as table_bytes,
  pg_indexes_size(c.oid) as index_bytes,
  c.reltuples::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in (
    'sms_delivery_logs',
    'sms_platform_settings',
    'doctor_sms_billing_periods',
    'doctor_sms_payments',
    'doctor_sms_payment_items',
    'clinic_billing_settings',
    'client_billing_terms',
    'client_billing_invoice_records',
    'clinic_invoices'
  )
order by c.relname;

-- =====================================================
-- INTERPRETATION GUIDE
-- =====================================================
-- SAFE DIRECTION FOR THE NEXT MIGRATION IF:
--   * Sections 2 and 3 confirm standalone Doctor SMS billing tables are empty.
--   * Section 5 shows new SMS logs are not_billable + unit_cost_minor 0.
--   * Section 11 functions are catalogued and can be replaced before columns
--     are dropped (especially get_clinic_organization_sms_usage and any
--     operational/admin report RPCs still returning monetary SMS fields).
--   * Section 12 returns no unexpected views/materialized views.
--   * Section 16 returns no SMS billing cron job.
--   * Historical invoice evidence in Section 17 is preserved untouched.
--
-- IMPORTANT:
-- Database audit cannot see Next.js source code. The application-side audit
-- must also be clean before destructive migration. The current cleanup removes
-- the known orphaned doctor_sms_billing_periods CSV route and old SMS report.
-- =====================================================
