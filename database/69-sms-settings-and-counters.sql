-- =====================================================
-- ROMDOC SMS SETTINGS AND COUNTERS
-- File: ROMDOC/database/69-sms-settings-and-counters.sql
-- =====================================================

create extension if not exists pgcrypto;

create table if not exists public.sms_platform_settings (
  id integer primary key default 1,
  sms_enabled boolean not null default false,
  confirmation_sms_enabled boolean not null default true,
  reminder_24h_sms_enabled boolean not null default false,
  provider text not null default 'twilio',
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sms_platform_settings_singleton_check check (id = 1),
  constraint sms_platform_settings_provider_check check (provider in ('twilio'))
);

insert into public.sms_platform_settings (
  id,
  sms_enabled,
  confirmation_sms_enabled,
  reminder_24h_sms_enabled,
  provider
)
values (1, false, true, false, 'twilio')
on conflict (id) do nothing;

create table if not exists public.sms_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  doctor_id uuid references public.doctors(id) on delete set null,
  triggered_by_profile_id uuid references public.profiles(id) on delete set null,
  event text not null,
  recipient text not null,
  status text not null,
  provider text not null default 'twilio',
  provider_message_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  constraint sms_delivery_logs_event_check check (
    event in ('confirmed', 'reminder_24_hours')
  ),
  constraint sms_delivery_logs_status_check check (
    status in ('sent', 'failed', 'skipped')
  ),
  constraint sms_delivery_logs_provider_check check (provider in ('twilio'))
);

create index if not exists idx_sms_delivery_logs_doctor
  on public.sms_delivery_logs(doctor_id, created_at desc);

create index if not exists idx_sms_delivery_logs_appointment
  on public.sms_delivery_logs(appointment_id, created_at desc);

create index if not exists idx_sms_delivery_logs_status
  on public.sms_delivery_logs(status, created_at desc);

alter table public.sms_platform_settings enable row level security;
alter table public.sms_delivery_logs enable row level security;

drop policy if exists "Admins can read SMS platform settings"
  on public.sms_platform_settings;

create policy "Admins can read SMS platform settings"
  on public.sms_platform_settings
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

drop policy if exists "Admins can read SMS delivery logs"
  on public.sms_delivery_logs;

create policy "Admins can read SMS delivery logs"
  on public.sms_delivery_logs
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
