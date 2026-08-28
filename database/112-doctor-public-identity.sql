-- Step 7B — Doctor Public Identity
-- Adds a dedicated public display name for doctors.
-- The public profile slug is updated by the application whenever public_name changes.
-- public_name remains nullable only for compatibility with older Doctor-creation paths;
-- all existing Doctor rows are backfilled below and public display code prefers public_name.

begin;

alter table public.doctors
  add column if not exists public_name text;

-- Preserve the current visible name as closely as possible for existing doctors.
-- Until Step 7B, public doctor names were derived from the slug.
update public.doctors
set public_name = initcap(replace(slug, '-', ' '))
where public_name is null
   or btrim(public_name) = '';


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'doctors_public_name_length_check'
      and conrelid = 'public.doctors'::regclass
  ) then
    alter table public.doctors
      add constraint doctors_public_name_length_check
      check (public_name is null or char_length(btrim(public_name)) between 2 and 200);
  end if;
end
$$;

comment on column public.doctors.public_name is
  'Doctor-controlled public display name. Separate from profiles first_name/last_name and Supabase Auth identity.';

commit;
