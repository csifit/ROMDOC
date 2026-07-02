-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 72A: Doctor invitation and complimentary-access
-- schema
--
-- File:
-- ROMDOC/database/58-admin-doctor-invitations-and-complimentary-access.sql
-- =====================================================

begin;

create extension if not exists pgcrypto;

-- =====================================================
-- 1. DOCTOR INVITATIONS
-- =====================================================

create table if not exists public.doctor_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text generated always as (lower(btrim(email))) stored,
  first_name text not null,
  last_name text not null,
  locale text not null default 'ro'
    constraint doctor_invitations_locale_check
    check (locale in ('ro', 'en')),
  personal_message text,
  complimentary_months integer not null default 12
    constraint doctor_invitations_complimentary_months_check
    check (complimentary_months between 1 and 36),
  status text not null default 'draft'
    constraint doctor_invitations_status_check
    check (status in ('draft','sent','accepted','expired','cancelled','failed')),
  invited_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,
  auth_user_id uuid
    references auth.users(id)
    on update cascade
    on delete set null,
  accepted_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,
  doctor_id uuid
    references public.doctors(id)
    on update cascade
    on delete set null,
  redirect_path text not null default '/auth/doctor-invitation',
  provider_message_id text,
  failure_code text,
  failure_message text,
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_invitations_email_length_check
    check (char_length(btrim(email)) between 3 and 320),
  constraint doctor_invitations_first_name_length_check
    check (char_length(btrim(first_name)) between 1 and 120),
  constraint doctor_invitations_last_name_length_check
    check (char_length(btrim(last_name)) between 1 and 120),
  constraint doctor_invitations_message_length_check
    check (personal_message is null or char_length(personal_message) <= 1000),
  constraint doctor_invitations_redirect_path_check
    check (
      redirect_path like '/%'
      and redirect_path not like '//%'
      and char_length(redirect_path) <= 500
    ),
  constraint doctor_invitations_acceptance_consistency_check
    check (
      (status = 'accepted' and accepted_at is not null and accepted_profile_id is not null)
      or status <> 'accepted'
    ),
  constraint doctor_invitations_cancelled_consistency_check
    check ((status = 'cancelled' and cancelled_at is not null) or status <> 'cancelled'),
  constraint doctor_invitations_expiry_after_creation_check
    check (expires_at is null or expires_at > created_at)
);

comment on table public.doctor_invitations is
  'Administrator-created invitations for doctors, including the optional personal message and complimentary-access duration.';
comment on column public.doctor_invitations.personal_message is
  'Plain-text invitation message supplied by an administrator. The application must escape it before HTML rendering.';
comment on column public.doctor_invitations.complimentary_months is
  'Number of complimentary months to grant after the invitation is accepted.';

create index if not exists idx_doctor_invitations_status_created_at
on public.doctor_invitations (status, created_at desc);
create index if not exists idx_doctor_invitations_invited_by
on public.doctor_invitations (invited_by_profile_id, created_at desc);
create index if not exists idx_doctor_invitations_auth_user
on public.doctor_invitations (auth_user_id)
where auth_user_id is not null;
create index if not exists idx_doctor_invitations_doctor
on public.doctor_invitations (doctor_id)
where doctor_id is not null;
create unique index if not exists idx_doctor_invitations_one_open_per_email
on public.doctor_invitations (normalized_email)
where status in ('draft', 'sent');

-- =====================================================
-- 2. DOCTOR ACCESS GRANTS
-- =====================================================

create table if not exists public.doctor_access_grants (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null
    references public.doctors(id)
    on update cascade
    on delete cascade,
  invitation_id uuid
    references public.doctor_invitations(id)
    on update cascade
    on delete set null,
  grant_type text not null default 'admin_complimentary'
    constraint doctor_access_grants_type_check
    check (grant_type in ('admin_complimentary','promotional','support_extension','manual_adjustment')),
  status text not null default 'scheduled'
    constraint doctor_access_grants_status_check
    check (status in ('scheduled','active','expired','revoked','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  granted_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,
  revoked_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,
  reason text not null,
  internal_notes text,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_access_grants_period_check check (ends_at > starts_at),
  constraint doctor_access_grants_reason_length_check
    check (char_length(btrim(reason)) between 1 and 500),
  constraint doctor_access_grants_internal_notes_length_check
    check (internal_notes is null or char_length(internal_notes) <= 2000),
  constraint doctor_access_grants_revocation_consistency_check
    check (
      (
        status = 'revoked'
        and revoked_at is not null
        and revoked_by_profile_id is not null
        and revocation_reason is not null
        and char_length(btrim(revocation_reason)) between 1 and 500
      )
      or status <> 'revoked'
    )
);

comment on table public.doctor_access_grants is
  'Non-Stripe access entitlements for doctors, including complimentary first-year access granted through an administrator invitation.';

create index if not exists idx_doctor_access_grants_doctor_period
on public.doctor_access_grants (doctor_id, starts_at, ends_at);
create index if not exists idx_doctor_access_grants_status_ends_at
on public.doctor_access_grants (status, ends_at);
create index if not exists idx_doctor_access_grants_invitation
on public.doctor_access_grants (invitation_id)
where invitation_id is not null;
create unique index if not exists idx_doctor_access_grants_one_active_admin_grant
on public.doctor_access_grants (doctor_id)
where status = 'active' and grant_type = 'admin_complimentary';
create unique index if not exists idx_doctor_access_grants_one_per_invitation
on public.doctor_access_grants (invitation_id)
where invitation_id is not null;

-- =====================================================
-- 3. INVITATION AND GRANT EVENT HISTORY
-- =====================================================

create table if not exists public.doctor_invitation_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid
    references public.doctor_invitations(id)
    on update cascade
    on delete set null,
  access_grant_id uuid
    references public.doctor_access_grants(id)
    on update cascade
    on delete set null,
  doctor_id uuid
    references public.doctors(id)
    on update cascade
    on delete set null,
  actor_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,
  event_type text not null
    constraint doctor_invitation_events_type_check
    check (
      event_type in (
        'invitation_created','invitation_sent','invitation_send_failed','invitation_resent',
        'invitation_accepted','invitation_expired','invitation_cancelled',
        'complimentary_access_scheduled','complimentary_access_activated',
        'complimentary_access_extended','complimentary_access_expired',
        'complimentary_access_revoked'
      )
    ),
  event_data jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now(),
  constraint doctor_invitation_events_subject_check
    check (invitation_id is not null or access_grant_id is not null or doctor_id is not null),
  constraint doctor_invitation_events_data_object_check
    check (jsonb_typeof(event_data) = 'object'),
  constraint doctor_invitation_events_reason_length_check
    check (reason is null or char_length(reason) <= 1000)
);

comment on table public.doctor_invitation_events is
  'Immutable audit events for doctor invitations and complimentary-access grants.';

create index if not exists idx_doctor_invitation_events_invitation
on public.doctor_invitation_events (invitation_id, created_at desc)
where invitation_id is not null;
create index if not exists idx_doctor_invitation_events_grant
on public.doctor_invitation_events (access_grant_id, created_at desc)
where access_grant_id is not null;
create index if not exists idx_doctor_invitation_events_doctor
on public.doctor_invitation_events (doctor_id, created_at desc)
where doctor_id is not null;
create index if not exists idx_doctor_invitation_events_actor
on public.doctor_invitation_events (actor_profile_id, created_at desc)
where actor_profile_id is not null;

-- =====================================================
-- 4. UPDATED_AT TRIGGERS
-- =====================================================

drop trigger if exists doctor_invitations_updated_at on public.doctor_invitations;
create trigger doctor_invitations_updated_at
before update on public.doctor_invitations
for each row execute function public.handle_updated_at();

drop trigger if exists doctor_access_grants_updated_at on public.doctor_access_grants;
create trigger doctor_access_grants_updated_at
before update on public.doctor_access_grants
for each row execute function public.handle_updated_at();

-- =====================================================
-- 5. IMMUTABLE EVENT PROTECTION
-- =====================================================

create or replace function public.prevent_doctor_invitation_event_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Doctor invitation events are immutable.';
end;
$$;

revoke all on function public.prevent_doctor_invitation_event_changes() from public;

drop trigger if exists prevent_doctor_invitation_event_update
on public.doctor_invitation_events;
create trigger prevent_doctor_invitation_event_update
before update on public.doctor_invitation_events
for each row execute function public.prevent_doctor_invitation_event_changes();

drop trigger if exists prevent_doctor_invitation_event_delete
on public.doctor_invitation_events;
create trigger prevent_doctor_invitation_event_delete
before delete on public.doctor_invitation_events
for each row execute function public.prevent_doctor_invitation_event_changes();

-- =====================================================
-- 6. ROW LEVEL SECURITY AND PRIVILEGES
-- =====================================================

alter table public.doctor_invitations enable row level security;
alter table public.doctor_access_grants enable row level security;
alter table public.doctor_invitation_events enable row level security;

revoke all on table public.doctor_invitations from anon, authenticated;
revoke all on table public.doctor_access_grants from anon, authenticated;
revoke all on table public.doctor_invitation_events from anon, authenticated;

grant all on table public.doctor_invitations to service_role;
grant all on table public.doctor_access_grants to service_role;
grant all on table public.doctor_invitation_events to service_role;

commit;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('doctor_invitations','doctor_access_grants','doctor_invitation_events')
order by table_name;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('doctor_invitations','doctor_access_grants','doctor_invitation_events')
order by tablename, indexname;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('doctor_invitations','doctor_access_grants','doctor_invitation_events')
order by tablename;
