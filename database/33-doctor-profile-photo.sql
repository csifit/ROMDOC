-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 61C: Doctor profile photo storage workflow
--
-- File:
-- ROMDOC/database/33-doctor-profile-photo.sql
--
-- Adds:
--   - private staging bucket
--   - public doctor profile photo bucket
--   - storage path column for safe replacement/deletion
-- =====================================================

begin;

alter table public.doctors
  add column if not exists photo_storage_path text;

comment on column public.doctors.photo_storage_path is
  'Object path inside the public doctor-profile-photos bucket. Used for safe replacement and deletion.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'doctor-photo-staging',
  'doctor-photo-staging',
  false,
  5242880,
  array[
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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'doctor-profile-photos',
  'doctor-profile-photos',
  true,
  5242880,
  array[
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

-- No authenticated write policies are intentionally created.
-- The trusted server API uses the service-role client after validating
-- the current user and doctor ownership.

commit;
