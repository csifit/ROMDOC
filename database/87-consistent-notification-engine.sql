-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 3E: Consistent notification engine
--
-- Exact path:
-- ROMDOC/database/87-consistent-notification-engine.sql
-- =====================================================

begin;

-- -----------------------------------------------------
-- 1. Extend immutable delivery attempts to all channels.
-- -----------------------------------------------------

alter table public.appointment_notification_deliveries
  add column if not exists audit_event_id uuid
    references public.appointment_audit_events(id)
    on update cascade
    on delete restrict;

alter table public.appointment_notification_deliveries
  add column if not exists recipient_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null;

alter table public.appointment_notification_deliveries
  add column if not exists recipient_phone text;

alter table public.appointment_notification_deliveries
  add column if not exists idempotency_key text;

alter table public.appointment_notification_deliveries
  alter column recipient_email drop not null;

alter table public.appointment_notification_deliveries
  drop constraint if exists appointment_notification_deliveries_channel_check;

alter table public.appointment_notification_deliveries
  add constraint appointment_notification_deliveries_channel_check
  check (
    channel in (
      'email',
      'sms'
    )
  );

alter table public.appointment_notification_deliveries
  drop constraint if exists appointment_notification_deliveries_delivery_status_check;

alter table public.appointment_notification_deliveries
  add constraint appointment_notification_deliveries_delivery_status_check
  check (
    delivery_status in (
      'sent',
      'failed',
      'skipped'
    )
  );

alter table public.appointment_notification_deliveries
  drop constraint if exists appointment_notification_email_length_check;

alter table public.appointment_notification_deliveries
  add constraint appointment_notification_recipient_check
  check (
    (
      channel = 'email'
      and recipient_email is not null
      and char_length(recipient_email) between 3 and 320
    )
    or
    (
      channel = 'sms'
      and recipient_phone is not null
      and char_length(recipient_phone) between 8 and 32
    )
  );

create unique index if not exists
  idx_appointment_notification_idempotency
on public.appointment_notification_deliveries (
  idempotency_key
)
where idempotency_key is not null;

create index if not exists
  idx_appointment_notification_audit_event
on public.appointment_notification_deliveries (
  audit_event_id,
  created_at desc
)
where audit_event_id is not null;

-- -----------------------------------------------------
-- 2. Dashboard notifications.
-- -----------------------------------------------------

create table if not exists public.dashboard_notifications (
  id uuid primary key default gen_random_uuid(),

  recipient_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete cascade,

  appointment_id uuid
    references public.appointments(id)
    on update cascade
    on delete cascade,

  audit_event_id uuid
    references public.appointment_audit_events(id)
    on update cascade
    on delete cascade,

  notification_type text not null,

  title text not null,
  body text not null,
  href text,

  read_at timestamptz,
  created_at timestamptz not null default now(),

  constraint dashboard_notification_title_length
    check (
      char_length(title) between 1 and 160
    ),

  constraint dashboard_notification_body_length
    check (
      char_length(body) between 1 and 1000
    ),

  constraint dashboard_notification_href_length
    check (
      href is null
      or char_length(href) <= 500
    )
);

create unique index if not exists
  idx_dashboard_notification_event_recipient
on public.dashboard_notifications (
  audit_event_id,
  recipient_profile_id,
  notification_type
)
where audit_event_id is not null;

create index if not exists
  idx_dashboard_notification_recipient_created
on public.dashboard_notifications (
  recipient_profile_id,
  created_at desc
);

create index if not exists
  idx_dashboard_notification_unread
on public.dashboard_notifications (
  recipient_profile_id,
  created_at desc
)
where read_at is null;

alter table public.dashboard_notifications
  enable row level security;

drop policy if exists
  "Users can read own dashboard notifications"
on public.dashboard_notifications;

drop policy if exists
  "Users can update own dashboard notifications"
on public.dashboard_notifications;

create policy
  "Users can read own dashboard notifications"
on public.dashboard_notifications
for select
to authenticated
using (
  recipient_profile_id = auth.uid()
);

create policy
  "Users can update own dashboard notifications"
on public.dashboard_notifications
for update
to authenticated
using (
  recipient_profile_id = auth.uid()
)
with check (
  recipient_profile_id = auth.uid()
);

revoke all
on table public.dashboard_notifications
from public, anon, authenticated;

grant select, update
on table public.dashboard_notifications
to authenticated;

commit;

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'appointment_notification_deliveries',
    'dashboard_notifications'
  )
order by table_name, ordinal_position;
