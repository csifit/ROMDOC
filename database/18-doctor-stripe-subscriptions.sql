-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 52F: Stripe doctor subscriptions
--
-- File:
-- ROMDOC/database/18-doctor-stripe-subscriptions.sql
-- =====================================================

begin;

-- =====================================================
-- 1. DOCTOR SUBSCRIPTIONS
-- =====================================================

create table if not exists public.doctor_subscriptions (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null unique
    references public.profiles(id)
    on delete cascade,

  doctor_application_id uuid unique
    references public.doctor_applications(id)
    on delete set null,

  doctor_id uuid unique
    references public.doctors(id)
    on delete set null,

  stripe_customer_id text unique,

  stripe_subscription_id text unique,

  stripe_price_id text,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'unpaid',
        'paused',
        'canceled'
      )
    ),

  current_period_start timestamptz,
  current_period_end timestamptz,

  cancel_at_period_end boolean not null default false,

  canceled_at timestamptz,
  last_payment_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  idx_doctor_subscriptions_status
on public.doctor_subscriptions (
  status
);

create index if not exists
  idx_doctor_subscriptions_customer
on public.doctor_subscriptions (
  stripe_customer_id
);

create index if not exists
  idx_doctor_subscriptions_subscription
on public.doctor_subscriptions (
  stripe_subscription_id
);

drop trigger if exists
  set_doctor_subscriptions_updated_at
on public.doctor_subscriptions;

create trigger set_doctor_subscriptions_updated_at
before update
on public.doctor_subscriptions
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 2. WEBHOOK EVENT LOG
-- =====================================================

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,

  event_type text not null,

  processed_at timestamptz not null default now()
);

-- =====================================================
-- 3. RLS
-- =====================================================

alter table public.doctor_subscriptions
  enable row level security;

alter table public.stripe_webhook_events
  enable row level security;

drop policy if exists
  "Users can view their own doctor subscription"
on public.doctor_subscriptions;

drop policy if exists
  "Admins can view doctor subscriptions"
on public.doctor_subscriptions;

create policy
  "Users can view their own doctor subscription"
on public.doctor_subscriptions
for select
to authenticated
using (
  profile_id = auth.uid()
);

create policy
  "Admins can view doctor subscriptions"
on public.doctor_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

grant select
on public.doctor_subscriptions
to authenticated;

-- No browser-facing policies are added for:
--
-- INSERT
-- UPDATE
-- DELETE
--
-- Those operations are performed only by trusted server
-- routes using the Supabase service-role client.

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'doctor_subscriptions'
order by ordinal_position;

select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'doctor_subscriptions';