-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Doctor invitation resend tracking
--
-- Target:
-- ROMDOC/database/103-doctor-invitation-resends.sql
-- =====================================================

begin;

alter table public.doctor_invitations
add column if not exists resend_count integer not null default 0;

alter table public.doctor_invitations
add column if not exists last_resent_at timestamptz;

alter table public.doctor_invitations
add column if not exists last_resend_failure_at timestamptz;

alter table public.doctor_invitations
add column if not exists last_resend_failure_code text;

alter table public.doctor_invitations
add column if not exists last_resend_failure_message text;

alter table public.doctor_invitations
drop constraint if exists doctor_invitations_resend_count_check;

alter table public.doctor_invitations
add constraint doctor_invitations_resend_count_check
check (resend_count >= 0);

alter table public.doctor_invitations
drop constraint if exists doctor_invitations_resend_failure_code_length_check;

alter table public.doctor_invitations
add constraint doctor_invitations_resend_failure_code_length_check
check (
  last_resend_failure_code is null
  or char_length(last_resend_failure_code) <= 100
);

alter table public.doctor_invitations
drop constraint if exists doctor_invitations_resend_failure_message_length_check;

alter table public.doctor_invitations
add constraint doctor_invitations_resend_failure_message_length_check
check (
  last_resend_failure_message is null
  or char_length(last_resend_failure_message) <= 500
);

comment on column public.doctor_invitations.resend_count is
  'Number of successful administrator resend operations after the initial invitation email.';

comment on column public.doctor_invitations.last_resent_at is
  'Time of the most recent successful invitation resend.';

comment on column public.doctor_invitations.last_resend_failure_at is
  'Time of the most recent failed resend attempt. A failed resend does not invalidate an existing invitation.';

comment on column public.doctor_invitations.last_resend_failure_code is
  'Safe application/provider code for the most recent failed resend attempt.';

comment on column public.doctor_invitations.last_resend_failure_message is
  'Safe summary of the most recent failed resend attempt.';

commit;

-- Verification
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'doctor_invitations'
  and column_name in (
    'resend_count',
    'last_resent_at',
    'last_resend_failure_at',
    'last_resend_failure_code',
    'last_resend_failure_message'
  )
order by ordinal_position;
