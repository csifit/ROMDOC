-- =====================================================
-- RomDoc translation completeness audit
--
-- File:
-- ROMDOC/database/audits/translation-completeness-audit.sql
--
-- This is a read-only audit. It creates no tables and changes no data.
-- Run each result set in Supabase SQL Editor.
-- =====================================================

-- -----------------------------------------------------
-- 1. Summary: missing Romanian or English translation rows
-- -----------------------------------------------------

with translation_summary as (
  select
    'doctor'::text as entity_type,
    d.id as entity_id,
    d.slug as entity_slug,
    exists (
      select 1
      from public.doctor_translations dt
      where dt.doctor_id = d.id
        and dt.locale = 'ro'
    ) as has_ro,
    exists (
      select 1
      from public.doctor_translations dt
      where dt.doctor_id = d.id
        and dt.locale = 'en'
    ) as has_en
  from public.doctors d
  where d.status = 'active'

  union all

  select
    'clinic',
    c.id,
    c.slug,
    exists (
      select 1
      from public.clinic_translations ct
      where ct.clinic_id = c.id
        and ct.locale = 'ro'
    ),
    exists (
      select 1
      from public.clinic_translations ct
      where ct.clinic_id = c.id
        and ct.locale = 'en'
    )
  from public.clinics c
  where c.status = 'approved'

  union all

  select
    'specialty',
    s.id,
    s.slug,
    exists (
      select 1
      from public.specialty_translations st
      where st.specialty_id = s.id
        and st.locale = 'ro'
    ),
    exists (
      select 1
      from public.specialty_translations st
      where st.specialty_id = s.id
        and st.locale = 'en'
    )
  from public.specialties s
  where s.is_active = true

  union all

  select
    'city',
    ci.id,
    ci.slug,
    exists (
      select 1
      from public.city_translations cit
      where cit.city_id = ci.id
        and cit.locale = 'ro'
    ),
    exists (
      select 1
      from public.city_translations cit
      where cit.city_id = ci.id
        and cit.locale = 'en'
    )
  from public.cities ci
  where ci.is_active = true
)
select
  entity_type,
  count(*) as active_entities,
  count(*) filter (
    where has_ro = false
  ) as missing_ro_rows,
  count(*) filter (
    where has_en = false
  ) as missing_en_rows,
  count(*) filter (
    where has_ro = false
       or has_en = false
  ) as incomplete_entities
from translation_summary
group by entity_type
order by entity_type;


-- -----------------------------------------------------
-- 2. Detailed list: entities missing a locale row
-- -----------------------------------------------------

with translation_summary as (
  select
    'doctor'::text as entity_type,
    d.id as entity_id,
    d.slug as entity_slug,
    exists (
      select 1
      from public.doctor_translations dt
      where dt.doctor_id = d.id
        and dt.locale = 'ro'
    ) as has_ro,
    exists (
      select 1
      from public.doctor_translations dt
      where dt.doctor_id = d.id
        and dt.locale = 'en'
    ) as has_en
  from public.doctors d
  where d.status = 'active'

  union all

  select
    'clinic',
    c.id,
    c.slug,
    exists (
      select 1
      from public.clinic_translations ct
      where ct.clinic_id = c.id
        and ct.locale = 'ro'
    ),
    exists (
      select 1
      from public.clinic_translations ct
      where ct.clinic_id = c.id
        and ct.locale = 'en'
    )
  from public.clinics c
  where c.status = 'approved'

  union all

  select
    'specialty',
    s.id,
    s.slug,
    exists (
      select 1
      from public.specialty_translations st
      where st.specialty_id = s.id
        and st.locale = 'ro'
    ),
    exists (
      select 1
      from public.specialty_translations st
      where st.specialty_id = s.id
        and st.locale = 'en'
    )
  from public.specialties s
  where s.is_active = true

  union all

  select
    'city',
    ci.id,
    ci.slug,
    exists (
      select 1
      from public.city_translations cit
      where cit.city_id = ci.id
        and cit.locale = 'ro'
    ),
    exists (
      select 1
      from public.city_translations cit
      where cit.city_id = ci.id
        and cit.locale = 'en'
    )
  from public.cities ci
  where ci.is_active = true
)
select
  entity_type,
  entity_id,
  entity_slug,
  case
    when has_ro = false
     and has_en = false
      then 'ro,en'
    when has_ro = false
      then 'ro'
    when has_en = false
      then 'en'
    else null
  end as missing_locales
from translation_summary
where has_ro = false
   or has_en = false
order by
  entity_type,
  entity_slug;


-- -----------------------------------------------------
-- 3. Doctor translation field completeness
-- -----------------------------------------------------

select
  d.id as doctor_id,
  d.slug,
  required_locale.locale,
  dt.id as translation_id,
  nullif(trim(dt.title), '') is null
    as missing_title,
  nullif(trim(dt.biography), '') is null
    as missing_biography,
  nullif(trim(dt.meta_title), '') is null
    as missing_meta_title,
  nullif(trim(dt.meta_description), '') is null
    as missing_meta_description
from public.doctors d
cross join (
  values ('ro'), ('en')
) as required_locale(locale)
left join public.doctor_translations dt
  on dt.doctor_id = d.id
 and dt.locale = required_locale.locale
where d.status = 'active'
  and (
    dt.id is null
    or nullif(trim(dt.title), '') is null
    or nullif(trim(dt.biography), '') is null
    or nullif(trim(dt.meta_title), '') is null
    or nullif(trim(dt.meta_description), '') is null
  )
order by d.slug, required_locale.locale;


-- -----------------------------------------------------
-- 4. Clinic translation field completeness
-- -----------------------------------------------------

select
  c.id as clinic_id,
  c.slug,
  required_locale.locale,
  ct.id as translation_id,
  nullif(trim(ct.name), '') is null
    as missing_name,
  nullif(trim(ct.description), '') is null
    as missing_description
from public.clinics c
cross join (
  values ('ro'), ('en')
) as required_locale(locale)
left join public.clinic_translations ct
  on ct.clinic_id = c.id
 and ct.locale = required_locale.locale
where c.status = 'approved'
  and (
    ct.id is null
    or nullif(trim(ct.name), '') is null
    or nullif(trim(ct.description), '') is null
  )
order by c.slug, required_locale.locale;


-- -----------------------------------------------------
-- 5. Specialty translation field completeness
-- -----------------------------------------------------

select
  s.id as specialty_id,
  s.slug,
  required_locale.locale,
  st.id as translation_id,
  nullif(trim(st.name), '') is null
    as missing_name,
  nullif(trim(st.meta_title), '') is null
    as missing_meta_title,
  nullif(trim(st.meta_description), '') is null
    as missing_meta_description
from public.specialties s
cross join (
  values ('ro'), ('en')
) as required_locale(locale)
left join public.specialty_translations st
  on st.specialty_id = s.id
 and st.locale = required_locale.locale
where s.is_active = true
  and (
    st.id is null
    or nullif(trim(st.name), '') is null
    or nullif(trim(st.meta_title), '') is null
    or nullif(trim(st.meta_description), '') is null
  )
order by s.slug, required_locale.locale;


-- -----------------------------------------------------
-- 6. City translation field completeness
-- -----------------------------------------------------

select
  c.id as city_id,
  c.slug,
  required_locale.locale,
  ct.id as translation_id,
  nullif(trim(ct.name), '') is null
    as missing_name
from public.cities c
cross join (
  values ('ro'), ('en')
) as required_locale(locale)
left join public.city_translations ct
  on ct.city_id = c.id
 and ct.locale = required_locale.locale
where c.is_active = true
  and (
    ct.id is null
    or nullif(trim(ct.name), '') is null
  )
order by c.slug, required_locale.locale;


-- -----------------------------------------------------
-- 7. Duplicate translation rows
-- -----------------------------------------------------

select
  'doctor_translations' as table_name,
  doctor_id as entity_id,
  locale,
  count(*) as duplicate_count
from public.doctor_translations
group by doctor_id, locale
having count(*) > 1

union all

select
  'clinic_translations',
  clinic_id,
  locale,
  count(*)
from public.clinic_translations
group by clinic_id, locale
having count(*) > 1

union all

select
  'specialty_translations',
  specialty_id,
  locale,
  count(*)
from public.specialty_translations
group by specialty_id, locale
having count(*) > 1

union all

select
  'city_translations',
  city_id,
  locale,
  count(*)
from public.city_translations
group by city_id, locale
having count(*) > 1

order by table_name, entity_id, locale;
