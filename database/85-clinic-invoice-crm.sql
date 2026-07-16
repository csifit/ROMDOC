begin;

create table if not exists public.clinic_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.clinic_organizations(id)
    on update cascade on delete restrict,
  billing_period_start date not null,
  billing_period_end date not null,
  invoice_number text not null,
  issued_on date not null,
  estimated_amount_ron numeric(12,2),
  amount_ron numeric(12,2) not null,
  status text not null default 'invoiced',
  paid_on date,
  payment_reference text,
  notes text,
  created_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade on delete restrict,
  marked_paid_by_profile_id uuid
    references public.profiles(id)
    on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clinic_invoices_period_check
    check (billing_period_end >= billing_period_start),
  constraint clinic_invoices_invoice_number_check
    check (char_length(trim(invoice_number)) between 1 and 100),
  constraint clinic_invoices_estimated_amount_check
    check (estimated_amount_ron is null or estimated_amount_ron >= 0),
  constraint clinic_invoices_amount_check
    check (amount_ron >= 0),
  constraint clinic_invoices_status_check
    check (status in ('draft', 'invoiced', 'paid')),
  constraint clinic_invoices_paid_state_check
    check (
      (
        status = 'paid'
        and paid_on is not null
        and marked_paid_by_profile_id is not null
      )
      or
      (
        status <> 'paid'
        and paid_on is null
        and marked_paid_by_profile_id is null
      )
    ),
  constraint clinic_invoices_payment_reference_length_check
    check (payment_reference is null or char_length(payment_reference) <= 200),
  constraint clinic_invoices_notes_length_check
    check (notes is null or char_length(notes) <= 2000)
);

create unique index if not exists
  clinic_invoices_org_period_number_unique
on public.clinic_invoices (
  organization_id,
  billing_period_start,
  invoice_number
);

create index if not exists clinic_invoices_organization_idx
  on public.clinic_invoices (organization_id);

create index if not exists clinic_invoices_issued_on_idx
  on public.clinic_invoices (issued_on desc);

create index if not exists clinic_invoices_status_idx
  on public.clinic_invoices (status);

create index if not exists clinic_invoices_paid_on_idx
  on public.clinic_invoices (paid_on)
  where status = 'paid';

create or replace function public.set_clinic_invoice_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists set_clinic_invoice_updated_at
on public.clinic_invoices;

create trigger set_clinic_invoice_updated_at
before update on public.clinic_invoices
for each row
execute function public.set_clinic_invoice_updated_at();

alter table public.clinic_invoices enable row level security;

revoke all on table public.clinic_invoices from anon, authenticated;
grant all on table public.clinic_invoices to service_role;

comment on table public.clinic_invoices is
  'Temporary RomDoc CRM records for clinic-organization invoices created manually in SAGA. SAGA remains the accounting source of truth.';

comment on column public.clinic_invoices.estimated_amount_ron is
  'Previous-month RomDoc estimate recorded for comparison.';

comment on column public.clinic_invoices.amount_ron is
  'Final invoice amount confirmed from the manually created SAGA invoice.';

comment on column public.clinic_invoices.paid_on is
  'Payment date used for the future one-year cleanup rule implemented in Step 80D.';

commit;
