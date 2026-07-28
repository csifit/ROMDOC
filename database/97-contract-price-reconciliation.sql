-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Phase 5E — Accepted-price comparison and verified
-- manual Admin price-update reconciliation
--
-- Target project path:
-- ROMDOC/database/97-contract-price-reconciliation.sql
--
-- Safety rules:
--   1. This migration never writes to public.client_billing_terms.
--   2. It never blocks, suspends, bans, hides or deletes an account.
--   3. It verifies that the manually configured operational price matches
--      the accepted contractual price before recording price_applied.
-- =====================================================

begin;

create extension if not exists pgcrypto;

-- =====================================================
-- 1. CANONICAL CONTRACT PRICE TERMS
-- =====================================================

create or replace function public.contract_price_numeric_value(
  target_terms jsonb,
  camel_key text,
  snake_key text
)
returns numeric
language plpgsql
immutable
security definer
set search_path = public
as $function$
declare
  raw_value jsonb;
  text_value text;
begin
  if coalesce(target_terms, '{}'::jsonb) ? camel_key then
    raw_value := target_terms -> camel_key;
  elsif coalesce(target_terms, '{}'::jsonb) ? snake_key then
    raw_value := target_terms -> snake_key;
  else
    return null;
  end if;

  if raw_value is null or raw_value = 'null'::jsonb then
    return null;
  end if;

  text_value := trim(both '"' from raw_value::text);
  if text_value !~ '^[0-9]+([.][0-9]+)?$' then
    raise exception 'Contract price field % is not a non-negative numeric value.', camel_key;
  end if;

  return text_value::numeric;
end;
$function$;

revoke all on function public.contract_price_numeric_value(jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.contract_price_numeric_value(jsonb, text, text)
  to service_role;

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
  sms_value numeric;
  vat_value numeric;
begin
  if jsonb_typeof(source) <> 'object' then
    raise exception 'Contractual commercial terms must be a JSON object.';
  end if;

  if source ? 'subscriptionUnitPrice' or source ? 'subscription_unit_price' then
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

  if source ? 'smsUnitPrice' or source ? 'sms_unit_price' then
    sms_value := public.contract_price_numeric_value(
      source,
      'smsUnitPrice',
      'sms_unit_price'
    );
    if sms_value is not null then
      result := result || jsonb_build_object('smsUnitPrice', sms_value);
    end if;
  end if;

  if source ? 'vatRate' or source ? 'vat_rate' then
    vat_value := public.contract_price_numeric_value(
      source,
      'vatRate',
      'vat_rate'
    );
    if vat_value is not null then
      if vat_value > 1 then
        raise exception 'Contract VAT rate must be between 0 and 1.';
      end if;
      result := result || jsonb_build_object('vatRate', vat_value);
    end if;
  end if;

  if source ? 'currency' and source -> 'currency' <> 'null'::jsonb then
    currency_value := upper(trim(both '"' from (source -> 'currency')::text));
    if currency_value not in ('EUR', 'RON') then
      raise exception 'Contract price currency must be EUR or RON.';
    end if;
    result := result || jsonb_build_object('currency', currency_value);
  end if;

  return result;
end;
$function$;

revoke all on function public.contract_normalize_price_terms(jsonb)
  from public, anon, authenticated;
grant execute on function public.contract_normalize_price_terms(jsonb)
  to service_role;

-- =====================================================
-- 2. EFFECTIVE OPERATIONAL PRICE SNAPSHOT
-- =====================================================
-- The optional client override is merged with the shared platform rates in
-- exactly the same direction as the billing UI: null override values fall
-- back to the global setting. No operational table is changed here.

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

  select *
  into settings_row
  from public.clinic_billing_settings
  where id = 1;

  if not found then
    settings_row.clinic_doctor_monthly_price_ron := 60;
    settings_row.sms_unit_price_ron := 0.30;
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
  override_applies := has_override
    and (override_row.effective_from is null or override_row.effective_from <= comparison_date)
    and (override_row.effective_until is null or override_row.effective_until >= comparison_date);

  return jsonb_build_object(
    'subscriptionUnitPrice',
      coalesce(
        case when override_applies then override_row.subscription_unit_price end,
        settings_row.clinic_doctor_monthly_price_ron,
        60
      ),
    'smsUnitPrice',
      coalesce(
        case when override_applies then override_row.sms_unit_price end,
        settings_row.sms_unit_price_ron,
        0.30
      ),
    'currency',
      case
        when override_applies and override_row.currency in ('EUR', 'RON')
          then override_row.currency
        else configured_currency
      end,
    'vatRate',
      coalesce(
        case when override_applies then override_row.vat_rate end,
        settings_row.vat_rate,
        0.21
      ),
    'source', case when override_applies then 'client_override' else 'global' end,
    'comparisonDate', comparison_date,
    'overrideApplies', override_applies,
    'overrideId', case when has_override then override_row.id else null end,
    'overrideUpdatedAt', case when has_override then override_row.updated_at else null end,
    'overrideEffectiveFrom', case when has_override then override_row.effective_from else null end,
    'overrideEffectiveUntil', case when has_override then override_row.effective_until else null end,
    'globalUpdatedAt', settings_row.updated_at
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
  accepted jsonb := public.contract_normalize_price_terms(target_accepted_terms);
  operational jsonb := coalesce(target_operational_terms, '{}'::jsonb);
  differences jsonb := '[]'::jsonb;
  field_name text;
begin
  foreach field_name in array array[
    'subscriptionUnitPrice',
    'smsUnitPrice',
    'currency',
    'vatRate'
  ]
  loop
    if accepted ? field_name
      and accepted -> field_name is distinct from operational -> field_name
    then
      differences := differences || jsonb_build_array(
        jsonb_build_object(
          'field', field_name,
          'accepted', accepted -> field_name,
          'operational', operational -> field_name
        )
      );
    end if;
  end loop;

  return differences;
end;
$function$;

revoke all on function public.contract_price_differences(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.contract_price_differences(jsonb, jsonb)
  to service_role;

-- =====================================================
-- 4. VERIFIED MANUAL PRICE-APPLICATION CONFIRMATION
-- =====================================================

create or replace function public.admin_mark_contract_price_applied(
  target_admin_profile_id uuid,
  target_assignment_id uuid,
  target_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_assignment public.client_contract_assignments%rowtype;
  selected_acceptance_id uuid;
  selected_accepted_at timestamptz;
  accepted_snapshot jsonb;
  comparison_date date;
  accepted_terms jsonb;
  operational_terms jsonb;
  differences jsonb;
  compared_at timestamptz := now();
  comparison_hash text;
begin
  if not public.is_active_contract_admin(target_admin_profile_id) then
    raise exception 'Only an active RomDoc administrator may confirm a manual price update.';
  end if;

  select *
  into selected_assignment
  from public.client_contract_assignments
  where id = target_assignment_id
  for update;

  if not found or selected_assignment.status not in ('accepted', 'effective') then
    raise exception 'Only an accepted or effective assignment may be reconciled.';
  end if;

  if not exists (
    select 1
    from public.contract_events
    where assignment_id = selected_assignment.id
      and event_type = 'price_update_pending'
  ) then
    raise exception 'This assignment does not have a pending manual price-update event.';
  end if;

  if exists (
    select 1
    from public.contract_events
    where assignment_id = selected_assignment.id
      and event_type = 'price_applied'
      and event_data ->> 'comparisonVerified' = 'true'
  ) then
    return;
  end if;

  select id, accepted_at, commercial_terms_snapshot
  into selected_acceptance_id, selected_accepted_at, accepted_snapshot
  from public.contract_acceptances
  where assignment_id = selected_assignment.id;

  if selected_acceptance_id is null then
    raise exception 'The accepted contract evidence could not be found.';
  end if;

  accepted_terms := public.contract_normalize_price_terms(accepted_snapshot);

  if accepted_terms = '{}'::jsonb then
    raise exception 'This acceptance does not contain contractual price values.';
  end if;

  comparison_date := coalesce(
    selected_assignment.effective_at::date,
    selected_accepted_at::date,
    current_date
  );

  operational_terms := public.contract_effective_operational_price_terms(
    selected_assignment.client_type,
    selected_assignment.doctor_id,
    selected_assignment.clinic_organization_id,
    comparison_date
  );

  differences := public.contract_price_differences(
    accepted_terms,
    operational_terms
  );

  if jsonb_array_length(differences) > 0 then
    raise exception 'Operational billing terms still differ from the accepted contractual price. Update the manual client pricing first.';
  end if;

  comparison_hash := encode(
    digest(
      convert_to(
        concat_ws(
          '|',
          selected_assignment.id::text,
          coalesce(selected_acceptance_id::text, ''),
          accepted_terms::text,
          operational_terms::text,
          compared_at::text
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.contract_events (
    assignment_id,
    acceptance_id,
    event_type,
    actor_profile_id,
    event_data
  )
  values (
    selected_assignment.id,
    selected_acceptance_id,
    'price_applied',
    target_admin_profile_id,
    jsonb_build_object(
      'comparisonVerified', true,
      'manualOperationalPriceChangeConfirmed', true,
      'acceptedTerms', accepted_terms,
      'operationalTerms', operational_terms,
      'differences', differences,
      'operationalSource', operational_terms -> 'source',
      'overrideId', operational_terms -> 'overrideId',
      'overrideUpdatedAt', operational_terms -> 'overrideUpdatedAt',
      'comparedAt', compared_at,
      'comparisonHash', comparison_hash,
      'note', nullif(left(trim(coalesce(target_note, '')), 1000), '')
    )
  );
end;
$function$;

revoke all on function public.admin_mark_contract_price_applied(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_mark_contract_price_applied(uuid, uuid, text)
  to service_role;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'contract_price_numeric_value',
    'contract_normalize_price_terms',
    'contract_effective_operational_price_terms',
    'contract_price_differences',
    'admin_mark_contract_price_applied'
  )
order by routine_name;

-- Expected: zero contract-related triggers on operational billing or account tables.
select
  trigger_name,
  event_object_table,
  event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in (
    'client_billing_terms',
    'profiles',
    'doctor_subscriptions'
  )
  and trigger_name ilike '%contract%';
