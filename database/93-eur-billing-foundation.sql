-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 9.5B — EUR billing foundation and test-data normalization
--
-- Target project path:
-- ROMDOC/database/93-eur-billing-foundation.sql
--
-- Decisions implemented:
--   1. EUR becomes the platform billing default.
--   2. Existing RON billing records are test data and are relabelled EUR.
--   3. Numeric amounts are intentionally not exchange-rate converted.
--   4. RON remains an allowed secondary currency where client-specific
--      billing terms or invoice records may explicitly use it later.
--   5. New platform SMS logs, Doctor SMS billing periods and Doctor SMS
--      payments always inherit the current global billing currency.
--
-- This migration does not change Stripe products, Stripe prices, RLS,
-- permissions, appointment workflows, or patient data.
-- =====================================================

begin;

-- =====================================================
-- 1. GLOBAL BILLING CURRENCY
-- =====================================================

alter table public.clinic_billing_settings
  add column if not exists billing_currency text not null default 'EUR';

alter table public.clinic_billing_settings
  drop constraint if exists clinic_billing_settings_currency_check;

alter table public.clinic_billing_settings
  add constraint clinic_billing_settings_currency_check
  check (billing_currency in ('EUR', 'RON'));

alter table public.clinic_billing_settings
  alter column billing_currency set default 'EUR';

insert into public.clinic_billing_settings (
  id,
  billing_currency
)
values (
  1,
  'EUR'
)
on conflict (id) do update
set
  billing_currency = 'EUR',
  updated_at = now();

comment on column public.clinic_billing_settings.billing_currency is
  'Default RomDoc operational billing currency. EUR is primary; RON remains available as a secondary explicit currency.';

-- The historical column names are retained to avoid a risky schema-wide rename.
-- Their numeric values are interpreted in billing_currency, not necessarily RON.
comment on column public.clinic_billing_settings.clinic_doctor_monthly_price_ron is
  'Legacy column name. Stores the configured Doctor subscription unit price in clinic_billing_settings.billing_currency.';

comment on column public.clinic_billing_settings.sms_unit_price_ron is
  'Legacy column name. Stores the configured SMS unit price in clinic_billing_settings.billing_currency.';

-- =====================================================
-- 2. SMS DELIVERY LOGS
-- =====================================================

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_currency_check;

alter table public.sms_delivery_logs
  alter column currency set default 'EUR';

update public.sms_delivery_logs
set currency = 'EUR'
where currency is distinct from 'EUR';

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_currency_check
  check (currency in ('EUR', 'RON'));

comment on column public.sms_delivery_logs.currency is
  'Currency of the stored SMS unit cost. New records inherit the global platform billing currency.';

-- =====================================================
-- 3. INDEPENDENT DOCTOR SMS BILLING PERIODS
-- =====================================================

alter table public.doctor_sms_billing_periods
  drop constraint if exists doctor_sms_billing_periods_currency_check;

alter table public.doctor_sms_billing_periods
  alter column currency set default 'EUR';

update public.doctor_sms_billing_periods
set currency = 'EUR'
where currency is distinct from 'EUR';

alter table public.doctor_sms_billing_periods
  add constraint doctor_sms_billing_periods_currency_check
  check (currency in ('EUR', 'RON'));

comment on column public.doctor_sms_billing_periods.currency is
  'Currency used for the Doctor SMS billing period. New periods inherit the global platform billing currency.';

-- =====================================================
-- 4. INDEPENDENT DOCTOR SMS PAYMENTS
-- =====================================================

alter table public.doctor_sms_payments
  drop constraint if exists doctor_sms_payments_currency_check;

alter table public.doctor_sms_payments
  alter column currency set default 'EUR';

update public.doctor_sms_payments
set currency = 'EUR'
where currency is distinct from 'EUR';

alter table public.doctor_sms_payments
  add constraint doctor_sms_payments_currency_check
  check (currency in ('EUR', 'RON'));

comment on column public.doctor_sms_payments.currency is
  'Currency sent to Stripe for a Doctor SMS balance payment.';

-- =====================================================
-- 5. CLIENT-SPECIFIC BILLING TERMS
-- =====================================================
-- EUR is the default. RON remains allowed as an explicit secondary option.

alter table public.client_billing_terms
  drop constraint if exists client_billing_terms_currency_check;

alter table public.client_billing_terms
  alter column currency set default 'EUR';

update public.client_billing_terms
set currency = 'EUR'
where currency is distinct from 'EUR';

alter table public.client_billing_terms
  add constraint client_billing_terms_currency_check
  check (currency in ('EUR', 'RON'));

-- =====================================================
-- 6. SHARED CLIENT INVOICE HISTORY
-- =====================================================

alter table public.client_billing_invoice_records
  drop constraint if exists client_billing_invoice_records_currency_check;

alter table public.client_billing_invoice_records
  alter column currency set default 'EUR';

update public.client_billing_invoice_records
set currency = 'EUR'
where currency is distinct from 'EUR';

alter table public.client_billing_invoice_records
  add constraint client_billing_invoice_records_currency_check
  check (currency in ('EUR', 'RON'));

-- =====================================================
-- 7. LEGACY CLINIC INVOICE CRM TABLE
-- =====================================================
-- The amount column names remain unchanged for compatibility. The new currency
-- column makes their unit explicit and allows the current test rows to be EUR.

alter table public.clinic_invoices
  add column if not exists currency text not null default 'EUR';

alter table public.clinic_invoices
  drop constraint if exists clinic_invoices_currency_check;

alter table public.clinic_invoices
  alter column currency set default 'EUR';

update public.clinic_invoices
set currency = 'EUR'
where currency is distinct from 'EUR';

alter table public.clinic_invoices
  add constraint clinic_invoices_currency_check
  check (currency in ('EUR', 'RON'));

comment on column public.clinic_invoices.currency is
  'Currency of estimated_amount_ron and amount_ron. Column names are retained only for backward compatibility.';

comment on column public.clinic_invoices.estimated_amount_ron is
  'Legacy column name. Previous-month estimate expressed in clinic_invoices.currency.';

comment on column public.clinic_invoices.amount_ron is
  'Legacy column name. Final invoice amount expressed in clinic_invoices.currency.';

-- =====================================================
-- 8. DATABASE SAFEGUARD FOR CURRENT INSERT PATHS
-- =====================================================
-- Some current application files still explicitly send "RON" when inserting
-- SMS records. Until the later UI/application cleanup steps replace those
-- fallbacks, these insert triggers make the database setting authoritative.

create or replace function public.apply_global_billing_currency()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  configured_currency text;
begin
  select settings.billing_currency
  into configured_currency
  from public.clinic_billing_settings as settings
  where settings.id = 1;

  if configured_currency not in ('EUR', 'RON') then
    configured_currency := 'EUR';
  end if;

  new.currency := coalesce(configured_currency, 'EUR');
  return new;
end;
$function$;

revoke all on function public.apply_global_billing_currency() from public;

drop trigger if exists apply_sms_delivery_log_currency
  on public.sms_delivery_logs;

create trigger apply_sms_delivery_log_currency
before insert on public.sms_delivery_logs
for each row
execute function public.apply_global_billing_currency();

drop trigger if exists apply_doctor_sms_billing_period_currency
  on public.doctor_sms_billing_periods;

create trigger apply_doctor_sms_billing_period_currency
before insert on public.doctor_sms_billing_periods
for each row
execute function public.apply_global_billing_currency();

drop trigger if exists apply_doctor_sms_payment_currency
  on public.doctor_sms_payments;

create trigger apply_doctor_sms_payment_currency
before insert on public.doctor_sms_payments
for each row
execute function public.apply_global_billing_currency();

commit;

-- =====================================================
-- VERIFICATION
-- Every non_eur_rows value should be 0 immediately after this migration.
-- =====================================================

select
  id,
  billing_currency,
  clinic_doctor_monthly_price_ron as doctor_subscription_unit_price,
  sms_unit_price_ron as sms_unit_price,
  vat_rate,
  updated_at
from public.clinic_billing_settings
where id = 1;

select 'sms_delivery_logs' as source, count(*) as non_eur_rows
from public.sms_delivery_logs
where currency is distinct from 'EUR'
union all
select 'doctor_sms_billing_periods', count(*)
from public.doctor_sms_billing_periods
where currency is distinct from 'EUR'
union all
select 'doctor_sms_payments', count(*)
from public.doctor_sms_payments
where currency is distinct from 'EUR'
union all
select 'client_billing_terms', count(*)
from public.client_billing_terms
where currency is distinct from 'EUR'
union all
select 'client_billing_invoice_records', count(*)
from public.client_billing_invoice_records
where currency is distinct from 'EUR'
union all
select 'clinic_invoices', count(*)
from public.clinic_invoices
where currency is distinct from 'EUR';
