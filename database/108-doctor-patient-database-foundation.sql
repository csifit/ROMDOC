-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 108: Doctor Patient Database foundation
--
-- File:
-- ROMDOC/database/108-doctor-patient-database-foundation.sql
--
-- Adds:
--   - doctor-specific patient CRM index
--   - manual patients without a RomDoc patient account
--   - optional link to profiles.id when an account exists
--   - automatic synchronization from appointments
--   - backfill from existing appointments
--   - Doctor-only RLS for this CRM table
--
-- Important:
--   This table is NOT a second Medical Folder.
--   Existing Medical Profile, Emergency Summary, Medical
--   Folder and their immutable audit histories remain the
--   clinical source of truth.
--
-- Independent Doctors and clinic-funded Doctors use the
-- same table. Rows are isolated by doctors.id.
--
-- Staff permissions are intentionally unchanged.
-- =====================================================

begin;

create table if not exists public.doctor_patients (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on update cascade
    on delete cascade,

  patient_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  display_name text not null,
  email text,
  phone text,

  source text not null default 'manual'
    constraint doctor_patients_source_check
    check (
      source in (
        'manual',
        'appointment'
      )
    ),

  created_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint doctor_patients_display_name_check
    check (
      char_length(trim(display_name))
      between 2 and 200
    ),

  constraint doctor_patients_contact_check
    check (
      nullif(trim(coalesce(email, '')), '') is not null
      or
      nullif(trim(coalesce(phone, '')), '') is not null
    )
);

comment on table public.doctor_patients is
  'Doctor-specific patient CRM index. A row may exist before the Patient creates a RomDoc account. Clinical records remain in the existing Medical Folder tables.';

comment on column public.doctor_patients.patient_profile_id is
  'Optional RomDoc Patient profile link. NULL is valid for a manually added patient without a RomDoc account.';

create unique index if not exists
  idx_doctor_patients_doctor_profile_unique
on public.doctor_patients (
  doctor_id,
  patient_profile_id
)
where patient_profile_id is not null;

create index if not exists
  idx_doctor_patients_doctor_name
on public.doctor_patients (
  doctor_id,
  lower(display_name)
);

create index if not exists
  idx_doctor_patients_doctor_created
on public.doctor_patients (
  doctor_id,
  created_at desc
);

create index if not exists
  idx_doctor_patients_profile
on public.doctor_patients (
  patient_profile_id
)
where patient_profile_id is not null;

drop trigger if exists
  set_doctor_patients_updated_at
on public.doctor_patients;

create trigger
  set_doctor_patients_updated_at
before update
on public.doctor_patients
for each row
execute function public.handle_updated_at();

-- =====================================================
-- AUTOMATIC APPOINTMENT -> PATIENT DATABASE SYNC
-- =====================================================
-- Matching priority:
--   1. Same doctor + patient_profile_id, when available.
--   2. Same doctor + same patient name + same email OR phone.
--
-- We deliberately do not merge solely by phone/email because
-- family members may share contact details.
-- =====================================================

create or replace function
  public.sync_doctor_patient_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  target_patient_id uuid;
  normalized_name text;
  normalized_email text;
  normalized_phone text;
begin
  if new.doctor_id is null then
    return new;
  end if;

  normalized_name :=
    lower(trim(coalesce(new.patient_name, '')));

  normalized_email :=
    lower(trim(coalesce(new.patient_email, '')));

  normalized_phone :=
    regexp_replace(
      coalesce(new.patient_phone, ''),
      '[^0-9]',
      '',
      'g'
    );

  if char_length(normalized_name) < 2 then
    return new;
  end if;

  if normalized_email = ''
    and normalized_phone = ''
  then
    return new;
  end if;

  if new.patient_profile_id is not null then
    select patient.id
    into target_patient_id
    from public.doctor_patients as patient
    where patient.doctor_id = new.doctor_id
      and patient.patient_profile_id =
        new.patient_profile_id
    limit 1;
  end if;

  if target_patient_id is null then
    select patient.id
    into target_patient_id
    from public.doctor_patients as patient
    where patient.doctor_id = new.doctor_id
      and lower(trim(patient.display_name)) =
        normalized_name
      and (
        (
          normalized_email <> ''
          and lower(trim(coalesce(patient.email, ''))) =
            normalized_email
        )
        or
        (
          normalized_phone <> ''
          and regexp_replace(
            coalesce(patient.phone, ''),
            '[^0-9]',
            '',
            'g'
          ) = normalized_phone
        )
      )
    order by
      patient.patient_profile_id is not null desc,
      patient.created_at asc
    limit 1;
  end if;

  if target_patient_id is not null then
    update public.doctor_patients
    set
      patient_profile_id =
        coalesce(
          patient_profile_id,
          new.patient_profile_id
        ),
      display_name =
        coalesce(
          nullif(trim(new.patient_name), ''),
          display_name
        ),
      email =
        coalesce(
          nullif(lower(trim(new.patient_email)), ''),
          email
        ),
      phone =
        coalesce(
          nullif(trim(new.patient_phone), ''),
          phone
        ),
      updated_at = now()
    where id = target_patient_id;

    return new;
  end if;

  insert into public.doctor_patients (
    doctor_id,
    patient_profile_id,
    display_name,
    email,
    phone,
    source,
    created_by_profile_id
  )
  values (
    new.doctor_id,
    new.patient_profile_id,
    trim(new.patient_name),
    nullif(lower(trim(coalesce(new.patient_email, ''))), ''),
    nullif(trim(coalesce(new.patient_phone, '')), ''),
    'appointment',
    new.created_by_profile_id
  )
  on conflict (
    doctor_id,
    patient_profile_id
  )
  where patient_profile_id is not null
  do update
  set
    display_name = excluded.display_name,
    email = coalesce(
      excluded.email,
      public.doctor_patients.email
    ),
    phone = coalesce(
      excluded.phone,
      public.doctor_patients.phone
    ),
    updated_at = now();

  return new;
end;
$function$;

revoke all
on function public.sync_doctor_patient_from_appointment()
from public, anon, authenticated;

drop trigger if exists
  sync_doctor_patient_from_appointment_trigger
on public.appointments;

create trigger
  sync_doctor_patient_from_appointment_trigger
after insert or update of
  patient_profile_id,
  patient_name,
  patient_email,
  patient_phone
on public.appointments
for each row
execute function
  public.sync_doctor_patient_from_appointment();

-- =====================================================
-- BACKFILL EXISTING APPOINTMENTS
-- =====================================================

with ranked_appointments as (
  select
    appointment.*,
    row_number() over (
      partition by
        appointment.doctor_id,
        coalesce(
          appointment.patient_profile_id::text,
          lower(trim(appointment.patient_name))
          || '|'
          || case
            when nullif(
              lower(trim(coalesce(appointment.patient_email, ''))),
              ''
            ) is not null
              then 'email:' || lower(trim(appointment.patient_email))
            else 'phone:' || regexp_replace(
              coalesce(appointment.patient_phone, ''),
              '[^0-9]',
              '',
              'g'
            )
          end
        )
      order by
        coalesce(
          appointment.scheduled_date,
          appointment.requested_date
        ) desc,
        coalesce(
          appointment.scheduled_time,
          appointment.requested_time
        ) desc nulls last,
        appointment.created_at desc
    ) as row_number_for_patient
  from public.appointments as appointment
  where appointment.doctor_id is not null
    and char_length(trim(appointment.patient_name)) >= 2
    and (
      nullif(
        trim(coalesce(appointment.patient_email, '')),
        ''
      ) is not null
      or
      nullif(
        trim(coalesce(appointment.patient_phone, '')),
        ''
      ) is not null
    )
)
insert into public.doctor_patients (
  doctor_id,
  patient_profile_id,
  display_name,
  email,
  phone,
  source,
  created_by_profile_id,
  created_at,
  updated_at
)
select
  appointment.doctor_id,
  appointment.patient_profile_id,
  trim(appointment.patient_name),
  nullif(
    lower(trim(coalesce(appointment.patient_email, ''))),
    ''
  ),
  nullif(
    trim(coalesce(appointment.patient_phone, '')),
    ''
  ),
  'appointment',
  appointment.created_by_profile_id,
  appointment.created_at,
  now()
from ranked_appointments as appointment
where appointment.row_number_for_patient = 1
on conflict (
  doctor_id,
  patient_profile_id
)
where patient_profile_id is not null
do update
set
  display_name = excluded.display_name,
  email = coalesce(
    excluded.email,
    public.doctor_patients.email
  ),
  phone = coalesce(
    excluded.phone,
    public.doctor_patients.phone
  ),
  updated_at = now();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.doctor_patients
  enable row level security;

drop policy if exists
  "Doctors can read own patient CRM"
on public.doctor_patients;

drop policy if exists
  "Doctors can create own patient CRM entries"
on public.doctor_patients;

drop policy if exists
  "Doctors can update own patient CRM entries"
on public.doctor_patients;

-- Direct Doctor UPDATE access is intentionally not granted
-- in Step 108. Appointment synchronization is performed by
-- the SECURITY DEFINER trigger above. A later audited
-- contact/address editing step can add a protected update
-- function without exposing arbitrary patient_profile_id
-- changes.

revoke all
on table public.doctor_patients
from public, anon, authenticated;

grant select, insert
on table public.doctor_patients
to authenticated;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'doctor_patients'
order by ordinal_position;

select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'doctor_patients'
order by policyname;

select
  count(*) as doctor_patient_rows,
  count(*) filter (
    where patient_profile_id is not null
  ) as linked_romdoc_patients,
  count(*) filter (
    where patient_profile_id is null
  ) as contact_only_patients
from public.doctor_patients;
