-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 63A: Patient Medical Folder foundation
--
-- File:
-- ROMDOC/database/39-patient-medical-folder-foundation.sql
--
-- Adds:
--   - private Supabase Storage bucket
--   - patient medical document metadata
--   - patient and doctor access helpers
--   - strict Row Level Security policies
--   - storage object read policies
--
-- Important:
--   Direct client-side uploads are intentionally NOT enabled.
--   Step 63B will add validated server upload routes.
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
  'patient-medical-folder',
  'patient-medical-folder',
  false,
  20971520,
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
-- 2. MEDICAL DOCUMENT METADATA
-- =====================================================

create table if not exists public.patient_medical_documents (
  id uuid primary key default gen_random_uuid(),

  patient_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,

  appointment_id uuid
    references public.appointments(id)
    on update cascade
    on delete set null,

  uploaded_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,

  uploaded_by_doctor_id uuid
    references public.doctors(id)
    on update cascade
    on delete restrict,

  document_type text not null
    constraint patient_medical_documents_type_check
    check (
      document_type in (
        'consultation_note',
        'prescription',
        'laboratory_result',
        'imaging_result',
        'referral',
        'medical_certificate',
        'discharge_summary',
        'other'
      )
    ),

  title text not null,
  description text,

  storage_bucket text not null
    default 'patient-medical-folder',

  storage_path text not null,

  original_file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  checksum_sha256 text,

  created_at timestamptz not null default now(),

  deleted_at timestamptz,
  deleted_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  constraint patient_medical_documents_bucket_check
    check (
      storage_bucket = 'patient-medical-folder'
    ),

  constraint patient_medical_documents_title_check
    check (
      char_length(trim(title)) between 2 and 250
    ),

  constraint patient_medical_documents_description_check
    check (
      description is null
      or char_length(trim(description)) between 1 and 5000
    ),

  constraint patient_medical_documents_path_check
    check (
      nullif(trim(storage_path), '') is not null
    ),

  constraint patient_medical_documents_file_name_check
    check (
      char_length(trim(original_file_name)) between 1 and 255
    ),

  constraint patient_medical_documents_mime_check
    check (
      mime_type in (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
    ),

  constraint patient_medical_documents_size_check
    check (
      file_size_bytes > 0
      and file_size_bytes <= 20971520
    ),

  constraint patient_medical_documents_checksum_check
    check (
      checksum_sha256 is null
      or checksum_sha256 ~ '^[a-fA-F0-9]{64}$'
    ),

  constraint patient_medical_documents_deletion_check
    check (
      (
        deleted_at is null
        and deleted_by_profile_id is null
      )
      or (
        deleted_at is not null
        and deleted_by_profile_id is not null
      )
    ),

  constraint patient_medical_documents_uploader_check
    check (
      uploaded_by_doctor_id is not null
    ),

  unique (
    storage_bucket,
    storage_path
  )
);

comment on table public.patient_medical_documents is
  'Private metadata for patient medical Folder documents. File bytes are stored in the private patient-medical-folder Supabase Storage bucket.';

comment on column public.patient_medical_documents.storage_path is
  'Required path format: <patient-profile-id>/<document-id>/<generated-file-name>.';

comment on column public.patient_medical_documents.deleted_at is
  'Soft-deletion timestamp. Only the doctor who uploaded the document may mark it deleted.';

create index if not exists
  idx_patient_medical_documents_patient_created
on public.patient_medical_documents (
  patient_profile_id,
  created_at desc
)
where deleted_at is null;

create index if not exists
  idx_patient_medical_documents_doctor_created
on public.patient_medical_documents (
  uploaded_by_doctor_id,
  created_at desc
)
where deleted_at is null;

create index if not exists
  idx_patient_medical_documents_appointment
on public.patient_medical_documents (
  appointment_id,
  created_at desc
)
where appointment_id is not null
  and deleted_at is null;

create index if not exists
  idx_patient_medical_documents_type_created
on public.patient_medical_documents (
  document_type,
  created_at desc
)
where deleted_at is null;

-- =====================================================
-- 3. ACCESS HELPERS
-- =====================================================

create or replace function public.is_active_patient_profile(
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = target_profile_id
      and profile.role = 'patient'
      and profile.account_status = 'active'
  );
$$;

revoke all
on function public.is_active_patient_profile(uuid)
from public;

grant execute
on function public.is_active_patient_profile(uuid)
to authenticated, service_role;

create or replace function public.doctor_can_access_patient_folder(
  target_patient_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctors as doctor
    join public.profiles as doctor_profile
      on doctor_profile.id = doctor.profile_id
    join public.appointments as appointment
      on appointment.doctor_id = doctor.id
    where doctor.profile_id = auth.uid()
      and doctor_profile.role = 'doctor'
      and doctor_profile.account_status = 'active'
      and appointment.patient_profile_id =
        target_patient_profile_id
      and appointment.status in (
        'confirmed',
        'rescheduled',
        'completed'
      )
  );
$$;

revoke all
on function public.doctor_can_access_patient_folder(uuid)
from public;

grant execute
on function public.doctor_can_access_patient_folder(uuid)
to authenticated, service_role;

create or replace function public.doctor_owns_medical_document(
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
    from public.patient_medical_documents as document
    join public.doctors as doctor
      on doctor.id = document.uploaded_by_doctor_id
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where document.id = target_document_id
      and doctor.profile_id = auth.uid()
      and document.uploaded_by_profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  );
$$;

revoke all
on function public.doctor_owns_medical_document(uuid)
from public;

grant execute
on function public.doctor_owns_medical_document(uuid)
to authenticated, service_role;

create or replace function public.can_read_patient_medical_storage_object(
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
    from public.patient_medical_documents as document
    where document.storage_bucket =
      'patient-medical-folder'
      and document.storage_path = object_name
      and document.deleted_at is null
      and (
        document.patient_profile_id = auth.uid()
        or public.doctor_can_access_patient_folder(
          document.patient_profile_id
        )
        or public.is_admin()
      )
  );
$$;

revoke all
on function public.can_read_patient_medical_storage_object(text)
from public;

grant execute
on function public.can_read_patient_medical_storage_object(text)
to authenticated, service_role;

-- =====================================================
-- 4. TABLE RLS
-- =====================================================

alter table public.patient_medical_documents
  enable row level security;

drop policy if exists
  "Patients can read own medical documents"
on public.patient_medical_documents;

drop policy if exists
  "Doctors can read accessible patient medical documents"
on public.patient_medical_documents;

drop policy if exists
  "Doctors can create patient medical document metadata"
on public.patient_medical_documents;

drop policy if exists
  "Uploading doctors can soft delete own medical documents"
on public.patient_medical_documents;

drop policy if exists
  "Admins can read patient medical documents"
on public.patient_medical_documents;

create policy
  "Patients can read own medical documents"
on public.patient_medical_documents
for select
to authenticated
using (
  patient_profile_id = auth.uid()
  and deleted_at is null
  and public.is_active_patient_profile(auth.uid())
);

create policy
  "Doctors can read accessible patient medical documents"
on public.patient_medical_documents
for select
to authenticated
using (
  deleted_at is null
  and public.doctor_can_access_patient_folder(
    patient_profile_id
  )
);

-- This metadata insert policy is deliberately strict.
-- Step 63B will normally insert through a validated server route.
create policy
  "Doctors can create patient medical document metadata"
on public.patient_medical_documents
for insert
to authenticated
with check (
  uploaded_by_profile_id = auth.uid()
  and uploaded_by_doctor_id is not null
  and deleted_at is null
  and deleted_by_profile_id is null
  and public.is_active_patient_profile(
    patient_profile_id
  )
  and exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id = uploaded_by_doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
  and public.doctor_can_access_patient_folder(
    patient_profile_id
  )
  and (
    appointment_id is null
    or exists (
      select 1
      from public.appointments as appointment
      where appointment.id = appointment_id
        and appointment.patient_profile_id =
          patient_profile_id
        and appointment.doctor_id =
          uploaded_by_doctor_id
        and appointment.status in (
          'confirmed',
          'rescheduled',
          'completed'
        )
    )
  )
  and (
    storage.foldername(storage_path)
  )[1] = patient_profile_id::text
  and (
    storage.foldername(storage_path)
  )[2] = id::text
);

create policy
  "Uploading doctors can soft delete own medical documents"
on public.patient_medical_documents
for update
to authenticated
using (
  deleted_at is null
  and public.doctor_owns_medical_document(id)
)
with check (
  public.doctor_owns_medical_document(id)
  and deleted_at is not null
  and deleted_by_profile_id = auth.uid()
);

create policy
  "Admins can read patient medical documents"
on public.patient_medical_documents
for select
to authenticated
using (
  public.is_admin()
);

revoke all
on table public.patient_medical_documents
from public, anon, authenticated;

grant select, insert, update
on table public.patient_medical_documents
to authenticated;

-- No DELETE privilege is granted. Documents use soft deletion.

-- =====================================================
-- 5. STORAGE RLS
-- =====================================================

drop policy if exists
  "Authorized users can read patient medical files"
on storage.objects;

drop policy if exists
  "Doctors can upload patient medical files"
on storage.objects;

drop policy if exists
  "Uploading doctors can delete patient medical files"
on storage.objects;

create policy
  "Authorized users can read patient medical files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'patient-medical-folder'
  and public.can_read_patient_medical_storage_object(name)
);

-- Direct browser uploads are intentionally blocked in Step 63A.
-- The validated Step 63B server route will use the service role.
-- No authenticated INSERT policy is created here.

-- Direct object deletion is also blocked.
-- Step 63B will soft-delete metadata first and remove the object
-- through a validated server route owned by the uploader doctor.

commit;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'patient-medical-folder';

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'patient_medical_documents'
order by ordinal_position;

select
  policyname,
  cmd
from pg_policies
where (
  schemaname = 'public'
  and tablename = 'patient_medical_documents'
)
or (
  schemaname = 'storage'
  and tablename = 'objects'
  and policyname like '%patient medical%'
)
order by schemaname, tablename, policyname;
