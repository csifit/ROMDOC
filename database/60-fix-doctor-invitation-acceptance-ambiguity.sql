-- ROMDOC/database/60-fix-doctor-invitation-acceptance-ambiguity.sql
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
as $function$
#variable_conflict use_column

declare
  v_invitation public.doctor_invitations%rowtype;
  v_profile public.profiles%rowtype;
  v_existing_doctor_id uuid;
  v_access_grant_id uuid;
  v_grant_start timestamptz := now();
  v_grant_end timestamptz;
begin
  select di.*
  into v_invitation
  from public.doctor_invitations as di
  where di.id = p_invitation_id
  for update;

  if v_invitation.id is null then
    raise exception 'Doctor invitation was not found.';
  end if;

  if v_invitation.status = 'accepted' then
    if v_invitation.accepted_profile_id <> p_profile_id then
      raise exception 'Doctor invitation has already been accepted by another account.';
    end if;

    select dag.id, dag.starts_at, dag.ends_at
    into v_access_grant_id, v_grant_start, v_grant_end
    from public.doctor_access_grants as dag
    where dag.invitation_id = v_invitation.id
    order by dag.created_at desc
    limit 1;

    return query
    select v_invitation.id, v_invitation.doctor_id, v_access_grant_id, v_grant_start, v_grant_end;
    return;
  end if;

  if v_invitation.status <> 'sent' then
    raise exception 'Doctor invitation is not available for acceptance.';
  end if;

  if v_invitation.expires_at is not null and v_invitation.expires_at <= now() then
    update public.doctor_invitations as di
    set status = 'expired', updated_at = now()
    where di.id = v_invitation.id;

    insert into public.doctor_invitation_events (
      invitation_id, actor_profile_id, event_type, event_data
    ) values (
      v_invitation.id,
      p_profile_id,
      'invitation_expired',
      jsonb_build_object('expiredAt', v_invitation.expires_at)
    );

    raise exception 'Doctor invitation has expired.';
  end if;

  if lower(btrim(v_invitation.email)) <> lower(btrim(p_email)) then
    raise exception 'Authenticated email does not match the doctor invitation.';
  end if;

  if v_invitation.auth_user_id is not null and v_invitation.auth_user_id <> p_auth_user_id then
    raise exception 'Authenticated user does not match the invited user.';
  end if;

  select p.*
  into v_profile
  from public.profiles as p
  where p.id = p_profile_id
  for update;

  if v_profile.id is null then
    insert into public.profiles (
      id, role, first_name, last_name, account_status, created_at, updated_at
    ) values (
      p_profile_id,
      'doctor',
      v_invitation.first_name,
      v_invitation.last_name,
      'active',
      now(),
      now()
    );
  else
    if v_profile.role in ('admin', 'manager', 'staff') then
      raise exception 'This account role cannot accept a doctor invitation.';
    end if;

    update public.profiles as p
    set
      role = 'doctor',
      first_name = coalesce(nullif(btrim(p.first_name), ''), v_invitation.first_name),
      last_name = coalesce(nullif(btrim(p.last_name), ''), v_invitation.last_name),
      account_status = 'active',
      updated_at = now()
    where p.id = p_profile_id;
  end if;

  select d.id
  into v_existing_doctor_id
  from public.doctors as d
  where d.profile_id = p_profile_id
  limit 1;

  if v_existing_doctor_id is null then
    insert into public.doctors (
      id, profile_id, slug, email, status, created_at, updated_at
    ) values (
      p_doctor_id,
      p_profile_id,
      p_doctor_slug,
      lower(btrim(p_email)),
      'active',
      now(),
      now()
    );

    v_existing_doctor_id := p_doctor_id;

    insert into public.doctor_translations (
      doctor_id, locale, title
    ) values (
      v_existing_doctor_id, 'ro', 'Medic'
    )
    on conflict (doctor_id, locale) do nothing;
  else
    update public.doctors as d
    set
      email = lower(btrim(p_email)),
      status = 'active',
      updated_at = now()
    where d.id = v_existing_doctor_id;
  end if;

  v_grant_end := v_grant_start + make_interval(months => v_invitation.complimentary_months);

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
  ) values (
    v_existing_doctor_id,
    v_invitation.id,
    'admin_complimentary',
    'active',
    v_grant_start,
    v_grant_end,
    v_invitation.invited_by_profile_id,
    'Complimentary access granted through administrator doctor invitation.',
    now(),
    now()
  )
  on conflict (invitation_id)
  where invitation_id is not null
  do update set
    doctor_id = excluded.doctor_id,
    status = 'active',
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    updated_at = now()
  returning public.doctor_access_grants.id
  into v_access_grant_id;

  update public.doctor_invitations as di
  set
    status = 'accepted',
    auth_user_id = p_auth_user_id,
    accepted_profile_id = p_profile_id,
    doctor_id = v_existing_doctor_id,
    accepted_at = now(),
    failure_code = null,
    failure_message = null,
    updated_at = now()
  where di.id = v_invitation.id;

  insert into public.doctor_invitation_events (
    invitation_id,
    access_grant_id,
    doctor_id,
    actor_profile_id,
    event_type,
    event_data
  ) values
  (
    v_invitation.id,
    v_access_grant_id,
    v_existing_doctor_id,
    p_profile_id,
    'invitation_accepted',
    jsonb_build_object('email', lower(btrim(p_email)))
  ),
  (
    v_invitation.id,
    v_access_grant_id,
    v_existing_doctor_id,
    v_invitation.invited_by_profile_id,
    'complimentary_access_activated',
    jsonb_build_object(
      'startsAt', v_grant_start,
      'endsAt', v_grant_end,
      'complimentaryMonths', v_invitation.complimentary_months
    )
  );

  return query
  select v_invitation.id, v_existing_doctor_id, v_access_grant_id, v_grant_start, v_grant_end;
end;
$function$;

revoke all
on function public.accept_doctor_invitation(uuid, uuid, uuid, uuid, text, text)
from public, anon, authenticated;

grant execute
on function public.accept_doctor_invitation(uuid, uuid, uuid, uuid, text, text)
to service_role;

commit;
