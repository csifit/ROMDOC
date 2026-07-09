-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Clinic Manager Organizations
--
-- Project path:
-- ROMDOC/database/56-clinic-manager-organizations.sql
--
-- Adds:
--   - clinic_manager profile role
--   - clinic organizations
--   - clinic organization billing profiles
--   - clinic organization members
--   - clinic-to-organization links
--   - clinic doctor invitation and coverage records
--   - basic helper functions and RLS policies
--
-- Note:
--   The profiles_role_check constraint is added as NOT VALID
--   because existing production databases may contain legacy role
--   values. New or updated rows must still use the allowed role list.
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- PROFILE ROLE: clinic_manager
-- =====================================================

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'patient',
      'doctor',
      'doctor_applicant',
      'staff',
      'clinic_manager',
      'admin'
    )
  ) not valid;

comment on column public.profiles.role is
  'RomDoc application role: patient, doctor, doctor_applicant, staff, clinic_manager, or admin. Constraint is NOT VALID to preserve possible legacy role rows until they are cleaned.';

-- =====================================================
-- CLINIC ORGANIZATIONS
-- =====================================================

create table if not exists public.clinic_organizations (
  id uuid primary key default gen_random_uuid(),

  name text not null
    check (char_length(trim(name)) >= 2),

  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'active',
        'suspended',
        'rejected',
        'archived'
      )
    ),

  contact_name text,
  contact_email text,
  contact_phone text,
  website text,

  admin_notes text,
  rejection_reason text,

  created_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  approved_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  approved_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clinic_organizations is
  'Business-level clinic or clinic group account managed by one or more clinic managers.';

comment on column public.clinic_organizations.status is
  'pending = awaiting RomDoc review; active = approved; suspended/rejected/archived are controlled by admin.';

-- =====================================================
-- CLINIC ORGANIZATION BILLING PROFILES
-- =====================================================

create table if not exists public.clinic_organization_billing_profiles (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null unique
    references public.clinic_organizations(id)
    on delete cascade,

  company_name text not null
    check (char_length(trim(company_name)) >= 2),

  tax_id text not null
    check (char_length(trim(tax_id)) >= 2),

  trade_register_number text,

  billing_address text not null
    check (char_length(trim(billing_address)) >= 5),

  billing_city text not null
    check (char_length(trim(billing_city)) >= 2),

  billing_county text not null
    check (char_length(trim(billing_county)) >= 2),

  billing_country text not null default 'România',

  billing_email text not null
    check (position('@' in billing_email) > 1),

  is_vat_payer boolean not null default false,
  vat_number text,

  created_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  updated_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clinic_organization_billing_profiles is
  'Billing identity used for manual clinic invoices and future cumulative clinic billing.';

-- =====================================================
-- CLINIC ORGANIZATION MEMBERS
-- =====================================================

create table if not exists public.clinic_organization_members (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.clinic_organizations(id)
    on delete cascade,

  profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  member_role text not null default 'manager'
    check (
      member_role in (
        'owner',
        'manager',
        'billing_manager'
      )
    ),

  status text not null default 'active'
    check (
      status in (
        'pending',
        'active',
        'suspended',
        'removed'
      )
    ),

  invited_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, profile_id)
);

comment on table public.clinic_organization_members is
  'Links clinic_manager profiles to clinic organizations.';

-- =====================================================
-- CLINIC ORGANIZATION CLINICS
-- =====================================================

create table if not exists public.clinic_organization_clinics (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.clinic_organizations(id)
    on delete cascade,

  clinic_id uuid not null
    references public.clinics(id)
    on delete cascade,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'active',
        'removed'
      )
    ),

  approved_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, clinic_id)
);

comment on table public.clinic_organization_clinics is
  'Links approved clinic records to clinic business organizations.';

-- =====================================================
-- CLINIC DOCTOR RELATIONSHIPS
-- =====================================================

create table if not exists public.clinic_doctor_relationships (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.clinic_organizations(id)
    on delete cascade,

  clinic_id uuid
    references public.clinics(id)
    on delete set null,

  doctor_id uuid
    references public.doctors(id)
    on delete set null,

  invited_doctor_email text,
  invitation_token_hash text,

  invitation_status text not null default 'pending'
    check (
      invitation_status in (
        'pending',
        'accepted',
        'declined',
        'expired',
        'cancelled'
      )
    ),

  payment_responsibility text not null default 'clinic_paid'
    check (
      payment_responsibility in (
        'self_paid',
        'clinic_paid'
      )
    ),

  coverage_status text not null default 'pending_admin_approval'
    check (
      coverage_status in (
        'none',
        'pending_admin_approval',
        'active',
        'paused',
        'cancelled',
        'ended'
      )
    ),

  invited_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  accepted_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz,

  coverage_started_at timestamptz,
  coverage_ended_at timestamptz,

  approved_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  approved_at timestamptz,
  paused_at timestamptz,
  pause_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    doctor_id is not null
    or invited_doctor_email is not null
  )
);

comment on table public.clinic_doctor_relationships is
  'Tracks clinic invitations, payment responsibility, and admin-approved clinic coverage for doctors.';

comment on column public.clinic_doctor_relationships.coverage_status is
  'Controls whether a clinic-paid doctor is actively covered, pending admin approval, paused, cancelled, or ended.';

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists idx_clinic_organizations_status
  on public.clinic_organizations(status);

create index if not exists idx_clinic_organizations_created_by
  on public.clinic_organizations(created_by_profile_id);

create index if not exists idx_clinic_org_billing_org
  on public.clinic_organization_billing_profiles(organization_id);

create index if not exists idx_clinic_org_members_profile
  on public.clinic_organization_members(profile_id);

create index if not exists idx_clinic_org_members_org_status
  on public.clinic_organization_members(organization_id, status);

create index if not exists idx_clinic_org_clinics_clinic
  on public.clinic_organization_clinics(clinic_id);

create index if not exists idx_clinic_org_clinics_org_status
  on public.clinic_organization_clinics(organization_id, status);

create index if not exists idx_clinic_doctor_relationships_org
  on public.clinic_doctor_relationships(organization_id);

create index if not exists idx_clinic_doctor_relationships_doctor
  on public.clinic_doctor_relationships(doctor_id);

create index if not exists idx_clinic_doctor_relationships_clinic
  on public.clinic_doctor_relationships(clinic_id);

create index if not exists idx_clinic_doctor_relationships_invited_email
  on public.clinic_doctor_relationships(lower(invited_doctor_email));

create index if not exists idx_clinic_doctor_relationships_coverage
  on public.clinic_doctor_relationships(payment_responsibility, coverage_status);

create unique index if not exists uq_clinic_doctor_relationships_org_clinic_doctor
  on public.clinic_doctor_relationships(organization_id, clinic_id, doctor_id)
  where doctor_id is not null
    and clinic_id is not null;

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

drop trigger if exists trg_clinic_organizations_updated_at
  on public.clinic_organizations;

create trigger trg_clinic_organizations_updated_at
before update on public.clinic_organizations
for each row
execute function public.handle_updated_at();

drop trigger if exists trg_clinic_org_billing_updated_at
  on public.clinic_organization_billing_profiles;

create trigger trg_clinic_org_billing_updated_at
before update on public.clinic_organization_billing_profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists trg_clinic_org_members_updated_at
  on public.clinic_organization_members;

create trigger trg_clinic_org_members_updated_at
before update on public.clinic_organization_members
for each row
execute function public.handle_updated_at();

drop trigger if exists trg_clinic_org_clinics_updated_at
  on public.clinic_organization_clinics;

create trigger trg_clinic_org_clinics_updated_at
before update on public.clinic_organization_clinics
for each row
execute function public.handle_updated_at();

drop trigger if exists trg_clinic_doctor_relationships_updated_at
  on public.clinic_doctor_relationships;

create trigger trg_clinic_doctor_relationships_updated_at
before update on public.clinic_doctor_relationships
for each row
execute function public.handle_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

create or replace function public.is_clinic_organization_member(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_organization_members member
    join public.profiles profile
      on profile.id = member.profile_id
    where member.organization_id = target_organization_id
      and member.profile_id = auth.uid()
      and member.status = 'active'
      and profile.role in ('clinic_manager', 'admin')
  );
$$;

create or replace function public.is_clinic_organization_billing_manager(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_organization_members member
    join public.profiles profile
      on profile.id = member.profile_id
    where member.organization_id = target_organization_id
      and member.profile_id = auth.uid()
      and member.status = 'active'
      and member.member_role in ('owner', 'billing_manager')
      and profile.role in ('clinic_manager', 'admin')
  );
$$;

-- =====================================================
-- RLS
-- =====================================================

alter table public.clinic_organizations
  enable row level security;

alter table public.clinic_organization_billing_profiles
  enable row level security;

alter table public.clinic_organization_members
  enable row level security;

alter table public.clinic_organization_clinics
  enable row level security;

alter table public.clinic_doctor_relationships
  enable row level security;

-- Cleanup for safe re-run.

drop policy if exists "admin_all_clinic_organizations"
  on public.clinic_organizations;

drop policy if exists "clinic_org_members_select_organizations"
  on public.clinic_organizations;

drop policy if exists "admin_all_clinic_org_billing_profiles"
  on public.clinic_organization_billing_profiles;

drop policy if exists "clinic_org_members_select_billing_profiles"
  on public.clinic_organization_billing_profiles;

drop policy if exists "clinic_org_billing_managers_update_billing_profiles"
  on public.clinic_organization_billing_profiles;

drop policy if exists "admin_all_clinic_org_members"
  on public.clinic_organization_members;

drop policy if exists "clinic_org_members_select_members"
  on public.clinic_organization_members;

drop policy if exists "admin_all_clinic_org_clinics"
  on public.clinic_organization_clinics;

drop policy if exists "clinic_org_members_select_clinics"
  on public.clinic_organization_clinics;

drop policy if exists "admin_all_clinic_doctor_relationships"
  on public.clinic_doctor_relationships;

drop policy if exists "clinic_org_members_select_doctor_relationships"
  on public.clinic_doctor_relationships;

-- Admin policies.

create policy "admin_all_clinic_organizations"
on public.clinic_organizations
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin_all_clinic_org_billing_profiles"
on public.clinic_organization_billing_profiles
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin_all_clinic_org_members"
on public.clinic_organization_members
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin_all_clinic_org_clinics"
on public.clinic_organization_clinics
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin_all_clinic_doctor_relationships"
on public.clinic_doctor_relationships
for all
using (public.is_admin())
with check (public.is_admin());

-- Clinic manager read policies.

create policy "clinic_org_members_select_organizations"
on public.clinic_organizations
for select
using (
  public.is_clinic_organization_member(id)
);

create policy "clinic_org_members_select_billing_profiles"
on public.clinic_organization_billing_profiles
for select
using (
  public.is_clinic_organization_member(organization_id)
);

create policy "clinic_org_billing_managers_update_billing_profiles"
on public.clinic_organization_billing_profiles
for update
using (
  public.is_clinic_organization_billing_manager(organization_id)
)
with check (
  public.is_clinic_organization_billing_manager(organization_id)
);

create policy "clinic_org_members_select_members"
on public.clinic_organization_members
for select
using (
  public.is_clinic_organization_member(organization_id)
);

create policy "clinic_org_members_select_clinics"
on public.clinic_organization_clinics
for select
using (
  public.is_clinic_organization_member(organization_id)
);

create policy "clinic_org_members_select_doctor_relationships"
on public.clinic_doctor_relationships
for select
using (
  public.is_clinic_organization_member(organization_id)
);

-- Grants. RLS still controls row-level access.

grant select, insert, update, delete
  on public.clinic_organizations
  to authenticated;

grant select, insert, update, delete
  on public.clinic_organization_billing_profiles
  to authenticated;

grant select, insert, update, delete
  on public.clinic_organization_members
  to authenticated;

grant select, insert, update, delete
  on public.clinic_organization_clinics
  to authenticated;

grant select, insert, update, delete
  on public.clinic_doctor_relationships
  to authenticated;

grant execute on function public.is_clinic_organization_member(uuid)
  to authenticated;

grant execute on function public.is_clinic_organization_billing_manager(uuid)
  to authenticated;
