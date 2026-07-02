-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 72C: Doctor invitation acceptance
--
-- File:
-- ROMDOC/database/59-doctor-invitation-acceptance.sql
-- =====================================================

begin;

create or replace function public.accept_doctor_invitation(
  p_invitation_id uuid,
  p_profile_id uuid,
  p_auth_user_id uuid,
  p_doctor_id uuid,
  p_doctor_slug text,
  p_email text
)
returns table (
  invitation_id uuid,
  doctor_id uuid,
  access_grant_id uuid,
  access_starts_at timestamptz,
  access_ends_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation_row public.doctor_invitations%rowtype;
  profile_row public.profiles%rowtype;
  existing_doctor_id uuid;
  created_grant_id uuid;
  grant_start timestamptz := now();
  grant_end timestamptz;
begin
  select *
  into invitation_row
  from public.doctor_invitations
  where id = p_invitation_id
  for update;

  if invitation_row.id is null then
    raise exception 'Doctor invitation was not found.';
  end if;

  if invitation_row.status = 'accepted' then
    if invitation_row.accepted_profile_id <> p_profile_id then
      raise exception 'Doctor invitation has already been accepted by another account.';
    end if;

    select dag.id, dag.starts_at, dag.ends_at
    into created_grant_id, grant_start, grant_end
    from public.doctor_access_grants dag
    where dag.invitation_id = invitation_row.id
    limit 1;

    return query
    select
      invitation_row.id,
      invitation_row.doctor_id,
      created_grant_id,
      grant_start,
      grant_end;

    return;
  end if;

  if invitation_row.status <> 'sent' then
    raise exception 'Doctor invitation is not available for acceptance.';
  end if;

  if invitation_row.expires_at is not null
     and invitation_row.expires_at <= now() then
    update public.doctor_invitations
    set
      status = 'expired',
      updated_at = now()
    where id = invitation_row.id;

    insert into public.doctor_invitation_events (
      invitation_id,
      actor_profile_id,
      event_type,
      event_data
    )
    values (
      invitation_row.id,
      p_profile_id,
      'invitation_expired',
      jsonb_build_object(
        'expiredAt',
        invitation_row.expires_at
      )
    );

    raise exception 'Doctor invitation has expired.';
  end if;

  if lower(btrim(invitation_row.email)) <> lower(btrim(p_email)) then
    raise exception 'Authenticated email does not match the doctor invitation.';
  end if;

  if invitation_row.auth_user_id is not null
     and invitation_row.auth_user_id <> p_auth_user_id then
    raise exception 'Authenticated user does not match the invited user.';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = p_profile_id
  for update;

  if profile_row.id is null then
    insert into public.profiles (
      id,
      role,
      first_name,
      last_name,
      created_at,
      updated_at
    )
    values (
      p_profile_id,
      'doctor',
      invitation_row.first_name,
      invitation_row.last_name,
      now(),
      now()
    );
  else
    if profile_row.role in ('admin', 'manager', 'staff') then
      raise exception 'This account role cannot accept a doctor invitation.';
    end if;

    update public.profiles
    set
      role = 'doctor',
      first_name = coalesce(
        nullif(btrim(first_name), ''),
        invitation_row.first_name
      ),
      last_name = coalesce(
        nullif(btrim(last_name), ''),
        invitation_row.last_name
      ),
      account_status = 'active',
      updated_at = now()
    where id = p_profile_id;
  end if;

  select d.id
  into existing_doctor_id
  from public.doctors d
  where d.profile_id = p_profile_id
  limit 1;

  if existing_doctor_id is null then
    insert into public.doctors (
      id,
      profile_id,
      slug,
      email,
      status,
      created_at,
      updated_at
    )
    values (
      p_doctor_id,
      p_profile_id,
      p_doctor_slug,
      lower(btrim(p_email)),
      'active',
      now(),
      now()
    );

    existing_doctor_id := p_doctor_id;

    insert into public.doctor_translations (
      doctor_id,
      locale,
      title
    )
    values (
      existing_doctor_id,
      'ro',
      'Medic'
    )
    on conflict (doctor_id, locale)
    do nothing;
  else
    update public.doctors
    set
      email = lower(btrim(p_email)),
      status = 'active',
      updated_at = now()
    where id = existing_doctor_id;
  end if;

  grant_end :=
    grant_start
    + make_interval(
        months => invitation_row.complimentary_months
      );

  insert into public.doctor_access_grants (
    doctor_id,
    invitation_id,
    grant_type,
    status,
    starts_at,
    ends_at,
    granted_by_profile_id,
    reason,
    created_at,
    updated_at
  )
  values (
    existing_doctor_id,
    invitation_row.id,
    'admin_complimentary',
    'active',
    grant_start,
    grant_end,
    invitation_row.invited_by_profile_id,
    'Complimentary access granted through administrator doctor invitation.',
    now(),
    now()
  )
  on conflict (
    invitation_id
  )
  where invitation_id is not null
  do update
  set
    doctor_id = excluded.doctor_id,
    status = 'active',
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    updated_at = now()
  returning id
  into created_grant_id;

  update public.doctor_invitations
  set
    status = 'accepted',
    auth_user_id = p_auth_user_id,
    accepted_profile_id = p_profile_id,
    doctor_id = existing_doctor_id,
    accepted_at = now(),
    failure_code = null,
    failure_message = null,
    updated_at = now()
  where id = invitation_row.id;

  insert into public.doctor_invitation_events (
    invitation_id,
    access_grant_id,
    doctor_id,
    actor_profile_id,
    event_type,
    event_data
  )
  values
  (
    invitation_row.id,
    created_grant_id,
    existing_doctor_id,
    p_profile_id,
    'invitation_accepted',
    jsonb_build_object(
      'email',
      lower(btrim(p_email))
    )
  ),
  (
    invitation_row.id,
    created_grant_id,
    existing_doctor_id,
    invitation_row.invited_by_profile_id,
    'complimentary_access_activated',
    jsonb_build_object(
      'startsAt',
      grant_start,
      'endsAt',
      grant_end,
      'complimentaryMonths',
      invitation_row.complimentary_months
    )
  );

  return query
  select
    invitation_row.id,
    existing_doctor_id,
    created_grant_id,
    grant_start,
    grant_end;
end;
$$;

revoke all
on function public.accept_doctor_invitation(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.accept_doctor_invitation(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
)
to service_role;

commit;
