-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 98 — Billing price source correction
--
-- Target project path:
-- ROMDOC/database/98-billing-price-source-correction.sql
--
-- Purpose:
--   1. Keep /admin/invoices global billing settings as the default source.
--   2. Preserve active client-specific pricing as the higher-priority source.
--   3. Replace legacy fallback values of 60 EUR and 0.30 EUR.
--   4. Normalize only known historical placeholder values.
--
-- Important:
--   - Existing custom global prices are preserved.
--   - Existing client-specific prices are not modified.
--   - The yearly Stripe subscription price is not stored in these billing
--     tables and is therefore intentionally outside this migration.
-- =====================================================

begin;

-- =====================================================
-- 1. CURRENT PLATFORM DEFAULTS
-- =====================================================
-- These defaults are used only if the singleton settings row must be created.
-- The Admin / Manager billing UI continues to edit the row with id = 1.

alter table public.clinic_billing_settings
  alter column clinic_doctor_monthly_price_ron set default 20,
  alter column sms_unit_price_ron set default 0.10,
  alter column vat_rate set default 0.21,
  alter column billing_currency set default 'EUR';

insert into public.clinic_billing_settings (
  id,
  clinic_doctor_monthly_price_ron,
  sms_unit_price_ron,
  vat_rate,
  billing_currency
)
values (
  1,
  20,
  0.10,
  0.21,
  'EUR'
)
on conflict (id) do nothing;

-- Normalize only the known historical RomDoc placeholder values.
-- Any other value is treated as an intentional Admin configuration and kept.
update public.clinic_billing_settings
set
  clinic_doctor_monthly_price_ron = case
    when clinic_doctor_monthly_price_ron = 60 then 20
    else clinic_doctor_monthly_price_ron
  end,
  sms_unit_price_ron = case
    when sms_unit_price_ron in (0.30, 0.35) then 0.10
    else sms_unit_price_ron
  end,
  updated_at = now()
where id = 1
  and (
    clinic_doctor_monthly_price_ron = 60
    or sms_unit_price_ron in (0.30, 0.35)
  );

comment on column public.clinic_billing_settings.clinic_doctor_monthly_price_ron is
  'Legacy column name. Global monthly Doctor subscription unit price in clinic_billing_settings.billing_currency, editable from /admin/invoices.';

comment on column public.clinic_billing_settings.sms_unit_price_ron is
  'Legacy column name. Global billable SMS unit price in clinic_billing_settings.billing_currency, editable from /admin/invoices.';

-- =====================================================
-- 2. CONTRACT PRICE RESOLUTION
-- =====================================================
-- Resolution order, matching the Admin invoice calculations:
--
--   active client-specific field
--     -> global /admin/invoices setting
--     -> emergency platform fallback
--
-- Client-specific values are applied field by field. A null field falls back
-- to the corresponding global value.

create or replace function public.contract_effective_operational_price_terms(
  target_client_type text,
  target_doctor_id uuid,
  target_clinic_organization_id uuid,
  target_comparison_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  settings_row public.clinic_billing_settings%rowtype;
  override_row public.client_billing_terms%rowtype;
  has_override boolean := false;
  override_applies boolean := false;
  comparison_date date := coalesce(target_comparison_date, current_date);
  configured_currency text;
begin
  if target_client_type not in ('independent_doctor', 'clinic_organization') then
    raise exception 'Unsupported contract billing client type.';
  end if;

  if (
    target_client_type = 'independent_doctor'
    and (target_doctor_id is null or target_clinic_organization_id is not null)
  ) or (
    target_client_type = 'clinic_organization'
    and (target_clinic_organization_id is null or target_doctor_id is not null)
  ) then
    raise exception 'The contract billing client target is invalid.';
  end if;

  select settings.*
  into settings_row
  from public.clinic_billing_settings as settings
  where settings.id = 1;

  if not found then
    settings_row.clinic_doctor_monthly_price_ron := 20;
    settings_row.sms_unit_price_ron := 0.10;
    settings_row.vat_rate := 0.21;
    settings_row.billing_currency := 'EUR';
  end if;

  configured_currency := case
    when settings_row.billing_currency in ('EUR', 'RON')
      then settings_row.billing_currency
    else 'EUR'
  end;

  if target_client_type = 'independent_doctor' then
    select terms.*
    into override_row
    from public.client_billing_terms as terms
    where terms.client_type = 'independent_doctor'
      and terms.doctor_id = target_doctor_id
    limit 1;
  else
    select terms.*
    into override_row
    from public.client_billing_terms as terms
    where terms.client_type = 'clinic_organization'
      and terms.clinic_organization_id = target_clinic_organization_id
    limit 1;
  end if;

  has_override := found;

  override_applies := has_override
    and (
      override_row.effective_from is null
      or override_row.effective_from <= comparison_date
    )
    and (
      override_row.effective_until is null
      or override_row.effective_until >= comparison_date
    );

  return jsonb_build_object(
    'subscriptionUnitPrice',
      coalesce(
        case
          when override_applies then override_row.subscription_unit_price
        end,
        settings_row.clinic_doctor_monthly_price_ron,
        20
      ),
    'smsUnitPrice',
      coalesce(
        case
          when override_applies then override_row.sms_unit_price
        end,
        settings_row.sms_unit_price_ron,
        0.10
      ),
    'currency',
      case
        when override_applies
          and override_row.currency in ('EUR', 'RON')
          then override_row.currency
        else configured_currency
      end,
    'vatRate',
      coalesce(
        case
          when override_applies then override_row.vat_rate
        end,
        settings_row.vat_rate,
        0.21
      ),
    'source',
      case when override_applies then 'client_override' else 'global' end,
    'comparisonDate',
      comparison_date,
    'overrideApplies',
      override_applies,
    'overrideId',
      case when has_override then override_row.id else null end,
    'overrideUpdatedAt',
      case when has_override then override_row.updated_at else null end,
    'overrideEffectiveFrom',
      case when has_override then override_row.effective_from else null end,
    'overrideEffectiveUntil',
      case when has_override then override_row.effective_until else null end,
    'globalUpdatedAt',
      settings_row.updated_at
  );
end;
$function$;

revoke all on function public.contract_effective_operational_price_terms(
  text,
  uuid,
  uuid,
  date
) from public, anon, authenticated;

grant execute on function public.contract_effective_operational_price_terms(
  text,
  uuid,
  uuid,
  date
) to service_role;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- The first result is the global source shown and edited by /admin/invoices.
-- The second result lists optional client-specific overrides. These rows are
-- intentionally not changed by this migration.

select
  id,
  clinic_doctor_monthly_price_ron as global_monthly_subscription_price,
  sms_unit_price_ron as global_sms_unit_price,
  vat_rate,
  billing_currency,
  updated_at
from public.clinic_billing_settings
where id = 1;

select
  client_type,
  doctor_id,
  clinic_organization_id,
  subscription_unit_price,
  sms_unit_price,
  currency,
  vat_rate,
  effective_from,
  effective_until,
  updated_at
from public.client_billing_terms
order by client_type, updated_at desc;
