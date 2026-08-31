-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 113A: Clinic Organisation invitation schema
--
-- Project path:
-- ROMDOC/database/113-clinic-organization-invitations.sql
--
-- Scope:
--   1. Clinic Organisation invitations
--   2. Maximum 3-month trial enforced by PostgreSQL
--   3. Immutable invitation/trial event history
--   4. Service-role-only access
--
-- No UI, email sending, invitation acceptance, organisation
-- creation, billing, or location creation is implemented here.
-- =====================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.clinic_organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  email text not null,
  normalized_email text
    generated always as (lower(btrim(email))) stored,
  first_name text not null,
  last_name text not null,
  phone text null,
  locale text not null default 'ro'
    constraint clinic_organization_invitations_locale_check
    check (locale in ('ro', 'en', 'de')),
  personal_message text null,
  trial_months integer not null default 3
    constraint clinic_organization_invitations_trial_months_check
    check (trial_months between 1 and 3),
  status text not null default 'draft'
    constraint clinic_organization_invitations_status_check
    check (
      status in (
        'draft',
        'sent',
        'accepted',
        'expired',
        'cancelled',
        'failed'
      )
    ),
  invited_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,
  auth_user_id uuid null
    references auth.users(id)
    on update cascade
    on delete set null,
  accepted_profile_id uuid null
    references public.profiles(id)
    on update cascade
    on delete set null,
  organization_id uuid null
    references public.clinic_organizations(id)
    on update cascade
    on delete set null,
  redirect_path text not null
    default '/auth/clinic-organization-invitation',
  invitation_action_link text null,
  provider_message_id text null,
  failure_code text null,
  failure_message text null,
  sent_at timestamptz null,
  accepted_at timestamptz null,
  expires_at timestamptz null,
  cancelled_at timestamptz null,
  trial_started_at timestamptz null,
  trial_ends_at timestamptz null,
  resend_count integer not null default 0
    constraint clinic_organization_invitations_resend_count_check
    check (resend_count >= 0),
  last_resent_at timestamptz null,
  last_resend_failure_at timestamptz null,
  last_resend_failure_code text null,
  last_resend_failure_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clinic_organization_invitations_organization_name_length_check
    check (
      char_length(btrim(organization_name))
      between 2 and 200
    ),
  constraint clinic_organization_invitations_email_length_check
    check (
      char_length(btrim(email))
      between 3 and 320
    ),
  constraint clinic_organization_invitations_first_name_length_check
    check (
      char_length(btrim(first_name))
      between 1 and 120
    ),
  constraint clinic_organization_invitations_last_name_length_check
    check (
      char_length(btrim(last_name))
      between 1 and 120
    ),
  constraint clinic_organization_invitations_phone_length_check
    check (
      phone is null
      or char_length(btrim(phone)) between 3 and 50
    ),
  constraint clinic_organization_invitations_message_length_check
    check (
      personal_message is null
      or char_length(personal_message) <= 1000
    ),
  constraint clinic_organization_invitations_redirect_path_check
    check (
      redirect_path like '/%'
      and redirect_path not like '//%'
      and char_length(redirect_path) <= 500
    ),
  constraint clinic_organization_invitations_action_link_length_check
    check (
      invitation_action_link is null
      or char_length(invitation_action_link) <= 4000
    ),
  constraint clinic_organization_invitations_failure_code_length_check
    check (
      failure_code is null
      or char_length(failure_code) <= 100
    ),
  constraint clinic_organization_invitations_failure_message_length_check
    check (
      failure_message is null
      or char_length(failure_message) <= 1000
    ),
  constraint clinic_organization_invitations_resend_failure_code_length_check
    check (
      last_resend_failure_code is null
      or char_length(last_resend_failure_code) <= 100
    ),
  constraint clinic_organization_invitations_resend_failure_message_length_check
    check (
      last_resend_failure_message is null
      or char_length(last_resend_failure_message) <= 1000
    ),
  constraint clinic_organization_invitations_acceptance_consistency_check
    check (
      (
        status = 'accepted'
        and accepted_at is not null
        and accepted_profile_id is not null
        and organization_id is not null
        and trial_started_at is not null
        and trial_ends_at is not null
      )
      or status <> 'accepted'
    ),
  constraint clinic_organization_invitations_cancelled_consistency_check
    check (
      (
        status = 'cancelled'
        and cancelled_at is not null
      )
      or status <> 'cancelled'
    ),
  constraint clinic_organization_invitations_expiry_after_creation_check
    check (
      expires_at is null
      or expires_at > created_at
    ),
  constraint clinic_organization_invitations_trial_pair_check
    check (
      (
        trial_started_at is null
        and trial_ends_at is null
      )
      or
      (
        trial_started_at is not null
        and trial_ends_at is not null
      )
    ),
  constraint clinic_organization_invitations_trial_period_check
    check (
      trial_started_at is null
      or (
        trial_ends_at > trial_started_at
        and trial_ends_at <= trial_started_at + interval '3 months'
      )
    )
);

comment on table public.clinic_organization_invitations is
  'Administrator-created invitations for Clinic Organisations. The initial contact may become a clinic_manager after acceptance. Trial duration is limited to 1-3 months and begins only when the invitation is accepted.';

comment on column public.clinic_organization_invitations.organization_name is
  'Organisation name captured at invitation time. It can later be used to create the clinic_organizations record or retained as the invitation snapshot when an organisation already exists.';

comment on column public.clinic_organization_invitations.trial_months is
  'Requested organisation trial duration. PostgreSQL restricts this value to 1, 2, or 3 months.';

comment on column public.clinic_organization_invitations.trial_started_at is
  'Trial start timestamp. Must remain NULL until the invitation is accepted.';

comment on column public.clinic_organization_invitations.trial_ends_at is
  'Trial end timestamp. PostgreSQL prevents this from being more than three calendar months after trial_started_at.';

comment on column public.clinic_organization_invitations.organization_id is
  'Optional link to clinic_organizations. Supports both invite-first and Admin-assisted organisation-first onboarding.';

comment on column public.clinic_organization_invitations.personal_message is
  'Plain-text invitation message supplied by an administrator. The application must escape it before HTML rendering.';

create index if not exists
  idx_clinic_organization_invitations_status_created_at
on public.clinic_organization_invitations (
  status,
  created_at desc
);

create index if not exists
  idx_clinic_organization_invitations_invited_by
on public.clinic_organization_invitations (
  invited_by_profile_id,
  created_at desc
);

create index if not exists
  idx_clinic_organization_invitations_auth_user
on public.clinic_organization_invitations (
  auth_user_id
)
where auth_user_id is not null;

create index if not exists
  idx_clinic_organization_invitations_accepted_profile
on public.clinic_organization_invitations (
  accepted_profile_id
)
where accepted_profile_id is not null;

create index if not exists
  idx_clinic_organization_invitations_organization
on public.clinic_organization_invitations (
  organization_id,
  created_at desc
)
where organization_id is not null;

create unique index if not exists
  idx_clinic_organization_invitations_one_open_per_email
on public.clinic_organization_invitations (
  normalized_email
)
where status in ('draft', 'sent');

create unique index if not exists
  idx_clinic_organization_invitations_one_open_per_organization
on public.clinic_organization_invitations (
  organization_id
)
where
  organization_id is not null
  and status in ('draft', 'sent');

create table if not exists public.clinic_organization_invitation_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null
    references public.clinic_organization_invitations(id)
    on update cascade
    on delete restrict,
  organization_id uuid null
    references public.clinic_organizations(id)
    on update cascade
    on delete set null,
  actor_profile_id uuid null
    references public.profiles(id)
    on update cascade
    on delete set null,
  event_type text not null
    constraint clinic_organization_invitation_events_type_check
    check (
      event_type in (
        'invitation_created',
        'invitation_sent',
        'invitation_send_failed',
        'invitation_resent',
        'invitation_accepted',
        'invitation_expired',
        'invitation_cancelled',
        'organization_linked',
        'trial_started',
        'trial_ended'
      )
    ),
  event_data jsonb not null default '{}'::jsonb,
  reason text null,
  created_at timestamptz not null default now(),
  constraint clinic_organization_invitation_events_data_object_check
    check (
      jsonb_typeof(event_data) = 'object'
    ),
  constraint clinic_organization_invitation_events_reason_length_check
    check (
      reason is null
      or char_length(reason) <= 1000
    )
);

comment on table public.clinic_organization_invitation_events is
  'Immutable audit events for Clinic Organisation invitations and their trial lifecycle.';

create index if not exists
  idx_clinic_organization_invitation_events_invitation
on public.clinic_organization_invitation_events (
  invitation_id,
  created_at desc
);

create index if not exists
  idx_clinic_organization_invitation_events_organization
on public.clinic_organization_invitation_events (
  organization_id,
  created_at desc
)
where organization_id is not null;

create index if not exists
  idx_clinic_organization_invitation_events_actor
on public.clinic_organization_invitation_events (
  actor_profile_id,
  created_at desc
)
where actor_profile_id is not null;

drop trigger if exists
  clinic_organization_invitations_updated_at
on public.clinic_organization_invitations;

create trigger
  clinic_organization_invitations_updated_at
before update
on public.clinic_organization_invitations
for each row
execute function public.handle_updated_at();

create or replace function
  public.prevent_clinic_organization_invitation_event_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception
    'Clinic Organisation invitation events are immutable.';
end;
$$;

revoke all
on function
  public.prevent_clinic_organization_invitation_event_changes()
from public;

drop trigger if exists
  prevent_clinic_organization_invitation_event_update
on public.clinic_organization_invitation_events;

create trigger
  prevent_clinic_organization_invitation_event_update
before update
on public.clinic_organization_invitation_events
for each row
execute function
  public.prevent_clinic_organization_invitation_event_changes();

drop trigger if exists
  prevent_clinic_organization_invitation_event_delete
on public.clinic_organization_invitation_events;

create trigger
  prevent_clinic_organization_invitation_event_delete
before delete
on public.clinic_organization_invitation_events
for each row
execute function
  public.prevent_clinic_organization_invitation_event_changes();

alter table
  public.clinic_organization_invitations
enable row level security;

alter table
  public.clinic_organization_invitation_events
enable row level security;

revoke all
on table public.clinic_organization_invitations
from anon, authenticated;

revoke all
on table public.clinic_organization_invitation_events
from anon, authenticated;

grant all
on table public.clinic_organization_invitations
to service_role;

grant all
on table public.clinic_organization_invitation_events
to service_role;

commit;

-- Verification queries
select
  table_name
from information_schema.tables
where
  table_schema = 'public'
  and table_name in (
    'clinic_organization_invitations',
    'clinic_organization_invitation_events'
  )
order by table_name;

select
  indexname
from pg_indexes
where
  schemaname = 'public'
  and tablename in (
    'clinic_organization_invitations',
    'clinic_organization_invitation_events'
  )
order by
  tablename,
  indexname;

select
  tablename,
  rowsecurity
from pg_tables
where
  schemaname = 'public'
  and tablename in (
    'clinic_organization_invitations',
    'clinic_organization_invitation_events'
  )
order by tablename;

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where
  conrelid = 'public.clinic_organization_invitations'::regclass
  and conname in (
    'clinic_organization_invitations_trial_months_check',
    'clinic_organization_invitations_trial_period_check',
    'clinic_organization_invitations_acceptance_consistency_check'
  )
order by conname;
