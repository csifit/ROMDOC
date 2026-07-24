-- =========================================================
-- RomDoc
-- Clinic Organisation self-registration and Admin approval
--
-- Exact destination:
-- ROMDOC/database/91-clinic-organization-self-registration.sql
--
-- Forward-only migration:
-- - affects future registrations only;
-- - does not backfill previously created users.
-- =========================================================

begin;

alter table public.clinic_organizations
  add column if not exists registration_city text;

alter table public.clinic_organizations
  add column if not exists application_message text;

alter table public.clinic_organizations
  add column if not exists registration_locale text;

comment on column public.clinic_organizations.registration_city is
  'City entered during Clinic Organisation account registration.';

comment on column public.clinic_organizations.application_message is
  'Optional message entered during Clinic Organisation account registration.';

comment on column public.clinic_organizations.registration_locale is
  'Language used during Clinic Organisation account registration.';


-- =========================================================
-- Create one pending Clinic Organisation for a new Auth user.
-- =========================================================

create or replace function
public.provision_clinic_organization_registration(
  target_user_id uuid,
  account_email text,
  metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_organization_id uuid;
  new_organization_id uuid;

  organization_name text;
  organization_slug_base text;
  organization_slug text;

  first_name_value text;
  last_name_value text;
  contact_name_value text;
  contact_email_value text;
  contact_phone_value text;
  website_value text;

  registration_city_value text;
  application_message_value text;
  registration_locale_value text;

  company_name_value text;
  tax_id_value text;
  trade_register_number_value text;
  billing_address_value text;
  billing_city_value text;
  billing_county_value text;
  billing_country_value text;
  billing_email_value text;
  is_vat_payer_value boolean;
  vat_number_value text;
begin
  metadata :=
    coalesce(
      metadata,
      '{}'::jsonb
    );

  if lower(
    trim(
      coalesce(
        metadata ->> 'registration_type',
        ''
      )
    )
  ) <> 'clinic' then
    return null;
  end if;

  first_name_value :=
    nullif(
      trim(
        coalesce(
          metadata ->> 'first_name',
          ''
        )
      ),
      ''
    );

  last_name_value :=
    nullif(
      trim(
        coalesce(
          metadata ->> 'last_name',
          ''
        )
      ),
      ''
    );

  contact_name_value :=
    nullif(
      trim(
        concat_ws(
          ' ',
          first_name_value,
          last_name_value
        )
      ),
      ''
    );

  contact_email_value :=
    lower(
      trim(
        coalesce(
          account_email,
          metadata ->> 'billing_email',
          ''
        )
      )
    );

  contact_phone_value :=
    nullif(
      trim(
        coalesce(
          metadata ->> 'phone',
          ''
        )
      ),
      ''
    );

  website_value :=
    nullif(
      trim(
        coalesce(
          metadata ->> 'clinic_website',
          ''
        )
      ),
      ''
    );

  registration_city_value :=
    nullif(
      trim(
        coalesce(
          metadata ->> 'clinic_city',
          ''
        )
      ),
      ''
    );

  application_message_value :=
    nullif(
      trim(
        coalesce(
          metadata ->> 'message',
          ''
        )
      ),
      ''
    );

  registration_locale_value :=
    case
      when lower(
        trim(
          coalesce(
            metadata ->> 'language',
            ''
          )
        )
      ) in (
        'ro',
        'en',
        'de'
      )
        then lower(
          trim(
            metadata ->> 'language'
          )
        )
      else 'ro'
    end;

  organization_name :=
    coalesce(
      nullif(
        trim(
          metadata ->> 'clinic_name'
        ),
        ''
      ),
      nullif(
        trim(
          metadata ->> 'billing_company_name'
        ),
        ''
      ),
      'Clinic organisation ' ||
        substr(
          replace(
            target_user_id::text,
            '-',
            ''
          ),
          1,
          8
        )
    );

  company_name_value :=
    coalesce(
      nullif(
        trim(
          metadata ->> 'billing_company_name'
        ),
        ''
      ),
      organization_name
    );

  tax_id_value :=
    coalesce(
      nullif(
        trim(
          metadata ->> 'billing_tax_id'
        ),
        ''
      ),
      'PENDING-' ||
        upper(
          substr(
            replace(
              target_user_id::text,
              '-',
              ''
            ),
            1,
            8
          )
        )
    );

  trade_register_number_value :=
    nullif(
      trim(
        coalesce(
          metadata ->> 'billing_trade_register_number',
          ''
        )
      ),
      ''
    );

  billing_address_value :=
    coalesce(
      nullif(
        trim(
          metadata ->> 'billing_address'
        ),
        ''
      ),
      'Pending completion'
    );

  billing_city_value :=
    coalesce(
      nullif(
        trim(
          metadata ->> 'billing_city'
        ),
        ''
      ),
      registration_city_value,
      'Pending'
    );

  billing_county_value :=
    coalesce(
      nullif(
        trim(
          metadata ->> 'billing_county'
        ),
        ''
      ),
      'Pending'
    );

  billing_country_value :=
    coalesce(
      nullif(
        trim(
          metadata ->> 'billing_country'
        ),
        ''
      ),
      'Romania'
    );

  billing_email_value :=
    lower(
      coalesce(
        nullif(
          trim(
            metadata ->> 'billing_email'
          ),
          ''
        ),
        nullif(
          contact_email_value,
          ''
        ),
        'pending@example.invalid'
      )
    );

  is_vat_payer_value :=
    lower(
      trim(
        coalesce(
          metadata ->> 'is_vat_payer',
          'false'
        )
      )
    ) in (
      'true',
      '1',
      'yes',
      'on'
    );

  vat_number_value :=
    nullif(
      trim(
        coalesce(
          metadata ->> 'vat_number',
          ''
        )
      ),
      ''
    );

  -- The existing general Auth trigger creates the profile first.
  -- Convert the new Clinic registration from patient to clinic_manager.
  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    'clinic_manager',
    first_name_value,
    last_name_value,
    now(),
    now()
  )
  on conflict (id) do update
  set
    role =
      case
        when public.profiles.role in (
          'admin',
          'doctor'
        )
          then public.profiles.role
        else 'clinic_manager'
      end,

    first_name =
      coalesce(
        excluded.first_name,
        public.profiles.first_name
      ),

    last_name =
      coalesce(
        excluded.last_name,
        public.profiles.last_name
      ),

    updated_at =
      now();

  -- Safety against duplicate organisations if the trigger is re-run.
  select
    member.organization_id
  into
    existing_organization_id
  from public.clinic_organization_members as member
  where member.profile_id =
    target_user_id
  order by
    member.created_at asc
  limit 1;

  if existing_organization_id is not null then
    return existing_organization_id;
  end if;

  organization_slug_base :=
    trim(
      both '-'
      from regexp_replace(
        lower(
          organization_name
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    );

  if organization_slug_base is null
     or organization_slug_base = '' then
    organization_slug_base :=
      'clinic-organisation';
  end if;

  organization_slug :=
    left(
      organization_slug_base,
      48
    ) ||
    '-' ||
    substr(
      replace(
        target_user_id::text,
        '-',
        ''
      ),
      1,
      8
    );

  insert into public.clinic_organizations (
    name,
    slug,
    status,
    contact_name,
    contact_email,
    contact_phone,
    website,
    registration_city,
    application_message,
    registration_locale,
    created_by_profile_id,
    created_at,
    updated_at
  )
  values (
    organization_name,
    organization_slug,
    'pending',
    contact_name_value,
    nullif(
      contact_email_value,
      ''
    ),
    contact_phone_value,
    website_value,
    registration_city_value,
    application_message_value,
    registration_locale_value,
    target_user_id,
    now(),
    now()
  )
  returning id
  into new_organization_id;

  insert into public.clinic_organization_billing_profiles (
    organization_id,
    company_name,
    tax_id,
    trade_register_number,
    billing_address,
    billing_city,
    billing_county,
    billing_country,
    billing_email,
    is_vat_payer,
    vat_number,
    created_by_profile_id,
    updated_by_profile_id,
    created_at,
    updated_at
  )
  values (
    new_organization_id,
    company_name_value,
    tax_id_value,
    trade_register_number_value,
    billing_address_value,
    billing_city_value,
    billing_county_value,
    billing_country_value,
    billing_email_value,
    is_vat_payer_value,
    vat_number_value,
    target_user_id,
    target_user_id,
    now(),
    now()
  );

  insert into public.clinic_organization_members (
    organization_id,
    profile_id,
    member_role,
    status,
    created_at,
    updated_at
  )
  values (
    new_organization_id,
    target_user_id,
    'owner',
    'active',
    now(),
    now()
  )
  on conflict (
    organization_id,
    profile_id
  ) do update
  set
    member_role =
      'owner',
    status =
      'active',
    updated_at =
      now();

  return new_organization_id;
end;
$$;

revoke execute
on function
public.provision_clinic_organization_registration(
  uuid,
  text,
  jsonb
)
from public, anon, authenticated;


-- =========================================================
-- Dedicated Auth trigger for future Clinic Organisation users.
--
-- `zz_` ensures it runs after the existing generic
-- `on_auth_user_created` trigger.
-- =========================================================

create or replace function
public.handle_clinic_organization_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(
    trim(
      coalesce(
        new.raw_user_meta_data
          ->> 'registration_type',
        ''
      )
    )
  ) = 'clinic' then
    perform
      public.provision_clinic_organization_registration(
        new.id,
        new.email,
        new.raw_user_meta_data
      );
  end if;

  return new;
end;
$$;

revoke execute
on function
public.handle_clinic_organization_signup()
from public, anon, authenticated;

drop trigger if exists
  zz_on_auth_clinic_organization_created
on auth.users;

create trigger
  zz_on_auth_clinic_organization_created
after insert
on auth.users
for each row
execute function
  public.handle_clinic_organization_signup();

commit;


-- =========================================================
-- Verification: only future clinic registrations are listed.
-- =========================================================

select
  profile.id,
  profile.role,
  organization.name,
  organization.status,
  member.member_role,
  member.status as member_status,
  organization.created_at
from public.profiles as profile
join public.clinic_organization_members as member
  on member.profile_id =
    profile.id
join public.clinic_organizations as organization
  on organization.id =
    member.organization_id
where profile.role =
  'clinic_manager'
order by
  organization.created_at desc;
