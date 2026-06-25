-- =====================================================
-- ROMDOC STEP 66E-2D-2A
-- Manager role and invitation foundation
-- =====================================================

begin;

-- -----------------------------------------------------
-- Add manager to the profile role constraint.
-- -----------------------------------------------------

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'patient',
      'doctor',
      'doctor_applicant',
      'staff',
      'manager',
      'admin'
    )
  );

comment on column public.profiles.role is
  'RomDoc role: patient, doctor, doctor_applicant, staff, manager, or admin.';

-- -----------------------------------------------------
-- Manager invitations
-- -----------------------------------------------------

create table if not exists public.manager_invitations (
  id uuid primary key default gen_random_uuid(),

  email text not null,
  first_name text,
  last_name text,

  invited_by_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,

  invited_user_id uuid
    references auth.users(id)
    on delete set null,

  accepted_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  status text not null default 'pending'
    constraint manager_invitations_status_check
    check (
      status in (
        'pending',
        'accepted',
        'expired',
        'revoked'
      )
    ),

  expires_at timestamptz not null
    default (now() + interval '7 days'),

  accepted_at timestamptz,
  revoked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists
  manager_invitations_one_pending_email_idx
on public.manager_invitations (
  lower(email)
)
where status = 'pending';

create index if not exists
  manager_invitations_status_idx
on public.manager_invitations (
  status,
  created_at desc
);

create index if not exists
  manager_invitations_user_idx
on public.manager_invitations (
  invited_user_id
);

drop trigger if exists
  set_manager_invitations_updated_at
on public.manager_invitations;

create trigger
  set_manager_invitations_updated_at
before update
on public.manager_invitations
for each row
execute function public.handle_updated_at();

-- -----------------------------------------------------
-- Manager audit log
-- -----------------------------------------------------

create table if not exists public.manager_audit_events (
  id uuid primary key default gen_random_uuid(),

  manager_profile_id uuid
    references public.profiles(id)
    on delete set null,

  invitation_id uuid
    references public.manager_invitations(id)
    on delete set null,

  actor_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,

  event_type text not null
    constraint manager_audit_events_type_check
    check (
      event_type in (
        'invited',
        'accepted',
        'activated',
        'suspended',
        'invitation_revoked'
      )
    ),

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists
  manager_audit_events_manager_idx
on public.manager_audit_events (
  manager_profile_id,
  created_at desc
);

create index if not exists
  manager_audit_events_actor_idx
on public.manager_audit_events (
  actor_profile_id,
  created_at desc
);

-- These tables are service-role managed through protected server routes.
alter table public.manager_invitations enable row level security;
alter table public.manager_audit_events enable row level security;

revoke all
on table public.manager_invitations
from anon, authenticated;

revoke all
on table public.manager_audit_events
from anon, authenticated;

commit;
