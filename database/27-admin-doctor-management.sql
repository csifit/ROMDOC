-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 56B: Admin doctor management
--
-- File:
-- ROMDOC/database/27-admin-doctor-management.sql
-- =====================================================

begin;

-- =====================================================
-- 1. PROFESSIONAL VERIFICATION
-- =====================================================

alter table public.doctors
  add column if not exists verification_status text;

update public.doctors
set verification_status = 'not_submitted'
where verification_status is null;

alter table public.doctors
  alter column verification_status
  set default 'not_submitted';

alter table public.doctors
  alter column verification_status
  set not null;

alter table public.doctors
  drop constraint if exists doctors_verification_status_check;

alter table public.doctors
  add constraint doctors_verification_status_check
  check (
    verification_status in (
      'not_submitted',
      'pending',
      'verified',
      'rejected',
      'expired'
    )
  );

alter table public.doctors
  add column if not exists
  professional_registration_number text;

alter table public.doctors
  add column if not exists
  verified_at timestamptz;

alter table public.doctors
  add column if not exists
  verified_by_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.doctors
  add column if not exists
  verification_expires_at timestamptz;

-- =====================================================
-- 2. SUBSCRIPTION PLAN
-- =====================================================

alter table public.doctor_subscriptions
  add column if not exists billing_interval text;

update public.doctor_subscriptions
set billing_interval = 'monthly'
where billing_interval is null;

alter table public.doctor_subscriptions
  alter column billing_interval
  set default 'monthly';

alter table public.doctor_subscriptions
  alter column billing_interval
  set not null;

alter table public.doctor_subscriptions
  drop constraint if exists
  doctor_subscriptions_billing_interval_check;

alter table public.doctor_subscriptions
  add constraint
  doctor_subscriptions_billing_interval_check
  check (
    billing_interval in (
      'monthly',
      'yearly'
    )
  );

-- =====================================================
-- 3. INDEXES
-- =====================================================

create index if not exists
  idx_doctors_verification_status
on public.doctors (
  verification_status
);

create index if not exists
  idx_doctors_status_verification
on public.doctors (
  status,
  verification_status
);

create index if not exists
  idx_doctor_subscriptions_billing_interval
on public.doctor_subscriptions (
  billing_interval
);

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  id,
  slug,
  status,
  verification_status,
  professional_registration_number,
  verified_at,
  verification_expires_at
from public.doctors
order by created_at desc;

select
  profile_id,
  doctor_id,
  status,
  billing_interval,
  stripe_price_id,
  current_period_end,
  cancel_at_period_end
from public.doctor_subscriptions
order by created_at desc;