-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 63D: Patient-controlled sharing and access audit
--
-- File:
-- ROMDOC/database/41-medical-document-sharing-audit.sql
--
-- Requires:
--   39-patient-medical-folder-foundation.sql
--   40-doctor-medical-folder-workflow.sql
--
-- Core rule:
--   - patient owns sharing control
--   - uploader doctor retains access to own document
--   - another doctor needs an active explicit share
--   - patient may revoke sharing at any time
-- =====================================================

begin;

-- =====================================================
-- 1. DOCUMENT SHARES
-- =====================================================

create table if not exists public.patient_medical_document_shares (
  id uuid primary key default gen_random_uuid(),

  document_id uuid not null
    references public.patient_medical_documents(id)
    on update cascade
    on delete restrict,

  patient_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,

  doctor_id uuid not null
    references public.doctors(id)
    on update cascade
    on delete restrict,

  granted_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,

  expires_at timestamptz,

  revoked_at timestamptz,
  revoked_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint patient_medical_document_shares_unique
    unique (document_id, doctor_id),

  constraint patient_medical_document_shares_expiry_check
    check (
      expires_at is null
      or expires_at > created_at
    ),

  constraint patient_medical_document_shares_revocation_check
    check (
      (
        revoked_at is null
        and revoked_by_profile_id is null
      )
      or (
        revoked_at is not null
        and revoked_by_profile_id is not null
      )
    )
);

comment on table public.patient_medical_document_shares is
  'Patient-controlled access grants for individual medical documents.';

create index if not exists
  idx_patient_medical_document_shares_patient
on public.patient_medical_document_shares (
  patient_profile_id,
  created_at desc
);

create index if not exists
  idx_patient_medical_document_shares_doctor_active
on public.patient_medical_document_shares (
  doctor_id,
  expires_at
)
where revoked_at is null;

create index if not exists
  idx_patient_medical_document_shares_document
on public.patient_medical_document_shares (
  document_id,
  created_at desc
);

create or replace function
  public.set_patient_medical_share_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists
  set_patient_medical_share_updated_at_trigger
on public.patient_medical_document_shares;

create trigger
  set_patient_medical_share_updated_at_trigger
before update
on public.patient_medical_document_shares
for each row
execute function
  public.set_patient_medical_share_updated_at();

-- =====================================================
-- 2. DOCUMENT-SPECIFIC DOCTOR ACCESS
-- =====================================================

create or replace function
  public.doctor_can_read_medical_document(
    target_document_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_medical_documents document
    join public.doctors doctor
      on (
        doctor.id = document.uploaded_by_doctor_id
        or exists (
          select 1
          from public.patient_medical_document_shares share
          where share.document_id = document.id
            and share.doctor_id = doctor.id
            and share.revoked_at is null
            and (
              share.expires_at is null
              or share.expires_at > now()
            )
        )
      )
    join public.profiles profile
      on profile.id = doctor.profile_id
    where document.id = target_document_id
      and document.deleted_at is null
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  );
$$;

revoke all
on function public.doctor_can_read_medical_document(uuid)
from public;

grant execute
on function public.doctor_can_read_medical_document(uuid)
to authenticated, service_role;

-- Replace folder-wide doctor metadata access with document-specific access.
drop policy if exists
  "Doctors can read accessible patient medical documents"
on public.patient_medical_documents;

create policy
  "Doctors can read explicitly accessible medical documents"
on public.patient_medical_documents
for select
to authenticated
using (
  deleted_at is null
  and public.doctor_can_read_medical_document(id)
);

create or replace function
  public.can_read_patient_medical_storage_object(
    object_name text
  )
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.patient_medical_documents document
    where document.storage_bucket =
      'patient-medical-folder'
      and document.storage_path = object_name
      and document.deleted_at is null
      and (
        document.patient_profile_id = auth.uid()
        or public.doctor_can_read_medical_document(
          document.id
        )
        or public.is_admin()
      )
  );
$$;

-- =====================================================
-- 3. SHARE RLS
-- =====================================================

alter table public.patient_medical_document_shares
  enable row level security;

create policy
  "Patients can read own medical document shares"
on public.patient_medical_document_shares
for select
to authenticated
using (
  patient_profile_id = auth.uid()
  and public.is_active_patient_profile(auth.uid())
);

create policy
  "Shared doctors can read own active grants"
on public.patient_medical_document_shares
for select
to authenticated
using (
  doctor_id in (
    select doctor.id
    from public.doctors doctor
    join public.profiles profile
      on profile.id = doctor.profile_id
    where doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
);

create policy
  "Admins can read medical document shares"
on public.patient_medical_document_shares
for select
to authenticated
using (
  public.is_admin()
);

revoke all
on table public.patient_medical_document_shares
from public, anon, authenticated;

grant select
on table public.patient_medical_document_shares
to authenticated;

-- Writes are server-only through validated API routes.

-- =====================================================
-- 4. EXPAND IMMUTABLE DOCUMENT EVENTS
-- =====================================================

alter table public.patient_medical_document_events
  drop constraint if exists
    patient_medical_document_events_event_type_check;

alter table public.patient_medical_document_events
  add constraint
    patient_medical_document_events_event_type_check
  check (
    event_type in (
      'created',
      'soft_deleted',
      'shared',
      'share_revoked',
      'viewed',
      'downloaded'
    )
  );

alter table public.patient_medical_document_events
  drop constraint if exists
    patient_medical_document_events_actor_role_check;

alter table public.patient_medical_document_events
  add constraint
    patient_medical_document_events_actor_role_check
  check (
    actor_role in (
      'patient',
      'doctor',
      'admin'
    )
  );

-- Patient already has read access to own events from Step 63B.
-- Doctors may read events only for documents they can currently access.
drop policy if exists
  "Doctors can read accessible medical document events"
on public.patient_medical_document_events;

create policy
  "Doctors can read explicitly accessible medical document events"
on public.patient_medical_document_events
for select
to authenticated
using (
  public.doctor_can_read_medical_document(
    document_id
  )
);

commit;
