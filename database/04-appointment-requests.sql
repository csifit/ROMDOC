-- =====================================================
-- APPOINTMENT REQUEST IMPROVEMENTS
-- =====================================================

alter table public.appointments
add column requested_time time;

-- Prevent obviously invalid empty names and emails.
alter table public.appointments
add constraint appointments_patient_name_not_blank
check (char_length(trim(patient_name)) >= 2);

alter table public.appointments
add constraint appointments_patient_email_not_blank
check (char_length(trim(patient_email)) >= 5);

-- =====================================================
-- PUBLIC APPOINTMENT INSERT POLICY
-- =====================================================

drop policy if exists "appointments_public_insert"
on public.appointments;

create policy "appointments_public_insert"
on public.appointments
for insert
to anon, authenticated
with check (
  status = 'pending'
  and patient_name is not null
  and patient_email is not null
  and requested_date is not null
  and doctor_id is not null
  and clinic_id is not null
);