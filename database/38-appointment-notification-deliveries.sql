-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 62F: Notification delivery logging
--
-- File:
-- ROMDOC/database/38-appointment-notification-deliveries.sql
--
-- Adds immutable delivery-attempt logging for appointment
-- lifecycle email notifications.
-- =====================================================

begin;

create table if not exists public.appointment_notification_deliveries (
  id uuid primary key default gen_random_uuid(),

  appointment_id uuid not null
    references public.appointments(id)
    on update cascade
    on delete restrict,

  notification_type text not null
    check (
      notification_type in (
        'confirmed',
        'rescheduled',
        'cancelled',
        'completed',
        'no_show'
      )
    ),

  channel text not null default 'email'
    check (channel in ('email')),

  recipient_email text not null,

  delivery_status text not null
    check (
      delivery_status in (
        'sent',
        'failed',
        'skipped'
      )
    ),

  provider text not null default 'resend',
  provider_message_id text,
  error_code text,
  error_message text,

  triggered_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now(),

  constraint appointment_notification_email_length_check
    check (
      char_length(recipient_email) between 3 and 320
    ),

  constraint appointment_notification_error_length_check
    check (
      error_message is null
      or char_length(error_message) <= 2000
    )
);

comment on table public.appointment_notification_deliveries is
  'Immutable record of appointment lifecycle notification delivery attempts.';

create index if not exists
  idx_appointment_notification_appointment_created
on public.appointment_notification_deliveries (
  appointment_id,
  created_at desc
);

create index if not exists
  idx_appointment_notification_status_created
on public.appointment_notification_deliveries (
  delivery_status,
  created_at desc
);

create index if not exists
  idx_appointment_notification_type_created
on public.appointment_notification_deliveries (
  notification_type,
  created_at desc
);

create or replace function public.prevent_appointment_notification_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'appointment_notification_deliveries_are_immutable'
    using errcode = '55000';
end;
$$;

drop trigger if exists
  prevent_appointment_notification_update
on public.appointment_notification_deliveries;

create trigger
  prevent_appointment_notification_update
before update
on public.appointment_notification_deliveries
for each row
execute function public.prevent_appointment_notification_mutation();

drop trigger if exists
  prevent_appointment_notification_delete
on public.appointment_notification_deliveries;

create trigger
  prevent_appointment_notification_delete
before delete
on public.appointment_notification_deliveries
for each row
execute function public.prevent_appointment_notification_mutation();

alter table public.appointment_notification_deliveries
  enable row level security;

create policy
  "Admins can read appointment notification deliveries"
on public.appointment_notification_deliveries
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'active'
  )
);

create policy
  "Doctors can read own appointment notification deliveries"
on public.appointment_notification_deliveries
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments appointment
    join public.doctors doctor
      on doctor.id = appointment.doctor_id
    join public.profiles profile
      on profile.id = doctor.profile_id
    where appointment.id =
      appointment_notification_deliveries.appointment_id
      and doctor.profile_id = auth.uid()
      and profile.account_status = 'active'
  )
);

create policy
  "Staff can read assigned appointment notification deliveries"
on public.appointment_notification_deliveries
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments appointment
    where appointment.id =
      appointment_notification_deliveries.appointment_id
      and appointment.clinic_id is not null
      and public.is_staff_for_doctor_clinic(
        auth.uid(),
        appointment.doctor_id,
        appointment.clinic_id
      )
  )
);

revoke all
on table public.appointment_notification_deliveries
from public, anon, authenticated;

grant select
on table public.appointment_notification_deliveries
to authenticated;

commit;
