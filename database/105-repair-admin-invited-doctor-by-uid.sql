-- ROMDOC/database/105-repair-admin-invited-doctor-by-uid.sql
--
-- Purpose:
-- Repair an Admin-invited doctor account when the Auth/profile row exists
-- but the normal invitation acceptance flow did not create the doctor profile.
--
-- IMPORTANT:
-- Replace ONLY v_target_uid below with the UID from Supabase Authentication.
--
-- This migration intentionally reuses public.accept_doctor_invitation(...)
-- so the repair follows RomDoc's normal activation workflow:
--   1. profiles.role/account_status
--   2. doctors row
--   3. doctor_translations row
--   4. doctor_access_grants complimentary access
--   5. doctor_invitations accepted state
--   6. invitation audit events
--
-- Safe behavior:
-- - Stops if the Auth user does not exist.
-- - Stops if there is no matching SENT Admin doctor invitation.
-- - Stops if the invitation belongs to another Auth user.
-- - Does not create an unrelated doctor account without an invitation.

begin;

do $repair$
declare
  -- ============================================================
  -- CHANGE THIS VALUE ONLY
  -- ============================================================
  v_target_uid uuid := '00000000-0000-0000-0000-000000000000'::uuid;

  v_auth_email text;
  v_invitation public.doctor_invitations%rowtype;

  v_existing_doctor_id uuid;
  v_new_doctor_id uuid := gen_random_uuid();

  v_base_slug text;
  v_doctor_slug text;
  v_suffix integer := 2;

  v_result_doctor_id uuid;
  v_access_grant_id uuid;
  v_access_starts_at timestamptz;
  v_access_ends_at timestamptz;
begin
  if v_target_uid = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception
      'Replace v_target_uid with the real Supabase Auth UID before running this migration.';
  end if;

  -- 1. Confirm that the Supabase Auth user exists.
  select lower(btrim(u.email))
  into v_auth_email
  from auth.users as u
  where u.id = v_target_uid;

  if v_auth_email is null or v_auth_email = '' then
    raise exception
      'No Supabase Auth user with UID % was found, or the user has no email.',
      v_target_uid;
  end if;

  -- 2. If a doctor row already exists, stop instead of creating a duplicate.
  select d.id
  into v_existing_doctor_id
  from public.doctors as d
  where d.profile_id = v_target_uid
  limit 1;

  if v_existing_doctor_id is not null then
    raise exception
      'UID % already has doctor row %. No repair was applied.',
      v_target_uid,
      v_existing_doctor_id;
  end if;

  -- 3. Find the latest SENT Admin doctor invitation belonging to this user.
  --
  -- Prefer the stored auth_user_id. Email is included as a fallback because
  -- older/failed invitation flows may have left auth_user_id unset.
  select di.*
  into v_invitation
  from public.doctor_invitations as di
  where di.status = 'sent'
    and (
      di.auth_user_id = v_target_uid
      or (
        di.auth_user_id is null
        and lower(btrim(di.email)) = v_auth_email
      )
    )
  order by di.created_at desc
  limit 1
  for update;

  if v_invitation.id is null then
    raise exception
      'No matching SENT Admin doctor invitation was found for UID % / email %. The account was not modified.',
      v_target_uid,
      v_auth_email;
  end if;

  if lower(btrim(v_invitation.email)) <> v_auth_email then
    raise exception
      'Invitation email % does not match Auth email %. The account was not modified.',
      v_invitation.email,
      v_auth_email;
  end if;

  if v_invitation.auth_user_id is not null
     and v_invitation.auth_user_id <> v_target_uid then
    raise exception
      'Invitation % belongs to Auth user %, not target UID %.',
      v_invitation.id,
      v_invitation.auth_user_id,
      v_target_uid;
  end if;

  if v_invitation.expires_at is not null
     and v_invitation.expires_at <= now() then
    raise exception
      'Invitation % expired at %. Resend the invitation first, then run this repair if still necessary.',
      v_invitation.id,
      v_invitation.expires_at;
  end if;

  -- 4. Create a guaranteed internal slug for the repaired account.
  --
  -- The doctor can complete the professional/public profile afterward.
  -- We use the UID to avoid guessing at Romanian diacritic transliteration.
  v_base_slug :=
    'medic-' || left(replace(v_target_uid::text, '-', ''), 12);

  v_doctor_slug := v_base_slug;

  while exists (
    select 1
    from public.doctors as d
    where d.slug = v_doctor_slug
  ) loop
    v_doctor_slug := v_base_slug || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  -- 5. Run RomDoc's existing canonical invitation-acceptance function.
  --
  -- This is intentionally the same database function used by:
  -- /api/doctor-invitations/accept
  select
    result.doctor_id,
    result.access_grant_id,
    result.access_starts_at,
    result.access_ends_at
  into
    v_result_doctor_id,
    v_access_grant_id,
    v_access_starts_at,
    v_access_ends_at
  from public.accept_doctor_invitation(
    p_invitation_id => v_invitation.id,
    p_profile_id => v_target_uid,
    p_auth_user_id => v_target_uid,
    p_doctor_id => v_new_doctor_id,
    p_doctor_slug => v_doctor_slug,
    p_email => v_auth_email
  ) as result;

  if v_result_doctor_id is null then
    raise exception
      'Doctor invitation acceptance returned no doctor ID. The transaction will be rolled back.';
  end if;

  -- 6. Final consistency checks.
  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_target_uid
      and p.role = 'doctor'
      and p.account_status = 'active'
  ) then
    raise exception
      'Repair did not leave the profile as an active doctor. The transaction will be rolled back.';
  end if;

  if not exists (
    select 1
    from public.doctors as d
    where d.id = v_result_doctor_id
      and d.profile_id = v_target_uid
      and d.status = 'active'
  ) then
    raise exception
      'Repair did not create an active doctors row. The transaction will be rolled back.';
  end if;

  raise notice 'RomDoc doctor repair completed successfully.';
  raise notice 'Auth/Profile UID: %', v_target_uid;
  raise notice 'Doctor ID: %', v_result_doctor_id;
  raise notice 'Invitation ID: %', v_invitation.id;
  raise notice 'Doctor slug: %', v_doctor_slug;
  raise notice 'Access grant ID: %', v_access_grant_id;
  raise notice 'Access starts: %', v_access_starts_at;
  raise notice 'Access ends: %', v_access_ends_at;
end;
$repair$;

commit;

-- Optional verification query.
-- Replace the UID below with the same UID if you want to inspect the result.
--
-- select
--   p.id as profile_id,
--   p.role,
--   p.account_status,
--   d.id as doctor_id,
--   d.slug,
--   d.status as doctor_status,
--   di.id as invitation_id,
--   di.status as invitation_status,
--   dag.id as access_grant_id,
--   dag.status as access_status,
--   dag.starts_at,
--   dag.ends_at
-- from public.profiles p
-- left join public.doctors d
--   on d.profile_id = p.id
-- left join public.doctor_invitations di
--   on di.accepted_profile_id = p.id
-- left join public.doctor_access_grants dag
--   on dag.doctor_id = d.id
--  and dag.invitation_id = di.id
-- where p.id = '00000000-0000-0000-0000-000000000000'::uuid;
