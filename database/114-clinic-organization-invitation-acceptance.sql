-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 113B: Clinic Organisation invitation acceptance
--
-- Project path:
-- ROMDOC/database/114-clinic-organization-invitation-acceptance.sql
--
-- Requires:
-- ROMDOC/database/113-clinic-organization-invitations.sql
-- =====================================================

begin;

create or replace function public.accept_clinic_organization_invitation(
  p_invitation_id uuid,
  p_profile_id uuid,
  p_auth_user_id uuid,
  p_organization_id uuid,
  p_organization_slug text,
  p_email text
)
returns table (
  invitation_id uuid,
  organization_id uuid,
  trial_started_at timestamptz,
  trial_ends_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation_row public.clinic_organization_invitations%rowtype;
  profile_row public.profiles%rowtype;
  organization_row public.clinic_organizations%rowtype;
  resolved_organization_id uuid;
  trial_start timestamptz;
  trial_end timestamptz;
  normalized_email text := lower(btrim(p_email));
  resolved_contact_name text;
begin
  select *
  into invitation_row
  from public.clinic_organization_invitations
  where id = p_invitation_id
  for update;

  if invitation_row.id is null then
    raise exception 'Clinic Organisation invitation was not found.';
  end if;

  if invitation_row.status = 'accepted' then
    if invitation_row.accepted_profile_id <> p_profile_id then
      raise exception 'Clinic Organisation invitation has already been accepted by another account.';
    end if;

    return query
    select
      invitation_row.id,
      invitation_row.organization_id,
      invitation_row.trial_started_at,
      invitation_row.trial_ends_at;

    return;
  end if;

  if invitation_row.status <> 'sent' then
    raise exception 'Clinic Organisation invitation is not available for acceptance.';
  end if;

  if invitation_row.expires_at is not null
     and invitation_row.expires_at <= now() then
    raise exception 'Clinic Organisation invitation has expired.';
  end if;

  if lower(btrim(invitation_row.email)) <> normalized_email then
    raise exception 'Authenticated email does not match the Clinic Organisation invitation.';
  end if;

  if invitation_row.auth_user_id is not null
     and invitation_row.auth_user_id <> p_auth_user_id then
    raise exception 'Authenticated user does not match the invited user.';
  end if;

  if invitation_row.trial_months < 1
     or invitation_row.trial_months > 3 then
    raise exception 'Clinic Organisation trial duration is invalid.';
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
      account_status,
      created_at,
      updated_at
    )
    values (
      p_profile_id,
      'clinic_manager',
      invitation_row.first_name,
      invitation_row.last_name,
      'active',
      now(),
      now()
    );
  else
    if profile_row.account_status = 'blocked' then
      raise exception 'Blocked account cannot accept a Clinic Organisation invitation.';
    end if;

    if profile_row.role not in ('patient', 'user', 'clinic_manager') then
      raise exception 'This account role cannot accept a Clinic Organisation invitation.';
    end if;

    update public.profiles
    set
      role = 'clinic_manager',
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

  resolved_contact_name :=
    btrim(
      concat_ws(
        ' ',
        invitation_row.first_name,
        invitation_row.last_name
      )
    );

  resolved_organization_id := invitation_row.organization_id;

  if resolved_organization_id is null then
    if p_organization_id is null then
      raise exception 'Clinic Organisation id is required.';
    end if;

    if p_organization_slug is null
       or btrim(p_organization_slug) = '' then
      raise exception 'Clinic Organisation slug is required.';
    end if;

    insert into public.clinic_organizations (
      id,
      name,
      slug,
      status,
      contact_name,
      contact_email,
      contact_phone,
      created_by_profile_id,
      approved_by_profile_id,
      approved_at,
      created_at,
      updated_at
    )
    values (
      p_organization_id,
      invitation_row.organization_name,
      btrim(p_organization_slug),
      'active',
      nullif(resolved_contact_name, ''),
      normalized_email,
      nullif(btrim(invitation_row.phone), ''),
      invitation_row.invited_by_profile_id,
      invitation_row.invited_by_profile_id,
      now(),
      now(),
      now()
    );

    resolved_organization_id := p_organization_id;
  else
    select *
    into organization_row
    from public.clinic_organizations
    where id = resolved_organization_id
    for update;

    if organization_row.id is null then
      raise exception 'Linked Clinic Organisation was not found.';
    end if;

    if organization_row.status in ('suspended', 'rejected', 'archived') then
      raise exception 'Linked Clinic Organisation is not available for activation.';
    end if;

    update public.clinic_organizations
    set
      status = 'active',
      contact_name = coalesce(
        nullif(btrim(organization_row.contact_name), ''),
        nullif(resolved_contact_name, '')
      ),
      contact_email = coalesce(
        nullif(btrim(organization_row.contact_email), ''),
        normalized_email
      ),
      contact_phone = coalesce(
        nullif(btrim(organization_row.contact_phone), ''),
        nullif(btrim(invitation_row.phone), '')
      ),
      approved_by_profile_id = coalesce(
        organization_row.approved_by_profile_id,
        invitation_row.invited_by_profile_id
      ),
      approved_at = coalesce(
        organization_row.approved_at,
        now()
      ),
      updated_at = now()
    where id = resolved_organization_id;
  end if;

  insert into public.clinic_organization_members (
    organization_id,
    profile_id,
    member_role,
    status,
    invited_by_profile_id,
    created_at,
    updated_at
  )
  values (
    resolved_organization_id,
    p_profile_id,
    'owner',
    'active',
    invitation_row.invited_by_profile_id,
    now(),
    now()
  )
  on conflict (organization_id, profile_id)
  do update
  set
    member_role = 'owner',
    status = 'active',
    invited_by_profile_id = coalesce(
      public.clinic_organization_members.invited_by_profile_id,
      excluded.invited_by_profile_id
    ),
    updated_at = now();

  trial_start := now();
  trial_end :=
    trial_start
    + make_interval(
        months => invitation_row.trial_months
      );

  update public.clinic_organization_invitations
  set
    status = 'accepted',
    auth_user_id = p_auth_user_id,
    accepted_profile_id = p_profile_id,
    organization_id = resolved_organization_id,
    accepted_at = trial_start,
    trial_started_at = trial_start,
    trial_ends_at = trial_end,
    failure_code = null,
    failure_message = null,
    updated_at = now()
  where id = invitation_row.id;

  insert into public.clinic_organization_invitation_events (
    invitation_id,
    organization_id,
    actor_profile_id,
    event_type,
    event_data
  )
  values
  (
    invitation_row.id,
    resolved_organization_id,
    invitation_row.invited_by_profile_id,
    'organization_linked',
    jsonb_build_object(
      'organizationId',
      resolved_organization_id,
      'createdDuringAcceptance',
      invitation_row.organization_id is null
    )
  ),
  (
    invitation_row.id,
    resolved_organization_id,
    p_profile_id,
    'invitation_accepted',
    jsonb_build_object(
      'email',
      normalized_email
    )
  ),
  (
    invitation_row.id,
    resolved_organization_id,
    invitation_row.invited_by_profile_id,
    'trial_started',
    jsonb_build_object(
      'startsAt',
      trial_start,
      'endsAt',
      trial_end,
      'trialMonths',
      invitation_row.trial_months
    )
  );

  return query
  select
    invitation_row.id,
    resolved_organization_id,
    trial_start,
    trial_end;
end;
$$;

revoke all
on function public.accept_clinic_organization_invitation(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.accept_clinic_organization_invitation(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
)
to service_role;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  routine_name,
  security_type
from information_schema.routines
where
  routine_schema = 'public'
  and routine_name = 'accept_clinic_organization_invitation';

select
  grantee,
  privilege_type
from information_schema.routine_privileges
where
  routine_schema = 'public'
  and routine_name = 'accept_clinic_organization_invitation'
order by grantee, privilege_type;
