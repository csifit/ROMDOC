-- =====================================================
-- STEP 72H AUDIT QUERIES
-- Run read-only sections in Supabase SQL Editor.
-- Replace test e-mail/UUID values where noted.
-- =====================================================

-- 1. Invitation lifecycle integrity
select
  di.id,
  di.email,
  di.status,
  di.auth_user_id,
  di.accepted_profile_id,
  di.doctor_id,
  di.sent_at,
  di.accepted_at,
  di.expires_at,
  count(die.id) as event_count
from public.doctor_invitations di
left join public.doctor_invitation_events die
  on die.invitation_id = di.id
group by di.id
order by di.created_at desc;

-- 2. Accepted invitations missing required objects
select
  di.id,
  di.email,
  di.accepted_profile_id,
  di.doctor_id,
  di.accepted_at
from public.doctor_invitations di
left join public.profiles p
  on p.id = di.accepted_profile_id
left join public.doctors d
  on d.id = di.doctor_id
where di.status = 'accepted'
  and (
    di.accepted_profile_id is null
    or di.doctor_id is null
    or di.accepted_at is null
    or p.id is null
    or p.role <> 'doctor'
    or d.id is null
  );

-- Expected: zero rows.

-- 3. Complimentary access integrity
select
  dag.id,
  dag.doctor_id,
  dag.invitation_id,
  dag.grant_type,
  dag.status,
  dag.starts_at,
  dag.ends_at,
  case
    when dag.ends_at <= now()
      and dag.status = 'active'
      then 'ERROR_ACTIVE_AFTER_EXPIRY'
    when dag.ends_at > now()
      and dag.status = 'expired'
      then 'CHECK_EARLY_EXPIRY'
    else 'OK'
  end as integrity_status
from public.doctor_access_grants dag
where dag.grant_type = 'admin_complimentary'
order by dag.created_at desc;

-- 4. Reminder uniqueness
select
  access_grant_id,
  reminder_type,
  count(*) as reminder_count
from public.doctor_access_reminders
group by
  access_grant_id,
  reminder_type
having count(*) > 1;

-- Expected: zero rows.

-- 5. Invalid clinic associations
select
  dc.doctor_id,
  dc.clinic_id,
  d.status as doctor_status,
  c.status as clinic_status
from public.doctor_clinics dc
left join public.doctors d
  on d.id = dc.doctor_id
left join public.clinics c
  on c.id = dc.clinic_id
where d.id is null
   or c.id is null
   or c.status <> 'approved';

-- Expected: zero rows.

-- 6. Duplicate doctor-clinic links
select
  doctor_id,
  clinic_id,
  count(*) as duplicate_count
from public.doctor_clinics
group by
  doctor_id,
  clinic_id
having count(*) > 1;

-- Expected: zero rows.

-- 7. Approved clinics without Romanian translation
select
  c.id,
  c.slug,
  c.status
from public.clinics c
left join public.clinic_translations ct
  on ct.clinic_id = c.id
 and ct.locale = 'ro'
where c.status = 'approved'
  and ct.clinic_id is null;

-- Expected: zero rows.

-- 8. Admin operational audit trail
select
  aoae.created_at,
  aoae.action,
  aoae.actor_profile_id,
  aoae.doctor_id,
  aoae.clinic_id,
  aoae.metadata
from public.admin_operational_audit_events aoae
order by aoae.created_at desc
limit 200;

-- 9. Verify audit immutability.
-- Run only against a disposable audit UUID.
-- This must fail with:
-- admin_operational_audit_events is immutable

-- update public.admin_operational_audit_events
-- set metadata = '{"tampered":true}'::jsonb
-- where id = 'AUDIT_EVENT_UUID';

-- delete from public.admin_operational_audit_events
-- where id = 'AUDIT_EVENT_UUID';
