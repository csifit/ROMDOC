-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step F: Support tickets for platform usage
--
-- File:
-- ROMDOC/database/68-support-tickets.sql
-- =====================================================

begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),

  requester_profile_id uuid
    references public.profiles(id)
    on delete set null,

  requester_type text not null
    constraint support_tickets_requester_type_check
    check (
      requester_type in (
        'patient',
        'doctor',
        'clinic',
        'visitor'
      )
    ),

  category text not null
    constraint support_tickets_category_check
    check (
      category in (
        'patient_support',
        'doctor_support',
        'profile_correction',
        'booking_problem',
        'privacy_request',
        'technical_problem',
        'other'
      )
    ),

  status text not null default 'open'
    constraint support_tickets_status_check
    check (
      status in (
        'open',
        'in_progress',
        'waiting_for_user',
        'resolved',
        'closed'
      )
    ),

  priority text not null default 'normal'
    constraint support_tickets_priority_check
    check (
      priority in (
        'low',
        'normal',
        'high'
      )
    ),

  subject text not null,
  message text not null,

  requester_name text not null,
  requester_email text not null,
  requester_phone text,

  related_url text,
  appointment_id uuid
    references public.appointments(id)
    on delete set null,

  routed_to_email text not null,
  source text not null default 'contact_page',
  user_agent text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_status_created
on public.support_tickets (status, created_at desc);

create index if not exists idx_support_tickets_category_created
on public.support_tickets (category, created_at desc);

create index if not exists idx_support_tickets_requester_email
on public.support_tickets (lower(requester_email));

create index if not exists idx_support_tickets_requester_profile
on public.support_tickets (requester_profile_id, created_at desc);

drop trigger if exists support_tickets_updated_at
on public.support_tickets;

create trigger support_tickets_updated_at
before update on public.support_tickets
for each row
execute function public.handle_updated_at();

alter table public.support_tickets enable row level security;

-- The public Contact form writes through the server API using the service role.
-- Direct browser inserts are intentionally not granted.

drop policy if exists "Admins can manage support tickets"
on public.support_tickets;

create policy "Admins can manage support tickets"
on public.support_tickets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Logged-in users may see their own tickets later, if we add a support inbox.
-- This does not affect the public Contact form.

drop policy if exists "Users can view own support tickets"
on public.support_tickets;

create policy "Users can view own support tickets"
on public.support_tickets
for select
to authenticated
using (
  requester_profile_id = auth.uid()
  or lower(requester_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

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
  and table_name = 'support_tickets'
order by ordinal_position;

select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'support_tickets'
order by policyname;
