-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Clinic blocking
--
-- Project path:
-- ROMDOC/database/56-clinic-blocking.sql
--
-- Adds:
--   - blocked clinic status
--   - block audit metadata
--   - validation that block metadata stays consistent
-- =====================================================

begin;

alter table public.clinics
  add column if not exists blocked_at timestamptz;

alter table public.clinics
  add column if not exists blocked_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete restrict;

alter table public.clinics
  add column if not exists blocked_reason text;

alter table public.clinics
  drop constraint if exists clinics_status_check;

alter table public.clinics
  add constraint clinics_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected',
      'blocked'
    )
  );

alter table public.clinics
  drop constraint if exists clinics_block_metadata_check;

alter table public.clinics
  add constraint clinics_block_metadata_check
  check (
    (
      status = 'blocked'
      and blocked_at is not null
      and blocked_by_profile_id is not null
      and char_length(
        trim(blocked_reason)
      ) between 3 and 1000
    )
    or
    (
      status <> 'blocked'
      and blocked_at is null
      and blocked_by_profile_id is null
      and blocked_reason is null
    )
  );

comment on column public.clinics.blocked_at is
  'Timestamp when an approved clinic was blocked by a RomDoc administrator.';

comment on column public.clinics.blocked_by_profile_id is
  'Administrator profile that blocked the clinic.';

comment on column public.clinics.blocked_reason is
  'Required internal reason for blocking the clinic.';

-- =====================================================
-- PREVENT NEW BOOKINGS AT NON-APPROVED CLINICS
-- =====================================================
--
-- Existing appointments remain intact when a clinic is blocked.
-- Only new appointments, or attempts to move an appointment to
-- another clinic, require the target clinic to be approved.
-- =====================================================

create or replace function
  public.require_approved_clinic_for_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_clinic_status text;
begin
  if new.clinic_id is null then
    return new;
  end if;

  select clinic.status
  into target_clinic_status
  from public.clinics as clinic
  where clinic.id = new.clinic_id;

  if
    target_clinic_status is distinct from
    'approved'
  then
    raise exception
      'appointment_clinic_is_not_approved'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists
  appointments_require_approved_clinic
on public.appointments;

create trigger
  appointments_require_approved_clinic
before insert or update of clinic_id
on public.appointments
for each row
execute function
  public.require_approved_clinic_for_appointment();

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
  and table_name = 'clinics'
  and column_name in (
    'status',
    'blocked_at',
    'blocked_by_profile_id',
    'blocked_reason'
  )
order by ordinal_position;
