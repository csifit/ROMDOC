insert into public.cities (slug, country_code, latitude, longitude)
values
  ('bucuresti', 'RO', 44.4268, 26.1025),
  ('cluj-napoca', 'RO', 46.7712, 23.6236),
  ('timisoara', 'RO', 45.7489, 21.2087),
  ('iasi', 'RO', 47.1585, 27.6014),
  ('constanta', 'RO', 44.1598, 28.6348),
  ('arad', 'RO', 46.1866, 21.3123);

insert into public.city_translations (city_id, locale, name)
select id, 'ro', case slug
  when 'bucuresti' then 'București'
  when 'cluj-napoca' then 'Cluj-Napoca'
  when 'timisoara' then 'Timișoara'
  when 'iasi' then 'Iași'
  when 'constanta' then 'Constanța'
  when 'arad' then 'Arad'
end
from public.cities;

insert into public.city_translations (city_id, locale, name)
select id, 'en', case slug
  when 'bucuresti' then 'Bucharest'
  when 'cluj-napoca' then 'Cluj-Napoca'
  when 'timisoara' then 'Timisoara'
  when 'iasi' then 'Iasi'
  when 'constanta' then 'Constanta'
  when 'arad' then 'Arad'
end
from public.cities;