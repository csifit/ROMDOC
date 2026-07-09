-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Clinic-invited doctor sub-account onboarding
--
-- Project path:
-- ROMDOC/database/78-clinic-invited-doctor-subaccounts.sql
--
-- Why:
--   Clinic-invited doctors are clinic-paid sub-accounts, not
--   independent Stripe-paid doctors.
--
-- Business rule:
--   independent doctor
--     -> self-paid Stripe doctor account
--
--   clinic-invited doctor
--     -> clinic-paid doctor sub-account
--     -> scoped to the inviting clinic organization
--     -> may use a separate e-mail for another independent or clinic account
--
-- This migration stores that distinction directly on public.doctors.
-- =====================================================

-- -----------------------------------------------------
-- 1. Doctor account type
-- -----------------------------------------------------

alter table public.doctors
  add column if not exists account_type text not null default 'independent';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'doctors_account_type_check'
      and conrelid = 'public.doctors'::regclass
  ) then
    alter table public.doctors
      add constraint doctors_account_type_check
      check (
        account_type in (
          'independent',
          'clinic_sub_account'
        )
      );
  end if;
end $$;

comment on column public.doctors.account_type is
  'independent = self-paid doctor account; clinic_sub_account = clinic-invited, clinic-paid doctor sub-account.';

-- -----------------------------------------------------
-- 2. Clinic ownership context for sub-accounts
-- -----------------------------------------------------

alter table public.doctors
  add column if not exists clinic_organization_id uuid;

alter table public.doctors
  add column if not exists clinic_doctor_relationship_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'doctors_clinic_organization_id_fkey'
      and conrelid = 'public.doctors'::regclass
  ) then
    alter table public.doctors
      add constraint doctors_clinic_organization_id_fkey
      foreign key (clinic_organization_id)
      references public.clinic_organizations(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'doctors_clinic_doctor_relationship_id_fkey'
      and conrelid = 'public.doctors'::regclass
  ) then
    alter table public.doctors
      add constraint doctors_clinic_doctor_relationship_id_fkey
      foreign key (clinic_doctor_relationship_id)
      references public.clinic_doctor_relationships(id)
      on delete set null;
  end if;
end $$;

comment on column public.doctors.clinic_organization_id is
  'For clinic_sub_account doctors, the clinic organization that commercially owns/pays for this doctor account.';

comment on column public.doctors.clinic_doctor_relationship_id is
  'For clinic_sub_account doctors, the invitation/relationship record that created this scoped doctor account.';

-- -----------------------------------------------------
-- 3. Helpful indexes
-- -----------------------------------------------------

create index if not exists idx_doctors_account_type
  on public.doctors(account_type);

create index if not exists idx_doctors_clinic_organization
  on public.doctors(clinic_organization_id);

create unique index if not exists uq_doctors_clinic_relationship
  on public.doctors(clinic_doctor_relationship_id)
  where clinic_doctor_relationship_id is not null;

-- -----------------------------------------------------
-- 4. Documentation only
-- -----------------------------------------------------

comment on table public.doctors is
  'Doctor public/profile records. Clinic-invited doctors may be represented as clinic_sub_account records scoped to a clinic organization, while independent doctors remain self-paid Stripe accounts.';
