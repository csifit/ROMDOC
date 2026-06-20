-- =====================================================
-- ROMDOC SPECIALTIES SEED
--
-- File:
-- ROMDOC/database/seeds/specialties.sql
--
-- Purpose:
-- 1. Add or update the complete specialties list.
-- 2. Preserve existing specialty UUIDs.
-- 3. Preserve existing doctor_specialties relationships.
-- 4. Add Romanian and English translations.
--
-- This file is safe to run multiple times.
-- =====================================================

begin;

-- =====================================================
-- 1. SPECIALTIES
-- =====================================================

insert into public.specialties (
  slug,
  icon,
  created_at,
  updated_at
)
values
  (
    'alergologie-imunologie-clinica',
    null,
    now(),
    now()
  ),
  (
    'anestezie-terapie-intensiva',
    null,
    now(),
    now()
  ),
  (
    'boli-infectioase',
    null,
    now(),
    now()
  ),
  (
    'cardiologie',
    null,
    now(),
    now()
  ),
  (
    'dermatovenerologie',
    null,
    now(),
    now()
  ),
  (
    'diabet-nutritie-boli-metabolice',
    null,
    now(),
    now()
  ),
  (
    'endocrinologie',
    null,
    now(),
    now()
  ),
  (
    'expertiza-medicala-capacitatii-de-munca',
    null,
    now(),
    now()
  ),
  (
    'farmacologie-clinica',
    null,
    now(),
    now()
  ),
  (
    'gastroenterologie',
    null,
    now(),
    now()
  ),
  (
    'genetica-medicala',
    null,
    now(),
    now()
  ),
  (
    'geriatrie-gerontologie',
    null,
    now(),
    now()
  ),
  (
    'hematologie',
    null,
    now(),
    now()
  ),
  (
    'medicina-de-familie',
    null,
    now(),
    now()
  ),
  (
    'medicina-de-urgenta',
    null,
    now(),
    now()
  ),
  (
    'medicina-interna',
    null,
    now(),
    now()
  ),
  (
    'medicina-muncii',
    null,
    now(),
    now()
  ),
  (
    'medicina-sportiva',
    null,
    now(),
    now()
  ),
  (
    'nefrologie',
    null,
    now(),
    now()
  ),
  (
    'neonatologie',
    null,
    now(),
    now()
  ),
  (
    'neurologie',
    null,
    now(),
    now()
  ),
  (
    'neurologie-pediatrica',
    null,
    now(),
    now()
  ),
  (
    'oncologie-medicala',
    null,
    now(),
    now()
  ),
  (
    'pediatrie',
    null,
    now(),
    now()
  ),
  (
    'pneumologie',
    null,
    now(),
    now()
  ),
  (
    'psihiatrie',
    null,
    now(),
    now()
  ),
  (
    'psihiatrie-pediatrica',
    null,
    now(),
    now()
  ),
  (
    'radioterapie',
    null,
    now(),
    now()
  ),
  (
    'recuperare-medicina-fizica-balneologie',
    null,
    now(),
    now()
  ),
  (
    'reumatologie',
    null,
    now(),
    now()
  ),
  (
    'chirurgie-cardiovasculara',
    null,
    now(),
    now()
  ),
  (
    'chirurgie-generala',
    null,
    now(),
    now()
  ),
  (
    'chirurgie-orala-maxilo-faciala',
    null,
    now(),
    now()
  ),
  (
    'chirurgie-pediatrica',
    null,
    now(),
    now()
  ),
  (
    'chirurgie-plastica-microchirurgie-reconstructiva',
    null,
    now(),
    now()
  ),
  (
    'chirurgie-toracica',
    null,
    now(),
    now()
  ),
  (
    'chirurgie-vasculara',
    null,
    now(),
    now()
  ),
  (
    'neurochirurgie',
    null,
    now(),
    now()
  ),
  (
    'obstetrica-ginecologie',
    null,
    now(),
    now()
  ),
  (
    'oftalmologie',
    null,
    now(),
    now()
  ),
  (
    'ortopedie-pediatrica',
    null,
    now(),
    now()
  ),
  (
    'ortopedie-traumatologie',
    null,
    now(),
    now()
  ),
  (
    'otorinolaringologie',
    null,
    now(),
    now()
  ),
  (
    'urologie',
    null,
    now(),
    now()
  ),
  (
    'anatomie-patologica',
    null,
    now(),
    now()
  ),
  (
    'epidemiologie',
    null,
    now(),
    now()
  ),
  (
    'igiena',
    null,
    now(),
    now()
  ),
  (
    'medicina-de-laborator',
    null,
    now(),
    now()
  ),
  (
    'medicina-legala',
    null,
    now(),
    now()
  ),
  (
    'medicina-nucleara',
    null,
    now(),
    now()
  ),
  (
    'radiologie-imagistica-medicala',
    null,
    now(),
    now()
  ),
  (
    'sanatate-publica-management',
    null,
    now(),
    now()
  ),
  (
    'homeopatie',
    null,
    now(),
    now()
  ),
  (
    'nutritionist',
    null,
    now(),
    now()
  )
on conflict (slug)
do update
set
  updated_at = now();

-- =====================================================
-- 2. ROMANIAN TRANSLATIONS
-- =====================================================

with translations (
  slug,
  name,
  meta_title,
  meta_description
) as (
  values
    (
      'alergologie-imunologie-clinica',
      'Alergologie şi imunologie clinică',
      'Medici alergologie şi imunologie clinică',
      'Găsește medici specializați în alergologie şi imunologie clinică.'
    ),
    (
      'anestezie-terapie-intensiva',
      'Anestezie şi terapie intensivă',
      'Medici anestezie şi terapie intensivă',
      'Găsește medici specializați în anestezie şi terapie intensivă.'
    ),
    (
      'boli-infectioase',
      'Boli infecţioase',
      'Medici boli infecţioase',
      'Găsește medici specializați în boli infecţioase.'
    ),
    (
      'cardiologie',
      'Cardiologie',
      'Medici cardiologie',
      'Găsește medici specializați în cardiologie.'
    ),
    (
      'dermatovenerologie',
      'Dermatovenerologie',
      'Medici dermatovenerologie',
      'Găsește medici specializați în dermatovenerologie.'
    ),
    (
      'diabet-nutritie-boli-metabolice',
      'Diabet zaharat, nutriţie şi boli metabolice',
      'Medici diabet, nutriţie şi boli metabolice',
      'Găsește medici specializați în diabet zaharat, nutriţie şi boli metabolice.'
    ),
    (
      'endocrinologie',
      'Endocrinologie',
      'Medici endocrinologie',
      'Găsește medici specializați în endocrinologie.'
    ),
    (
      'expertiza-medicala-capacitatii-de-munca',
      'Expertiza medicală a capacităţii de muncă',
      'Medici expertiza capacităţii de muncă',
      'Găsește medici specializați în expertiza medicală a capacităţii de muncă.'
    ),
    (
      'farmacologie-clinica',
      'Farmacologie clinică',
      'Medici farmacologie clinică',
      'Găsește medici specializați în farmacologie clinică.'
    ),
    (
      'gastroenterologie',
      'Gastroenterologie',
      'Medici gastroenterologie',
      'Găsește medici specializați în gastroenterologie.'
    ),
    (
      'genetica-medicala',
      'Genetică medicală',
      'Medici genetică medicală',
      'Găsește medici specializați în genetică medicală.'
    ),
    (
      'geriatrie-gerontologie',
      'Geriatrie şi gerontologie',
      'Medici geriatrie şi gerontologie',
      'Găsește medici specializați în geriatrie şi gerontologie.'
    ),
    (
      'hematologie',
      'Hematologie',
      'Medici hematologie',
      'Găsește medici specializați în hematologie.'
    ),
    (
      'medicina-de-familie',
      'Medicină de familie',
      'Medici de familie',
      'Găsește medici specializați în medicină de familie.'
    ),
    (
      'medicina-de-urgenta',
      'Medicină de urgenţă',
      'Medici medicină de urgenţă',
      'Găsește medici specializați în medicină de urgenţă.'
    ),
    (
      'medicina-interna',
      'Medicină internă',
      'Medici medicină internă',
      'Găsește medici specializați în medicină internă.'
    ),
    (
      'medicina-muncii',
      'Medicina muncii',
      'Medici medicina muncii',
      'Găsește medici specializați în medicina muncii.'
    ),
    (
      'medicina-sportiva',
      'Medicină sportivă',
      'Medici medicină sportivă',
      'Găsește medici specializați în medicină sportivă.'
    ),
    (
      'nefrologie',
      'Nefrologie',
      'Medici nefrologie',
      'Găsește medici specializați în nefrologie.'
    ),
    (
      'neonatologie',
      'Neonatologie',
      'Medici neonatologie',
      'Găsește medici specializați în neonatologie.'
    ),
    (
      'neurologie',
      'Neurologie',
      'Medici neurologie',
      'Găsește medici specializați în neurologie.'
    ),
    (
      'neurologie-pediatrica',
      'Neurologie pediatrică',
      'Medici neurologie pediatrică',
      'Găsește medici specializați în neurologie pediatrică.'
    ),
    (
      'oncologie-medicala',
      'Oncologie medicală',
      'Medici oncologie medicală',
      'Găsește medici specializați în oncologie medicală.'
    ),
    (
      'pediatrie',
      'Pediatrie',
      'Medici pediatrie',
      'Găsește medici specializați în pediatrie.'
    ),
    (
      'pneumologie',
      'Pneumologie',
      'Medici pneumologie',
      'Găsește medici specializați în pneumologie.'
    ),
    (
      'psihiatrie',
      'Psihiatrie',
      'Medici psihiatrie',
      'Găsește medici specializați în psihiatrie.'
    ),
    (
      'psihiatrie-pediatrica',
      'Psihiatrie pediatrică',
      'Medici psihiatrie pediatrică',
      'Găsește medici specializați în psihiatrie pediatrică.'
    ),
    (
      'radioterapie',
      'Radioterapie',
      'Medici radioterapie',
      'Găsește medici specializați în radioterapie.'
    ),
    (
      'recuperare-medicina-fizica-balneologie',
      'Recuperare, medicină fizică şi balneologie',
      'Medici recuperare şi medicină fizică',
      'Găsește medici specializați în recuperare, medicină fizică şi balneologie.'
    ),
    (
      'reumatologie',
      'Reumatologie',
      'Medici reumatologie',
      'Găsește medici specializați în reumatologie.'
    ),
    (
      'chirurgie-cardiovasculara',
      'Chirurgie cardiovasculară',
      'Medici chirurgie cardiovasculară',
      'Găsește medici specializați în chirurgie cardiovasculară.'
    ),
    (
      'chirurgie-generala',
      'Chirurgie generală',
      'Medici chirurgie generală',
      'Găsește medici specializați în chirurgie generală.'
    ),
    (
      'chirurgie-orala-maxilo-faciala',
      'Chirurgie orală şi maxilo-facială',
      'Medici chirurgie orală şi maxilo-facială',
      'Găsește medici specializați în chirurgie orală şi maxilo-facială.'
    ),
    (
      'chirurgie-pediatrica',
      'Chirurgie pediatrică',
      'Medici chirurgie pediatrică',
      'Găsește medici specializați în chirurgie pediatrică.'
    ),
    (
      'chirurgie-plastica-microchirurgie-reconstructiva',
      'Chirurgie plastică-microchirurgie reconstructivă',
      'Medici chirurgie plastică şi microchirurgie',
      'Găsește medici specializați în chirurgie plastică şi microchirurgie reconstructivă.'
    ),
    (
      'chirurgie-toracica',
      'Chirurgie toracică',
      'Medici chirurgie toracică',
      'Găsește medici specializați în chirurgie toracică.'
    ),
    (
      'chirurgie-vasculara',
      'Chirurgie vasculară',
      'Medici chirurgie vasculară',
      'Găsește medici specializați în chirurgie vasculară.'
    ),
    (
      'neurochirurgie',
      'Neurochirurgie',
      'Medici neurochirurgie',
      'Găsește medici specializați în neurochirurgie.'
    ),
    (
      'obstetrica-ginecologie',
      'Obstetrică-ginecologie',
      'Medici obstetrică-ginecologie',
      'Găsește medici specializați în obstetrică-ginecologie.'
    ),
    (
      'oftalmologie',
      'Oftalmologie',
      'Medici oftalmologie',
      'Găsește medici specializați în oftalmologie.'
    ),
    (
      'ortopedie-pediatrica',
      'Ortopedie pediatrică',
      'Medici ortopedie pediatrică',
      'Găsește medici specializați în ortopedie pediatrică.'
    ),
    (
      'ortopedie-traumatologie',
      'Ortopedie şi traumatologie',
      'Medici ortopedie şi traumatologie',
      'Găsește medici specializați în ortopedie şi traumatologie.'
    ),
    (
      'otorinolaringologie',
      'Otorinolaringologie',
      'Medici ORL',
      'Găsește medici specializați în otorinolaringologie.'
    ),
    (
      'urologie',
      'Urologie',
      'Medici urologie',
      'Găsește medici specializați în urologie.'
    ),
    (
      'anatomie-patologica',
      'Anatomie patologică',
      'Medici anatomie patologică',
      'Găsește medici specializați în anatomie patologică.'
    ),
    (
      'epidemiologie',
      'Epidemiologie',
      'Medici epidemiologie',
      'Găsește medici specializați în epidemiologie.'
    ),
    (
      'igiena',
      'Igienă',
      'Medici igienă',
      'Găsește medici specializați în igienă.'
    ),
    (
      'medicina-de-laborator',
      'Medicină de laborator',
      'Medici medicină de laborator',
      'Găsește medici specializați în medicină de laborator.'
    ),
    (
      'medicina-legala',
      'Medicină legală',
      'Medici medicină legală',
      'Găsește medici specializați în medicină legală.'
    ),
    (
      'medicina-nucleara',
      'Medicină nucleară',
      'Medici medicină nucleară',
      'Găsește medici specializați în medicină nucleară.'
    ),
    (
      'radiologie-imagistica-medicala',
      'Radiologie-imagistică medicală',
      'Medici radiologie şi imagistică medicală',
      'Găsește medici specializați în radiologie şi imagistică medicală.'
    ),
    (
      'sanatate-publica-management',
      'Sănătate publică şi management',
      'Medici sănătate publică şi management',
      'Găsește specialiști în sănătate publică şi management.'
    ),
    (
      'homeopatie',
      'Homeopatie',
      'Specialiști homeopatie',
      'Găsește specialiști care oferă servicii de homeopatie.'
    ),
    (
      'nutritionist',
      'Nutritionist',
      'Nutriționiști',
      'Găsește specialiști în nutriție.'
    )
)
insert into public.specialty_translations (
  specialty_id,
  locale,
  name,
  meta_title,
  meta_description
)
select
  specialties.id,
  'ro',
  translations.name,
  translations.meta_title,
  translations.meta_description
from translations
join public.specialties
  on specialties.slug = translations.slug
on conflict (
  specialty_id,
  locale
)
do update
set
  name = excluded.name,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description;

-- =====================================================
-- 3. ENGLISH TRANSLATIONS
-- =====================================================

with translations (
  slug,
  name,
  meta_title,
  meta_description
) as (
  values
    (
      'alergologie-imunologie-clinica',
      'Allergology and Clinical Immunology',
      'Allergology and Clinical Immunology Doctors',
      'Find doctors specializing in allergology and clinical immunology.'
    ),
    (
      'anestezie-terapie-intensiva',
      'Anesthesiology and Intensive Care',
      'Anesthesiology and Intensive Care Doctors',
      'Find doctors specializing in anesthesiology and intensive care.'
    ),
    (
      'boli-infectioase',
      'Infectious Diseases',
      'Infectious Disease Doctors',
      'Find doctors specializing in infectious diseases.'
    ),
    (
      'cardiologie',
      'Cardiology',
      'Cardiologists',
      'Find doctors specializing in cardiology.'
    ),
    (
      'dermatovenerologie',
      'Dermatology and Venereology',
      'Dermatology and Venereology Doctors',
      'Find doctors specializing in dermatology and venereology.'
    ),
    (
      'diabet-nutritie-boli-metabolice',
      'Diabetes, Nutrition and Metabolic Diseases',
      'Diabetes, Nutrition and Metabolic Disease Doctors',
      'Find doctors specializing in diabetes, nutrition and metabolic diseases.'
    ),
    (
      'endocrinologie',
      'Endocrinology',
      'Endocrinologists',
      'Find doctors specializing in endocrinology.'
    ),
    (
      'expertiza-medicala-capacitatii-de-munca',
      'Medical Assessment of Work Capacity',
      'Work Capacity Medical Assessment Doctors',
      'Find doctors specializing in medical assessment of work capacity.'
    ),
    (
      'farmacologie-clinica',
      'Clinical Pharmacology',
      'Clinical Pharmacologists',
      'Find doctors specializing in clinical pharmacology.'
    ),
    (
      'gastroenterologie',
      'Gastroenterology',
      'Gastroenterologists',
      'Find doctors specializing in gastroenterology.'
    ),
    (
      'genetica-medicala',
      'Medical Genetics',
      'Medical Genetics Doctors',
      'Find doctors specializing in medical genetics.'
    ),
    (
      'geriatrie-gerontologie',
      'Geriatrics and Gerontology',
      'Geriatrics and Gerontology Doctors',
      'Find doctors specializing in geriatrics and gerontology.'
    ),
    (
      'hematologie',
      'Hematology',
      'Hematologists',
      'Find doctors specializing in hematology.'
    ),
    (
      'medicina-de-familie',
      'Family Medicine',
      'Family Doctors',
      'Find doctors specializing in family medicine.'
    ),
    (
      'medicina-de-urgenta',
      'Emergency Medicine',
      'Emergency Medicine Doctors',
      'Find doctors specializing in emergency medicine.'
    ),
    (
      'medicina-interna',
      'Internal Medicine',
      'Internal Medicine Doctors',
      'Find doctors specializing in internal medicine.'
    ),
    (
      'medicina-muncii',
      'Occupational Medicine',
      'Occupational Medicine Doctors',
      'Find doctors specializing in occupational medicine.'
    ),
    (
      'medicina-sportiva',
      'Sports Medicine',
      'Sports Medicine Doctors',
      'Find doctors specializing in sports medicine.'
    ),
    (
      'nefrologie',
      'Nephrology',
      'Nephrologists',
      'Find doctors specializing in nephrology.'
    ),
    (
      'neonatologie',
      'Neonatology',
      'Neonatologists',
      'Find doctors specializing in neonatology.'
    ),
    (
      'neurologie',
      'Neurology',
      'Neurologists',
      'Find doctors specializing in neurology.'
    ),
    (
      'neurologie-pediatrica',
      'Pediatric Neurology',
      'Pediatric Neurologists',
      'Find doctors specializing in pediatric neurology.'
    ),
    (
      'oncologie-medicala',
      'Medical Oncology',
      'Medical Oncologists',
      'Find doctors specializing in medical oncology.'
    ),
    (
      'pediatrie',
      'Pediatrics',
      'Pediatricians',
      'Find doctors specializing in pediatrics.'
    ),
    (
      'pneumologie',
      'Pulmonology',
      'Pulmonologists',
      'Find doctors specializing in pulmonology.'
    ),
    (
      'psihiatrie',
      'Psychiatry',
      'Psychiatrists',
      'Find doctors specializing in psychiatry.'
    ),
    (
      'psihiatrie-pediatrica',
      'Child and Adolescent Psychiatry',
      'Child and Adolescent Psychiatrists',
      'Find doctors specializing in child and adolescent psychiatry.'
    ),
    (
      'radioterapie',
      'Radiation Oncology',
      'Radiation Oncologists',
      'Find doctors specializing in radiation oncology.'
    ),
    (
      'recuperare-medicina-fizica-balneologie',
      'Rehabilitation, Physical Medicine and Balneology',
      'Rehabilitation and Physical Medicine Doctors',
      'Find doctors specializing in rehabilitation, physical medicine and balneology.'
    ),
    (
      'reumatologie',
      'Rheumatology',
      'Rheumatologists',
      'Find doctors specializing in rheumatology.'
    ),
    (
      'chirurgie-cardiovasculara',
      'Cardiovascular Surgery',
      'Cardiovascular Surgeons',
      'Find doctors specializing in cardiovascular surgery.'
    ),
    (
      'chirurgie-generala',
      'General Surgery',
      'General Surgeons',
      'Find doctors specializing in general surgery.'
    ),
    (
      'chirurgie-orala-maxilo-faciala',
      'Oral and Maxillofacial Surgery',
      'Oral and Maxillofacial Surgeons',
      'Find doctors specializing in oral and maxillofacial surgery.'
    ),
    (
      'chirurgie-pediatrica',
      'Pediatric Surgery',
      'Pediatric Surgeons',
      'Find doctors specializing in pediatric surgery.'
    ),
    (
      'chirurgie-plastica-microchirurgie-reconstructiva',
      'Plastic and Reconstructive Microsurgery',
      'Plastic and Reconstructive Surgeons',
      'Find doctors specializing in plastic and reconstructive microsurgery.'
    ),
    (
      'chirurgie-toracica',
      'Thoracic Surgery',
      'Thoracic Surgeons',
      'Find doctors specializing in thoracic surgery.'
    ),
    (
      'chirurgie-vasculara',
      'Vascular Surgery',
      'Vascular Surgeons',
      'Find doctors specializing in vascular surgery.'
    ),
    (
      'neurochirurgie',
      'Neurosurgery',
      'Neurosurgeons',
      'Find doctors specializing in neurosurgery.'
    ),
    (
      'obstetrica-ginecologie',
      'Obstetrics and Gynecology',
      'Obstetricians and Gynecologists',
      'Find doctors specializing in obstetrics and gynecology.'
    ),
    (
      'oftalmologie',
      'Ophthalmology',
      'Ophthalmologists',
      'Find doctors specializing in ophthalmology.'
    ),
    (
      'ortopedie-pediatrica',
      'Pediatric Orthopedics',
      'Pediatric Orthopedic Doctors',
      'Find doctors specializing in pediatric orthopedics.'
    ),
    (
      'ortopedie-traumatologie',
      'Orthopedics and Traumatology',
      'Orthopedic and Traumatology Doctors',
      'Find doctors specializing in orthopedics and traumatology.'
    ),
    (
      'otorinolaringologie',
      'Otorhinolaryngology',
      'ENT Doctors',
      'Find doctors specializing in ear, nose and throat medicine.'
    ),
    (
      'urologie',
      'Urology',
      'Urologists',
      'Find doctors specializing in urology.'
    ),
    (
      'anatomie-patologica',
      'Pathology',
      'Pathologists',
      'Find doctors specializing in pathology.'
    ),
    (
      'epidemiologie',
      'Epidemiology',
      'Epidemiologists',
      'Find specialists in epidemiology.'
    ),
    (
      'igiena',
      'Hygiene',
      'Hygiene Specialists',
      'Find specialists in hygiene and preventive medicine.'
    ),
    (
      'medicina-de-laborator',
      'Laboratory Medicine',
      'Laboratory Medicine Doctors',
      'Find doctors specializing in laboratory medicine.'
    ),
    (
      'medicina-legala',
      'Forensic Medicine',
      'Forensic Medicine Doctors',
      'Find doctors specializing in forensic medicine.'
    ),
    (
      'medicina-nucleara',
      'Nuclear Medicine',
      'Nuclear Medicine Doctors',
      'Find doctors specializing in nuclear medicine.'
    ),
    (
      'radiologie-imagistica-medicala',
      'Radiology and Medical Imaging',
      'Radiologists and Medical Imaging Doctors',
      'Find doctors specializing in radiology and medical imaging.'
    ),
    (
      'sanatate-publica-management',
      'Public Health and Management',
      'Public Health and Management Specialists',
      'Find specialists in public health and healthcare management.'
    ),
    (
      'homeopatie',
      'Homeopathy',
      'Homeopathy Practitioners',
      'Find practitioners offering homeopathy services.'
    ),
    (
      'nutritionist',
      'Nutritionist',
      'Nutritionists',
      'Find nutrition professionals.'
    )
)
insert into public.specialty_translations (
  specialty_id,
  locale,
  name,
  meta_title,
  meta_description
)
select
  specialties.id,
  'en',
  translations.name,
  translations.meta_title,
  translations.meta_description
from translations
join public.specialties
  on specialties.slug = translations.slug
on conflict (
  specialty_id,
  locale
)
do update
set
  name = excluded.name,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  specialties.id,
  specialties.slug,
  romanian.name as name_ro,
  english.name as name_en
from public.specialties
left join public.specialty_translations as romanian
  on romanian.specialty_id = specialties.id
  and romanian.locale = 'ro'
left join public.specialty_translations as english
  on english.specialty_id = specialties.id
  and english.locale = 'en'
order by romanian.name;