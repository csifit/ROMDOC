-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step C: Appointment-specific messaging with attachments
--
-- File:
-- ROMDOC/database/64-appointment-messaging.sql
--
-- Scope:
-- - Messages are tied to one appointment.
-- - Attachments are tied to one appointment message.
-- - This is not an open doctor-patient chat system.
-- - Files are stored in a private Supabase Storage bucket.
-- =====================================================

begin;

-- =====================================================
-- 1. PRIVATE STORAGE BUCKET
-- =====================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'appointment-message-attachments',
  'appointment-message-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =====================================================
-- 2. MESSAGE TABLES
-- =====================================================

create table if not exists public.appointment_messages (
  id uuid primary key default gen_random_uuid(),

  appointment_id uuid not null
    references public.appointments(id)
    on delete cascade,

  sender_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  body text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointment_messages_body_length
    check (
      body is null
      or length(trim(body)) between 1 and 4000
    )
);

create table if not exists public.appointment_message_attachments (
  id uuid primary key default gen_random_uuid(),

  message_id uuid not null
    references public.appointment_messages(id)
    on delete cascade,

  appointment_id uuid not null
    references public.appointments(id)
    on delete cascade,

  uploaded_by_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  bucket_id text not null default 'appointment-message-attachments',
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null,

  created_at timestamptz not null default now(),

  constraint appointment_message_attachments_bucket_check
    check (bucket_id = 'appointment-message-attachments'),

  constraint appointment_message_attachments_size_check
    check (
      file_size_bytes > 0
      and file_size_bytes <= 10485760
    ),

  constraint appointment_message_attachments_mime_check
    check (
      mime_type in (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
    )
);

create index if not exists
  idx_appointment_messages_appointment_created
on public.appointment_messages (
  appointment_id,
  created_at
);

create index if not exists
  idx_appointment_messages_sender_created
on public.appointment_messages (
  sender_profile_id,
  created_at desc
);

create index if not exists
  idx_appointment_message_attachments_message
on public.appointment_message_attachments (
  message_id,
  created_at
);

create index if not exists
  idx_appointment_message_attachments_appointment
on public.appointment_message_attachments (
  appointment_id,
  created_at
);

-- =====================================================
-- 3. UPDATED_AT TRIGGER
-- =====================================================

drop trigger if exists
  set_appointment_messages_updated_at
on public.appointment_messages;

create trigger set_appointment_messages_updated_at
before update
on public.appointment_messages
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 4. ACCESS HELPERS
-- =====================================================

create or replace function public.can_access_appointment_messages(
  target_appointment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.appointments as a
    left join public.doctors as d
      on d.id = a.doctor_id
    where a.id = target_appointment_id
      and auth.uid() is not null
      and (
        a.patient_profile_id = auth.uid()
        or d.profile_id = auth.uid()
      )
  );
$$;

create or replace function public.can_send_appointment_message(
  target_appointment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.appointments as a
    left join public.doctors as d
      on d.id = a.doctor_id
    where a.id = target_appointment_id
      and auth.uid() is not null
      and a.status in (
        'pending',
        'confirmed',
        'rescheduled',
        'completed'
      )
      and (
        a.patient_profile_id = auth.uid()
        or d.profile_id = auth.uid()
      )
  );
$$;

revoke all
on function public.can_access_appointment_messages(uuid)
from public;

revoke all
on function public.can_send_appointment_message(uuid)
from public;

grant execute
on function public.can_access_appointment_messages(uuid)
to authenticated;

grant execute
on function public.can_send_appointment_message(uuid)
to authenticated;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

alter table public.appointment_messages
  enable row level security;

alter table public.appointment_message_attachments
  enable row level security;

drop policy if exists
  "Appointment participants can view messages"
on public.appointment_messages;

drop policy if exists
  "Appointment participants can create messages"
on public.appointment_messages;

drop policy if exists
  "Appointment participants can view message attachments"
on public.appointment_message_attachments;

drop policy if exists
  "Appointment participants can create message attachments"
on public.appointment_message_attachments;

create policy
  "Appointment participants can view messages"
on public.appointment_messages
for select
to authenticated
using (
  public.can_access_appointment_messages(appointment_id)
);

create policy
  "Appointment participants can create messages"
on public.appointment_messages
for insert
to authenticated
with check (
  sender_profile_id = auth.uid()
  and public.can_send_appointment_message(appointment_id)
);

create policy
  "Appointment participants can view message attachments"
on public.appointment_message_attachments
for select
to authenticated
using (
  public.can_access_appointment_messages(appointment_id)
);

create policy
  "Appointment participants can create message attachments"
on public.appointment_message_attachments
for insert
to authenticated
with check (
  uploaded_by_profile_id = auth.uid()
  and public.can_send_appointment_message(appointment_id)
);

grant select, insert
on public.appointment_messages
to authenticated;

grant select, insert
on public.appointment_message_attachments
to authenticated;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'appointment_messages',
    'appointment_message_attachments'
  )
order by table_name, ordinal_position;

select
  policyname,
  tablename,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'appointment_messages',
    'appointment_message_attachments'
  )
order by tablename, policyname;
