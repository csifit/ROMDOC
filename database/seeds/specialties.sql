insert into public.specialties (slug, icon)
values
  ('cardiologie', 'heart'),
  ('dermatologie', 'skin'),
  ('neurologie', 'brain'),
  ('pediatrie', 'baby'),
  ('ortopedie', 'bone'),
  ('ginecologie', 'female'),
  ('oftalmologie', 'eye'),
  ('stomatologie', 'tooth');

insert into public.specialty_translations (
  specialty_id,
  locale,
  name,
  meta_title,
  meta_description
)
select
  id,
  'ro',
  case slug
    when 'cardiologie' then 'Cardiologie'
    when 'dermatologie' then 'Dermatologie'
    when 'neurologie' then 'Neurologie'
    when 'pediatrie' then 'Pediatrie'
    when 'ortopedie' then 'Ortopedie'
    when 'ginecologie' then 'Ginecologie'
    when 'oftalmologie' then 'Oftalmologie'
    when 'stomatologie' then 'Stomatologie'
  end,
  case slug
    when 'cardiologie' then 'Medici cardiologi în România'
    when 'dermatologie' then 'Medici dermatologi în România'
    when 'neurologie' then 'Medici neurologi în România'
    when 'pediatrie' then 'Medici pediatri în România'
    when 'ortopedie' then 'Medici ortopezi în România'
    when 'ginecologie' then 'Medici ginecologi în România'
    when 'oftalmologie' then 'Medici oftalmologi în România'
    when 'stomatologie' then 'Medici stomatologi în România'
  end,
  case slug
    when 'cardiologie' then 'Găsește medici cardiologi și trimite o cerere de programare online.'
    when 'dermatologie' then 'Găsește medici dermatologi și trimite o cerere de programare online.'
    when 'neurologie' then 'Găsește medici neurologi și trimite o cerere de programare online.'
    when 'pediatrie' then 'Găsește medici pediatri și trimite o cerere de programare online.'
    when 'ortopedie' then 'Găsește medici ortopezi și trimite o cerere de programare online.'
    when 'ginecologie' then 'Găsește medici ginecologi și trimite o cerere de programare online.'
    when 'oftalmologie' then 'Găsește medici oftalmologi și trimite o cerere de programare online.'
    when 'stomatologie' then 'Găsește medici stomatologi și trimite o cerere de programare online.'
  end
from public.specialties;

insert into public.specialty_translations (
  specialty_id,
  locale,
  name,
  meta_title,
  meta_description
)
select
  id,
  'en',
  case slug
    when 'cardiologie' then 'Cardiology'
    when 'dermatologie' then 'Dermatology'
    when 'neurologie' then 'Neurology'
    when 'pediatrie' then 'Pediatrics'
    when 'ortopedie' then 'Orthopedics'
    when 'ginecologie' then 'Gynecology'
    when 'oftalmologie' then 'Ophthalmology'
    when 'stomatologie' then 'Dentistry'
  end,
  case slug
    when 'cardiologie' then 'Cardiologists in Romania'
    when 'dermatologie' then 'Dermatologists in Romania'
    when 'neurologie' then 'Neurologists in Romania'
    when 'pediatrie' then 'Pediatricians in Romania'
    when 'ortopedie' then 'Orthopedic doctors in Romania'
    when 'ginecologie' then 'Gynecologists in Romania'
    when 'oftalmologie' then 'Ophthalmologists in Romania'
    when 'stomatologie' then 'Dentists in Romania'
  end,
  case slug
    when 'cardiologie' then 'Find cardiologists and submit an online appointment request.'
    when 'dermatologie' then 'Find dermatologists and submit an online appointment request.'
    when 'neurologie' then 'Find neurologists and submit an online appointment request.'
    when 'pediatrie' then 'Find pediatricians and submit an online appointment request.'
    when 'ortopedie' then 'Find orthopedic doctors and submit an online appointment request.'
    when 'ginecologie' then 'Find gynecologists and submit an online appointment request.'
    when 'oftalmologie' then 'Find ophthalmologists and submit an online appointment request.'
    when 'stomatologie' then 'Find dentists and submit an online appointment request.'
  end
from public.specialties;