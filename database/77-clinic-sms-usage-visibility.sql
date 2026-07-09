-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Corrected Clinic SMS Usage Visibility
--
-- Project path:
-- ROMDOC/database/77-clinic-sms-usage-visibility.sql
--
-- Why:
--   The existing production table public.sms_delivery_logs already has
--   SMS billing fields:
--     - invoice_status
--     - unit_cost_minor
--     - currency
--     - invoiced_at
--     - invoice_reference
--     - invoiced_by_profile_id
--     - sms_billing_period_id
--
--   This migration therefore does NOT recreate those fields.
--   It only adds clinic / payer visibility fields and a safe read-only
--   RPC for Clinic Manager SMS visibility.
--
-- Uses the real existing column names:
--   event
--   recipient
--   status
--   provider
--   provider_message_id
--   created_at
--   delivered_at
--   failed_at
--
-- Privacy rule:
--   Clinic Manager sees billing and delivery metadata only.
--   The function never returns full phone numbers, SMS body, patient notes,
--   or patient medical Folder data.
-- =====================================================

-- =====================================================
-- 1. Add clinic / payer visibility fields
-- =====================================================

alter table public.sms_delivery_logs
  add column if not exists clinic_id uuid
    references public.clinics(id)
    on delete set null;

alter table public.sms_delivery_logs
  add column if not exists payer_type text
    not null
    default 'doctor';

alter table public.sms_delivery_logs
  add column if not exists payer_clinic_organization_id uuid
    references public.clinic_organizations(id)
    on delete set null;

alter table public.sms_delivery_logs
  add column if not exists payer_note text;

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_payer_type_check;

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_payer_type_check
  check (
    payer_type in (
      'doctor',
      'clinic_organization',
      'romdoc',
      'not_billable'
    )
  );

-- Existing non-billable messages should clearly remain non-billable.
update public.sms_delivery_logs
set payer_type = 'not_billable'
where invoice_status = 'not_billable'
  and payer_type <> 'not_billable';

comment on column public.sms_delivery_logs.clinic_id is
  'Optional clinic connected to the SMS event, used for clinic-level billing visibility.';

comment on column public.sms_delivery_logs.payer_type is
  'Who is commercially responsible for this SMS: doctor, clinic_organization, romdoc, or not_billable.';

comment on column public.sms_delivery_logs.payer_clinic_organization_id is
  'Clinic organization responsible for this SMS when payer_type = clinic_organization.';

comment on column public.sms_delivery_logs.payer_note is
  'Optional internal note explaining payer assignment. Do not store SMS content or medical information here.';

-- =====================================================
-- 2. Helpful indexes
-- =====================================================

create index if not exists idx_sms_delivery_logs_clinic
  on public.sms_delivery_logs(clinic_id);

create index if not exists idx_sms_delivery_logs_payer_org
  on public.sms_delivery_logs(payer_clinic_organization_id);

create index if not exists idx_sms_delivery_logs_payer_type
  on public.sms_delivery_logs(payer_type);

create index if not exists idx_sms_delivery_logs_created_at
  on public.sms_delivery_logs(created_at);

create index if not exists idx_sms_delivery_logs_doctor_created
  on public.sms_delivery_logs(doctor_id, created_at);

create index if not exists idx_sms_delivery_logs_invoice_status_created
  on public.sms_delivery_logs(invoice_status, created_at);

-- =====================================================
-- 3. Safe Clinic Manager SMS visibility RPC
-- =====================================================

drop function if exists public.get_clinic_organization_sms_usage(
  uuid,
  timestamptz,
  timestamptz
);

create or replace function public.get_clinic_organization_sms_usage(
  target_organization_id uuid default null,
  period_start timestamptz default date_trunc('month', now()),
  period_end timestamptz default (date_trunc('month', now()) + interval '1 month')
)
returns table (
  sms_log_id uuid,
  organization_id uuid,
  organization_name text,
  doctor_id uuid,
  clinic_id uuid,
  event text,
  status text,
  delivery_report_status text,
  invoice_status text,
  masked_recipient text,
  provider text,
  provider_message_id text,
  created_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  unit_cost_minor integer,
  currency text,
  estimated_billable_minor integer,
  invoice_reference text,
  invoiced_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with enriched_logs as (
    select
      log.id,
      coalesce(
        log.payer_clinic_organization_id,
        inferred_relationship.organization_id
      ) as effective_organization_id,
      log.doctor_id,
      coalesce(
        log.clinic_id,
        inferred_relationship.clinic_id
      ) as effective_clinic_id,
      log.event,
      log.status,
      log.delivery_report_status,
      log.invoice_status,
      log.recipient,
      log.provider,
      log.provider_message_id,
      log.created_at,
      log.delivered_at,
      log.failed_at,
      log.unit_cost_minor,
      log.currency,
      log.invoice_reference,
      log.invoiced_at
    from public.sms_delivery_logs log
    left join lateral (
      select
        relationship.organization_id,
        relationship.clinic_id
      from public.clinic_doctor_relationships relationship
      where log.payer_clinic_organization_id is null
        and log.doctor_id is not null
        and relationship.doctor_id = log.doctor_id
        and relationship.payment_responsibility = 'clinic_paid'
        and relationship.coverage_status = 'active'
      order by
        relationship.accepted_at desc nulls last,
        relationship.created_at desc
      limit 1
    ) inferred_relationship on true
    where log.created_at >= period_start
      and log.created_at < period_end
  )
  select
    enriched_logs.id as sms_log_id,
    enriched_logs.effective_organization_id as organization_id,
    organization.name as organization_name,
    enriched_logs.doctor_id,
    enriched_logs.effective_clinic_id as clinic_id,
    enriched_logs.event,
    enriched_logs.status,
    enriched_logs.delivery_report_status,
    enriched_logs.invoice_status,

    case
      when enriched_logs.recipient is null then null
      when length(regexp_replace(enriched_logs.recipient, '\D', '', 'g')) <= 4 then '••••'
      else
        left(enriched_logs.recipient, 4)
        || '••••'
        || right(enriched_logs.recipient, 2)
    end as masked_recipient,

    enriched_logs.provider,
    enriched_logs.provider_message_id,
    enriched_logs.created_at,
    enriched_logs.delivered_at,
    enriched_logs.failed_at,
    enriched_logs.unit_cost_minor,
    enriched_logs.currency,

    case
      when enriched_logs.status = 'sent'
        and enriched_logs.invoice_status <> 'not_billable'
      then enriched_logs.unit_cost_minor
      else 0
    end as estimated_billable_minor,

    enriched_logs.invoice_reference,
    enriched_logs.invoiced_at
  from enriched_logs
  join public.clinic_organizations organization
    on organization.id = enriched_logs.effective_organization_id
  where enriched_logs.effective_organization_id is not null
    and (
      target_organization_id is null
      or enriched_logs.effective_organization_id = target_organization_id
    )
    and public.is_clinic_organization_member(
      enriched_logs.effective_organization_id
    )
  order by enriched_logs.created_at desc;
$$;

comment on function public.get_clinic_organization_sms_usage(
  uuid,
  timestamptz,
  timestamptz
) is
  'Returns safe SMS delivery and billing metadata for clinic organizations visible to the current clinic manager/admin. Full phone numbers, SMS bodies, patient medical data and patient Folder content are not returned.';

grant execute on function public.get_clinic_organization_sms_usage(
  uuid,
  timestamptz,
  timestamptz
) to authenticated;
