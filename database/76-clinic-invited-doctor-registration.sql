-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Clinic Invited Doctor Registration
--
-- Project path:
-- ROMDOC/database/76-clinic-invited-doctor-registration.sql
--
-- Why:
--   A clinic-invited doctor should not need to pay Stripe first.
--   The clinic invitation must be able to attach to the doctor account
--   while the doctor account is being created.
--
-- Business rule:
--   - Clinic Manager invites doctor.
--   - Doctor creates account through invite link.
--   - Clinic is responsible for payment.
--   - Admin does not approve each clinic invitation.
--   - Admin may still view billing/SMS/subscription status globally.
-- =====================================================

alter table public.clinic_doctor_relationships
  add column if not exists accepted_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.clinic_doctor_relationships
  add column if not exists accepted_account_email text;

comment on column public.clinic_doctor_relationships.accepted_profile_id is
  'Profile created or used by the invited doctor when accepting/registering through a clinic invitation. This can exist before the doctor profile record is fully created.';

comment on column public.clinic_doctor_relationships.accepted_account_email is
  'Normalized e-mail address of the account that accepted the clinic invitation.';

create index if not exists idx_clinic_doctor_relationships_accepted_profile
  on public.clinic_doctor_relationships(accepted_profile_id);

create index if not exists idx_clinic_doctor_relationships_accepted_email
  on public.clinic_doctor_relationships(lower(accepted_account_email));
