-- =====================================================
-- ADD CLINIC ID TO APPOINTMENTS
-- =====================================================

alter table public.appointments
add column clinic_id uuid
references public.clinics(id)
on delete set null;

create index idx_appointments_clinic
on public.appointments(clinic_id);