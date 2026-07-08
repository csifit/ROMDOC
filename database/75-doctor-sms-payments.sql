-- =====================================================
-- ROMDOC CUMULATIVE DOCTOR SMS PAYMENTS
-- File: ROMDOC/database/75-doctor-sms-payments.sql
-- =====================================================

create table if not exists public.doctor_sms_payments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_count integer not null default 0,
  sms_count integer not null default 0,
  net_amount_minor integer not null default 0,
  vat_amount_minor integer not null default 0,
  gross_amount_minor integer not null default 0,
  currency text not null default 'RON',
  payment_status text not null default 'checkout_open',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_sms_payments_period_count_check check (period_count >= 0),
  constraint doctor_sms_payments_sms_count_check check (sms_count >= 0),
  constraint doctor_sms_payments_amounts_check check (
    net_amount_minor >= 0
    and vat_amount_minor >= 0
    and gross_amount_minor >= 0
  ),
  constraint doctor_sms_payments_currency_check check (currency in ('RON')),
  constraint doctor_sms_payments_payment_status_check check (
    payment_status in (
      'checkout_open',
      'paid',
      'failed',
      'cancelled',
      'refunded'
    )
  )
);

create table if not exists public.doctor_sms_payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.doctor_sms_payments(id) on delete cascade,
  billing_period_id uuid not null references public.doctor_sms_billing_periods(id) on delete restrict,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  net_amount_minor integer not null default 0,
  vat_amount_minor integer not null default 0,
  gross_amount_minor integer not null default 0,
  created_at timestamptz not null default now(),
  constraint doctor_sms_payment_items_amounts_check check (
    net_amount_minor >= 0
    and vat_amount_minor >= 0
    and gross_amount_minor >= 0
  )
);

create unique index if not exists idx_doctor_sms_payment_items_unique
  on public.doctor_sms_payment_items(payment_id, billing_period_id);

create index if not exists idx_doctor_sms_payments_profile_status
  on public.doctor_sms_payments(profile_id, payment_status, created_at desc);

create index if not exists idx_doctor_sms_payments_stripe_session
  on public.doctor_sms_payments(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists idx_doctor_sms_payment_items_period
  on public.doctor_sms_payment_items(billing_period_id);

create or replace function public.set_doctor_sms_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_doctor_sms_payments_updated_at
  on public.doctor_sms_payments;

create trigger set_doctor_sms_payments_updated_at
  before update on public.doctor_sms_payments
  for each row
  execute function public.set_doctor_sms_payments_updated_at();

alter table public.doctor_sms_payments enable row level security;
alter table public.doctor_sms_payment_items enable row level security;

revoke all on public.doctor_sms_payments from anon;
revoke all on public.doctor_sms_payments from authenticated;
revoke all on public.doctor_sms_payment_items from anon;
revoke all on public.doctor_sms_payment_items from authenticated;

grant select on public.doctor_sms_payments to authenticated;
grant select on public.doctor_sms_payment_items to authenticated;

drop policy if exists "Doctors can read their own SMS payments"
  on public.doctor_sms_payments;

create policy "Doctors can read their own SMS payments"
  on public.doctor_sms_payments
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

drop policy if exists "Admins and accounting managers can read SMS payments"
  on public.doctor_sms_payments;

create policy "Admins and accounting managers can read SMS payments"
  on public.doctor_sms_payments
  for select
  to authenticated
  using (public.can_manage_sms_billing(auth.uid()));

drop policy if exists "Doctors can read their own SMS payment items"
  on public.doctor_sms_payment_items;

create policy "Doctors can read their own SMS payment items"
  on public.doctor_sms_payment_items
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

drop policy if exists "Admins and accounting managers can read SMS payment items"
  on public.doctor_sms_payment_items;

create policy "Admins and accounting managers can read SMS payment items"
  on public.doctor_sms_payment_items
  for select
  to authenticated
  using (public.can_manage_sms_billing(auth.uid()));
