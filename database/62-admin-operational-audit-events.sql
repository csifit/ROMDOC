-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 72H: Immutable administrator operational audit
--
-- File:
-- ROMDOC/database/62-admin-operational-audit-events.sql
-- =====================================================

begin;

create table if not exists public.admin_operational_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,
  action text not null
    check (
      action in (
        'clinic_created',
        'doctor_clinic_associated',
        'doctor_clinic_removed'
      )
    ),
  target_type text not null
    check (
      target_type in (
        'clinic',
        'doctor_clinic'
      )
    ),
  target_id uuid,
  doctor_id uuid
    references public.doctors(id)
    on delete restrict,
  clinic_id uuid
    references public.clinics(id)
    on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists
  idx_admin_operational_audit_actor
on public.admin_operational_audit_events (
  actor_profile_id,
  created_at desc
);

create index if not exists
  idx_admin_operational_audit_action
on public.admin_operational_audit_events (
  action,
  created_at desc
);

create index if not exists
  idx_admin_operational_audit_doctor
on public.admin_operational_audit_events (
  doctor_id,
  created_at desc
)
where doctor_id is not null;

create index if not exists
  idx_admin_operational_audit_clinic
on public.admin_operational_audit_events (
  clinic_id,
  created_at desc
)
where clinic_id is not null;

alter table public.admin_operational_audit_events
enable row level security;

revoke all
on table public.admin_operational_audit_events
from public, anon, authenticated;

grant all
on table public.admin_operational_audit_events
to service_role;

create or replace function public.prevent_admin_operational_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  raise exception
    'admin_operational_audit_events is immutable';
end;
$function$;

drop trigger if exists
  prevent_admin_operational_audit_update
on public.admin_operational_audit_events;

create trigger
  prevent_admin_operational_audit_update
before update
on public.admin_operational_audit_events
for each row
execute function public.prevent_admin_operational_audit_mutation();

drop trigger if exists
  prevent_admin_operational_audit_delete
on public.admin_operational_audit_events;

create trigger
  prevent_admin_operational_audit_delete
before delete
on public.admin_operational_audit_events
for each row
execute function public.prevent_admin_operational_audit_mutation();

commit;
