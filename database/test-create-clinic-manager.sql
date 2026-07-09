-- =====================================================
-- ROMDOC TEST DATA SCRIPT
-- Create Test Clinic Manager
--
-- Project path:
-- ROMDOC/database/test-create-clinic-manager.sql
--
-- This is NOT a migration.
-- Do not use this file in production migrations.
--
-- Purpose:
--   Creates/updates one test clinic_manager profile and links it to
--   a test clinic organization with billing details, so the new
--   /clinic-manager-dashboard pages can be tested.
--
-- Before running:
--   1. Go to Supabase Dashboard -> Authentication -> Users.
--   2. Create a user with this e-mail:
--        test.clinic.manager@romdoc.fit
--   3. Set a temporary password.
--   4. Enable Auto Confirm User / Email Confirmed if available.
--   5. Then run this SQL file in Supabase SQL Editor.
--
-- After testing:
--   You may delete the test user from Supabase Auth and remove
--   the related organization records if desired.
-- =====================================================

do $$
declare
  test_email constant text := 'test.clinic.manager@romdoc.fit';
  test_profile_id uuid;
  test_organization_id uuid;
begin
  select id
  into test_profile_id
  from auth.users
  where lower(email) = lower(test_email)
  limit 1;

  if test_profile_id is null then
    raise exception 'Auth user with e-mail % was not found. Create it in Supabase Authentication -> Users first.', test_email;
  end if;

  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    account_status
  )
  values (
    test_profile_id,
    'clinic_manager',
    'Test',
    'Clinic Manager',
    'active'
  )
  on conflict (id)
  do update set
    role = excluded.role,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    account_status = excluded.account_status,
    updated_at = now();

  insert into public.clinic_organizations (
    name,
    slug,
    status,
    contact_name,
    contact_email,
    contact_phone,
    website,
    admin_notes,
    created_by_profile_id,
    approved_by_profile_id,
    approved_at
  )
  values (
    'Clinica Test RomDoc',
    'clinica-test-romdoc',
    'active',
    'Test Clinic Manager',
    test_email,
    '+40700000000',
    'https://www.romdoc.fit',
    'Test organization created for Clinic Manager dashboard testing.',
    test_profile_id,
    test_profile_id,
    now()
  )
  on conflict (slug)
  do update set
    name = excluded.name,
    status = excluded.status,
    contact_name = excluded.contact_name,
    contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone,
    website = excluded.website,
    admin_notes = excluded.admin_notes,
    approved_by_profile_id = excluded.approved_by_profile_id,
    approved_at = excluded.approved_at,
    updated_at = now()
  returning id
  into test_organization_id;

  insert into public.clinic_organization_billing_profiles (
    organization_id,
    company_name,
    tax_id,
    trade_register_number,
    billing_address,
    billing_city,
    billing_county,
    billing_country,
    billing_email,
    is_vat_payer,
    vat_number,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    test_organization_id,
    'Clinica Test RomDoc SRL',
    'RO12345678',
    'J02/1234/2026',
    'Strada Test 1',
    'Arad',
    'Arad',
    'România',
    test_email,
    true,
    'RO12345678',
    test_profile_id,
    test_profile_id
  )
  on conflict (organization_id)
  do update set
    company_name = excluded.company_name,
    tax_id = excluded.tax_id,
    trade_register_number = excluded.trade_register_number,
    billing_address = excluded.billing_address,
    billing_city = excluded.billing_city,
    billing_county = excluded.billing_county,
    billing_country = excluded.billing_country,
    billing_email = excluded.billing_email,
    is_vat_payer = excluded.is_vat_payer,
    vat_number = excluded.vat_number,
    updated_by_profile_id = excluded.updated_by_profile_id,
    updated_at = now();

  insert into public.clinic_organization_members (
    organization_id,
    profile_id,
    member_role,
    status,
    invited_by_profile_id
  )
  values (
    test_organization_id,
    test_profile_id,
    'owner',
    'active',
    test_profile_id
  )
  on conflict (organization_id, profile_id)
  do update set
    member_role = excluded.member_role,
    status = excluded.status,
    invited_by_profile_id = excluded.invited_by_profile_id,
    updated_at = now();

  raise notice 'Test clinic manager is ready: %, organization id: %', test_email, test_organization_id;
end $$;

-- Verification query
select
  p.id,
  au.email,
  p.role,
  p.account_status,
  o.name as organization_name,
  o.status as organization_status,
  m.member_role,
  m.status as membership_status,
  b.company_name,
  b.billing_email
from public.profiles p
join auth.users au
  on au.id = p.id
left join public.clinic_organization_members m
  on m.profile_id = p.id
left join public.clinic_organizations o
  on o.id = m.organization_id
left join public.clinic_organization_billing_profiles b
  on b.organization_id = o.id
where lower(au.email) = lower('test.clinic.manager@romdoc.fit');
