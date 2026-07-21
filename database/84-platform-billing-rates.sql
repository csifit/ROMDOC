-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 87A.1 — Group 7G
-- Shared editable billing rates
--
-- File:
-- ROMDOC/database/84-platform-billing-rates.sql
-- =====================================================

begin;

alter table public.clinic_billing_settings
  alter column clinic_doctor_monthly_price_ron set default 60,
  alter column sms_unit_price_ron set default 0.30,
  alter column vat_rate set default 0.21;

-- Normalize only the original placeholder defaults.
-- Existing custom prices are intentionally preserved.
update public.clinic_billing_settings
set
  sms_unit_price_ron = case
    when sms_unit_price_ron = 0 then 0.30
    else sms_unit_price_ron
  end,
  vat_rate = case
    when vat_rate = 0.19 then 0.21
    else vat_rate
  end,
  updated_at = now()
where id = 1;

insert into public.clinic_billing_settings (
  id,
  clinic_doctor_monthly_price_ron,
  sms_unit_price_ron,
  vat_rate
)
values (1, 60, 0.30, 0.21)
on conflict (id) do nothing;

comment on table public.clinic_billing_settings is
  'Shared editable RomDoc billing rates used for independent Doctor and clinic organisation estimates. Changes are performed through the protected Admin and accounting-Manager billing settings API.';

comment on column public.clinic_billing_settings.clinic_doctor_monthly_price_ron is
  'Shared monthly subscription unit price in RON for an independent Doctor or one clinic-funded Doctor subscription.';

comment on column public.clinic_billing_settings.sms_unit_price_ron is
  'Shared unit price in RON for one billable sent SMS, including confirmation and 24-hour reminder events.';

comment on column public.clinic_billing_settings.vat_rate is
  'VAT rate used by RomDoc operational billing estimates.';

commit;

select
  id,
  clinic_doctor_monthly_price_ron,
  sms_unit_price_ron,
  vat_rate,
  updated_at
from public.clinic_billing_settings
where id = 1;
