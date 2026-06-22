-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 60C: Admin professional verification review workflow
--
-- File:
-- ROMDOC/database/30-admin-verification-review.sql
--
-- Adds:
--   - atomic admin review function
--   - synchronized submission and public doctor status
--   - optional private admin review note
-- =====================================================

begin;

create or replace function public.admin_review_doctor_verification(
  target_submission_id uuid,
  review_action text,
  review_reason text default null,
  private_note text default null
)
returns public.doctor_verification_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid;
  current_submission public.doctor_verification_submissions;
  updated_submission public.doctor_verification_submissions;
  normalized_reason text;
  normalized_note text;
begin
  current_profile_id := auth.uid();

  if current_profile_id is null or not public.is_admin() then
    raise exception 'administrator_permission_required'
      using errcode = '42501';
  end if;

  normalized_reason := nullif(trim(coalesce(review_reason, '')), '');
  normalized_note := nullif(trim(coalesce(private_note, '')), '');

  if review_action not in (
    'start_review',
    'approve',
    'reject',
    'mark_expired'
  ) then
    raise exception 'invalid_review_action'
      using errcode = '22023';
  end if;

  select submission.*
  into current_submission
  from public.doctor_verification_submissions as submission
  where submission.id = target_submission_id
  for update;

  if not found then
    raise exception 'verification_submission_not_found'
      using errcode = 'P0002';
  end if;

  if review_action = 'start_review' then
    if current_submission.status <> 'submitted' then
      raise exception 'submission_cannot_enter_review'
        using errcode = '22023';
    end if;

    update public.doctor_verification_submissions
    set
      status = 'under_review',
      reviewed_at = null,
      reviewed_by_profile_id = current_profile_id,
      rejection_reason = null
    where id = target_submission_id
    returning *
    into updated_submission;

    update public.doctors
    set
      verification_status = 'pending',
      professional_registration_number =
        current_submission.professional_registration_number,
      verification_expires_at =
        current_submission.registration_expires_at
    where id = current_submission.doctor_id;

  elsif review_action = 'approve' then
    if current_submission.status not in (
      'submitted',
      'under_review'
    ) then
      raise exception 'submission_cannot_be_approved'
        using errcode = '22023';
    end if;

    update public.doctor_verification_submissions
    set
      status = 'verified',
      reviewed_at = now(),
      reviewed_by_profile_id = current_profile_id,
      rejection_reason = null
    where id = target_submission_id
    returning *
    into updated_submission;

    update public.doctors
    set
      verification_status = 'verified',
      professional_registration_number =
        current_submission.professional_registration_number,
      verified_at = now(),
      verified_by_profile_id = current_profile_id,
      verification_expires_at =
        current_submission.registration_expires_at
    where id = current_submission.doctor_id;

  elsif review_action = 'reject' then
    if current_submission.status not in (
      'submitted',
      'under_review'
    ) then
      raise exception 'submission_cannot_be_rejected'
        using errcode = '22023';
    end if;

    if normalized_reason is null then
      raise exception 'rejection_reason_required'
        using errcode = '23514';
    end if;

    if char_length(normalized_reason) > 2000 then
      raise exception 'rejection_reason_too_long'
        using errcode = '22001';
    end if;

    update public.doctor_verification_submissions
    set
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by_profile_id = current_profile_id,
      rejection_reason = normalized_reason
    where id = target_submission_id
    returning *
    into updated_submission;

    update public.doctors
    set
      verification_status = 'rejected',
      verified_at = null,
      verified_by_profile_id = null,
      verification_expires_at =
        current_submission.registration_expires_at
    where id = current_submission.doctor_id;

  else
    if current_submission.status <> 'verified' then
      raise exception 'only_verified_submission_can_expire'
        using errcode = '22023';
    end if;

    update public.doctor_verification_submissions
    set
      status = 'expired',
      reviewed_at = now(),
      reviewed_by_profile_id = current_profile_id
    where id = target_submission_id
    returning *
    into updated_submission;

    update public.doctors
    set
      verification_status = 'expired',
      verified_at = null,
      verified_by_profile_id = null
    where id = current_submission.doctor_id;
  end if;

  if normalized_note is not null then
    if char_length(normalized_note) > 5000 then
      raise exception 'admin_note_too_long'
        using errcode = '22001';
    end if;

    insert into public.doctor_verification_admin_notes (
      submission_id,
      author_profile_id,
      note
    )
    values (
      target_submission_id,
      current_profile_id,
      normalized_note
    );
  end if;

  return updated_submission;
end;
$$;

revoke all
on function public.admin_review_doctor_verification(
  uuid,
  text,
  text,
  text
)
from public;

grant execute
on function public.admin_review_doctor_verification(
  uuid,
  text,
  text,
  text
)
to authenticated;

comment on function public.admin_review_doctor_verification(
  uuid,
  text,
  text,
  text
) is
  'Atomically reviews a doctor verification submission and synchronizes the public doctors verification summary. Admin only.';

commit;
