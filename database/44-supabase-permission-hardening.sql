-- ============================================================
-- RomDoc Step 66B
-- Confirmed Supabase permission hardening
--
-- Exact destination:
-- ROMDOC/database/44-supabase-permission-hardening.sql
--
-- Apply in Supabase SQL Editor.
-- This migration addresses only confirmed audit findings.
-- ============================================================

begin;

-- ============================================================
-- 1. Appointments must never be created anonymously.
-- ============================================================

drop policy if exists
  "Public can create online appointment requests"
on public.appointments;

-- Keep the existing authenticated patient and doctor INSERT policies.
-- No replacement anonymous policy is created.


-- ============================================================
-- 2. Restrict existing policies to authenticated users.
--    The authorization expressions remain unchanged.
-- ============================================================

alter policy admin_all_appointments
on public.appointments
to authenticated;

alter policy admin_all_clinics
on public.clinics
to authenticated;

alter policy admin_all_doctors
on public.doctors
to authenticated;

alter policy admin_all_profiles
on public.profiles
to authenticated;

alter policy admin_all_reviews
on public.reviews
to authenticated;

alter policy profiles_insert_own
on public.profiles
to authenticated;

alter policy profiles_select_own
on public.profiles
to authenticated;

alter policy profiles_update_own
on public.profiles
to authenticated;


-- ============================================================
-- 3. Remove the broader duplicate public review policy.
--
-- "Anyone can view published reviews" requires:
--   status = 'published' AND approved = true
--
-- "reviews_public_read" required only:
--   approved = true
--
-- Because permissive policies are OR-combined, the second policy could
-- expose approved reviews that were not published.
-- ============================================================

drop policy if exists
  reviews_public_read
on public.reviews;


-- ============================================================
-- 4. Stripe webhook event table is server-only.
--
-- RLS remains enabled with zero client policies.
-- The Stripe webhook uses the service-role admin client.
-- ============================================================

revoke all privileges
on table public.stripe_webhook_events
from anon, authenticated;

grant all privileges
on table public.stripe_webhook_events
to service_role;


-- ============================================================
-- 5. Public read-only RPCs.
--
-- Remove implicit PUBLIC execution, then explicitly grant only
-- the two API roles that need these public directory functions.
-- ============================================================

revoke execute
on function public.find_approved_clinics_nearby(
  double precision,
  double precision,
  double precision
)
from public;

grant execute
on function public.find_approved_clinics_nearby(
  double precision,
  double precision,
  double precision
)
to anon, authenticated, service_role;

revoke execute
on function public.get_available_appointment_slots(
  uuid,
  uuid,
  date
)
from public;

grant execute
on function public.get_available_appointment_slots(
  uuid,
  uuid,
  date
)
to anon, authenticated, service_role;


-- ============================================================
-- 6. Admin mutation RPC.
--
-- Authenticated users may reach the RPC endpoint, but the function's
-- internal auth.uid()/is_admin() check remains mandatory.
-- Anonymous and PUBLIC execution are removed.
-- ============================================================

revoke execute
on function public.admin_review_doctor_verification(
  uuid,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.admin_review_doctor_verification(
  uuid,
  text,
  text,
  text
)
to authenticated, service_role;


-- ============================================================
-- 7. Authenticated RLS/storage helper functions.
--
-- These functions are required by authenticated policies, so do not
-- revoke authenticated execution. Remove anonymous/PUBLIC access.
-- ============================================================

revoke execute
on function public.can_access_doctor_verification_storage_object(text)
from public, anon;
grant execute
on function public.can_access_doctor_verification_storage_object(text)
to authenticated, service_role;

revoke execute
on function public.can_doctor_create_appointment(uuid, uuid)
from public, anon;
grant execute
on function public.can_doctor_create_appointment(uuid, uuid)
to authenticated, service_role;

revoke execute
on function public.can_read_patient_medical_storage_object(text)
from public, anon;
grant execute
on function public.can_read_patient_medical_storage_object(text)
to authenticated, service_role;

revoke execute
on function public.doctor_can_access_patient_folder(uuid)
from public, anon;
grant execute
on function public.doctor_can_access_patient_folder(uuid)
to authenticated, service_role;

revoke execute
on function public.doctor_can_read_medical_document(uuid)
from public, anon;
grant execute
on function public.doctor_can_read_medical_document(uuid)
to authenticated, service_role;

revoke execute
on function public.doctor_owns_medical_document(uuid)
from public, anon;
grant execute
on function public.doctor_owns_medical_document(uuid)
to authenticated, service_role;

revoke execute
on function public.is_active_patient_profile(uuid)
from public, anon;
grant execute
on function public.is_active_patient_profile(uuid)
to authenticated, service_role;

revoke execute
on function public.is_admin()
from public, anon;
grant execute
on function public.is_admin()
to authenticated, service_role;

revoke execute
on function public.is_staff_for_doctor_clinic(uuid, uuid, uuid)
from public, anon;
grant execute
on function public.is_staff_for_doctor_clinic(uuid, uuid, uuid)
to authenticated, service_role;

revoke execute
on function public.owns_availability(uuid)
from public, anon;
grant execute
on function public.owns_availability(uuid)
to authenticated, service_role;

revoke execute
on function public.owns_doctor_service(uuid)
from public, anon;
grant execute
on function public.owns_doctor_service(uuid)
to authenticated, service_role;

revoke execute
on function public.owns_doctor_verification_submission(uuid)
from public, anon;
grant execute
on function public.owns_doctor_verification_submission(uuid)
to authenticated, service_role;


-- ============================================================
-- 8. Trigger-only and internal helper functions.
--
-- These functions are invoked by database triggers or by other
-- SECURITY DEFINER functions. They should not be direct API RPCs.
-- ============================================================

revoke execute
on function public.activate_doctor_staff_assignment()
from public, anon, authenticated;

revoke execute
on function public.guard_appointment_lifecycle()
from public, anon, authenticated;

revoke execute
on function public.handle_appointment_reminder_schedule_change()
from public, anon, authenticated;

revoke execute
on function public.handle_new_user()
from public, anon, authenticated;

revoke execute
on function public.prevent_appointment_audit_mutation()
from public, anon, authenticated;

revoke execute
on function public.prevent_appointment_notification_mutation()
from public, anon, authenticated;

revoke execute
on function public.prevent_patient_medical_document_event_mutation()
from public, anon, authenticated;

revoke execute
on function public.record_appointment_audit_event()
from public, anon, authenticated;

revoke execute
on function public.record_doctor_verification_audit_event()
from public, anon, authenticated;

revoke execute
on function public.record_patient_medical_document_event()
from public, anon, authenticated;

revoke execute
on function public.resolve_appointment_audit_actor_role(uuid)
from public, anon, authenticated;

revoke execute
on function public.rls_auto_enable()
from public, anon, authenticated;

revoke execute
on function public.validate_appointment_schedule()
from public, anon, authenticated;


-- ============================================================
-- 9. Ensure API roles cannot create objects in public schema.
-- ============================================================

revoke create
on schema public
from anon, authenticated;


commit;


-- ============================================================
-- VERIFICATION A
-- Anonymous appointment INSERT policy must be gone.
-- ============================================================

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'appointments'
order by policyname;


-- ============================================================
-- VERIFICATION B
-- Only one public review policy should remain, and it must require
-- status='published' AND approved=true.
-- ============================================================

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'reviews'
order by policyname;


-- ============================================================
-- VERIFICATION C
-- Stripe webhook table should have no anon/auth privileges.
-- ============================================================

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'stripe_webhook_events'
  and grantee in (
    'anon',
    'authenticated',
    'service_role'
  )
order by grantee, privilege_type;


-- ============================================================
-- VERIFICATION D
-- Re-run RPC access for the functions changed above.
-- ============================================================

select
  p.oid::regprocedure::text as function_signature,
  p.prosecdef as security_definer,
  has_function_privilege(
    'anon',
    p.oid,
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    p.oid,
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    p.oid,
    'EXECUTE'
  ) as service_role_can_execute,
  has_function_privilege(
    'public',
    p.oid,
    'EXECUTE'
  ) as public_can_execute
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'activate_doctor_staff_assignment',
    'admin_review_doctor_verification',
    'can_access_doctor_verification_storage_object',
    'can_doctor_create_appointment',
    'can_read_patient_medical_storage_object',
    'doctor_can_access_patient_folder',
    'doctor_can_read_medical_document',
    'doctor_owns_medical_document',
    'find_approved_clinics_nearby',
    'get_available_appointment_slots',
    'guard_appointment_lifecycle',
    'handle_appointment_reminder_schedule_change',
    'handle_new_user',
    'is_active_patient_profile',
    'is_admin',
    'is_staff_for_doctor_clinic',
    'owns_availability',
    'owns_doctor_service',
    'owns_doctor_verification_submission',
    'prevent_appointment_audit_mutation',
    'prevent_appointment_notification_mutation',
    'prevent_patient_medical_document_event_mutation',
    'record_appointment_audit_event',
    'record_doctor_verification_audit_event',
    'record_patient_medical_document_event',
    'resolve_appointment_audit_actor_role',
    'rls_auto_enable',
    'validate_appointment_schedule'
  )
order by p.oid::regprocedure::text;


-- ============================================================
-- VERIFICATION E
-- Both values should be false.
-- ============================================================

select
  has_schema_privilege(
    'anon',
    'public',
    'CREATE'
  ) as anon_can_create_in_public,
  has_schema_privilege(
    'authenticated',
    'public',
    'CREATE'
  ) as authenticated_can_create_in_public;
