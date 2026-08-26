-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Phase: Remove per-SMS price from contract reconciliation
--
-- Target project path:
-- ROMDOC/database/106-remove-sms-price-from-contract-reconciliation.sql
--
-- Purpose:
--   1. Contract price reconciliation tracks only subscription/package price,
--      currency and VAT.
--   2. Legacy smsUnitPrice / sms_unit_price keys in historical contract JSON
--      are ignored for current reconciliation.
--   3. Existing SMS-price database columns are NOT dropped in this migration.
--   4. Historical contract evidence is NOT rewritten.
--
-- Safety:
--   - Does not update client_billing_terms.
--   - Does not update clinic_billing_settings.
--   - Does not delete contract history.
--   - Does not block, suspend, hide or disable any account.
-- =====================================================

begin;

-- =====================================================
-- 1. CANONICAL CONTRACT PRICE TERMS
-- =====================================================
-- Per-SMS price is retired. Historical JSON can still physically contain
-- smsUnitPrice/sms_unit_price, but normalization deliberately ignores it.

create or replace function public.contract_normalize_price_terms(
  target_terms jsonb
)
returns jsonb
language plpgsql
immutable
security definer
set search_path = public
as $function$
declare
  source jsonb := coalesce(target_terms, '{}'::jsonb);
  result jsonb := '{}'::jsonb;
  currency_value text;
  subscription_value numeric;
  vat_value numeric;
begin
  if jsonb_typeof(source) <> 'object' then
    raise exception 'Contractual commercial terms must be a JSON object.';
  end if;

  if source ? 'subscriptionUnitPrice'
     or source ? 'subscription_unit_price'
  then
    subscription_value := public.contract_price_numeric_value(
      source,
      'subscriptionUnitPrice',
      'subscription_unit_price'
    );

    if subscription_value is not null then
      result := result || jsonb_build_object(
        'subscriptionUnitPrice',
        subscription_value
      );
    end if;
  end if;

  if source ? 'vatRate'
     or source ? 'vat_rate'
  then
    vat_value := public.contract_price_numeric_value(
      source,
      'vatRate',
      'vat_rate'
    );

    if vat_value is not null then
      if vat_value > 1 then
        raise exception 'Contract VAT rate must be between 0 and 1.';
      end if;

      result := result || jsonb_build_object(
        'vatRate',
        vat_value
      );
    end if;
  end if;

  if source ? 'currency'
     and source -> 'currency' <> 'null'::jsonb
  then
    currency_value := upper(
      trim(
        both '"'
        from (source -> 'currency')::text
      )
    );

    if currency_value not in ('EUR', 'RON') then
      raise exception 'Contract price currency must be EUR or RON.';
    end if;

    result := result || jsonb_build_object(
      'currency',
      currency_value
    );
  end if;

  return result;
end;
$function$;

revoke all
on function public.contract_normalize_price_terms(jsonb)
from public, anon, authenticated;

grant execute
on function public.contract_normalize_price_terms(jsonb)
to service_role;

-- =====================================================
-- 2. EFFECTIVE OPERATIONAL PRICE SNAPSHOT
-- =====================================================
-- Only package/subscription price, currency and VAT are financial terms.
-- SMS usage remains operational telemetry elsewhere.

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
  comparison_date date := coalesce(
    target_comparison_date,
    current_date
  );
  configured_currency text;
begin
  if target_client_type not in (
    'independent_doctor',
    'clinic_organization'
  ) then
    raise exception 'Unsupported contract billing client type.';
  end if;

  if (
    target_client_type = 'independent_doctor'
    and (
      target_doctor_id is null
      or target_clinic_organization_id is not null
    )
  ) or (
    target_client_type = 'clinic_organization'
    and (
      target_clinic_organization_id is null
      or target_doctor_id is not null
    )
  ) then
    raise exception 'The contract billing client target is invalid.';
  end if;

  select *
  into settings_row
  from public.clinic_billing_settings
  where id = 1;

  if not found then
    settings_row.clinic_doctor_monthly_price_ron := 20;
    settings_row.vat_rate := 0.21;
    settings_row.billing_currency := 'EUR';
  end if;

  configured_currency := case
    when settings_row.billing_currency in ('EUR', 'RON')
      then settings_row.billing_currency
    else 'EUR'
  end;

  if target_client_type = 'independent_doctor' then
    select *
    into override_row
    from public.client_billing_terms
    where client_type = 'independent_doctor'
      and doctor_id = target_doctor_id
    limit 1;
  else
    select *
    into override_row
    from public.client_billing_terms
    where client_type = 'clinic_organization'
      and clinic_organization_id = target_clinic_organization_id
    limit 1;
  end if;

  has_override := found;

  override_applies :=
    has_override
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
          when override_applies
            then override_row.subscription_unit_price
        end,
        settings_row.clinic_doctor_monthly_price_ron,
        20
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
          when override_applies
            then override_row.vat_rate
        end,
        settings_row.vat_rate,
        0.21
      ),
    'source',
      case
        when override_applies
          then 'client_override'
        else 'global'
      end,
    'comparisonDate',
      comparison_date,
    'overrideApplies',
      override_applies,
    'overrideId',
      case
        when has_override
          then override_row.id
        else null
      end,
    'overrideUpdatedAt',
      case
        when has_override
          then override_row.updated_at
        else null
      end,
    'overrideEffectiveFrom',
      case
        when has_override
          then override_row.effective_from
        else null
      end,
    'overrideEffectiveUntil',
      case
        when has_override
          then override_row.effective_until
        else null
      end,
    'globalUpdatedAt',
      settings_row.updated_at
  );
end;
$function$;

revoke all
on function public.contract_effective_operational_price_terms(
  text,
  uuid,
  uuid,
  date
)
from public, anon, authenticated;

grant execute
on function public.contract_effective_operational_price_terms(
  text,
  uuid,
  uuid,
  date
)
to service_role;

-- =====================================================
-- 3. FIELD-BY-FIELD DIFFERENCES
-- =====================================================

create or replace function public.contract_price_differences(
  target_accepted_terms jsonb,
  target_operational_terms jsonb
)
returns jsonb
language plpgsql
immutable
security definer
set search_path = public
as $function$
declare
  accepted jsonb :=
    public.contract_normalize_price_terms(
      target_accepted_terms
    );
  operational jsonb :=
    coalesce(
      target_operational_terms,
      '{}'::jsonb
    );
  differences jsonb :=
    '[]'::jsonb;
  field_name text;
begin
  foreach field_name
  in array array[
    'subscriptionUnitPrice',
    'currency',
    'vatRate'
  ]
  loop
    if accepted ? field_name
       and accepted -> field_name
         is distinct from
         operational -> field_name
    then
      differences :=
        differences ||
        jsonb_build_array(
          jsonb_build_object(
            'field',
              field_name,
            'accepted',
              accepted -> field_name,
            'operational',
              operational -> field_name
          )
        );
    end if;
  end loop;

  return differences;
end;
$function$;

revoke all
on function public.contract_price_differences(
  jsonb,
  jsonb
)
from public, anon, authenticated;

grant execute
on function public.contract_price_differences(
  jsonb,
  jsonb
)
to service_role;

comment on function public.contract_normalize_price_terms(jsonb) is
  'Normalizes contractual billing terms for reconciliation. Per-SMS price keys are retired and intentionally ignored.';

comment on function public.contract_effective_operational_price_terms(
  text,
  uuid,
  uuid,
  date
) is
  'Returns effective subscription/package price, currency and VAT for contract reconciliation. SMS usage is not a monetary contract term.';

comment on function public.contract_price_differences(jsonb, jsonb) is
  'Compares accepted and operational subscription/package price, currency and VAT. Per-SMS pricing is intentionally excluded.';

commit;
