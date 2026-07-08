-- =====================================================
-- ROMDOC DOCTOR BILLING PROFILES
-- File: ROMDOC/database/73-doctor-billing-profiles.sql
-- =====================================================

create table if not exists public.doctor_billing_profiles (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null unique references public.doctors(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null default 'srl',
  legal_name text not null default '',
  cui text,
  trade_registry_number text,
  vat_payer boolean not null default false,
  billing_address text,
  county text,
  city text,
  postal_code text,
  country text not null default 'Romania',
  billing_email text,
  accounting_contact_name text,
  accounting_contact_phone text,
  invoice_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_billing_profiles_entity_type_check check (
    entity_type in (
      'srl',
      'pfa',
      'ii',
      'cabinet_medical',
      'individual',
      'other'
    )
  ),
  constraint doctor_billing_profiles_legal_name_length_check check (
    char_length(legal_name) <= 240
  ),
  constraint doctor_billing_profiles_cui_length_check check (
    cui is null or char_length(cui) <= 40
  ),
  constraint doctor_billing_profiles_trade_registry_length_check check (
    trade_registry_number is null or char_length(trade_registry_number) <= 80
  ),
  constraint doctor_billing_profiles_billing_email_length_check check (
    billing_email is null or char_length(billing_email) <= 320
  )
);

create index if not exists idx_doctor_billing_profiles_profile_id
  on public.doctor_billing_profiles(profile_id);

create index if not exists idx_doctor_billing_profiles_cui
  on public.doctor_billing_profiles(cui)
  where cui is not null;

create or replace function public.set_doctor_billing_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_doctor_billing_profiles_updated_at
  on public.doctor_billing_profiles;

create trigger set_doctor_billing_profiles_updated_at
  before update on public.doctor_billing_profiles
  for each row
  execute function public.set_doctor_billing_profiles_updated_at();

alter table public.doctor_billing_profiles enable row level security;

revoke all on public.doctor_billing_profiles from anon;
revoke all on public.doctor_billing_profiles from authenticated;

grant select, insert, update on public.doctor_billing_profiles to authenticated;

drop policy if exists "Doctors can read their own billing profile"
  on public.doctor_billing_profiles;

create policy "Doctors can read their own billing profile"
  on public.doctor_billing_profiles
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

drop policy if exists "Doctors can insert their own billing profile"
  on public.doctor_billing_profiles;

create policy "Doctors can insert their own billing profile"
  on public.doctor_billing_profiles
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.doctors d
      where d.id = doctor_id
        and d.profile_id = auth.uid()
    )
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'doctor'
        and p.account_status = 'active'
    )
  );

drop policy if exists "Doctors can update their own billing profile"
  on public.doctor_billing_profiles;

create policy "Doctors can update their own billing profile"
  on public.doctor_billing_profiles
  for update
  to authenticated
  using (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.doctors d
      where d.id = doctor_id
        and d.profile_id = auth.uid()
    )
  )
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.doctors d
      where d.id = doctor_id
        and d.profile_id = auth.uid()
    )
  );

drop policy if exists "Admins and accounting managers can read doctor billing profiles"
  on public.doctor_billing_profiles;

create policy "Admins and accounting managers can read doctor billing profiles"
  on public.doctor_billing_profiles
  for select
  to authenticated
  using (public.can_manage_sms_billing(auth.uid()));
