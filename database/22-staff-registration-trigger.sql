-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 54A: Support invited staff in registration trigger
--
-- File:
-- ROMDOC/database/22-staff-registration-trigger.sql
-- =====================================================

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_registration_type text;
  assigned_role text;

  submitted_specialty_id uuid;
  submitted_city_id uuid;

  raw_specialty_id text;
  raw_city_id text;
begin
  requested_registration_type :=
    lower(
      trim(
        coalesce(
          new.raw_user_meta_data
            ->> 'registration_type',
          'patient'
        )
      )
    );

  assigned_role :=
    case
      when requested_registration_type = 'doctor'
        then 'doctor_applicant'

      when requested_registration_type = 'staff'
        then 'staff'

      else 'patient'
    end;

  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  values (
    new.id,
    assigned_role,

    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data
            ->> 'first_name',
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data
            ->> 'last_name',
          ''
        )
      ),
      ''
    ),

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
        else excluded.role
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

    updated_at = now();

  if assigned_role = 'doctor_applicant' then
    raw_specialty_id :=
      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data
              ->> 'specialty_id',
            ''
          )
        ),
        ''
      );

    raw_city_id :=
      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data
              ->> 'city_id',
            ''
          )
        ),
        ''
      );

    if (
      raw_specialty_id is not null
      and raw_specialty_id ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) then
      submitted_specialty_id :=
        raw_specialty_id::uuid;
    end if;

    if (
      raw_city_id is not null
      and raw_city_id ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) then
      submitted_city_id :=
        raw_city_id::uuid;
    end if;

    if (
      submitted_specialty_id is not null
      and not exists (
        select 1
        from public.specialties
        where id =
          submitted_specialty_id
      )
    ) then
      submitted_specialty_id :=
        null;
    end if;

    if (
      submitted_city_id is not null
      and not exists (
        select 1
        from public.cities
        where id =
          submitted_city_id
      )
    ) then
      submitted_city_id :=
        null;
    end if;

    insert into public.doctor_applications (
      profile_id,
      phone,
      specialty_id,
      city_id,
      professional_registration_number,
      message,
      status,
      created_at,
      updated_at
    )
    values (
      new.id,

      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data
              ->> 'phone',
            ''
          )
        ),
        ''
      ),

      submitted_specialty_id,
      submitted_city_id,

      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data
              ->> 'professional_registration_number',
            ''
          )
        ),
        ''
      ),

      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data
              ->> 'message',
            ''
          )
        ),
        ''
      ),

      'pending_payment',
      now(),
      now()
    )
    on conflict (profile_id) do update
    set
      phone =
        coalesce(
          excluded.phone,
          public.doctor_applications.phone
        ),

      specialty_id =
        coalesce(
          excluded.specialty_id,
          public.doctor_applications.specialty_id
        ),

      city_id =
        coalesce(
          excluded.city_id,
          public.doctor_applications.city_id
        ),

      professional_registration_number =
        coalesce(
          excluded.professional_registration_number,
          public.doctor_applications
            .professional_registration_number
        ),

      message =
        coalesce(
          excluded.message,
          public.doctor_applications.message
        ),

      updated_at = now();
  end if;

  return new;
end;
$$;

commit;