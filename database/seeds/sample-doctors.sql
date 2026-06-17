-- =====================================================
-- SAMPLE CLINIC
-- =====================================================

insert into public.clinics (
  slug,
  city_id,
  email,
  phone,
  website,
  street_address
)
select
  'clinica-medicala-arad',
  id,
  'contact@clinicaarad.ro',
  '+40 357 000 000',
  'https://clinicaarad.ro',
  'Strada Revolutiei 1'
from public.cities
where slug = 'arad';

-- =====================================================
-- CLINIC TRANSLATIONS
-- =====================================================

insert into public.clinic_translations (
  clinic_id,
  locale,
  name,
  description
)
select
  id,
  'ro',
  'Clinica Medicală Arad',
  'Clinică medicală multidisciplinară.'
from public.clinics
where slug = 'clinica-medicala-arad';

insert into public.clinic_translations (
  clinic_id,
  locale,
  name,
  description
)
select
  id,
  'en',
  'Arad Medical Clinic',
  'Multidisciplinary medical clinic.'
from public.clinics
where slug = 'clinica-medicala-arad';

-- =====================================================
-- DOCTOR 1
-- =====================================================

insert into public.doctors (
  slug,
  city_id,
  years_experience,
  consultation_price,
  status,
  average_rating,
  review_count
)
select
  'dr-andrei-popescu',
  id,
  12,
  250,
  'active',
  4.8,
  24
from public.cities
where slug = 'arad';

-- =====================================================
-- DOCTOR 2
-- =====================================================

insert into public.doctors (
  slug,
  city_id,
  years_experience,
  consultation_price,
  status,
  average_rating,
  review_count
)
select
  'dr-maria-ionescu',
  id,
  8,
  220,
  'active',
  4.9,
  17
from public.cities
where slug = 'arad';

-- =====================================================
-- DOCTOR TRANSLATIONS
-- =====================================================

insert into public.doctor_translations (
  doctor_id,
  locale,
  title,
  biography
)
select
  id,
  'ro',
  'Medic specialist cardiologie',
  'Experiență în diagnostic și tratament cardiovascular.'
from public.doctors
where slug = 'dr-andrei-popescu';

insert into public.doctor_translations (
  doctor_id,
  locale,
  title,
  biography
)
select
  id,
  'ro',
  'Medic specialist cardiologie',
  'Specializată în prevenție și monitorizare cardiacă.'
from public.doctors
where slug = 'dr-maria-ionescu';

-- =====================================================
-- DOCTOR SPECIALTIES
-- =====================================================

insert into public.doctor_specialties (
  doctor_id,
  specialty_id
)
select
  d.id,
  s.id
from public.doctors d
cross join public.specialties s
where d.slug = 'dr-andrei-popescu'
and s.slug = 'cardiologie';

insert into public.doctor_specialties (
  doctor_id,
  specialty_id
)
select
  d.id,
  s.id
from public.doctors d
cross join public.specialties s
where d.slug = 'dr-maria-ionescu'
and s.slug = 'cardiologie';

-- =====================================================
-- DOCTOR CLINICS
-- =====================================================

insert into public.doctor_clinics (
  doctor_id,
  clinic_id
)
select
  d.id,
  c.id
from public.doctors d
cross join public.clinics c
where d.slug = 'dr-andrei-popescu'
and c.slug = 'clinica-medicala-arad';

insert into public.doctor_clinics (
  doctor_id,
  clinic_id
)
select
  d.id,
  c.id
from public.doctors d
cross join public.clinics c
where d.slug = 'dr-maria-ionescu'
and c.slug = 'clinica-medicala-arad';