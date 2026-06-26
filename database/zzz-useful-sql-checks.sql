-- =====================================================
-- Verify the doctor-clinic relationship
-- =====================================================
select
  d.id as doctor_id,
  d.slug,
  d.profile_id,
  dc.clinic_id,
  c.slug as clinic_slug
from public.doctors as d
join public.doctor_clinics as dc
  on dc.doctor_id = d.id
join public.clinics as c
  on c.id = dc.clinic_id
where d.profile_id is not null;

-- =====================================================
-- 8. Rescheduling behavior
-- =====================================================

--  A reschedule call must include:

-- target_scheduled_date
-- target_scheduled_time

-- Example:

select *
from public.transition_own_appointment(
  target_appointment_id := 'APPOINTMENT_UUID',
  target_status := 'rescheduled',
  target_scheduled_date := '2026-07-20',
  target_scheduled_time := '14:30',
  transition_reason := 'Medicul nu este disponibil la ora inițială.'
);


-- =====================================================
-- 9. Cancellation behavior
-- =====================================================

-- Example doctor, staff, admin, or owning-patient cancellation:

select *
from public.transition_own_appointment(
  target_appointment_id := 'APPOINTMENT_UUID',
  target_status := 'cancelled',
  transition_reason := 'Pacientul nu mai poate ajunge.'
);

-- =====================================================
-- 10. Completion and no-show
-- =====================================================

-- Complete:

select *
from public.transition_own_appointment(
  target_appointment_id := 'APPOINTMENT_UUID',
  target_status := 'completed',
  transition_reason := 'Consultație finalizată.'
);

No-show:

select *
from public.transition_own_appointment(
  target_appointment_id := 'APPOINTMENT_UUID',
  target_status := 'no_show',
  transition_reason := 'Pacientul nu s-a prezentat.'
);

-- These become terminal appointments.

-- =====================================================
-- Possible Patient cancellation responses include:

-- 401 — not authenticated
-- 403 — not an active patient or does not own appointment
-- 404 — appointment not found
-- 409 — appointment already started
-- 409 — appointment is already terminal
-- 400 — invalid reason
-- =====================================================

-- =====================================================
-- 16. Verify RLS policies
-- =====================================================

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where tablename in (
  'patient_medical_documents',
  'objects'
)
order by schemaname, tablename, policyname;

-- =====================================================
-- verify legal pages
-- =====================================================

select
  page_key,
  title,
  is_published,
  updated_at,
  updated_by_profile_id
from public.legal_pages
order by page_key;