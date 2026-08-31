begin;

create table if not exists public.clinic_organisation_leads (
  id uuid primary key default gen_random_uuid(),

  preferred_solution text not null
    check (preferred_solution in ('integrated', 'romdoc')),

  priorities text[] not null default '{}'::text[],

  organization_type text not null
    check (
      organization_type in (
        'independent_clinic',
        'multi_location_clinic',
        'medical_centre',
        'private_hospital',
        'diagnostic_imaging',
        'laboratory',
        'other'
      )
    ),

  doctor_count_range text not null
    check (
      doctor_count_range in (
        '1_5',
        '6_20',
        '21_50',
        '51_100',
        '100_plus'
      )
    ),

  desired_next_step text not null
    check (
      desired_next_step in (
        'intro_meeting',
        'demo',
        'integration_discussion',
        'email_information',
        'custom_solution'
      )
    ),

  organization_name text not null,
  contact_name text null,
  email text not null,
  phone text not null,
  notes text null,
  locale text not null default 'ro'
    check (locale in ('ro', 'en', 'de')),

  status text not null default 'new'
    check (
      status in (
        'new',
        'contacted',
        'meeting_scheduled',
        'proposal',
        'won',
        'closed'
      )
    ),

  status_updated_at timestamptz null,
  status_updated_by_profile_id uuid null
    references public.profiles(id)
    on delete set null,

  notification_status text not null default 'pending'
    check (
      notification_status in (
        'pending',
        'sent',
        'failed',
        'skipped'
      )
    ),
  notification_provider_message_id text null,
  notification_error text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clinic_organisation_leads_status_created_at
  on public.clinic_organisation_leads (status, created_at desc);

create index if not exists idx_clinic_organisation_leads_email
  on public.clinic_organisation_leads (lower(email));

alter table public.clinic_organisation_leads enable row level security;

revoke all on table public.clinic_organisation_leads from anon;
revoke all on table public.clinic_organisation_leads from authenticated;

grant all on table public.clinic_organisation_leads to service_role;

comment on table public.clinic_organisation_leads is
  'Prospective clinic organisation enquiries submitted through the public RomDoc clinic questionnaire.';

commit;
