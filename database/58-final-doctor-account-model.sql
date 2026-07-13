-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 77A: Final doctor account model
--
-- Project path:
-- ROMDOC/database/58-final-doctor-account-model.sql
--
-- Final account types:
--   independent
--   clinic_invited
--
-- Rules:
--   - account_type is immutable after doctor creation
--   - independent doctors cannot be linked to a clinic organization
--   - clinic-invited doctors require both organization and relationship
--   - clinic-invited doctors cannot hold direct doctor subscriptions
-- =====================================================

begin;

-- =====================================================
-- 1. NORMALIZE LEGACY ACCOUNT TYPE
-- =====================================================

update public.doctors
set account_type = 'clinic_invited'
where account_type = 'clinic_sub_account';

-- Refuse to continue if an unknown account type exists.
do $$
declare
  invalid_count bigint;
begin
  select count(*)
  into invalid_count
  from public.doctors
  where account_type is null
     or account_type not in (
       'independent',
       'clinic_invited'
     );

  if invalid_count > 0 then
    raise exception
      'doctor_account_type_migration_blocked: % invalid doctor account type row(s)',
      invalid_count;
  end if;
end;
$$;

-- =====================================================
-- 2. REPLACE ACCOUNT-TYPE CHECK CONSTRAINT
-- =====================================================

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.doctors'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%account_type%'
  loop
    execute format(
      'alter table public.doctors drop constraint %I',
      constraint_record.conname
    );
  end loop;
end;
$$;

alter table public.doctors
  alter column account_type
  set default 'independent';

alter table public.doctors
  alter column account_type
  set not null;

alter table public.doctors
  add constraint doctors_account_type_check
  check (
    account_type in (
      'independent',
      'clinic_invited'
    )
  );

-- =====================================================
-- 3. VALIDATE ACCOUNT-TYPE LINKAGE
-- =====================================================

do $$
declare
  invalid_count bigint;
begin
  select count(*)
  into invalid_count
  from public.doctors
  where (
    account_type = 'independent'
    and (
      clinic_organization_id is not null
      or clinic_doctor_relationship_id is not null
    )
  )
  or (
    account_type = 'clinic_invited'
    and (
      clinic_organization_id is null
      or clinic_doctor_relationship_id is null
    )
  );

  if invalid_count > 0 then
    raise exception
      'doctor_account_linkage_migration_blocked: % invalid doctor linkage row(s)',
      invalid_count;
  end if;
end;
$$;

alter table public.doctors
  drop constraint if exists
    doctors_account_type_linkage_check;

alter table public.doctors
  add constraint
    doctors_account_type_linkage_check
  check (
    (
      account_type = 'independent'
      and clinic_organization_id is null
      and clinic_doctor_relationship_id is null
    )
    or
    (
      account_type = 'clinic_invited'
      and clinic_organization_id is not null
      and clinic_doctor_relationship_id is not null
    )
  );

-- =====================================================
-- 4. MAKE DOCTOR ACCOUNT IDENTITY IMMUTABLE
-- =====================================================

create or replace function
  public.prevent_doctor_account_identity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.account_type is distinct from new.account_type then
    raise exception
      'doctor_account_type_is_immutable'
      using errcode = '55000';
  end if;

  if (
    old.clinic_organization_id
      is distinct from
    new.clinic_organization_id
  ) then
    raise exception
      'doctor_clinic_organization_is_immutable'
      using errcode = '55000';
  end if;

  if (
    old.clinic_doctor_relationship_id
      is distinct from
    new.clinic_doctor_relationship_id
  ) then
    raise exception
      'doctor_clinic_relationship_is_immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists
  prevent_doctor_account_identity_update
on public.doctors;

create trigger
  prevent_doctor_account_identity_update
before update of
  account_type,
  clinic_organization_id,
  clinic_doctor_relationship_id
on public.doctors
for each row
execute function
  public.prevent_doctor_account_identity_change();

-- =====================================================
-- 5. PREVENT DIRECT SUBSCRIPTIONS FOR CLINIC-INVITED
-- =====================================================

create or replace function
  public.enforce_independent_doctor_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_account_type text;
begin
  if new.doctor_id is not null then
    select doctor.account_type
    into resolved_account_type
    from public.doctors as doctor
    where doctor.id = new.doctor_id;
  elsif new.profile_id is not null then
    select doctor.account_type
    into resolved_account_type
    from public.doctors as doctor
    where doctor.profile_id = new.profile_id
    limit 1;
  end if;

  if resolved_account_type = 'clinic_invited' then
    raise exception
      'clinic_invited_doctor_cannot_have_direct_subscription'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists
  enforce_independent_doctor_subscription_write
on public.doctor_subscriptions;

create trigger
  enforce_independent_doctor_subscription_write
before insert or update of
  doctor_id,
  profile_id
on public.doctor_subscriptions
for each row
execute function
  public.enforce_independent_doctor_subscription();

-- Check existing direct subscriptions before validating the new rule.
do $$
declare
  invalid_count bigint;
begin
  select count(*)
  into invalid_count
  from public.doctor_subscriptions as subscription
  join public.doctors as doctor
    on (
      doctor.id = subscription.doctor_id
      or (
        subscription.doctor_id is null
        and doctor.profile_id = subscription.profile_id
      )
    )
  where doctor.account_type = 'clinic_invited';

  if invalid_count > 0 then
    raise exception
      'doctor_subscription_migration_blocked: % clinic-invited direct subscription row(s)',
      invalid_count;
  end if;
end;
$$;

-- =====================================================
-- 6. DOCUMENT THE FINAL MODEL
-- =====================================================

comment on column public.doctors.account_type is
  'Immutable doctor account identity: independent or clinic_invited.';

comment on column public.doctors.clinic_organization_id is
  'Required and immutable for clinic_invited doctors; null for independent doctors.';

comment on column public.doctors.clinic_doctor_relationship_id is
  'Required and immutable for clinic_invited doctors; null for independent doctors.';

comment on function
  public.prevent_doctor_account_identity_change()
is
  'Prevents converting or relinking an existing doctor account. A different commercial model requires a new Auth/profile/doctor account.';

comment on function
  public.enforce_independent_doctor_subscription()
is
  'Rejects direct doctor subscriptions for clinic-invited doctor accounts.';

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  account_type,
  count(*) as doctor_count,
  count(*) filter (
    where clinic_organization_id is not null
  ) as with_organization,
  count(*) filter (
    where clinic_doctor_relationship_id is not null
  ) as with_relationship
from public.doctors
group by account_type
order by account_type;

select
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.doctors'::regclass
  and contype = 'c'
  and (
    conname = 'doctors_account_type_check'
    or conname = 'doctors_account_type_linkage_check'
  )
order by conname;

select
  trigger_name,
  event_manipulation,
  action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and (
    (
      event_object_table = 'doctors'
      and trigger_name =
        'prevent_doctor_account_identity_update'
    )
    or
    (
      event_object_table = 'doctor_subscriptions'
      and trigger_name =
        'enforce_independent_doctor_subscription_write'
    )
  )
order by event_object_table, trigger_name;
