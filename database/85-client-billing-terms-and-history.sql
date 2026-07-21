begin;

-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Group 7G.1 — Client pricing, XLSX export and billing history
-- Project path: ROMDOC/database/85-client-billing-terms-and-history.sql
--
-- This migration stores:
--   1. one optional client-specific billing override per client;
--   2. lightweight invoice metadata per client and month.
--
-- It deliberately does NOT store immutable usage snapshots. Usage and
-- estimates remain live until a SAGA invoice is registered.
-- =====================================================

create table if not exists public.client_billing_terms (
  id uuid primary key default gen_random_uuid(),
  client_type text not null,
  doctor_id uuid references public.doctors(id) on delete cascade,
  clinic_organization_id uuid references public.clinic_organizations(id) on delete cascade,
  subscription_unit_price numeric(12,4),
  sms_unit_price numeric(12,4),
  currency text not null default 'RON',
  vat_rate numeric(8,6),
  vat_treatment text not null default 'domestic',
  vat_reason text,
  vat_number text,
  vat_validated_at timestamptz,
  vat_validation_status text,
  effective_from date,
  effective_until date,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_billing_terms_client_type_check check (
    client_type in ('independent_doctor', 'clinic_organization')
  ),
  constraint client_billing_terms_target_check check (
    (
      client_type = 'independent_doctor'
      and doctor_id is not null
      and clinic_organization_id is null
    )
    or
    (
      client_type = 'clinic_organization'
      and clinic_organization_id is not null
      and doctor_id is null
    )
  ),
  constraint client_billing_terms_subscription_price_check check (
    subscription_unit_price is null or subscription_unit_price >= 0
  ),
  constraint client_billing_terms_sms_price_check check (
    sms_unit_price is null or sms_unit_price >= 0
  ),
  constraint client_billing_terms_currency_check check (
    currency in ('RON', 'EUR')
  ),
  constraint client_billing_terms_vat_rate_check check (
    vat_rate is null or (vat_rate >= 0 and vat_rate <= 1)
  ),
  constraint client_billing_terms_vat_treatment_check check (
    vat_treatment in (
      'domestic',
      'reverse_charge',
      'outside_scope',
      'exempt',
      'custom'
    )
  ),
  constraint client_billing_terms_vat_validation_status_check check (
    vat_validation_status is null
    or vat_validation_status in ('not_checked', 'valid', 'invalid', 'unavailable')
  ),
  constraint client_billing_terms_effective_dates_check check (
    effective_from is null
    or effective_until is null
    or effective_until >= effective_from
  )
);

create unique index if not exists uq_client_billing_terms_doctor
  on public.client_billing_terms(doctor_id)
  where client_type = 'independent_doctor';

create unique index if not exists uq_client_billing_terms_organization
  on public.client_billing_terms(clinic_organization_id)
  where client_type = 'clinic_organization';

create index if not exists idx_client_billing_terms_effective_dates
  on public.client_billing_terms(effective_from, effective_until);

create table if not exists public.client_billing_invoice_records (
  id uuid primary key default gen_random_uuid(),
  client_type text not null,
  doctor_id uuid references public.doctors(id) on delete restrict,
  clinic_organization_id uuid references public.clinic_organizations(id) on delete restrict,
  billing_period_start date not null,
  billing_period_end date not null,
  invoice_number text not null,
  issued_on date not null,
  estimated_amount numeric(12,2),
  amount numeric(12,2) not null,
  currency text not null default 'RON',
  status text not null default 'invoiced',
  paid_on date,
  payment_reference text,
  notes text,
  legacy_clinic_invoice_id uuid unique references public.clinic_invoices(id) on delete set null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  marked_paid_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_billing_invoice_records_client_type_check check (
    client_type in ('independent_doctor', 'clinic_organization')
  ),
  constraint client_billing_invoice_records_target_check check (
    (
      client_type = 'independent_doctor'
      and doctor_id is not null
      and clinic_organization_id is null
    )
    or
    (
      client_type = 'clinic_organization'
      and clinic_organization_id is not null
      and doctor_id is null
    )
  ),
  constraint client_billing_invoice_records_period_check check (
    billing_period_end >= billing_period_start
  ),
  constraint client_billing_invoice_records_amount_check check (
    amount >= 0 and (estimated_amount is null or estimated_amount >= 0)
  ),
  constraint client_billing_invoice_records_currency_check check (
    currency in ('RON', 'EUR')
  ),
  constraint client_billing_invoice_records_status_check check (
    status in ('invoiced', 'paid')
  ),
  constraint client_billing_invoice_records_paid_check check (
    (status = 'invoiced' and paid_on is null)
    or (status = 'paid' and paid_on is not null)
  )
);

create unique index if not exists uq_client_billing_invoice_doctor_period
  on public.client_billing_invoice_records(
    doctor_id,
    billing_period_start,
    billing_period_end
  )
  where client_type = 'independent_doctor';

create unique index if not exists uq_client_billing_invoice_org_period
  on public.client_billing_invoice_records(
    clinic_organization_id,
    billing_period_start,
    billing_period_end
  )
  where client_type = 'clinic_organization';

create unique index if not exists uq_client_billing_invoice_number_normalized
  on public.client_billing_invoice_records(lower(trim(invoice_number)));

create index if not exists idx_client_billing_invoice_period
  on public.client_billing_invoice_records(billing_period_start desc, billing_period_end desc);

create index if not exists idx_client_billing_invoice_status
  on public.client_billing_invoice_records(status, issued_on desc);

-- Preserve existing clinic invoice history in the new shared history table.
insert into public.client_billing_invoice_records (
  client_type,
  clinic_organization_id,
  billing_period_start,
  billing_period_end,
  invoice_number,
  issued_on,
  estimated_amount,
  amount,
  currency,
  status,
  paid_on,
  payment_reference,
  notes,
  legacy_clinic_invoice_id,
  created_by_profile_id,
  marked_paid_by_profile_id,
  created_at,
  updated_at
)
select
  'clinic_organization',
  invoice.organization_id,
  invoice.billing_period_start,
  invoice.billing_period_end,
  invoice.invoice_number,
  invoice.issued_on,
  invoice.estimated_amount_ron,
  invoice.amount_ron,
  'RON',
  case when invoice.status = 'paid' then 'paid' else 'invoiced' end,
  case when invoice.status = 'paid' then coalesce(invoice.paid_on, invoice.issued_on) else null end,
  invoice.payment_reference,
  invoice.notes,
  invoice.id,
  invoice.created_by_profile_id,
  invoice.marked_paid_by_profile_id,
  invoice.created_at,
  invoice.updated_at
from public.clinic_invoices as invoice
where invoice.status in ('invoiced', 'paid')
on conflict do nothing;

alter table public.client_billing_terms enable row level security;
alter table public.client_billing_invoice_records enable row level security;

revoke all on public.client_billing_terms from anon, authenticated;
revoke all on public.client_billing_invoice_records from anon, authenticated;

-- Browser clients never write these accounting tables directly. All access is
-- through server routes using the service-role client after role checks.

create or replace function public.set_client_billing_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_client_billing_terms_updated_at
  on public.client_billing_terms;
create trigger set_client_billing_terms_updated_at
before update on public.client_billing_terms
for each row execute function public.set_client_billing_updated_at();

drop trigger if exists set_client_billing_invoice_records_updated_at
  on public.client_billing_invoice_records;
create trigger set_client_billing_invoice_records_updated_at
before update on public.client_billing_invoice_records
for each row execute function public.set_client_billing_updated_at();

comment on table public.client_billing_terms is
  'Optional Admin-managed billing overrides per independent Doctor or clinic organisation. Effective and VAT validation fields are optional.';

comment on table public.client_billing_invoice_records is
  'Lightweight SAGA invoice metadata and payment status per client/month. This table is not a usage snapshot.';

commit;
