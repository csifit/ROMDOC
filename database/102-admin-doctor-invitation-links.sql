-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Admin doctor invitation links
--
-- Target:
-- ROMDOC/database/102-admin-doctor-invitation-links.sql
-- =====================================================

begin;

alter table public.doctor_invitations
add column if not exists invitation_action_link text;

comment on column public.doctor_invitations.invitation_action_link is
  'Temporary Supabase invitation bearer link. Accessible only through protected service-role server code.';

alter table public.doctor_invitations
drop constraint if exists doctor_invitations_action_link_length_check;

alter table public.doctor_invitations
add constraint doctor_invitations_action_link_length_check
check (
  invitation_action_link is null
  or (
    char_length(invitation_action_link) between 20 and 4000
    and invitation_action_link like 'https://%'
  )
);

create or replace function public.clear_inactive_doctor_invitation_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('accepted', 'expired', 'cancelled', 'failed') then
    new.invitation_action_link := null;
  end if;

  return new;
end;
$$;

revoke all on function public.clear_inactive_doctor_invitation_link() from public;

drop trigger if exists clear_inactive_doctor_invitation_link
on public.doctor_invitations;

create trigger clear_inactive_doctor_invitation_link
before insert or update of status
on public.doctor_invitations
for each row
execute function public.clear_inactive_doctor_invitation_link();

-- Existing accepted/expired/cancelled/failed records must not retain links.
update public.doctor_invitations
set invitation_action_link = null
where status in ('accepted', 'expired', 'cancelled', 'failed')
  and invitation_action_link is not null;

commit;

-- Verification
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'doctor_invitations'
  and column_name = 'invitation_action_link';

select
  trigger_name,
  event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'doctor_invitations'
  and trigger_name = 'clear_inactive_doctor_invitation_link';
