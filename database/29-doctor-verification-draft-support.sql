-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 60B: Allow incomplete verification drafts
--
-- File:
-- ROMDOC/database/29-doctor-verification-draft-support.sql
-- =====================================================

begin;

alter table public.doctor_verification_submissions
  alter column professional_registration_number drop not null,
  alter column issuing_authority drop not null;

alter table public.doctor_verification_submissions
  drop constraint if exists doctor_verification_registration_number_not_blank,
  drop constraint if exists doctor_verification_issuing_authority_not_blank;

alter table public.doctor_verification_submissions
  add constraint doctor_verification_registration_number_valid
  check (
    professional_registration_number is null
    or char_length(trim(professional_registration_number)) between 2 and 150
  ),
  add constraint doctor_verification_issuing_authority_valid
  check (
    issuing_authority is null
    or char_length(trim(issuing_authority)) between 2 and 250
  ),
  add constraint doctor_verification_required_fields_when_submitted
  check (
    status = 'draft'
    or (
      nullif(trim(professional_registration_number), '') is not null
      and nullif(trim(issuing_authority), '') is not null
    )
  );

commit;
