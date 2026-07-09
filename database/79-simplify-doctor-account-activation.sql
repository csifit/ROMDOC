-- =====================================================
-- ROMDOC MIGRATION 79
-- Simplify doctor account activation
--
-- File:
-- ROMDOC/database/79-simplify-doctor-account-activation.sql
--
-- Business rule:
-- - Independent doctors still need Stripe payment before doctor activation.
-- - After successful payment: profile account active, doctor profile active.
-- - Clinic doctors are activated by clinic invitation flow.
-- - Admin does not approve normal doctor activation.
-- - Professional verification is separate and remains on doctors.verification_status.
-- - No archived/draft/pending/rejected doctor profile statuses.
-- =====================================================

begin;

-- -----------------------------------------------------
-- 1. profiles.account_status: active / suspended / blocked
-- -----------------------------------------------------

alter table public.profiles
  add column if not exists account_status text not null default 'active';

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%account_status%'
  loop
    execute format(
      'alter table public.profiles drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

update public.profiles
set account_status = 'active'
where account_status is null
   or account_status not in ('active', 'suspended', 'blocked');

alter table public.profiles
  alter column account_status set default 'active',
  alter column account_status set not null;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended', 'blocked'));

comment on column public.profiles.account_status is
  'Controls whether the user account can use RomDoc: active, suspended, blocked.';

-- -----------------------------------------------------
-- 2. doctors.status: active / suspended only
-- -----------------------------------------------------

alter table public.doctors
  add column if not exists status text not null default 'active';

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.doctors'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
      and pg_get_constraintdef(oid) not ilike '%verification_status%'
  loop
    execute format(
      'alter table public.doctors drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

-- Old activation statuses are no longer meaningful. A doctor is active by default
-- unless explicitly suspended by Admin.
update public.doctors
set status = case
  when status = 'suspended' then 'suspended'
  else 'active'
end
where status is null
   or status not in ('active', 'suspended')
   or status in ('pending', 'rejected', 'draft');

alter table public.doctors
  alter column status set default 'active',
  alter column status set not null;

alter table public.doctors
  add constraint doctors_status_check
  check (status in ('active', 'suspended'));

comment on column public.doctors.status is
  'Operational doctor profile status. Active by default; Admin can suspend. Professional verification is separate.';

commit;
