-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 64D: Reminder delivery logs and duplicate prevention
--
-- File:
-- ROMDOC/database/45-reminder-delivery-logs-deduplication.sql
--
-- Requires:
--   38-appointment-notification-deliveries.sql
--   43-appointment-reminder-scheduling.sql
--   44-appointment-reminder-processor.sql
-- =====================================================

begin;

-- =====================================================
-- 1. EXTEND DELIVERY LOGS FOR REMINDERS
-- =====================================================

alter table public.appointment_notification_deliveries
  add column if not exists reminder_schedule_id uuid
    references public.appointment_reminder_schedules(id)
    on update cascade
    on delete restrict;

alter table public.appointment_notification_deliveries
  add column if not exists appointment_occurrence_at timestamptz;

alter table public.appointment_notification_deliveries
  add column if not exists idempotency_key text;

comment on column
  public.appointment_notification_deliveries.reminder_schedule_id
is
  'Reminder schedule that caused this delivery attempt. Null for lifecycle notifications.';

comment on column
  public.appointment_notification_deliveries.appointment_occurrence_at
is
  'Appointment occurrence associated with a reminder attempt. Null for lifecycle notifications.';

comment on column
  public.appointment_notification_deliveries.idempotency_key
is
  'Provider idempotency key used to prevent duplicate email sends.';

-- Replace the original notification type check with reminder-aware values.
alter table public.appointment_notification_deliveries
  drop constraint if exists
    appointment_notification_deliveries_notification_type_check;

alter table public.appointment_notification_deliveries
  add constraint
    appointment_notification_deliveries_notification_type_check
  check (
    notification_type in (
      'confirmed',
      'rescheduled',
      'cancelled',
      'completed',
      'no_show',
      'reminder_48_hours',
      'reminder_24_hours'
    )
  );

alter table public.appointment_notification_deliveries
  add constraint
    appointment_notification_reminder_fields_check
  check (
    (
      notification_type not in (
        'reminder_48_hours',
        'reminder_24_hours'
      )
      and reminder_schedule_id is null
      and appointment_occurrence_at is null
      and idempotency_key is null
    )
    or
    (
      notification_type in (
        'reminder_48_hours',
        'reminder_24_hours'
      )
      and reminder_schedule_id is not null
      and appointment_occurrence_at is not null
      and idempotency_key is not null
    )
  ) not valid;

alter table public.appointment_notification_deliveries
  validate constraint
    appointment_notification_reminder_fields_check;

alter table public.appointment_notification_deliveries
  add constraint
    appointment_notification_idempotency_key_length_check
  check (
    idempotency_key is null
    or char_length(idempotency_key) between 1 and 256
  );

-- =====================================================
-- 2. DELIVERY-LOG INDEXES
-- =====================================================

create index if not exists
  idx_appointment_notification_reminder_schedule_created
on public.appointment_notification_deliveries (
  reminder_schedule_id,
  created_at desc
)
where reminder_schedule_id is not null;

create index if not exists
  idx_appointment_notification_occurrence_created
on public.appointment_notification_deliveries (
  appointment_id,
  appointment_occurrence_at,
  created_at desc
)
where appointment_occurrence_at is not null;

-- Only one successful delivery may exist for a reminder schedule.
create unique index if not exists
  uq_appointment_notification_sent_reminder
on public.appointment_notification_deliveries (
  reminder_schedule_id
)
where reminder_schedule_id is not null
  and delivery_status = 'sent';

-- A provider idempotency key may identify only one successful logical send.
create unique index if not exists
  uq_appointment_notification_sent_idempotency
on public.appointment_notification_deliveries (
  idempotency_key
)
where idempotency_key is not null
  and delivery_status = 'sent';

-- =====================================================
-- 3. DATABASE DUPLICATE CHECK
-- =====================================================

create or replace function
  public.appointment_reminder_already_sent(
    target_reminder_schedule_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointment_notification_deliveries
    where reminder_schedule_id =
      target_reminder_schedule_id
      and delivery_status = 'sent'
  );
$$;

revoke all
on function
  public.appointment_reminder_already_sent(uuid)
from public, anon, authenticated;

grant execute
on function
  public.appointment_reminder_already_sent(uuid)
to service_role;

comment on function
  public.appointment_reminder_already_sent(uuid)
is
  'Returns true when a successful immutable delivery already exists for a reminder schedule.';

commit;
