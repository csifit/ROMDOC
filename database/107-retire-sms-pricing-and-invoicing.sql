-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- 107 — Retire SMS pricing and invoicing
--
-- Exact project path:
-- ROMDOC/database/107-retire-sms-pricing-and-invoicing.sql
--
-- Goal:
-- - Keep SMS sending, delivery reports and usage counters.
-- - Retire per-SMS pricing and SMS invoicing/payment capability.
-- - Remove standalone Doctor SMS billing/payment tables.
-- - Clear existing SMS billing metadata because all current data is test data.
-- - Keep a few harmless compatibility columns so existing application/RPC
--   code does not need another large rewrite, but lock them permanently to
--   non-billable values.
--
-- IMPORTANT:
-- This migration does NOT change Doctor/Clinic account access.
-- =====================================================

begin;

-- =====================================================
-- 1. RETIRE GLOBAL + CLIENT-SPECIFIC SMS PRICES
-- =====================================================

update public.clinic_billing_settings
set
  sms_unit_price_ron = 0,
  updated_at = now()
where sms_unit_price_ron is distinct from 0;

alter table public.clinic_billing_settings
  alter column sms_unit_price_ron set default 0;

alter table public.clinic_billing_settings
  drop constraint if exists clinic_billing_settings_sms_price_check;

alter table public.clinic_billing_settings
  add constraint clinic_billing_settings_sms_price_check
  check (sms_unit_price_ron = 0);

update public.client_billing_terms
set
  sms_unit_price = null,
  updated_at = now()
where sms_unit_price is not null;

alter table public.client_billing_terms
  drop constraint if exists client_billing_terms_sms_price_check;

alter table public.client_billing_terms
  add constraint client_billing_terms_sms_price_check
  check (sms_unit_price is null);

comment on column public.clinic_billing_settings.sms_unit_price_ron is
  'Retired compatibility field. Per-SMS pricing is disabled and this value must remain 0.';

comment on column public.client_billing_terms.sms_unit_price is
  'Retired compatibility field. Per-SMS pricing is disabled and this value must remain NULL.';

-- =====================================================
-- 2. CLEAR ALL TEST SMS INVOICE / COST METADATA
-- =====================================================

update public.sms_delivery_logs
set
  invoice_status = 'not_billable',
  unit_cost_minor = 0,
  invoiced_at = null,
  invoice_reference = null,
  invoiced_by_profile_id = null,
  sms_billing_period_id = null
where
  invoice_status is distinct from 'not_billable'
  or unit_cost_minor is distinct from 0
  or invoiced_at is not null
  or invoice_reference is not null
  or invoiced_by_profile_id is not null
  or sms_billing_period_id is not null;

alter table public.sms_delivery_logs
  alter column invoice_status set default 'not_billable',
  alter column unit_cost_minor set default 0;

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_invoice_status_check;

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_invoice_status_check
  check (invoice_status = 'not_billable');

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_unit_cost_minor_check;

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_unit_cost_minor_check
  check (unit_cost_minor = 0);

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_no_invoice_metadata_check;

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_no_invoice_metadata_check
  check (
    invoiced_at is null
    and invoice_reference is null
    and invoiced_by_profile_id is null
  );

comment on column public.sms_delivery_logs.invoice_status is
  'Retired compatibility field. SMS is included in subscription/package and is always not_billable.';

comment on column public.sms_delivery_logs.unit_cost_minor is
  'Retired compatibility field. Per-SMS monetary cost is disabled and must remain 0.';

comment on column public.sms_delivery_logs.currency is
  'Legacy compatibility metadata only. SMS delivery is not billed per message.';

drop index if exists public.idx_sms_delivery_logs_invoice_status;
drop index if exists public.idx_sms_delivery_logs_doctor_invoice_status;
drop index if exists public.idx_sms_delivery_logs_invoice_status_created;

-- The old link to a standalone SMS billing period is no longer meaningful.
alter table public.sms_delivery_logs
  drop column if exists sms_billing_period_id;

-- SMS delivery logs must no longer inherit currency from billing settings.
drop trigger if exists apply_sms_delivery_log_currency
  on public.sms_delivery_logs;

-- =====================================================
-- 3. DROP EMPTY STANDALONE SMS BILLING / PAYMENT TABLES
-- =====================================================
-- Audit confirmed all three tables contain 0 rows and 0 money.

drop table if exists public.doctor_sms_payment_items cascade;
drop table if exists public.doctor_sms_payments cascade;
drop table if exists public.doctor_sms_billing_periods cascade;

drop function if exists public.set_doctor_sms_billing_periods_updated_at();
drop function if exists public.set_doctor_sms_payments_updated_at();

-- We intentionally leave the generic apply_global_billing_currency() helper
-- in place. It is harmless and avoiding an unnecessary DROP keeps this
-- retirement migration small and low-risk.

-- =====================================================
-- 4. CONTRACT PRICE DETECTION: SMS IS NOT A PRICE TERM
-- =====================================================

create or replace function public.contract_terms_have_price_values(
  target_terms jsonb
)
returns boolean
language sql
immutable
security definer
set search_path = public
as $function$
  select
    jsonb_typeof(coalesce(target_terms, '{}'::jsonb)) = 'object'
    and coalesce(target_terms, '{}'::jsonb) ?| array[
      'subscriptionUnitPrice',
      'vatRate',
      'subscription_unit_price',
      'vat_rate'
    ];
$function$;

revoke all
on function public.contract_terms_have_price_values(jsonb)
from public, anon, authenticated;

grant execute
on function public.contract_terms_have_price_values(jsonb)
to service_role;

comment on function public.contract_terms_have_price_values(jsonb) is
  'Returns true when contract JSON contains subscription/package price or VAT terms. Per-SMS price keys are retired and ignored.';

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Expected: 0
select
  sms_unit_price_ron as global_sms_price_should_be_zero
from public.clinic_billing_settings
where id = 1;

-- Expected: 0
select
  count(*) as client_rows_with_sms_price_should_be_zero
from public.client_billing_terms
where sms_unit_price is not null;

-- Expected: all *_should_be_zero columns = 0.
select
  count(*) as total_sms_logs,
  count(*) filter (
    where invoice_status <> 'not_billable'
  ) as billable_status_rows_should_be_zero,
  count(*) filter (
    where unit_cost_minor <> 0
  ) as nonzero_cost_rows_should_be_zero,
  count(*) filter (
    where invoiced_at is not null
      or invoice_reference is not null
      or invoiced_by_profile_id is not null
  ) as invoice_metadata_rows_should_be_zero
from public.sms_delivery_logs;

-- Expected: all object_exists values = false.
select
  object_name,
  to_regclass('public.' || object_name) is not null as object_exists
from (
  values
    ('doctor_sms_billing_periods'),
    ('doctor_sms_payments'),
    ('doctor_sms_payment_items')
) as retired(object_name);

-- Expected: both values = true.
select
  to_regclass('public.sms_delivery_logs') is not null
    as sms_delivery_logs_still_exists,
  to_regclass('public.sms_platform_settings') is not null
    as sms_platform_settings_still_exists;
