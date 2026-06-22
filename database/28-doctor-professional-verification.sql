-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 60A: Doctor professional verification foundation
--
-- File:
-- ROMDOC/database/28-doctor-professional-verification.sql
--
-- Adds:
--   - versioned professional verification submissions
--   - private verification document metadata
--   - private Supabase Storage bucket
--   - doctor/admin Row Level Security policies
--   - indexes and updated_at triggers
--
-- Existing public.doctors verification summary columns from
-- migration 27 remain the public source of truth for badges
-- and directory filtering.
-- =====================================================

begin;

-- =====================================================
-- 1. VERIFICATION SUBMISSIONS
-- =====================================================

create table if not exists public.doctor_verification_submissions (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null
    references public.doctors(id)
    on delete cascade,

  status text not null default 'draft'
    constraint doctor_verification_submissions_status_check
    check (
      status in (
        'draft',
        'submitted',
        'under_review',
        'verified',
        'rejected',
        'expired',
        'withdrawn'
      )
    ),

  professional_registration_number text not null,
  issuing_authority text not null,
  professional_title text,
  registration_country text not null default 'RO',
  registration_expires_at date,

  submitted_at timestamptz,
  reviewed_at timestamptz,

  reviewed_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint doctor_verification_registration_number_not_blank
    check (
      char_length(
        trim(professional_registration_number)
      ) between 2 and 150
    ),

  constraint doctor_verification_issuing_authority_not_blank
    check (
      char_length(
        trim(issuing_authority)
      ) between 2 and 250
    ),

  constraint doctor_verification_country_code_format
    check (
      registration_country ~ '^[A-Z]{2}$'
    ),

  constraint doctor_verification_rejection_reason_required
    check (
      status <> 'rejected'
      or nullif(trim(rejection_reason), '') is not null
    ),

  constraint doctor_verification_submitted_at_required
    check (
      status = 'draft'
      or submitted_at is not null
    ),

  constraint doctor_verification_review_fields_consistent
    check (
      status not in (
        'verified',
        'rejected',
        'expired'
      )
      or (
        reviewed_at is not null
        and reviewed_by_profile_id is not null
      )
    )
);

comment on table public.doctor_verification_submissions is
  'Versioned professional verification requests submitted by doctors and reviewed by RomDoc administrators.';

-- Only one submission may be actively edited or reviewed for a doctor.
create unique index if not exists
  idx_doctor_verification_one_open_submission
on public.doctor_verification_submissions (
  doctor_id
)
where status in (
  'draft',
  'submitted',
  'under_review'
);

create index if not exists
  idx_doctor_verification_submissions_doctor_created
on public.doctor_verification_submissions (
  doctor_id,
  created_at desc
);

create index if not exists
  idx_doctor_verification_submissions_status_submitted
on public.doctor_verification_submissions (
  status,
  submitted_at asc
);

create index if not exists
  idx_doctor_verification_submissions_reviewer
on public.doctor_verification_submissions (
  reviewed_by_profile_id,
  reviewed_at desc
);

-- =====================================================
-- 2. VERIFICATION DOCUMENT METADATA
-- =====================================================

create table if not exists public.doctor_verification_documents (
  id uuid primary key default gen_random_uuid(),

  submission_id uuid not null
    references public.doctor_verification_submissions(id)
    on delete cascade,

  uploaded_by_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,

  document_type text not null default 'other'
    constraint doctor_verification_documents_type_check
    check (
      document_type in (
        'identity_document',
        'professional_certificate',
        'membership_certificate',
        'practice_authorization',
        'other'
      )
    ),

  storage_bucket text not null default
    'doctor-verification-documents',

  storage_path text not null,
  original_file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  checksum_sha256 text,

  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  constraint doctor_verification_documents_bucket_check
    check (
      storage_bucket = 'doctor-verification-documents'
    ),

  constraint doctor_verification_documents_path_not_blank
    check (
      nullif(trim(storage_path), '') is not null
    ),

  constraint doctor_verification_documents_name_not_blank
    check (
      nullif(trim(original_file_name), '') is not null
    ),

  constraint doctor_verification_documents_mime_check
    check (
      mime_type in (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
    ),

  constraint doctor_verification_documents_size_check
    check (
      file_size_bytes > 0
      and file_size_bytes <= 10485760
    ),

  constraint doctor_verification_documents_deletion_consistent
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

  unique(storage_bucket, storage_path)
);

comment on table public.doctor_verification_documents is
  'Private metadata for files stored in the doctor-verification-documents Supabase Storage bucket.';

comment on column public.doctor_verification_documents.storage_path is
  'Expected format: <doctor-profile-id>/<submission-id>/<generated-file-name>.';

create index if not exists
  idx_doctor_verification_documents_submission
on public.doctor_verification_documents (
  submission_id,
  created_at asc
)
where deleted_at is null;

create index if not exists
  idx_doctor_verification_documents_uploader
on public.doctor_verification_documents (
  uploaded_by_profile_id,
  created_at desc
);

-- =====================================================
-- 3. PRIVATE ADMIN NOTES
-- =====================================================

create table if not exists public.doctor_verification_admin_notes (
  id uuid primary key default gen_random_uuid(),

  submission_id uuid not null
    references public.doctor_verification_submissions(id)
    on delete cascade,

  author_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,

  note text not null,
  created_at timestamptz not null default now(),

  constraint doctor_verification_admin_note_not_blank
    check (
      char_length(trim(note)) between 1 and 5000
    )
);

comment on table public.doctor_verification_admin_notes is
  'Administrator-only review notes. Doctors must never receive access to this table.';

create index if not exists
  idx_doctor_verification_admin_notes_submission
on public.doctor_verification_admin_notes (
  submission_id,
  created_at asc
);

-- =====================================================
-- 4. UPDATED_AT TRIGGER
-- =====================================================

drop trigger if exists
  doctor_verification_submissions_updated_at
on public.doctor_verification_submissions;

create trigger
  doctor_verification_submissions_updated_at
before update
on public.doctor_verification_submissions
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 5. AUTHORIZATION HELPERS
-- =====================================================

create or replace function public.owns_doctor_verification_submission(
  target_submission_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctor_verification_submissions as submission
    join public.doctors as doctor
      on doctor.id = submission.doctor_id
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where submission.id = target_submission_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  );
$$;

revoke all
on function public.owns_doctor_verification_submission(uuid)
from public;

grant execute
on function public.owns_doctor_verification_submission(uuid)
to authenticated;

create or replace function public.can_access_doctor_verification_storage_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.doctors as doctor
      join public.profiles as profile
        on profile.id = doctor.profile_id
      where doctor.profile_id = auth.uid()
        and profile.role = 'doctor'
        and profile.account_status = 'active'
        and (storage.foldername(object_name))[1] = auth.uid()::text
    );
$$;

revoke all
on function public.can_access_doctor_verification_storage_object(text)
from public;

grant execute
on function public.can_access_doctor_verification_storage_object(text)
to authenticated;

-- =====================================================
-- 6. TABLE ROW LEVEL SECURITY
-- =====================================================

alter table public.doctor_verification_submissions
  enable row level security;

alter table public.doctor_verification_documents
  enable row level security;

alter table public.doctor_verification_admin_notes
  enable row level security;

-- Safe re-run cleanup.
drop policy if exists
  "Doctors can read own verification submissions"
on public.doctor_verification_submissions;

drop policy if exists
  "Doctors can create own verification drafts"
on public.doctor_verification_submissions;

drop policy if exists
  "Doctors can update own editable verification submissions"
on public.doctor_verification_submissions;

drop policy if exists
  "Admins can manage verification submissions"
on public.doctor_verification_submissions;

drop policy if exists
  "Doctors can read own verification document metadata"
on public.doctor_verification_documents;

drop policy if exists
  "Doctors can create own verification document metadata"
on public.doctor_verification_documents;

drop policy if exists
  "Doctors can update own draft verification document metadata"
on public.doctor_verification_documents;

drop policy if exists
  "Admins can manage verification document metadata"
on public.doctor_verification_documents;

-- Doctors may read their own verification history. Private administrator
-- notes are stored in a separate admin-only table below.
create policy
  "Doctors can read own verification submissions"
on public.doctor_verification_submissions
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id = doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
);

create policy
  "Doctors can create own verification drafts"
on public.doctor_verification_submissions
for insert
to authenticated
with check (
  status = 'draft'
  and submitted_at is null
  and reviewed_at is null
  and reviewed_by_profile_id is null
  and rejection_reason is null
  and exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id = doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
);

-- A doctor can edit a draft or submit it. Rejected/verified submissions are
-- immutable to doctors and remain part of the audit history.
create policy
  "Doctors can update own editable verification submissions"
on public.doctor_verification_submissions
for update
to authenticated
using (
  status = 'draft'
  and exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id = doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
)
with check (
  status in (
    'draft',
    'submitted'
  )
  and reviewed_at is null
  and reviewed_by_profile_id is null
  and rejection_reason is null
  and (
    status <> 'submitted'
    or submitted_at is not null
  )
  and exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id = doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  )
);

create policy
  "Admins can manage verification submissions"
on public.doctor_verification_submissions
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

create policy
  "Doctors can read own verification document metadata"
on public.doctor_verification_documents
for select
to authenticated
using (
  public.owns_doctor_verification_submission(
    submission_id
  )
);

create policy
  "Doctors can create own verification document metadata"
on public.doctor_verification_documents
for insert
to authenticated
with check (
  uploaded_by_profile_id = auth.uid()
  and deleted_at is null
  and deleted_by_profile_id is null
  and public.owns_doctor_verification_submission(
    submission_id
  )
  and exists (
    select 1
    from public.doctor_verification_submissions as submission
    where submission.id = submission_id
      and submission.status = 'draft'
  )
);

create policy
  "Doctors can update own draft verification document metadata"
on public.doctor_verification_documents
for update
to authenticated
using (
  uploaded_by_profile_id = auth.uid()
  and public.owns_doctor_verification_submission(
    submission_id
  )
  and exists (
    select 1
    from public.doctor_verification_submissions as submission
    where submission.id = submission_id
      and submission.status = 'draft'
  )
)
with check (
  uploaded_by_profile_id = auth.uid()
  and public.owns_doctor_verification_submission(
    submission_id
  )
  and exists (
    select 1
    from public.doctor_verification_submissions as submission
    where submission.id = submission_id
      and submission.status = 'draft'
  )
);

create policy
  "Admins can manage verification document metadata"
on public.doctor_verification_documents
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists
  "Admins can manage verification admin notes"
on public.doctor_verification_admin_notes;

create policy
  "Admins can manage verification admin notes"
on public.doctor_verification_admin_notes
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
  and author_profile_id = auth.uid()
);

-- =====================================================
-- 7. PRIVATE SUPABASE STORAGE BUCKET
-- =====================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'doctor-verification-documents',
  'doctor-verification-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Safe re-run cleanup.
drop policy if exists
  "Doctors and admins can read verification files"
on storage.objects;

drop policy if exists
  "Doctors can upload own verification files"
on storage.objects;

drop policy if exists
  "Doctors can update own draft verification files"
on storage.objects;

drop policy if exists
  "Doctors can delete own draft verification files"
on storage.objects;

drop policy if exists
  "Admins can manage verification files"
on storage.objects;

create policy
  "Doctors and admins can read verification files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'doctor-verification-documents'
  and public.can_access_doctor_verification_storage_object(
    name
  )
);

-- Required object path:
--   <authenticated-profile-id>/<submission-id>/<generated-file-name>
create policy
  "Doctors can upload own verification files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'doctor-verification-documents'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.doctor_verification_submissions as submission
    join public.doctors as doctor
      on doctor.id = submission.doctor_id
    where submission.id::text = (storage.foldername(name))[2]
      and submission.status = 'draft'
      and doctor.profile_id = auth.uid()
  )
);

create policy
  "Doctors can update own draft verification files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'doctor-verification-documents'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.doctor_verification_submissions as submission
    join public.doctors as doctor
      on doctor.id = submission.doctor_id
    where submission.id::text = (storage.foldername(name))[2]
      and submission.status = 'draft'
      and doctor.profile_id = auth.uid()
  )
)
with check (
  bucket_id = 'doctor-verification-documents'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.doctor_verification_submissions as submission
    join public.doctors as doctor
      on doctor.id = submission.doctor_id
    where submission.id::text = (storage.foldername(name))[2]
      and submission.status = 'draft'
      and doctor.profile_id = auth.uid()
  )
);

create policy
  "Doctors can delete own draft verification files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'doctor-verification-documents'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.doctor_verification_submissions as submission
    join public.doctors as doctor
      on doctor.id = submission.doctor_id
    where submission.id::text = (storage.foldername(name))[2]
      and submission.status = 'draft'
      and doctor.profile_id = auth.uid()
  )
);

create policy
  "Admins can manage verification files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'doctor-verification-documents'
  and public.is_admin()
)
with check (
  bucket_id = 'doctor-verification-documents'
  and public.is_admin()
);

-- =====================================================
-- 8. EXPLICIT GRANTS
-- =====================================================

grant select, insert, update
on public.doctor_verification_submissions
to authenticated;

grant select, insert, update
on public.doctor_verification_documents
to authenticated;

grant select, insert, update, delete
on public.doctor_verification_admin_notes
to authenticated;

-- No DELETE grant is given on the metadata tables. Application deletion
-- should use soft-delete fields and a secure server route.

commit;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'doctor_verification_submissions',
    'doctor_verification_documents'
  )
order by table_name;

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'doctor-verification-documents';

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where (
    schemaname = 'public'
    and tablename in (
      'doctor_verification_submissions',
      'doctor_verification_documents',
      'doctor_verification_admin_notes'
    )
  )
  or (
    schemaname = 'storage'
    and tablename = 'objects'
    and policyname ilike '%verification%'
  )
order by schemaname, tablename, policyname;
