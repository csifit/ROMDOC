-- =====================================================
-- REQUIRE PATIENT PHONE FOR APPOINTMENTS
-- =====================================================

update public.appointments
set patient_phone = 'unknown'
where patient_phone is null
   or char_length(trim(patient_phone)) < 7;

alter table public.appointments
alter column patient_phone set not null;

alter table public.appointments
add constraint appointments_patient_phone_valid
check (char_length(trim(patient_phone)) >= 7);