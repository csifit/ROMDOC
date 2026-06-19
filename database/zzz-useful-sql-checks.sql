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
