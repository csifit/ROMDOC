-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 2D: Doctor inbox message read state
--
-- File:
-- ROMDOC/database/75-doctor-inbox-read-state.sql
-- =====================================================

begin;

create table if not exists public.appointment_message_reads (
  appointment_id uuid not null
    references public.appointments(id)
    on delete cascade,

  profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  last_read_at timestamptz not null default now(),

  primary key (
    appointment_id,
    profile_id
  )
);

create index if not exists
  idx_appointment_message_reads_profile
on public.appointment_message_reads (
  profile_id,
  last_read_at desc
);

alter table public.appointment_message_reads
  enable row level security;

drop policy if exists
  "Users can view their appointment message read state"
on public.appointment_message_reads;

drop policy if exists
  "Users can create their appointment message read state"
on public.appointment_message_reads;

drop policy if exists
  "Users can update their appointment message read state"
on public.appointment_message_reads;

create policy
  "Users can view their appointment message read state"
on public.appointment_message_reads
for select
to authenticated
using (
  profile_id = auth.uid()
  and public.can_access_appointment_messages(
    appointment_id
  )
);

create policy
  "Users can create their appointment message read state"
on public.appointment_message_reads
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and public.can_access_appointment_messages(
    appointment_id
  )
);

create policy
  "Users can update their appointment message read state"
on public.appointment_message_reads
for update
to authenticated
using (
  profile_id = auth.uid()
  and public.can_access_appointment_messages(
    appointment_id
  )
)
with check (
  profile_id = auth.uid()
  and public.can_access_appointment_messages(
    appointment_id
  )
);

grant select, insert, update
on public.appointment_message_reads
to authenticated;

commit;
