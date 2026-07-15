begin;

-- Step 78A — Independent-doctor registration
--
-- IMPORTANT:
-- This migration makes only the doctor account type immutable.
-- It does not restrict updates to profile details, contact information,
-- specialties, services, availability, clinic associations or Staff access.
--
-- Admin-invited testing doctors must be created as:
--   account_type = 'independent'
--
-- Their temporary free/testing access must be stored separately from
-- account_type. When the testing period ends, only the temporary access ends;
-- the doctor account remains independent.
--
-- Professional licence / registration numbers remain informational:
-- no uniqueness constraint, duplicate warning, matching or merge behavior.

alter table public.doctor_applications
  add column if not exists account_type text;

update public.doctor_applications as application
set account_type = coalesce(
  (
    select doctor.account_type
    from public.doctors as doctor
    where doctor.profile_id = application.profile_id
    limit 1
  ),
  'independent'
)
where application.account_type is null;

alter table public.doctor_applications
  alter column account_type set default 'independent';

alter table public.doctor_applications
  alter column account_type set not null;

alter table public.doctor_applications
  drop constraint if exists doctor_applications_account_type_check;

alter table public.doctor_applications
  add constraint doctor_applications_account_type_check
  check (
    account_type in (
      'independent',
      'clinic_invited'
    )
  );

create index if not exists
  idx_doctor_applications_account_type
on public.doctor_applications (
  account_type
);

create or replace function public.prevent_doctor_application_account_type_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.account_type is distinct from old.account_type then
    raise exception
      'doctor_application_account_type_is_immutable'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists
  prevent_doctor_application_account_type_change
on public.doctor_applications;

create trigger
  prevent_doctor_application_account_type_change
before update of account_type
on public.doctor_applications
for each row
execute function
  public.prevent_doctor_application_account_type_change();

create or replace function public.prevent_doctor_account_type_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.account_type is distinct from old.account_type then
    raise exception
      'doctor_account_type_is_immutable'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists
  prevent_doctor_account_type_change
on public.doctors;

create trigger
  prevent_doctor_account_type_change
before update of account_type
on public.doctors
for each row
execute function
  public.prevent_doctor_account_type_change();

create or replace function public.validate_new_doctor_account_type()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  application_account_type text;
begin
  select application.account_type
  into application_account_type
  from public.doctor_applications as application
  where application.profile_id = new.profile_id
  limit 1;

  if (
    application_account_type is not null
    and new.account_type is distinct from application_account_type
  ) then
    raise exception
      'doctor_account_type_does_not_match_application'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists
  validate_new_doctor_account_type
on public.doctors;

create trigger
  validate_new_doctor_account_type
before insert
on public.doctors
for each row
execute function
  public.validate_new_doctor_account_type();

comment on column public.doctor_applications.account_type is
  'Immutable doctor account category. Public and Admin-testing doctors are independent. Clinic invitation accounts are clinic_invited. Temporary Admin access is stored separately.';

commit;
