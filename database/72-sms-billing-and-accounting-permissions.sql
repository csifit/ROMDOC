-- =====================================================
-- ROMDOC SMS BILLING AND ACCOUNTING PERMISSIONS
-- File: ROMDOC/database/72-sms-billing-and-accounting-permissions.sql
-- =====================================================

-- Doctor-facing SMS price for setup:
-- 0.30 RON / sent SMS + VAT.
-- Stored as minor units: 30 bani. VAT is calculated at invoice level.

create table if not exists public.manager_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  granted_by_profile_id uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint manager_permissions_permission_key_check check (
    permission_key in (
      'accounting',
      'support',
      'verification',
      'clinic_management',
      'content_moderation'
    )
  )
);

create unique index if not exists idx_manager_permissions_active_unique
  on public.manager_permissions(profile_id, permission_key)
  where revoked_at is null;

create index if not exists idx_manager_permissions_profile
  on public.manager_permissions(profile_id, revoked_at);

alter table public.manager_permissions enable row level security;

revoke all on public.manager_permissions from anon;
revoke all on public.manager_permissions from authenticated;

drop policy if exists "Admins can read manager permissions"
  on public.manager_permissions;

create policy "Admins can read manager permissions"
  on public.manager_permissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

alter table public.sms_delivery_logs
  add column if not exists invoice_status text not null default 'not_billable',
  add column if not exists unit_cost_minor integer not null default 30,
  add column if not exists currency text not null default 'RON',
  add column if not exists invoiced_at timestamptz,
  add column if not exists invoice_reference text,
  add column if not exists invoiced_by_profile_id uuid references public.profiles(id) on delete set null;

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_invoice_status_check;

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_invoice_status_check
  check (
    invoice_status in (
      'not_billable',
      'uninvoiced',
      'invoiced',
      'credited'
    )
  );

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_unit_cost_minor_check;

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_unit_cost_minor_check
  check (unit_cost_minor >= 0);

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_currency_check;

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_currency_check
  check (currency in ('RON'));

update public.sms_delivery_logs
set
  invoice_status = case
    when status = 'sent' then 'uninvoiced'
    else 'not_billable'
  end,
  unit_cost_minor = 30,
  currency = 'RON'
where invoice_status = 'not_billable'
  and (unit_cost_minor is null or unit_cost_minor = 30);

create index if not exists idx_sms_delivery_logs_invoice_status
  on public.sms_delivery_logs(invoice_status, created_at desc);

create index if not exists idx_sms_delivery_logs_doctor_invoice_status
  on public.sms_delivery_logs(doctor_id, invoice_status, created_at desc);

create or replace function public.can_manage_sms_billing(check_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_profile_id
      and p.role = 'admin'
      and p.account_status = 'active'
  )
  or exists (
    select 1
    from public.profiles p
    join public.manager_permissions mp
      on mp.profile_id = p.id
    where p.id = check_profile_id
      and p.role = 'manager'
      and p.account_status = 'active'
      and mp.permission_key = 'accounting'
      and mp.revoked_at is null
  );
$$;

revoke all on function public.can_manage_sms_billing(uuid) from public;
grant execute on function public.can_manage_sms_billing(uuid) to authenticated;

drop policy if exists "Admins can read SMS delivery logs"
  on public.sms_delivery_logs;

create policy "Admins and accounting managers can read SMS delivery logs"
  on public.sms_delivery_logs
  for select
  to authenticated
  using (public.can_manage_sms_billing(auth.uid()));

drop policy if exists "Admins can read SMS platform settings"
  on public.sms_platform_settings;

create policy "Admins and accounting managers can read SMS platform settings"
  on public.sms_platform_settings
  for select
  to authenticated
  using (public.can_manage_sms_billing(auth.uid()));
