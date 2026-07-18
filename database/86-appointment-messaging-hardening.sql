-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 3A: Appointment messaging hardening
--
-- Exact path:
-- ROMDOC/database/86-appointment-messaging-hardening.sql
-- =====================================================

begin;

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
    left join public.profiles as current_profile
      on current_profile.id = auth.uid()
    where a.id = target_appointment_id
      and auth.uid() is not null
      and coalesce(
        current_profile.account_status,
        'active'
      ) = 'active'
      and (
        a.patient_profile_id = auth.uid()
        or d.profile_id = auth.uid()
        or exists (
          select 1
          from public.doctor_staff as ds
          where ds.staff_profile_id = auth.uid()
            and ds.doctor_id = a.doctor_id
            and ds.status = 'active'
            and (
              ds.clinic_id = a.clinic_id
              or ds.clinic_id is null
            )
        )
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
  select
    public.can_access_appointment_messages(
      target_appointment_id
    )
    and exists (
      select 1
      from public.appointments as a
      where a.id = target_appointment_id
        and a.status in (
          'pending',
          'confirmed',
          'rescheduled',
          'completed',
          'cancelled',
          'no_show'
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

drop policy if exists
  "Appointment participants can view messages"
on public.appointment_messages;

drop policy if exists
  "Appointment participants can create messages"
on public.appointment_messages;

create policy
  "Appointment participants can view messages"
on public.appointment_messages
for select
to authenticated
using (
  public.can_access_appointment_messages(
    appointment_id
  )
);

create policy
  "Appointment participants can create messages"
on public.appointment_messages
for insert
to authenticated
with check (
  sender_profile_id = auth.uid()
  and public.can_send_appointment_message(
    appointment_id
  )
);

drop policy if exists
  "Appointment participants can view message attachments"
on public.appointment_message_attachments;

drop policy if exists
  "Appointment participants can create message attachments"
on public.appointment_message_attachments;

create policy
  "Appointment participants can view message attachments"
on public.appointment_message_attachments
for select
to authenticated
using (
  public.can_access_appointment_messages(
    appointment_id
  )
);

create policy
  "Appointment participants can create message attachments"
on public.appointment_message_attachments
for insert
to authenticated
with check (
  uploaded_by_profile_id = auth.uid()
  and public.can_send_appointment_message(
    appointment_id
  )
);

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

create unique index if not exists
  idx_appointment_messages_id_appointment
on public.appointment_messages (
  id,
  appointment_id
);

alter table public.appointment_message_attachments
drop constraint if exists
  appointment_message_attachments_message_appointment_fkey;

alter table public.appointment_message_attachments
add constraint
  appointment_message_attachments_message_appointment_fkey
foreign key (
  message_id,
  appointment_id
)
references public.appointment_messages (
  id,
  appointment_id
)
on delete cascade
not valid;

alter table public.appointment_message_attachments
validate constraint
  appointment_message_attachments_message_appointment_fkey;

commit;

select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'can_access_appointment_messages',
    'can_send_appointment_message'
  )
order by routine_name;

select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'appointment_messages',
    'appointment_message_attachments',
    'appointment_message_reads'
  )
order by tablename, policyname;
