-- =========================================================
-- RomDoc Step 87A.8 — Group 8A
-- Appointment notification-language foundation
--
-- Exact destination:
-- ROMDOC/database/90-appointment-notification-locale.sql
-- =========================================================

begin;

alter table public.appointments
  add column if not exists
    notification_locale text;

update public.appointments
set notification_locale = 'ro'
where
  notification_locale is null
  or notification_locale not in (
    'ro',
    'en',
    'de'
  );

alter table public.appointments
  alter column notification_locale
    set default 'ro';

alter table public.appointments
  alter column notification_locale
    set not null;

alter table public.appointments
  drop constraint if exists
    appointments_notification_locale_check;

alter table public.appointments
  add constraint
    appointments_notification_locale_check
  check (
    notification_locale in (
      'ro',
      'en',
      'de'
    )
  );

comment on column
  public.appointments.notification_locale
is
  'Immutable notification language captured when the appointment is created. Supported values: ro, en, de. Legacy and manual appointments default to ro.';

commit;

-- ---------------------------------------------------------
-- Verification
-- ---------------------------------------------------------

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where
  table_schema = 'public'
  and table_name = 'appointments'
  and column_name =
    'notification_locale';

select
  notification_locale,
  count(*) as appointments
from public.appointments
group by notification_locale
order by notification_locale;
