-- =====================================================
-- ROMDOC DOCTOR SMS BILLING PERIODS
-- File: ROMDOC/database/74-doctor-sms-billing-periods.sql
-- =====================================================

create table if not exists public.doctor_sms_billing_periods (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  sms_count integer not null default 0,
  unit_cost_minor integer not null default 30,
  net_amount_minor integer not null default 0,
  vat_rate_basis_points integer not null default 2100,
  vat_amount_minor integer not null default 0,
  gross_amount_minor integer not null default 0,
  currency text not null default 'RON',
  payment_status text not null default 'unpaid',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  saga_invoice_status text not null default 'not_issued',
  saga_invoice_reference text,
  saga_invoice_issued_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_sms_billing_periods_period_check check (period_end > period_start),
  constraint doctor_sms_billing_periods_sms_count_check check (sms_count >= 0),
  constraint doctor_sms_billing_periods_unit_cost_check check (unit_cost_minor >= 0),
  constraint doctor_sms_billing_periods_amounts_check check (
    net_amount_minor >= 0
    and vat_amount_minor >= 0
    and gross_amount_minor >= 0
  ),
  constraint doctor_sms_billing_periods_vat_rate_check check (vat_rate_basis_points >= 0),
  constraint doctor_sms_billing_periods_currency_check check (currency in ('RON')),
  constraint doctor_sms_billing_periods_payment_status_check check (
    payment_status in (
      'unpaid',
      'checkout_open',
      'paid',
      'failed',
      'cancelled',
      'refunded'
    )
  ),
  constraint doctor_sms_billing_periods_saga_invoice_status_check check (
    saga_invoice_status in (
      'not_issued',
      'issued',
      'cancelled'
    )
  )
);

create unique index if not exists idx_doctor_sms_billing_periods_unique_period
  on public.doctor_sms_billing_periods(doctor_id, period_start, period_end);

create index if not exists idx_doctor_sms_billing_periods_profile_status
  on public.doctor_sms_billing_periods(profile_id, payment_status, period_start desc);

create index if not exists idx_doctor_sms_billing_periods_payment_status
  on public.doctor_sms_billing_periods(payment_status, period_start desc);

alter table public.sms_delivery_logs
  add column if not exists sms_billing_period_id uuid references public.doctor_sms_billing_periods(id) on delete set null;

create index if not exists idx_sms_delivery_logs_billing_period
  on public.sms_delivery_logs(sms_billing_period_id)
  where sms_billing_period_id is not null;

create or replace function public.set_doctor_sms_billing_periods_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_doctor_sms_billing_periods_updated_at
  on public.doctor_sms_billing_periods;

create trigger set_doctor_sms_billing_periods_updated_at
  before update on public.doctor_sms_billing_periods
  for each row
  execute function public.set_doctor_sms_billing_periods_updated_at();

alter table public.doctor_sms_billing_periods enable row level security;

revoke all on public.doctor_sms_billing_periods from anon;
revoke all on public.doctor_sms_billing_periods from authenticated;

grant select on public.doctor_sms_billing_periods to authenticated;

drop policy if exists "Doctors can read their own SMS billing periods"
  on public.doctor_sms_billing_periods;

create policy "Doctors can read their own SMS billing periods"
  on public.doctor_sms_billing_periods
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'doctor'
        and p.account_status = 'active'
    )
  );

drop policy if exists "Admins and accounting managers can read SMS billing periods"
  on public.doctor_sms_billing_periods;

create policy "Admins and accounting managers can read SMS billing periods"
  on public.doctor_sms_billing_periods
  for select
  to authenticated
  using (public.can_manage_sms_billing(auth.uid()));
