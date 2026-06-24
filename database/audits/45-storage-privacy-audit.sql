-- =========================================================
-- RomDoc Step 66C
-- Supabase Storage privacy and signed-URL database audit
--
-- Exact destination:
-- ROMDOC/database/audits/45-storage-privacy-audit.sql
--
-- READ ONLY:
-- This file creates no objects and changes no data.
-- Run each numbered result set separately in Supabase SQL Editor.
-- =========================================================


-- ---------------------------------------------------------
-- 1. BUCKET INVENTORY AND PRIVACY CLASSIFICATION
-- ---------------------------------------------------------

select
  b.id as bucket_id,
  b.name as bucket_name,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types,
  case
    when lower(b.id) ~
      '(medical|patient|verification|identity|certificate|authorization|private)'
      and b.public
      then 'CRITICAL: sensitive-looking bucket is public'

    when lower(b.id) ~
      '(medical|patient|verification|identity|certificate|authorization|private)'
      and not b.public
      then 'OK: sensitive bucket is private'

    when b.public
      then 'REVIEW: intentionally public bucket'

    else 'OK: private bucket'
  end as audit_status
from storage.buckets b
order by b.id;


-- ---------------------------------------------------------
-- 2. STORAGE.OBJECTS RLS STATUS
-- ---------------------------------------------------------

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls,
  case
    when not c.relrowsecurity
      then 'CRITICAL: RLS disabled on storage.objects'
    else 'OK'
  end as audit_status
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'storage'
  and c.relname = 'objects';


-- ---------------------------------------------------------
-- 3. COMPLETE STORAGE POLICY INVENTORY
-- ---------------------------------------------------------

select
  p.policyname,
  p.cmd,
  p.roles,
  p.permissive,
  p.qual as using_expression,
  p.with_check as with_check_expression
from pg_policies p
where p.schemaname = 'storage'
  and p.tablename = 'objects'
order by
  p.cmd,
  p.policyname;


-- ---------------------------------------------------------
-- 4. POLICIES THAT APPLY TO PUBLIC OR ANON
-- ---------------------------------------------------------

select
  p.policyname,
  p.cmd,
  p.roles,
  p.qual as using_expression,
  p.with_check as with_check_expression,
  case
    when (
      'public' = any(p.roles)
      or 'anon' = any(p.roles)
    )
    and coalesce(
      p.qual,
      p.with_check,
      ''
    ) !~* 'bucket_id'
      then 'HIGH: public/anon policy without obvious bucket restriction'

    when (
      'public' = any(p.roles)
      or 'anon' = any(p.roles)
    )
      then 'REVIEW: public or anonymous storage policy'

    else 'OK'
  end as audit_status
from pg_policies p
where p.schemaname = 'storage'
  and p.tablename = 'objects'
  and (
    'public' = any(p.roles)
    or 'anon' = any(p.roles)
  )
order by p.policyname;


-- ---------------------------------------------------------
-- 5. POSSIBLY UNCONDITIONAL STORAGE POLICIES
-- ---------------------------------------------------------

select
  p.policyname,
  p.cmd,
  p.roles,
  p.qual as using_expression,
  p.with_check as with_check_expression,
  case
    when lower(
      coalesce(p.qual, '')
    ) in ('true', '(true)')
      or lower(
        coalesce(
          p.with_check,
          ''
        )
      ) in ('true', '(true)')
      then 'HIGH: unconditional storage policy'
    else 'REVIEW'
  end as audit_status
from pg_policies p
where p.schemaname = 'storage'
  and p.tablename = 'objects'
  and (
    lower(
      coalesce(p.qual, '')
    ) in ('true', '(true)')
    or lower(
      coalesce(
        p.with_check,
        ''
      )
    ) in ('true', '(true)')
  )
order by p.policyname;


-- ---------------------------------------------------------
-- 6. POLICY COVERAGE PER BUCKET
--
-- This is heuristic: it searches policy expressions for the
-- literal bucket ID. A policy may still use a helper function.
-- ---------------------------------------------------------

with policy_text as (
  select
    p.policyname,
    p.cmd,
    array_to_string(
      p.roles,
      ','
    ) as role_text,
    concat_ws(
      ' ',
      p.qual,
      p.with_check
    ) as expression_text
  from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
)
select
  b.id as bucket_id,
  b.public,
  count(pt.policyname) filter (
    where pt.expression_text ilike
      '%' || b.id || '%'
  ) as policies_mentioning_bucket,
  string_agg(
    distinct pt.policyname,
    ', '
  ) filter (
    where pt.expression_text ilike
      '%' || b.id || '%'
  ) as matching_policies,
  case
    when not b.public
      and count(pt.policyname) filter (
        where pt.expression_text ilike
          '%' || b.id || '%'
      ) = 0
      then 'REVIEW: private bucket has no policy mentioning its ID'
    else 'OK/REVIEW HELPERS'
  end as audit_status
from storage.buckets b
cross join policy_text pt
group by
  b.id,
  b.public
order by b.id;


-- ---------------------------------------------------------
-- 7. OBJECT COUNTS AND TOTAL SIZE PER BUCKET
-- ---------------------------------------------------------

select
  o.bucket_id,
  count(*) as object_count,
  coalesce(
    sum(
      case
        when (
          o.metadata ->> 'size'
        ) ~ '^[0-9]+$'
          then (
            o.metadata ->> 'size'
          )::bigint
        else 0
      end
    ),
    0
  ) as total_size_bytes,
  min(o.created_at) as oldest_object,
  max(o.created_at) as newest_object
from storage.objects o
group by o.bucket_id
order by o.bucket_id;


-- ---------------------------------------------------------
-- 8. OBJECTS IN UNKNOWN OR MISSING BUCKETS
-- ---------------------------------------------------------

select
  o.id,
  o.bucket_id,
  o.name,
  o.created_at
from storage.objects o
left join storage.buckets b
  on b.id = o.bucket_id
where b.id is null
order by o.created_at desc;


-- ---------------------------------------------------------
-- 9. SUSPICIOUS PATH NAMES
--
-- Flags paths that may expose email addresses, phone numbers,
-- patient names, identity terms or path traversal-like patterns.
-- UUID path segments are preferred.
-- ---------------------------------------------------------

select
  o.bucket_id,
  o.name,
  o.created_at,
  case
    when o.name ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
      then 'HIGH: email address appears in object path'

    when o.name ~ '(^|/)\+?[0-9][0-9 ()-]{7,}($|/)'
      then 'HIGH: phone-like value appears in object path'

    when o.name ~ '(^|/)\.\.?(/|$)'
      then 'HIGH: dot path segment'

    when o.name ~* '(cnp|passport|identity|patient-name|full-name)'
      then 'REVIEW: sensitive descriptive term in path'

    else 'REVIEW'
  end as audit_status
from storage.objects o
where
  o.name ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
  or o.name ~ '(^|/)\+?[0-9][0-9 ()-]{7,}($|/)'
  or o.name ~ '(^|/)\.\.?(/|$)'
  or o.name ~* '(cnp|passport|identity|patient-name|full-name)'
order by o.created_at desc;


-- ---------------------------------------------------------
-- 10. OBJECTS EXCEEDING BUCKET FILE-SIZE LIMIT
-- ---------------------------------------------------------

select
  o.bucket_id,
  o.name,
  (
    o.metadata ->> 'size'
  )::bigint as object_size_bytes,
  b.file_size_limit,
  o.created_at
from storage.objects o
join storage.buckets b
  on b.id = o.bucket_id
where b.file_size_limit is not null
  and (
    o.metadata ->> 'size'
  ) ~ '^[0-9]+$'
  and (
    o.metadata ->> 'size'
  )::bigint > b.file_size_limit
order by object_size_bytes desc;


-- ---------------------------------------------------------
-- 11. MIME TYPES OUTSIDE BUCKET ALLOWLIST
-- ---------------------------------------------------------

select
  o.bucket_id,
  o.name,
  o.metadata ->> 'mimetype'
    as detected_mime_type,
  b.allowed_mime_types,
  o.created_at
from storage.objects o
join storage.buckets b
  on b.id = o.bucket_id
where b.allowed_mime_types is not null
  and cardinality(
    b.allowed_mime_types
  ) > 0
  and coalesce(
    o.metadata ->> 'mimetype',
    ''
  ) <> ''
  and not (
    o.metadata ->> 'mimetype'
    = any(b.allowed_mime_types)
  )
order by o.created_at desc;


-- ---------------------------------------------------------
-- 12. VERIFICATION METADATA POINTING TO MISSING OBJECTS
-- ---------------------------------------------------------

select
  d.id as document_id,
  d.submission_id,
  d.storage_bucket,
  d.storage_path,
  d.original_file_name,
  d.deleted_at,
  case
    when o.id is null
      then 'HIGH: metadata row points to missing storage object'
    else 'OK'
  end as audit_status
from public.doctor_verification_documents d
left join storage.objects o
  on o.bucket_id = d.storage_bucket
 and o.name = d.storage_path
where d.deleted_at is null
  and o.id is null
order by d.created_at desc;


-- ---------------------------------------------------------
-- 13. VERIFICATION OBJECTS WITHOUT LIVE METADATA
-- ---------------------------------------------------------

select
  o.id as storage_object_id,
  o.bucket_id,
  o.name,
  o.created_at,
  case
    when d.id is null
      then 'REVIEW: orphan verification storage object'
    else 'OK'
  end as audit_status
from storage.objects o
left join public.doctor_verification_documents d
  on d.storage_bucket = o.bucket_id
 and d.storage_path = o.name
 and d.deleted_at is null
where o.bucket_id =
  'doctor-verification-documents'
  and d.id is null
order by o.created_at desc;


-- ---------------------------------------------------------
-- 14. MEDICAL DOCUMENT METADATA POINTING TO MISSING OBJECTS
-- ---------------------------------------------------------

select
  d.id as document_id,
  d.patient_profile_id,
  d.appointment_id,
  d.storage_bucket,
  d.storage_path,
  d.original_file_name,
  d.deleted_at,
  case
    when o.id is null
      then 'HIGH: metadata row points to missing storage object'
    else 'OK'
  end as audit_status
from public.patient_medical_documents d
left join storage.objects o
  on o.bucket_id = d.storage_bucket
 and o.name = d.storage_path
where d.content_format = 'file'
  and d.deleted_at is null
  and o.id is null
order by d.created_at desc;


-- ---------------------------------------------------------
-- 15. MEDICAL-FOLDER OBJECTS WITHOUT LIVE METADATA
-- ---------------------------------------------------------

select
  o.id as storage_object_id,
  o.bucket_id,
  o.name,
  o.created_at,
  case
    when d.id is null
      then 'REVIEW: orphan medical-folder storage object'
    else 'OK'
  end as audit_status
from storage.objects o
left join public.patient_medical_documents d
  on d.storage_bucket = o.bucket_id
 and d.storage_path = o.name
 and d.deleted_at is null
where o.bucket_id =
  'patient-medical-folder'
  and d.id is null
order by o.created_at desc;


-- ---------------------------------------------------------
-- 16. PUBLIC OBJECT URL EXPOSURE
--
-- Every object in a public bucket is publicly downloadable
-- when its path is known. Confirm that only intended assets are
-- stored in public buckets.
-- ---------------------------------------------------------

select
  o.bucket_id,
  o.name,
  o.created_at,
  o.metadata ->> 'mimetype'
    as mime_type,
  case
    when lower(o.name) ~
      '(medical|verification|identity|certificate|authorization|patient)'
      then 'CRITICAL: sensitive-looking object in public bucket'
    else 'REVIEW: intentionally public object'
  end as audit_status
from storage.objects o
join storage.buckets b
  on b.id = o.bucket_id
where b.public = true
order by
  o.bucket_id,
  o.created_at desc;


-- ---------------------------------------------------------
-- 17. DUPLICATE OBJECT PATHS
-- ---------------------------------------------------------

select
  o.bucket_id,
  o.name,
  count(*) as duplicate_count
from storage.objects o
group by
  o.bucket_id,
  o.name
having count(*) > 1
order by duplicate_count desc;


-- ---------------------------------------------------------
-- 18. OBJECT OWNER DISTRIBUTION
--
-- owner_id may be null for service-role uploads.
-- Review whether that is intentional per bucket.
-- ---------------------------------------------------------

select
  o.bucket_id,
  o.owner_id,
  count(*) as object_count
from storage.objects o
group by
  o.bucket_id,
  o.owner_id
order by
  o.bucket_id,
  object_count desc;


-- ---------------------------------------------------------
-- 19. STORAGE HELPER FUNCTION EXECUTE ACCESS
-- ---------------------------------------------------------

select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(
    p.oid
  ) as argument_types,
  p.prosecdef as security_definer,
  has_function_privilege(
    'anon',
    p.oid,
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    p.oid,
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    p.oid,
    'EXECUTE'
  ) as service_role_can_execute,
  has_function_privilege(
    'public',
    p.oid,
    'EXECUTE'
  ) as public_can_execute
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname ilike '%storage%'
    or p.proname ilike '%document%'
    or p.proname ilike '%folder%'
    or p.proname ilike '%verification%'
  )
order by p.proname;


-- ---------------------------------------------------------
-- 20. FINAL STORAGE SECURITY SUMMARY
-- ---------------------------------------------------------

select
  (
    select count(*)
    from storage.buckets
  ) as bucket_count,

  (
    select count(*)
    from storage.buckets
    where public = true
  ) as public_bucket_count,

  (
    select count(*)
    from storage.buckets
    where public = true
      and lower(id) ~
        '(medical|patient|verification|identity|certificate|authorization|private)'
  ) as sensitive_public_bucket_count,

  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  ) as storage_policy_count,

  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        'public' = any(roles)
        or 'anon' = any(roles)
      )
  ) as public_or_anon_policy_count,

  (
    select count(*)
    from public.doctor_verification_documents d
    left join storage.objects o
      on o.bucket_id =
        d.storage_bucket
     and o.name =
        d.storage_path
    where d.deleted_at is null
      and o.id is null
  ) as missing_verification_objects,

  (
    select count(*)
    from public.patient_medical_documents d
    left join storage.objects o
      on o.bucket_id =
        d.storage_bucket
     and o.name =
        d.storage_path
    where d.content_format = 'file'
      and d.deleted_at is null
      and o.id is null
  ) as missing_medical_objects;
