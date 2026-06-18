-- =====================================================
-- APPOINTMENT SCHEDULING FIELDS
-- =====================================================

alter table public.appointments
add column scheduled_date date;

alter table public.appointments
add column scheduled_time time;

alter table public.appointments
add column reschedule_reason text;

alter table public.appointments
add column updated_at timestamptz not null default now();

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

create trigger appointments_updated_at
before update on public.appointments
for each row
execute function public.handle_updated_at();