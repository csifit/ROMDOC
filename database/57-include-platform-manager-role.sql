-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Include Platform Manager Role
--
-- Project path:
-- ROMDOC/database/57-include-platform-manager-role.sql
--
-- Why:
--   The production database already has role = 'manager'.
--   This role is separate from clinic_manager:
--     - manager: platform support role invited by admin
--     - clinic_manager: clinic organization role
--
-- Keeps the role model simple:
--   admin          -> full platform control
--   manager        -> admin-invited platform support / invoicing help
--   doctor         -> doctor account
--   staff          -> doctor-invited appointment helper
--   clinic_manager -> clinic organization manager
--   patient        -> patient account
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
      'manager',
      'clinic_manager',
      'admin'
    )
  ) not valid;

alter table public.profiles
  validate constraint profiles_role_check;

comment on column public.profiles.role is
  'RomDoc application role: patient, doctor, doctor_applicant, staff, manager, clinic_manager, or admin.';
