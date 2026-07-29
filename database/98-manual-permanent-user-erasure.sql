-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Manual permanent user erasure toolkit — corrected v2.1
--
-- Target path:
-- ROMDOC/database/98-manual-permanent-user-erasure.sql
--
-- IMPORTANT:
--   1. This migration does not delete any user when installed.
--   2. It exposes two owner-only SQL Editor operations and installs
--      private privacy-erasure support. It changes no user rows on install.
--   3. No execute permission is granted to anon, authenticated,
--      service_role, or the public API.
--   4. Physical Supabase Storage objects must be deleted first.
--   5. The execution function requires the exact UUID and an exact,
--      UUID-specific irreversible confirmation phrase.
--   6. Shared records are preserved only after the departing user's
--      profile UUID and direct identifiers have been removed.
--   7. Auth-only invited Doctors are resolved through
--      doctor_invitations.auth_user_id/email even when profiles and
--      doctors.profile_id are missing.
--   8. Doctor invitation events, grants, and invitations are removed
--      in dependency order.
--   9. A Doctor row is deleted completely when no shared patient
--      history still needs it; otherwise an anonymised internal
--      tombstone is retained.
-- =====================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- =====================================================
-- 1. PRIVACY-ERASURE EXECUTION CONTEXT
-- =====================================================

create or replace function public.privacy_erasure_context_active()
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_catalog
as $function$
  select coalesce(
    current_setting('romdoc.privacy_erasure', true),
    ''
  ) = 'confirmed';
$function$;

revoke all on function public.privacy_erasure_context_active()
from public, anon, authenticated, service_role;

comment on function public.privacy_erasure_context_active() is
  'True only inside the manually confirmed RomDoc permanent-erasure transaction.';


-- =====================================================
-- 1A. CONTRACT AUTHOR-REFERENCE REDACTION
-- =====================================================
-- These three trigger functions retain their normal immutability rules.
-- During a confirmed erasure transaction they permit only changes to
-- profile-reference audit columns. Contract content and commercial data
-- must remain byte-for-byte unchanged.

create or replace function public.prepare_contract_document_version()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  previous_document public.contract_documents%rowtype;
begin
  if tg_op = 'UPDATE'
    and public.privacy_erasure_context_active()
    and (
      to_jsonb(new) - array[
        'created_by_profile_id',
        'published_by_profile_id',
        'updated_at'
      ]::text[]
    ) = (
      to_jsonb(old) - array[
        'created_by_profile_id',
        'published_by_profile_id',
        'updated_at'
      ]::text[]
    )
  then
    new.updated_at := old.updated_at;
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception
      'Contract documents must be created as drafts before publication.';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'published' then
      raise exception
        'Published contract documents are immutable. Create a new version instead.';
    end if;

    if new.id <> old.id
      or new.document_key <> old.document_key
      or new.audience <> old.audience
      or new.locale <> old.locale
      or new.created_by_profile_id <> old.created_by_profile_id
      or new.created_at <> old.created_at
    then
      raise exception
        'The document identity and creation evidence cannot be changed.';
    end if;
  end if;

  if new.supersedes_document_id is not null then
    select *
    into previous_document
    from public.contract_documents
    where id = new.supersedes_document_id;

    if not found
      or previous_document.status <> 'published'
      or previous_document.document_key <> new.document_key
      or previous_document.audience <> new.audience
      or previous_document.locale <> new.locale
      or previous_document.version = new.version
    then
      raise exception
        'A new document version may supersede only a published version of the same document key, audience and locale.';
    end if;
  end if;

  new.content_hash := encode(
    digest(convert_to(new.content_html, 'UTF8'), 'sha256'::text),
    'hex'
  );
  new.updated_at := now();

  if new.status = 'draft' then
    new.published_at := null;
    new.published_by_profile_id := null;
  elsif new.status = 'published' then
    if tg_op <> 'UPDATE' or old.status <> 'draft' then
      raise exception
        'Only a draft contract document may be published.';
    end if;

    if new.published_by_profile_id is null then
      raise exception
        'published_by_profile_id is required when publishing a contract document.';
    end if;

    new.published_at := now();

    if new.effective_at is not null
      and new.effective_at < new.published_at
    then
      raise exception
        'A contract document effective date cannot be earlier than its publication timestamp.';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.prepare_contract_package_version()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  previous_package public.contract_packages%rowtype;
  linked_count integer;
  unpublished_count integer;
  invalid_count integer;
  manifest_source text;
begin
  if tg_op = 'UPDATE'
    and public.privacy_erasure_context_active()
    and (
      to_jsonb(new) - array[
        'created_by_profile_id',
        'published_by_profile_id',
        'updated_at'
      ]::text[]
    ) = (
      to_jsonb(old) - array[
        'created_by_profile_id',
        'published_by_profile_id',
        'updated_at'
      ]::text[]
    )
  then
    new.updated_at := old.updated_at;
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception
      'Contract packages must be created as drafts before publication.';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'published' then
      raise exception
        'Published contract packages are immutable. Create a new version instead.';
    end if;

    if new.id <> old.id
      or new.package_key <> old.package_key
      or new.contract_type <> old.contract_type
      or new.locale <> old.locale
      or new.created_by_profile_id <> old.created_by_profile_id
      or new.created_at <> old.created_at
    then
      raise exception
        'The package identity and creation evidence cannot be changed.';
    end if;
  end if;

  if new.supersedes_package_id is not null then
    select *
    into previous_package
    from public.contract_packages
    where id = new.supersedes_package_id;

    if not found
      or previous_package.status <> 'published'
      or previous_package.package_key <> new.package_key
      or previous_package.contract_type <> new.contract_type
      or previous_package.locale <> new.locale
      or previous_package.version = new.version
    then
      raise exception
        'A new package version may supersede only a published version of the same package key, contract type and locale.';
    end if;
  end if;

  new.updated_at := now();

  if new.status = 'draft' then
    new.published_at := null;
    new.published_by_profile_id := null;
    new.manifest_hash := null;
  elsif new.status = 'published' then
    if tg_op <> 'UPDATE' or old.status <> 'draft' then
      raise exception
        'Only a draft contract package may be published.';
    end if;

    if new.published_by_profile_id is null then
      raise exception
        'published_by_profile_id is required when publishing a contract package.';
    end if;

    select
      count(*),
      count(*) filter (where document.status <> 'published'),
      count(*) filter (
        where document.locale <> new.locale
          or not (
            document.audience = 'shared'
            or (
              new.contract_type = 'independent_doctor'
              and document.audience = 'doctor'
            )
            or (
              new.contract_type = 'clinic_organization'
              and document.audience = 'clinic_organization'
            )
          )
      ),
      string_agg(
        concat_ws(
          ':',
          link.display_order::text,
          document.id::text,
          document.document_key,
          document.version,
          document.locale,
          document.content_hash,
          link.is_required::text
        ),
        '|'
        order by link.display_order
      )
    into
      linked_count,
      unpublished_count,
      invalid_count,
      manifest_source
    from public.contract_package_documents as link
    join public.contract_documents as document
      on document.id = link.document_id
    where link.package_id = new.id;

    if linked_count = 0 then
      raise exception
        'A contract package must contain at least one document before publication.';
    end if;

    if unpublished_count > 0 then
      raise exception
        'Every document in a published package must already be published.';
    end if;

    if invalid_count > 0 then
      raise exception
        'One or more documents do not match the package locale or audience.';
    end if;

    new.published_at := now();

    if new.effective_at is not null
      and new.effective_at < new.published_at
    then
      raise exception
        'A contract package effective date cannot be earlier than its publication timestamp.';
    end if;

    new.manifest_hash := encode(
      digest(convert_to(manifest_source, 'UTF8'), 'sha256'::text),
      'hex'
    );
  end if;

  return new;
end;
$function$;

create or replace function public.prepare_client_contract_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  selected_package public.contract_packages%rowtype;
  previous_assignment public.client_contract_assignments%rowtype;
begin
  if tg_op = 'UPDATE'
    and public.privacy_erasure_context_active()
    and (
      to_jsonb(new) - array[
        'created_by_profile_id',
        'updated_by_profile_id',
        'updated_at'
      ]::text[]
    ) = (
      to_jsonb(old) - array[
        'created_by_profile_id',
        'updated_by_profile_id',
        'updated_at'
      ]::text[]
    )
  then
    new.updated_at := old.updated_at;
    return new;
  end if;

  select *
  into selected_package
  from public.contract_packages
  where id = new.package_id;

  if not found or selected_package.status <> 'published' then
    raise exception
      'Only a published contract package may be assigned to a client.';
  end if;

  if selected_package.contract_type <> new.client_type then
    raise exception
      'The contract package type does not match the client type.';
  end if;

  if tg_op = 'INSERT' and new.status <> 'assigned' then
    raise exception
      'A client contract assignment must start with status assigned.';
  end if;

  if tg_op = 'UPDATE' then
    if new.id <> old.id
      or new.package_id <> old.package_id
      or new.client_type <> old.client_type
      or new.doctor_id is distinct from old.doctor_id
      or new.clinic_organization_id is distinct from old.clinic_organization_id
      or new.assigned_at <> old.assigned_at
      or new.created_by_profile_id <> old.created_by_profile_id
      or new.created_at <> old.created_at
    then
      raise exception
        'The assigned package, client target and creation evidence cannot be changed.';
    end if;

    if old.status <> 'assigned'
      and (
        new.commercial_terms is distinct from old.commercial_terms
        or new.payment_deadline_days <> old.payment_deadline_days
        or new.acceptance_required <> old.acceptance_required
        or new.supersedes_assignment_id is distinct from old.supersedes_assignment_id
      )
    then
      raise exception
        'Contractual terms cannot change after an assignment leaves draft assignment status. Create a new assignment instead.';
    end if;

    if old.status <> new.status then
      if not (
        (
          old.status = 'assigned'
          and new.status in (
            'notified',
            'awaiting_acceptance',
            'accepted',
            'cancelled'
          )
        )
        or (
          old.status = 'notified'
          and new.status in (
            'awaiting_acceptance',
            'accepted',
            'cancelled'
          )
        )
        or (
          old.status = 'awaiting_acceptance'
          and new.status in (
            'accepted',
            'cancelled'
          )
        )
        or (
          old.status = 'accepted'
          and new.status in (
            'effective',
            'superseded',
            'terminated'
          )
        )
        or (
          old.status = 'effective'
          and new.status in (
            'superseded',
            'terminated'
          )
        )
      ) then
        raise exception
          'Invalid client contract assignment status transition: % -> %.',
          old.status,
          new.status;
      end if;
    end if;
  end if;

  if new.supersedes_assignment_id is not null then
    select *
    into previous_assignment
    from public.client_contract_assignments
    where id = new.supersedes_assignment_id;

    if not found
      or previous_assignment.client_type <> new.client_type
      or previous_assignment.doctor_id is distinct from new.doctor_id
      or previous_assignment.clinic_organization_id is distinct from new.clinic_organization_id
    then
      raise exception
        'A new assignment may supersede only an assignment for the same client.';
    end if;
  end if;

  new.commercial_terms_hash := encode(
    digest(
      convert_to(new.commercial_terms::text, 'UTF8'),
      'sha256'::text
    ),
    'hex'
  );

  if new.payment_deadline_days is null then
    new.payment_deadline_days :=
      coalesce(selected_package.payment_deadline_days, 30);
  end if;

  if new.effective_at is null then
    new.effective_at := selected_package.effective_at;
  end if;

  if new.status in (
    'notified',
    'awaiting_acceptance',
    'accepted',
    'effective'
  )
    and new.notified_at is null
  then
    new.notified_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.prepare_contract_document_version()
from public, anon, authenticated, service_role;
revoke all on function public.prepare_contract_package_version()
from public, anon, authenticated, service_role;
revoke all on function public.prepare_client_contract_assignment()
from public, anon, authenticated, service_role;


-- =====================================================
-- 2. PRIVACY EXCEPTION FOR KNOWN IMMUTABLE AUDIT TABLES
-- =====================================================
-- Normal application writes remain immutable. The exception is active only
-- after the owner-only erasure function sets a transaction-local flag.

create or replace function public.prevent_appointment_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  raise exception 'appointment_audit_events_are_immutable'
    using errcode = '55000';
end;
$function$;

create or replace function public.prevent_appointment_notification_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  raise exception 'appointment_notification_deliveries_are_immutable'
    using errcode = '55000';
end;
$function$;

create or replace function public.prevent_patient_medical_document_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  raise exception 'patient_medical_document_events_are_immutable'
    using errcode = '55000';
end;
$function$;

create or replace function public.prevent_patient_medical_profile_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  raise exception 'patient_medical_profile_history_is_immutable'
    using errcode = '55000';
end;
$function$;

create or replace function public.prevent_contract_acceptance_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  raise exception
    'Contract acceptance evidence is immutable and cannot be updated or deleted.';
end;
$function$;

create or replace function public.prevent_contract_acceptance_artifact_delete()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return old;
  end if;

  raise exception
    'Accepted-contract PDF artifact records cannot be deleted.';
end;
$function$;

create or replace function public.prevent_contract_event_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  raise exception
    'Contract events are append-only and cannot be updated or deleted.';
end;
$function$;

create or replace function public.prevent_doctor_invitation_event_changes()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  raise exception 'Doctor invitation events are immutable.';
end;
$function$;

create or replace function public.protect_contract_assignment_email_delivery()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
begin
  if public.privacy_erasure_context_active() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    raise exception
      'Contract assignment email delivery records cannot be deleted.';
  end if;

  if old.status = 'sent' then
    raise exception
      'A sent contract assignment email delivery is immutable.';
  end if;

  if new.id <> old.id
    or new.assignment_id <> old.assignment_id
    or new.recipient_email <> old.recipient_email
    or new.created_at <> old.created_at
  then
    raise exception
      'Contract assignment email delivery identity cannot be changed.';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.prevent_appointment_audit_mutation()
from public, anon, authenticated, service_role;
revoke all on function public.prevent_appointment_notification_mutation()
from public, anon, authenticated, service_role;
revoke all on function public.prevent_patient_medical_document_event_mutation()
from public, anon, authenticated, service_role;
revoke all on function public.prevent_patient_medical_profile_history_mutation()
from public, anon, authenticated, service_role;
revoke all on function public.prevent_contract_acceptance_change()
from public, anon, authenticated, service_role;
revoke all on function public.prevent_contract_acceptance_artifact_delete()
from public, anon, authenticated, service_role;
revoke all on function public.prevent_contract_event_change()
from public, anon, authenticated, service_role;
revoke all on function public.prevent_doctor_invitation_event_changes()
from public, anon, authenticated, service_role;
revoke all on function public.protect_contract_assignment_email_delivery()
from public, anon, authenticated, service_role;

-- =====================================================
-- 3. MAKE SHARED ACTOR REFERENCES ERASURE-SAFE
-- =====================================================
-- Actor/audit references may become NULL after account erasure. Ownership
-- references such as profile_id and patient_profile_id remain unchanged.

create or replace function public._privacy_make_actor_reference_nullable(
  target_table_name text,
  target_column_name text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  target_relation regclass;
  target_attribute_number smallint;
  constraint_record record;
  replacement_constraint_name text;
begin
  target_relation := to_regclass(
    format('public.%I', target_table_name)
  );

  if target_relation is null then
    return;
  end if;

  select attribute.attnum::smallint
  into target_attribute_number
  from pg_attribute as attribute
  where attribute.attrelid = target_relation
    and attribute.attname = target_column_name
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if target_attribute_number is null then
    return;
  end if;

  execute format(
    'alter table %s alter column %I drop not null',
    target_relation,
    target_column_name
  );

  for constraint_record in
    select constraint_row.conname
    from pg_constraint as constraint_row
    where constraint_row.conrelid = target_relation
      and constraint_row.contype = 'f'
      and cardinality(constraint_row.conkey) = 1
      and target_attribute_number = any(constraint_row.conkey)
      and constraint_row.confrelid = 'public.profiles'::regclass
  loop
    execute format(
      'alter table %s drop constraint %I',
      target_relation,
      constraint_record.conname
    );
  end loop;

  replacement_constraint_name :=
    'privacy_fk_' ||
    substr(
      md5(target_table_name || ':' || target_column_name),
      1,
      20
    );

  execute format(
    'alter table %s drop constraint if exists %I',
    target_relation,
    replacement_constraint_name
  );

  execute format(
    'alter table %s add constraint %I foreign key (%I) ' ||
    'references public.profiles(id) on update cascade on delete set null',
    target_relation,
    replacement_constraint_name,
    target_column_name
  );
end;
$function$;

revoke all on function public._privacy_make_actor_reference_nullable(text, text)
from public, anon, authenticated, service_role;

do $block$
declare
  actor_reference record;
begin
  for actor_reference in
    select
      table_row.relname as table_name,
      attribute.attname as column_name
    from pg_constraint as constraint_row
    join pg_class as table_row
      on table_row.oid = constraint_row.conrelid
    join pg_namespace as namespace_row
      on namespace_row.oid = table_row.relnamespace
    join unnest(constraint_row.conkey)
      with ordinality as key_column(attnum, position)
      on true
    join pg_attribute as attribute
      on attribute.attrelid = table_row.oid
      and attribute.attnum = key_column.attnum
    where constraint_row.contype = 'f'
      and cardinality(constraint_row.conkey) = 1
      and constraint_row.confrelid = 'public.profiles'::regclass
      and namespace_row.nspname = 'public'
      and (
        attribute.attname ~ '_by_profile_id$'
        or attribute.attname in (
          'actor_profile_id',
          'author_profile_id',
          'recipient_profile_id'
        )
      )
      and attribute.attname <> 'accepted_by_profile_id'
  loop
    perform public._privacy_make_actor_reference_nullable(
      actor_reference.table_name,
      actor_reference.column_name
    );
  end loop;
end;
$block$;

drop function public._privacy_make_actor_reference_nullable(text, text);

-- =====================================================
-- 4. PRIVATE DYNAMIC HELPERS
-- =====================================================

create or replace function public._privacy_column_exists(
  target_table_name text,
  target_column_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, information_schema, extensions, pg_catalog
as $function$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = target_table_name
      and column_name = target_column_name
  );
$function$;

create or replace function public._privacy_delete_uuid(
  target_table_name text,
  target_column_name text,
  target_value uuid
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  affected bigint := 0;
begin
  if target_value is null
    or to_regclass(format('public.%I', target_table_name)) is null
    or not public._privacy_column_exists(
      target_table_name,
      target_column_name
    )
  then
    return 0;
  end if;

  execute format(
    'delete from public.%I where %I = $1',
    target_table_name,
    target_column_name
  )
  using target_value;

  get diagnostics affected = row_count;
  return affected;
end;
$function$;

create or replace function public._privacy_delete_uuid_array(
  target_table_name text,
  target_column_name text,
  target_values uuid[]
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  affected bigint := 0;
begin
  if coalesce(cardinality(target_values), 0) = 0
    or to_regclass(format('public.%I', target_table_name)) is null
    or not public._privacy_column_exists(
      target_table_name,
      target_column_name
    )
  then
    return 0;
  end if;

  execute format(
    'delete from public.%I where %I = any($1)',
    target_table_name,
    target_column_name
  )
  using target_values;

  get diagnostics affected = row_count;
  return affected;
end;
$function$;

create or replace function public._privacy_delete_email(
  target_table_name text,
  target_column_name text,
  target_email text
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  affected bigint := 0;
begin
  if nullif(trim(coalesce(target_email, '')), '') is null
    or to_regclass(format('public.%I', target_table_name)) is null
    or not public._privacy_column_exists(
      target_table_name,
      target_column_name
    )
  then
    return 0;
  end if;

  execute format(
    'delete from public.%I where lower(%I) = lower($1)',
    target_table_name,
    target_column_name
  )
  using target_email;

  get diagnostics affected = row_count;
  return affected;
end;
$function$;

revoke all on function public._privacy_column_exists(text, text)
from public, anon, authenticated, service_role;
revoke all on function public._privacy_delete_uuid(text, text, uuid)
from public, anon, authenticated, service_role;
revoke all on function public._privacy_delete_uuid_array(text, text, uuid[])
from public, anon, authenticated, service_role;
revoke all on function public._privacy_delete_email(text, text, text)
from public, anon, authenticated, service_role;

-- =====================================================
-- 5. STORAGE OBJECT PREFLIGHT
-- =====================================================
-- This function only reports objects. It never deletes Storage rows/files.

create or replace function public.privacy_user_storage_objects(
  target_user_id uuid
)
returns table (
  bucket_id text,
  object_name text,
  owner_id text,
  detected_by text
)
language sql
stable
security definer
set search_path = public, auth, storage, extensions, pg_catalog
as $function$
  with target_identity as (
    select auth_user.email
    from auth.users as auth_user
    where auth_user.id = target_user_id
  ),
  target_doctors as (
    select doctor.id
    from public.doctors as doctor
    where doctor.profile_id = target_user_id

    union

    select invitation.doctor_id
    from public.doctor_invitations as invitation
    left join target_identity as identity
      on true
    where invitation.doctor_id is not null
      and (
        invitation.auth_user_id = target_user_id
        or invitation.accepted_profile_id = target_user_id
        or (
          identity.email is not null
          and lower(invitation.email) = lower(identity.email)
        )
      )
  ),
  target_appointments as (
    select appointment.id
    from public.appointments as appointment
    left join auth.users as auth_user
      on auth_user.id = target_user_id
    where appointment.patient_profile_id = target_user_id
      or (
        auth_user.email is not null
        and lower(appointment.patient_email) =
          lower(auth_user.email)
      )
  ),
  target_contract_assignments as (
    select distinct assignment.id
    from public.client_contract_assignments as assignment
    left join public.contract_acceptances as acceptance
      on acceptance.assignment_id = assignment.id
    where assignment.doctor_id in (
      select id from target_doctors
    )
      or acceptance.accepted_by_profile_id =
        target_user_id
  ),
  target_acceptances as (
    select acceptance.id
    from public.contract_acceptances as acceptance
    where acceptance.assignment_id in (
      select id from target_contract_assignments
    )
  ),
  known_paths as (
    select
      'doctor-profile-photos'::text as bucket_id,
      doctor.photo_storage_path as object_name,
      'doctor.photo_storage_path'::text as detected_by
    from public.doctors as doctor
    where doctor.profile_id = target_user_id
      and nullif(trim(doctor.photo_storage_path), '') is not null

    union all

    select
      document.storage_bucket,
      document.storage_path,
      'patient_medical_documents.storage_path'
    from public.patient_medical_documents as document
    where document.content_format = 'file'
      and document.patient_profile_id = target_user_id

    union all

    select
      attachment.bucket_id,
      attachment.storage_path,
      'appointment_message_attachments.storage_path'
    from public.appointment_message_attachments as attachment
    left join public.appointment_messages as message
      on message.id = attachment.message_id
    where attachment.uploaded_by_profile_id = target_user_id
      or message.sender_profile_id = target_user_id
      or attachment.appointment_id in (
        select id from target_appointments
      )

    union all

    select
      document.storage_bucket,
      document.storage_path,
      'doctor_verification_documents.storage_path'
    from public.doctor_verification_documents as document
    join public.doctor_verification_submissions as submission
      on submission.id = document.submission_id
    where submission.doctor_id in (
      select id from target_doctors
    )
      or document.uploaded_by_profile_id = target_user_id

    union all

    select
      artifact.storage_bucket,
      artifact.storage_path,
      'contract_acceptance_artifacts.storage_path'
    from public.contract_acceptance_artifacts as artifact
    where artifact.acceptance_id in (
      select id from target_acceptances
    )
  ),
  matches as (
    select
      object_row.bucket_id,
      object_row.name as object_name,
      object_row.owner_id,
      coalesce(
        path_row.detected_by,
        case
          when object_row.owner_id = target_user_id::text
            then 'storage.objects.owner_id'
          else 'UUID in object path'
        end
      ) as detected_by
    from storage.objects as object_row
    left join known_paths as path_row
      on path_row.bucket_id = object_row.bucket_id
      and path_row.object_name = object_row.name
    where path_row.object_name is not null
      or object_row.owner_id = target_user_id::text
      or object_row.name like target_user_id::text || '/%'
      or object_row.name like '%/' ||
        target_user_id::text || '/%'
      or exists (
        select 1
        from target_doctors as doctor
        where object_row.name like doctor.id::text || '/%'
          or object_row.name like '%/' ||
            doctor.id::text || '/%'
      )
  )
  select distinct
    matches.bucket_id,
    matches.object_name,
    matches.owner_id,
    matches.detected_by
  from matches
  order by matches.bucket_id, matches.object_name;
$function$;

revoke all on function public.privacy_user_storage_objects(uuid)
from public, anon, authenticated, service_role;

-- =====================================================
-- 6. MANUAL PREFLIGHT REPORT
-- =====================================================

create or replace function public.preview_permanent_user_removal(
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, information_schema, extensions, pg_catalog
as $function$
declare
  auth_email text;
  auth_phone text;
  profile_role text;
  doctor_ids uuid[] := array[]::uuid[];
  invitation_ids uuid[] := array[]::uuid[];
  access_grant_ids uuid[] := array[]::uuid[];
  storage_rows jsonb := '[]'::jsonb;
  uuid_references jsonb := '[]'::jsonb;
  doctor_references jsonb := '[]'::jsonb;
  text_uuid_references jsonb := '[]'::jsonb;
  email_references jsonb := '[]'::jsonb;
  column_record record;
  reference_count bigint;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('statement_timeout', '15min', true);

  if target_user_id is null then
    raise exception 'A target user UUID is required.';
  end if;

  select auth_user.email, auth_user.phone
  into auth_email, auth_phone
  from auth.users as auth_user
  where auth_user.id = target_user_id;

  select profile.role
  into profile_role
  from public.profiles as profile
  where profile.id = target_user_id;

  select coalesce(
    array_agg(distinct linked_doctor.id),
    array[]::uuid[]
  )
  into doctor_ids
  from (
    select doctor.id
    from public.doctors as doctor
    where doctor.profile_id = target_user_id

    union

    select invitation.doctor_id
    from public.doctor_invitations as invitation
    where invitation.doctor_id is not null
      and (
        invitation.auth_user_id = target_user_id
        or invitation.accepted_profile_id = target_user_id
        or (
          auth_email is not null
          and lower(invitation.email) = lower(auth_email)
        )
      )
  ) as linked_doctor;

  select coalesce(
    array_agg(distinct invitation.id),
    array[]::uuid[]
  )
  into invitation_ids
  from public.doctor_invitations as invitation
  where invitation.auth_user_id = target_user_id
    or invitation.accepted_profile_id = target_user_id
    or invitation.doctor_id = any(doctor_ids)
    or (
      auth_email is not null
      and lower(invitation.email) = lower(auth_email)
    );

  select coalesce(
    array_agg(distinct access_grant.id),
    array[]::uuid[]
  )
  into access_grant_ids
  from public.doctor_access_grants as access_grant
  where access_grant.invitation_id = any(invitation_ids)
    or access_grant.doctor_id = any(doctor_ids);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'bucket', object_row.bucket_id,
        'name', object_row.object_name,
        'ownerId', object_row.owner_id,
        'detectedBy', object_row.detected_by
      )
    ),
    '[]'::jsonb
  )
  into storage_rows
  from public.privacy_user_storage_objects(target_user_id)
    as object_row;

  for column_record in
    select
      column_row.table_name,
      column_row.column_name
    from information_schema.columns as column_row
    join information_schema.tables as table_info
      on table_info.table_schema = column_row.table_schema
      and table_info.table_name = column_row.table_name
      and table_info.table_type = 'BASE TABLE'
    where column_row.table_schema = 'public'
      and column_row.udt_name = 'uuid'
    order by column_row.table_name, column_row.ordinal_position
  loop
    execute format(
      'select count(*) from public.%I where %I = $1',
      column_record.table_name,
      column_record.column_name
    )
    into reference_count
    using target_user_id;

    if reference_count > 0 then
      uuid_references := uuid_references ||
        jsonb_build_array(
          jsonb_build_object(
            'table', column_record.table_name,
            'column', column_record.column_name,
            'rows', reference_count
          )
        );
    end if;

    if coalesce(cardinality(doctor_ids), 0) > 0
      and (
        column_record.column_name = 'doctor_id'
        or column_record.column_name like '%\_doctor\_id' escape '\'
      )
    then
      execute format(
        'select count(*) from public.%I where %I = any($1)',
        column_record.table_name,
        column_record.column_name
      )
      into reference_count
      using doctor_ids;

      if reference_count > 0 then
        doctor_references := doctor_references ||
          jsonb_build_array(
            jsonb_build_object(
              'table', column_record.table_name,
              'column', column_record.column_name,
              'rows', reference_count
            )
          );
      end if;
    end if;
  end loop;

  for column_record in
    select
      column_row.table_name,
      column_row.column_name
    from information_schema.columns as column_row
    join information_schema.tables as table_info
      on table_info.table_schema = column_row.table_schema
      and table_info.table_name = column_row.table_name
      and table_info.table_type = 'BASE TABLE'
    where column_row.table_schema = 'public'
      and column_row.data_type in (
        'text',
        'character varying',
        'character',
        'json',
        'jsonb'
      )
    order by column_row.table_name, column_row.ordinal_position
  loop
    execute format(
      'select count(*) from public.%I ' ||
      'where position($1 in %I::text) > 0',
      column_record.table_name,
      column_record.column_name
    )
    into reference_count
    using target_user_id::text;

    if reference_count > 0 then
      text_uuid_references :=
        text_uuid_references ||
        jsonb_build_array(
          jsonb_build_object(
            'table', column_record.table_name,
            'column', column_record.column_name,
            'rows', reference_count
          )
        );
    end if;
  end loop;

  if auth_email is not null then
    for column_record in
      select
        column_row.table_name,
        column_row.column_name
      from information_schema.columns as column_row
      join information_schema.tables as table_info
        on table_info.table_schema = column_row.table_schema
        and table_info.table_name = column_row.table_name
        and table_info.table_type = 'BASE TABLE'
      where column_row.table_schema = 'public'
        and column_row.column_name ilike '%email%'
        and column_row.data_type in (
          'text',
          'character varying',
          'character'
        )
      order by column_row.table_name, column_row.ordinal_position
    loop
      execute format(
        'select count(*) from public.%I ' ||
        'where lower(%I) = lower($1)',
        column_record.table_name,
        column_record.column_name
      )
      into reference_count
      using auth_email;

      if reference_count > 0 then
        email_references := email_references ||
          jsonb_build_array(
            jsonb_build_object(
              'table', column_record.table_name,
              'column', column_record.column_name,
              'rows', reference_count
            )
          );
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'userId', target_user_id,
    'authUserExists', exists(
      select 1 from auth.users where id = target_user_id
    ),
    'profileExists', exists(
      select 1 from public.profiles where id = target_user_id
    ),
    'role', profile_role,
    'email', auth_email,
    'phonePresent', auth_phone is not null,
    'doctorIds', to_jsonb(doctor_ids),
    'doctorInvitationIds', to_jsonb(invitation_ids),
    'doctorAccessGrantIds', to_jsonb(access_grant_ids),
    'identityResolution',
      case
        when exists (
          select 1
          from public.profiles
          where id = target_user_id
        ) then 'profile'
        when coalesce(cardinality(invitation_ids), 0) > 0
          then 'auth_user_or_invitation'
        else 'auth_user_only'
      end,
    'storageObjects', storage_rows,
    'uuidReferences', uuid_references,
    'doctorReferences', doctor_references,
    'textUuidReferences', text_uuid_references,
    'emailReferences', email_references,
    'requiredConfirmation',
      'DELETE ROMDOC USER ' || target_user_id::text,
    'important',
      'Delete every listed physical Storage object before execution.'
  );
end;
$function$;

revoke all on function public.preview_permanent_user_removal(uuid)
from public, anon, authenticated, service_role;

comment on function public.preview_permanent_user_removal(uuid) is
  'Owner-only SQL Editor preview. Reports direct UUID/email references and matching physical Storage objects.';

-- =====================================================
-- 7. MANUAL PERMANENT USER REMOVAL
-- =====================================================

create or replace function public.permanently_remove_romdoc_user(
  target_user_id uuid,
  target_confirmation text,
  target_delete_accepted_contract_evidence boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, information_schema, extensions, pg_catalog, pg_temp
as $function$
declare
  expected_confirmation text;
  auth_email text;
  auth_phone text;
  profile_role text;
  profile_first_name text;
  profile_last_name text;

  doctor_ids uuid[] := array[]::uuid[];
  deleted_doctor_ids uuid[] := array[]::uuid[];
  doctor_tombstone_ids uuid[] := array[]::uuid[];
  invitation_ids uuid[] := array[]::uuid[];
  access_grant_ids uuid[] := array[]::uuid[];
  appointment_ids uuid[] := array[]::uuid[];
  medical_document_ids uuid[] := array[]::uuid[];
  contract_assignment_ids uuid[] := array[]::uuid[];
  contract_acceptance_ids uuid[] := array[]::uuid[];

  storage_blockers jsonb := '[]'::jsonb;
  restrictive_blockers jsonb := '[]'::jsonb;
  remaining_uuid_references jsonb := '[]'::jsonb;
  remaining_text_uuid_references jsonb := '[]'::jsonb;

  row_record record;
  constraint_record record;
  check_constraint_record record;
  column_record record;
  reference_count bigint;
  affected bigint;
  total_deleted bigint := 0;
  total_anonymised bigint := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('statement_timeout', '15min', true);

  if target_user_id is null then
    raise exception 'A target user UUID is required.';
  end if;

  expected_confirmation :=
    'DELETE ROMDOC USER ' || target_user_id::text;

  if target_confirmation is distinct from expected_confirmation then
    raise exception
      'Confirmation mismatch. Required phrase: %',
      expected_confirmation;
  end if;

  select
    auth_user.email,
    auth_user.phone
  into
    auth_email,
    auth_phone
  from auth.users as auth_user
  where auth_user.id = target_user_id
  for update;

  select
    profile.role,
    profile.first_name,
    profile.last_name
  into
    profile_role,
    profile_first_name,
    profile_last_name
  from public.profiles as profile
  where profile.id = target_user_id
  for update;

  if auth_email is null
    and not exists (
      select 1 from auth.users where id = target_user_id
    )
    and profile_role is null
    and not exists (
      select 1 from public.profiles where id = target_user_id
    )
  then
    raise exception
      'No Supabase Auth user or RomDoc profile exists for UUID %.',
      target_user_id;
  end if;

  if profile_role = 'admin'
    and (
      select count(*)
      from public.profiles
      where role = 'admin'
        and account_status = 'active'
    ) <= 1
  then
    raise exception
      'The last active RomDoc Administrator cannot be removed.';
  end if;

  if to_regclass('public.clinic_organization_members') is not null
    and exists (
      select 1
      from public.clinic_organization_members as member
      where member.profile_id = target_user_id
        and member.member_role = 'owner'
        and member.status = 'active'
        and not exists (
          select 1
          from public.clinic_organization_members as other_member
          where other_member.organization_id =
              member.organization_id
            and other_member.profile_id <> target_user_id
            and other_member.member_role = 'owner'
            and other_member.status = 'active'
        )
    )
  then
    raise exception
      'This user is the sole active owner of a Clinic Organisation. Transfer ownership before permanent removal.';
  end if;

  select coalesce(
    array_agg(distinct linked_doctor.id),
    array[]::uuid[]
  )
  into doctor_ids
  from (
    select doctor.id
    from public.doctors as doctor
    where doctor.profile_id = target_user_id

    union

    select invitation.doctor_id
    from public.doctor_invitations as invitation
    where invitation.doctor_id is not null
      and (
        invitation.auth_user_id = target_user_id
        or invitation.accepted_profile_id = target_user_id
        or (
          auth_email is not null
          and lower(invitation.email) = lower(auth_email)
        )
      )
  ) as linked_doctor;

  select coalesce(
    array_agg(distinct invitation.id),
    array[]::uuid[]
  )
  into invitation_ids
  from public.doctor_invitations as invitation
  where invitation.auth_user_id = target_user_id
    or invitation.accepted_profile_id = target_user_id
    or invitation.doctor_id = any(doctor_ids)
    or (
      auth_email is not null
      and lower(invitation.email) = lower(auth_email)
    );

  select coalesce(
    array_agg(distinct access_grant.id),
    array[]::uuid[]
  )
  into access_grant_ids
  from public.doctor_access_grants as access_grant
  where access_grant.invitation_id = any(invitation_ids)
    or access_grant.doctor_id = any(doctor_ids);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'bucket', object_row.bucket_id,
        'name', object_row.object_name,
        'ownerId', object_row.owner_id,
        'detectedBy', object_row.detected_by
      )
    ),
    '[]'::jsonb
  )
  into storage_blockers
  from public.privacy_user_storage_objects(target_user_id)
    as object_row;

  if jsonb_array_length(storage_blockers) > 0 then
    raise exception
      'Physical Supabase Storage objects still exist. Delete them through Storage before retrying. Objects: %',
      storage_blockers::text;
  end if;

  perform set_config(
    'romdoc.privacy_erasure',
    'confirmed',
    true
  );

  -- -----------------------------------------------------
  -- 7A. TEMPORARILY DISABLE USER TRIGGERS ON AFFECTED TABLES
  -- -----------------------------------------------------
  -- Foreign-key constraint triggers remain active. Every user-trigger state is
  -- recorded and restored exactly before the transaction can commit.

  create temporary table if not exists
    privacy_erasure_trigger_tables (
      schema_name text not null,
      table_name text not null,
      primary key (schema_name, table_name)
    )
  on commit drop;

  create temporary table if not exists
    privacy_erasure_trigger_states (
      schema_name text not null,
      table_name text not null,
      trigger_name text not null,
      enabled_state "char" not null,
      primary key (schema_name, table_name, trigger_name)
    )
  on commit drop;

  truncate table privacy_erasure_trigger_tables;
  truncate table privacy_erasure_trigger_states;

  -- Known tables that may be reached through appointment, medical, contract,
  -- email-delivery, or audit dependencies rather than the user UUID directly.
  insert into privacy_erasure_trigger_tables (
    schema_name,
    table_name
  )
  select
    'public',
    known_table.table_name
  from (
    values
      ('profiles'),
      ('doctors'),
      ('appointments'),
      ('reviews'),
      ('appointment_messages'),
      ('appointment_message_attachments'),
      ('appointment_audit_events'),
      ('appointment_notification_deliveries'),
      ('appointment_reminder_jobs'),
      ('appointment_reminder_schedules'),
      ('appointment_reminders'),
      ('scheduled_appointment_reminders'),
      ('appointment_notification_queue'),
      ('appointment_sms_reminders'),
      ('appointment_email_reminders'),
      ('patient_medical_documents'),
      ('patient_medical_document_shares'),
      ('patient_medical_document_events'),
      ('patient_medical_profile_entries'),
      ('patient_medical_profile_history'),
      ('contract_documents'),
      ('contract_packages'),
      ('client_contract_assignments'),
      ('contract_acceptances'),
      ('contract_acceptance_artifacts'),
      ('contract_events'),
      ('contract_assignment_email_deliveries'),
      ('contract_confirmation_email_deliveries'),
      ('doctor_verification_submissions'),
      ('doctor_verification_documents'),
      ('doctor_verification_admin_notes'),
      ('doctor_invitations'),
      ('doctor_access_grants'),
      ('doctor_invitation_events'),
      ('support_tickets')
  ) as known_table(table_name)
  where to_regclass(
    format('public.%I', known_table.table_name)
  ) is not null
  on conflict do nothing;

  -- Include every real public table that currently contains the profile UUID.
  for column_record in
    select
      column_row.table_name,
      column_row.column_name
    from information_schema.columns as column_row
    join information_schema.tables as table_info
      on table_info.table_schema = column_row.table_schema
      and table_info.table_name = column_row.table_name
      and table_info.table_type = 'BASE TABLE'
    where column_row.table_schema = 'public'
      and column_row.udt_name = 'uuid'
    order by column_row.table_name, column_row.ordinal_position
  loop
    execute format(
      'select count(*) from public.%I where %I = $1',
      column_record.table_name,
      column_record.column_name
    )
    into reference_count
    using target_user_id;

    if reference_count > 0 then
      insert into privacy_erasure_trigger_tables (
        schema_name,
        table_name
      )
      values ('public', column_record.table_name)
      on conflict do nothing;
    end if;

    if coalesce(cardinality(doctor_ids), 0) > 0
      and (
        column_record.column_name = 'doctor_id'
        or column_record.column_name ~ '_doctor_id$'
      )
    then
      execute format(
        'select count(*) from public.%I where %I = any($1)',
        column_record.table_name,
        column_record.column_name
      )
      into reference_count
      using doctor_ids;

      if reference_count > 0 then
        insert into privacy_erasure_trigger_tables (
          schema_name,
          table_name
        )
        values ('public', column_record.table_name)
        on conflict do nothing;
      end if;
    end if;
  end loop;

  -- Include tables containing the account email or UUID/email inside JSON.
  for column_record in
    select
      column_row.table_name,
      column_row.column_name,
      column_row.data_type
    from information_schema.columns as column_row
    join information_schema.tables as table_info
      on table_info.table_schema = column_row.table_schema
      and table_info.table_name = column_row.table_name
      and table_info.table_type = 'BASE TABLE'
    where column_row.table_schema = 'public'
      and column_row.is_generated = 'NEVER'
      and column_row.data_type in (
        'text',
        'character varying',
        'character',
        'json',
        'jsonb'
      )
    order by column_row.table_name, column_row.ordinal_position
  loop
    execute format(
      'select count(*) from public.%I ' ||
      'where position($1 in %I::text) > 0 ' ||
      'or ($2 is not null and ' ||
      'position(lower($2) in lower(%I::text)) > 0)',
      column_record.table_name,
      column_record.column_name,
      column_record.column_name
    )
    into reference_count
    using target_user_id::text, auth_email;

    if reference_count > 0 then
      insert into privacy_erasure_trigger_tables (
        schema_name,
        table_name
      )
      values ('public', column_record.table_name)
      on conflict do nothing;
    end if;
  end loop;

  insert into privacy_erasure_trigger_states (
    schema_name,
    table_name,
    trigger_name,
    enabled_state
  )
  select
    namespace_row.nspname,
    table_row.relname,
    trigger_row.tgname,
    trigger_row.tgenabled
  from privacy_erasure_trigger_tables as affected_table
  join pg_namespace as namespace_row
    on namespace_row.nspname = affected_table.schema_name
  join pg_class as table_row
    on table_row.relnamespace = namespace_row.oid
    and table_row.relname = affected_table.table_name
  join pg_trigger as trigger_row
    on trigger_row.tgrelid = table_row.oid
    and trigger_row.tgisinternal = false
  on conflict do nothing;

  for row_record in
    select *
    from privacy_erasure_trigger_tables
    order by schema_name, table_name
  loop
    execute format(
      'lock table %I.%I in access exclusive mode',
      row_record.schema_name,
      row_record.table_name
    );

    execute format(
      'alter table %I.%I disable trigger user',
      row_record.schema_name,
      row_record.table_name
    );
  end loop;

  -- -----------------------------------------------------
  -- 7B. DOCTOR INVITATION AND COMPLIMENTARY-ACCESS CHAIN
  -- -----------------------------------------------------
  -- doctor_invitations is a mutable workflow table. Its child event table is
  -- append-only during normal operation. During confirmed privacy erasure the
  -- event rows are removed first, followed by grants and the invitation.

  affected := public._privacy_delete_uuid_array(
    'doctor_invitation_events',
    'invitation_id',
    invitation_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'doctor_invitation_events',
    'access_grant_id',
    access_grant_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'doctor_invitation_events',
    'doctor_id',
    doctor_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid(
    'doctor_invitation_events',
    'actor_profile_id',
    target_user_id
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'doctor_access_grants',
    'id',
    access_grant_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'doctor_invitations',
    'id',
    invitation_ids
  );
  total_deleted := total_deleted + affected;

  -- -----------------------------------------------------
  -- 7C. CONTRACT RECORDS OWNED OR SIGNED BY THIS USER
  -- -----------------------------------------------------

  if exists (
    select 1
    from public.contract_acceptances as acceptance
    join public.client_contract_assignments as assignment
      on assignment.id = acceptance.assignment_id
    where acceptance.accepted_by_profile_id = target_user_id
      or assignment.doctor_id = any(doctor_ids)
  )
    and target_delete_accepted_contract_evidence is not true
  then
    raise exception
      'Accepted contract evidence exists for this account. After legal approval, delete the accepted PDF from Storage and rerun with target_delete_accepted_contract_evidence = true, or retain the evidence until the applicable retention period ends.';
  end if;

  select coalesce(
    array_agg(distinct assignment.id),
    array[]::uuid[]
  )
  into contract_assignment_ids
  from public.client_contract_assignments as assignment
  left join public.contract_acceptances as acceptance
    on acceptance.assignment_id = assignment.id
  where (
      assignment.doctor_id = any(doctor_ids)
      and (
        acceptance.id is null
        or target_delete_accepted_contract_evidence = true
      )
    )
    or (
      target_delete_accepted_contract_evidence = true
      and acceptance.accepted_by_profile_id = target_user_id
    );

  select coalesce(
    array_agg(acceptance.id),
    array[]::uuid[]
  )
  into contract_acceptance_ids
  from public.contract_acceptances as acceptance
  where acceptance.assignment_id =
    any(contract_assignment_ids);

  affected := public._privacy_delete_uuid_array(
    'contract_confirmation_email_deliveries',
    'acceptance_id',
    contract_acceptance_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'contract_assignment_email_deliveries',
    'assignment_id',
    contract_assignment_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'contract_events',
    'assignment_id',
    contract_assignment_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'contract_acceptance_artifacts',
    'acceptance_id',
    contract_acceptance_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'contract_acceptances',
    'id',
    contract_acceptance_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'client_contract_assignments',
    'id',
    contract_assignment_ids
  );
  total_deleted := total_deleted + affected;

  -- -----------------------------------------------------
  -- 7D. PATIENT MEDICAL PROFILE AND MEDICAL FOLDER
  -- -----------------------------------------------------

  if to_regclass('public.patient_medical_documents') is not null then
    select coalesce(
      array_agg(document.id),
      array[]::uuid[]
    )
    into medical_document_ids
    from public.patient_medical_documents as document
    where document.patient_profile_id = target_user_id;
  end if;

  affected := public._privacy_delete_uuid_array(
    'patient_medical_document_shares',
    'document_id',
    medical_document_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'patient_medical_document_events',
    'document_id',
    medical_document_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'patient_medical_documents',
    'id',
    medical_document_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid(
    'patient_medical_profile_history',
    'patient_profile_id',
    target_user_id
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid(
    'patient_medical_profile_entries',
    'patient_profile_id',
    target_user_id
  );
  total_deleted := total_deleted + affected;

  -- -----------------------------------------------------
  -- 7E. PATIENT APPOINTMENTS AND DEPENDENT RECORDS
  -- -----------------------------------------------------

  if to_regclass('public.appointments') is not null then
    select coalesce(
      array_agg(appointment.id),
      array[]::uuid[]
    )
    into appointment_ids
    from public.appointments as appointment
    where appointment.patient_profile_id = target_user_id
      or (
        auth_email is not null
        and lower(appointment.patient_email) =
          lower(auth_email)
      );
  end if;

  affected := public._privacy_delete_uuid_array(
    'appointment_message_attachments',
    'appointment_id',
    appointment_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'appointment_messages',
    'appointment_id',
    appointment_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'appointment_notification_deliveries',
    'appointment_id',
    appointment_ids
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_uuid_array(
    'appointment_audit_events',
    'appointment_id',
    appointment_ids
  );
  total_deleted := total_deleted + affected;

  -- Additional current/future appointment child tables are handled only when
  -- the named table and appointment_id column exist.
  for row_record in
    select item.table_name, item.column_name
    from (
      values
        ('appointment_reminder_jobs', 'appointment_id'),
        ('appointment_reminder_schedules', 'appointment_id'),
        ('appointment_reminders', 'appointment_id'),
        ('scheduled_appointment_reminders', 'appointment_id'),
        ('appointment_notification_queue', 'appointment_id'),
        ('appointment_sms_reminders', 'appointment_id'),
        ('appointment_email_reminders', 'appointment_id'),
        ('reviews', 'appointment_id')
    ) as item(table_name, column_name)
  loop
    affected := public._privacy_delete_uuid_array(
      row_record.table_name,
      row_record.column_name,
      appointment_ids
    );
    total_deleted := total_deleted + affected;
  end loop;

  affected := public._privacy_delete_uuid_array(
    'appointments',
    'id',
    appointment_ids
  );
  total_deleted := total_deleted + affected;

  -- Messages sent by the departing account in appointments that belong to
  -- another person are erased without deleting that other appointment.
  affected := public._privacy_delete_uuid(
    'appointment_messages',
    'sender_profile_id',
    target_user_id
  );
  total_deleted := total_deleted + affected;

  -- -----------------------------------------------------
  -- 7F. PATIENT-OWNED, SUPPORT, AND PREFERENCE RECORDS
  -- -----------------------------------------------------

  for row_record in
    select item.table_name, item.column_name
    from (
      values
        ('reviews', 'patient_profile_id'),
        ('patient_saved_doctors', 'patient_profile_id'),
        ('patient_reminder_preferences', 'patient_profile_id'),
        ('patient_notification_preferences', 'patient_profile_id'),
        ('support_tickets', 'requester_profile_id')
    ) as item(table_name, column_name)
  loop
    affected := public._privacy_delete_uuid(
      row_record.table_name,
      row_record.column_name,
      target_user_id
    );
    total_deleted := total_deleted + affected;
  end loop;

  affected := public._privacy_delete_email(
    'support_tickets',
    'requester_email',
    auth_email
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_email(
    'appointment_notification_deliveries',
    'recipient_email',
    auth_email
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_email(
    'contract_assignment_email_deliveries',
    'recipient_email',
    auth_email
  );
  total_deleted := total_deleted + affected;

  affected := public._privacy_delete_email(
    'contract_confirmation_email_deliveries',
    'recipient_email',
    auth_email
  );
  total_deleted := total_deleted + affected;

  -- -----------------------------------------------------
  -- 7G. DOCTOR PRIVATE DATA; PRESERVE OTHER PATIENTS' HISTORY
  -- -----------------------------------------------------

  if coalesce(cardinality(doctor_ids), 0) > 0 then
    for column_record in
      select
        column_row.table_name,
        column_row.column_name
      from information_schema.columns as column_row
      join information_schema.tables as table_info
        on table_info.table_schema = column_row.table_schema
        and table_info.table_name = column_row.table_name
        and table_info.table_type = 'BASE TABLE'
      where column_row.table_schema = 'public'
        and column_row.udt_name = 'uuid'
        and column_row.column_name = 'doctor_id'
        and column_row.table_name not in (
          'appointments',
          'appointment_audit_events'
        )
      order by column_row.table_name
    loop
      affected := public._privacy_delete_uuid_array(
        column_record.table_name,
        column_record.column_name,
        doctor_ids
      );
      total_deleted := total_deleted + affected;
    end loop;

    -- Delete each Doctor row completely when no foreign-key reference still
    -- requires it. When another patient's appointment/audit history requires
    -- the internal doctor_id, retain only an anonymised suspended tombstone.
    for row_record in
      select unnest(doctor_ids) as doctor_id
    loop
      begin
        delete from public.doctors
        where id = row_record.doctor_id;

        if found then
          deleted_doctor_ids :=
            array_append(deleted_doctor_ids, row_record.doctor_id);
          total_deleted := total_deleted + 1;
        end if;
      exception
        when foreign_key_violation then
          doctor_tombstone_ids :=
            array_append(doctor_tombstone_ids, row_record.doctor_id);

          update public.doctors
          set
            profile_id = null,
            slug = 'deleted-doctor-' ||
              replace(id::text, '-', ''),
            status = 'suspended',
            city_id = null,
            photo_url = null,
            photo_storage_path = null,
            years_experience = null,
            consultation_price = null,
            phone = null,
            email = null,
            professional_registration_number = null,
            verification_status = 'not_submitted',
            verified_at = null,
            verified_by_profile_id = null,
            verification_expires_at = null,
            updated_at = now()
          where id = row_record.doctor_id;

          if found then
            total_anonymised := total_anonymised + 1;
          end if;
      end;
    end loop;
  end if;

  -- -----------------------------------------------------
  -- 7H. DELETE PLAIN PROFILE-OWNED ROWS
  -- -----------------------------------------------------
  -- A plain profile_id column normally identifies a membership, preference,
  -- application, subscription, or another account-owned row. Doctors and the
  -- profile itself are handled separately.

  for column_record in
    select distinct column_row.table_name
    from information_schema.columns as column_row
    join information_schema.tables as table_info
      on table_info.table_schema = column_row.table_schema
      and table_info.table_name = column_row.table_name
      and table_info.table_type = 'BASE TABLE'
    where column_row.table_schema = 'public'
      and column_row.column_name = 'profile_id'
      and column_row.udt_name = 'uuid'
      and column_row.table_name not in (
        'profiles',
        'doctors'
      )
    order by column_row.table_name
  loop
    affected := public._privacy_delete_uuid(
      column_record.table_name,
      'profile_id',
      target_user_id
    );
    total_deleted := total_deleted + affected;
  end loop;

  -- -----------------------------------------------------
  -- 7I. NULL REMAINING ERASABLE PROFILE REFERENCES
  -- -----------------------------------------------------
  -- For direct profile foreign keys that remain:
  --   CASCADE and SET NULL are allowed to run during profile deletion.
  --   Nullable NO ACTION/RESTRICT references are explicitly nulled.
  --   Non-null restrictive references stop the transaction.

  for constraint_record in
    select
      table_row.relname as table_name,
      attribute.attname as column_name,
      attribute.attnotnull as is_not_null,
      constraint_row.confdeltype as delete_action,
      constraint_row.conname as constraint_name,
      cardinality(constraint_row.conkey) as key_column_count
    from pg_constraint as constraint_row
    join pg_class as table_row
      on table_row.oid = constraint_row.conrelid
    join pg_namespace as namespace_row
      on namespace_row.oid = table_row.relnamespace
    join unnest(constraint_row.conkey)
      with ordinality as key_column(attnum, position)
      on true
    join pg_attribute as attribute
      on attribute.attrelid = table_row.oid
      and attribute.attnum = key_column.attnum
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'public.profiles'::regclass
      and namespace_row.nspname = 'public'
    order by table_row.relname, attribute.attname
  loop
    execute format(
      'select count(*) from public.%I where %I = $1',
      constraint_record.table_name,
      constraint_record.column_name
    )
    into reference_count
    using target_user_id;

    if reference_count = 0 then
      continue;
    end if;

    if constraint_record.key_column_count <> 1 then
      restrictive_blockers := restrictive_blockers ||
        jsonb_build_array(
          jsonb_build_object(
            'table', constraint_record.table_name,
            'column', constraint_record.column_name,
            'rows', reference_count,
            'constraint', constraint_record.constraint_name,
            'reason', 'Composite foreign key requires case-specific review'
          )
        );
      continue;
    end if;

    if constraint_record.delete_action in ('c', 'n') then
      continue;
    end if;

    if constraint_record.is_not_null is false then
      execute format(
        'update public.%I set %I = null where %I = $1',
        constraint_record.table_name,
        constraint_record.column_name,
        constraint_record.column_name
      )
      using target_user_id;

      get diagnostics affected = row_count;
      total_anonymised := total_anonymised + affected;
    else
      restrictive_blockers := restrictive_blockers ||
        jsonb_build_array(
          jsonb_build_object(
            'table', constraint_record.table_name,
            'column', constraint_record.column_name,
            'rows', reference_count,
            'constraint', constraint_record.constraint_name,
            'reason', 'Non-null restrictive profile reference'
          )
        );
    end if;
  end loop;

  if jsonb_array_length(restrictive_blockers) > 0 then
    raise exception
      'Unhandled restrictive profile references remain. No deletion was committed. References: %',
      restrictive_blockers::text;
  end if;

  -- -----------------------------------------------------
  -- 7J. REDACT UUID/EMAIL STRINGS IN JSON AND TEXT METADATA
  -- -----------------------------------------------------

  for column_record in
    select
      column_row.table_name,
      column_row.column_name,
      column_row.data_type,
      column_row.is_nullable
    from information_schema.columns as column_row
    join information_schema.tables as table_info
      on table_info.table_schema = column_row.table_schema
      and table_info.table_name = column_row.table_name
      and table_info.table_type = 'BASE TABLE'
    where column_row.table_schema = 'public'
      and column_row.is_generated = 'NEVER'
      and column_row.data_type in (
        'json',
        'jsonb'
      )
      and column_row.table_name not in (
        'contract_documents',
        'contract_packages',
        'client_contract_assignments',
        'contract_acceptances'
      )
    order by column_row.table_name, column_row.ordinal_position
  loop
    begin
      execute format(
        'update public.%I ' ||
        'set %I = replace(%I::text, $1, ''[deleted-user]'')::%s ' ||
        'where position($1 in %I::text) > 0',
        column_record.table_name,
        column_record.column_name,
        column_record.column_name,
        case
          when column_record.data_type = 'json'
            then 'json'
          else 'jsonb'
        end,
        column_record.column_name
      )
      using target_user_id::text;

      get diagnostics affected = row_count;
      total_anonymised := total_anonymised + affected;

      if auth_email is not null then
        execute format(
          'update public.%I ' ||
          'set %I = replace(%I::text, $1, ''[deleted-email]'')::%s ' ||
          'where position(lower($1) in lower(%I::text)) > 0',
          column_record.table_name,
          column_record.column_name,
          column_record.column_name,
          case
            when column_record.data_type = 'json'
              then 'json'
            else 'jsonb'
          end,
          column_record.column_name
        )
        using auth_email;

        get diagnostics affected = row_count;
        total_anonymised := total_anonymised + affected;
      end if;
    exception
      when others then
        raise exception
          'Could not redact JSON metadata in %.%: %',
          column_record.table_name,
          column_record.column_name,
          sqlerrm;
    end;
  end loop;

  -- Remove a literal copy of the Auth/profile UUID from writable plain-text
  -- columns. Contract templates and immutable acceptance snapshots are excluded:
  -- evidence tied to the erased account is deleted earlier, while unrelated
  -- legal text must not be silently modified.
  for column_record in
    select
      column_row.table_name,
      column_row.column_name
    from information_schema.columns as column_row
    join information_schema.tables as table_info
      on table_info.table_schema = column_row.table_schema
      and table_info.table_name = column_row.table_name
      and table_info.table_type = 'BASE TABLE'
    where column_row.table_schema = 'public'
      and column_row.is_generated = 'NEVER'
      and column_row.data_type in (
        'text',
        'character varying',
        'character'
      )
      and column_row.table_name not in (
        'contract_documents',
        'contract_packages',
        'client_contract_assignments',
        'contract_acceptances'
      )
    order by column_row.table_name, column_row.ordinal_position
  loop
    execute format(
      'update public.%I ' ||
      'set %I = replace(%I, $1, $2) ' ||
      'where position($1 in %I) > 0',
      column_record.table_name,
      column_record.column_name,
      column_record.column_name,
      column_record.column_name
    )
    using
      target_user_id::text,
      'deleted-user-' ||
        substr(
          encode(
            digest(
              convert_to(target_user_id::text, 'UTF8'),
              'sha256'::text
            ),
            'hex'
          ),
          1,
          16
        );

    get diagnostics affected = row_count;
    total_anonymised := total_anonymised + affected;
  end loop;

  -- Remove exact email values from remaining email columns. Nullable columns
  -- become NULL. Required columns receive a unique non-deliverable address.
  if auth_email is not null then
    for column_record in
      select
        column_row.table_name,
        column_row.column_name,
        column_row.is_nullable
      from information_schema.columns as column_row
      join information_schema.tables as table_info
        on table_info.table_schema = column_row.table_schema
        and table_info.table_name = column_row.table_name
        and table_info.table_type = 'BASE TABLE'
      where column_row.table_schema = 'public'
        and column_row.is_generated = 'NEVER'
        and column_row.column_name ilike '%email%'
        and column_row.data_type in (
          'text',
          'character varying',
          'character'
        )
      order by column_row.table_name, column_row.ordinal_position
    loop
      if column_record.is_nullable = 'YES' then
        execute format(
          'update public.%I set %I = null ' ||
          'where lower(%I) = lower($1)',
          column_record.table_name,
          column_record.column_name,
          column_record.column_name
        )
        using auth_email;
      else
        execute format(
          'update public.%I ' ||
          'set %I = ''deleted+'' || ' ||
          'replace(gen_random_uuid()::text, ''-'', '''') || ' ||
          '''@invalid.romdoc'' ' ||
          'where lower(%I) = lower($1)',
          column_record.table_name,
          column_record.column_name,
          column_record.column_name
        )
        using auth_email;
      end if;

      get diagnostics affected = row_count;
      total_anonymised := total_anonymised + affected;
    end loop;
  end if;

  -- -----------------------------------------------------
  -- 7K. TEMPORARILY RELAX ACTOR-DEPENDENT CHECKS
  -- -----------------------------------------------------
  -- Some historical tables require an actor UUID when a status is published,
  -- reviewed, blocked, deleted, paid, or revoked. The exact original CHECK
  -- definitions are saved, dropped under ACCESS EXCLUSIVE locks, and restored
  -- as NOT VALID after the profile UUID has been cleared. New and changed rows
  -- continue to be checked; only the already-redacted historical rows are not
  -- revalidated.

  create temporary table if not exists
    privacy_erasure_checks_to_restore (
      relation_oid oid not null,
      schema_name text not null,
      table_name text not null,
      constraint_name text not null,
      constraint_definition text not null,
      primary key (relation_oid, constraint_name)
    )
  on commit drop;

  truncate table privacy_erasure_checks_to_restore;

  for constraint_record in
    select
      table_row.oid as relation_oid,
      namespace_row.nspname as schema_name,
      table_row.relname as table_name,
      attribute.attname as column_name
    from pg_constraint as foreign_key
    join pg_class as table_row
      on table_row.oid = foreign_key.conrelid
    join pg_namespace as namespace_row
      on namespace_row.oid = table_row.relnamespace
    join unnest(foreign_key.conkey)
      with ordinality as key_column(attnum, position)
      on true
    join pg_attribute as attribute
      on attribute.attrelid = table_row.oid
      and attribute.attnum = key_column.attnum
    where foreign_key.contype = 'f'
      and cardinality(foreign_key.conkey) = 1
      and foreign_key.confrelid = 'public.profiles'::regclass
      and namespace_row.nspname = 'public'
      and (
        attribute.attname ~ '_by_profile_id$'
        or attribute.attname in (
          'actor_profile_id',
          'author_profile_id',
          'recipient_profile_id'
        )
      )
      and attribute.attname <> 'accepted_by_profile_id'
    order by table_row.relname, attribute.attname
  loop
    execute format(
      'select count(*) from %I.%I where %I = $1',
      constraint_record.schema_name,
      constraint_record.table_name,
      constraint_record.column_name
    )
    into reference_count
    using target_user_id;

    if reference_count = 0 then
      continue;
    end if;

    for check_constraint_record in
      select
        check_row.conname as constraint_name,
        pg_get_constraintdef(check_row.oid, true)
          as constraint_definition
      from pg_constraint as check_row
      where check_row.conrelid =
          constraint_record.relation_oid
        and check_row.contype = 'c'
        and position(
          lower(constraint_record.column_name)
          in lower(pg_get_constraintdef(check_row.oid, true))
        ) > 0
    loop
      insert into privacy_erasure_checks_to_restore (
        relation_oid,
        schema_name,
        table_name,
        constraint_name,
        constraint_definition
      )
      values (
        constraint_record.relation_oid,
        constraint_record.schema_name,
        constraint_record.table_name,
        check_constraint_record.constraint_name,
        check_constraint_record.constraint_definition
      )
      on conflict (relation_oid, constraint_name) do nothing;
    end loop;
  end loop;

  for check_constraint_record in
    select *
    from privacy_erasure_checks_to_restore
    order by schema_name, table_name, constraint_name
  loop
    execute format(
      'lock table %I.%I in access exclusive mode',
      check_constraint_record.schema_name,
      check_constraint_record.table_name
    );

    execute format(
      'alter table %I.%I drop constraint %I',
      check_constraint_record.schema_name,
      check_constraint_record.table_name,
      check_constraint_record.constraint_name
    );
  end loop;

  -- -----------------------------------------------------
  -- 7L. DELETE PROFILE AND AUTH USER LAST
  -- -----------------------------------------------------

  delete from public.profiles
  where id = target_user_id;

  get diagnostics affected = row_count;
  total_deleted := total_deleted + affected;

  delete from auth.users
  where id = target_user_id;

  get diagnostics affected = row_count;
  total_deleted := total_deleted + affected;

  -- -----------------------------------------------------
  -- 7M. RESTORE USER TRIGGERS AND CHECK CONSTRAINTS
  -- -----------------------------------------------------

  for row_record in
    select *
    from privacy_erasure_trigger_states
    order by schema_name, table_name, trigger_name
  loop
    if row_record.enabled_state = 'D' then
      execute format(
        'alter table %I.%I disable trigger %I',
        row_record.schema_name,
        row_record.table_name,
        row_record.trigger_name
      );
    elsif row_record.enabled_state = 'R' then
      execute format(
        'alter table %I.%I enable replica trigger %I',
        row_record.schema_name,
        row_record.table_name,
        row_record.trigger_name
      );
    elsif row_record.enabled_state = 'A' then
      execute format(
        'alter table %I.%I enable always trigger %I',
        row_record.schema_name,
        row_record.table_name,
        row_record.trigger_name
      );
    else
      execute format(
        'alter table %I.%I enable trigger %I',
        row_record.schema_name,
        row_record.table_name,
        row_record.trigger_name
      );
    end if;
  end loop;

  for check_constraint_record in
    select *
    from privacy_erasure_checks_to_restore
    order by schema_name, table_name, constraint_name
  loop
    execute format(
      'alter table %I.%I add constraint %I %s not valid',
      check_constraint_record.schema_name,
      check_constraint_record.table_name,
      check_constraint_record.constraint_name,
      check_constraint_record.constraint_definition
    );
  end loop;

  -- -----------------------------------------------------
  -- 7N. TRANSACTIONAL VERIFICATION
  -- -----------------------------------------------------

  for column_record in
    select
      column_row.table_name,
      column_row.column_name
    from information_schema.columns as column_row
    join information_schema.tables as table_info
      on table_info.table_schema = column_row.table_schema
      and table_info.table_name = column_row.table_name
      and table_info.table_type = 'BASE TABLE'
    where column_row.table_schema = 'public'
      and column_row.udt_name = 'uuid'
    order by column_row.table_name, column_row.ordinal_position
  loop
    execute format(
      'select count(*) from public.%I where %I = $1',
      column_record.table_name,
      column_record.column_name
    )
    into reference_count
    using target_user_id;

    if reference_count > 0 then
      remaining_uuid_references :=
        remaining_uuid_references ||
        jsonb_build_array(
          jsonb_build_object(
            'table', column_record.table_name,
            'column', column_record.column_name,
            'rows', reference_count
          )
        );
    end if;
  end loop;

  for column_record in
    select
      column_row.table_name,
      column_row.column_name
    from information_schema.columns as column_row
    join information_schema.tables as table_info
      on table_info.table_schema = column_row.table_schema
      and table_info.table_name = column_row.table_name
      and table_info.table_type = 'BASE TABLE'
    where column_row.table_schema = 'public'
      and column_row.data_type in (
        'text',
        'character varying',
        'character',
        'json',
        'jsonb'
      )
    order by column_row.table_name, column_row.ordinal_position
  loop
    execute format(
      'select count(*) from public.%I ' ||
      'where position($1 in %I::text) > 0',
      column_record.table_name,
      column_record.column_name
    )
    into reference_count
    using target_user_id::text;

    if reference_count > 0 then
      remaining_text_uuid_references :=
        remaining_text_uuid_references ||
        jsonb_build_array(
          jsonb_build_object(
            'table', column_record.table_name,
            'column', column_record.column_name,
            'rows', reference_count
          )
        );
    end if;
  end loop;

  if jsonb_array_length(remaining_uuid_references) > 0
    or jsonb_array_length(remaining_text_uuid_references) > 0
    or exists (
      select 1 from public.profiles where id = target_user_id
    )
    or exists (
      select 1 from auth.users where id = target_user_id
    )
  then
    raise exception
      'Post-deletion verification failed. No deletion was committed. Remaining typed UUID references: %. Remaining literal UUID references: %.',
      remaining_uuid_references::text,
      remaining_text_uuid_references::text;
  end if;

  return jsonb_build_object(
    'success', true,
    'userId', target_user_id,
    'previousRole', profile_role,
    'deletedRowsOrAuthRecords', total_deleted,
    'anonymisedOrRedactedRows', total_anonymised,
    'resolvedDoctorIds', to_jsonb(doctor_ids),
    'deletedDoctorIds', to_jsonb(deleted_doctor_ids),
    'doctorTombstoneIds', to_jsonb(doctor_tombstone_ids),
    'deletedDoctorInvitationIds', to_jsonb(invitation_ids),
    'deletedDoctorAccessGrantIds', to_jsonb(access_grant_ids),
    'deletedContractAssignments',
      to_jsonb(contract_assignment_ids),
    'deletedContractAcceptances',
      to_jsonb(contract_acceptance_ids),
    'completedAt', now(),
    'message',
      'The live RomDoc profile UUID and Supabase Auth user were permanently removed. Review backups and external processors separately.'
  );
end;
$function$;

revoke all on function public.permanently_remove_romdoc_user(
  uuid,
  text,
  boolean
)
from public, anon, authenticated, service_role;

comment on function public.permanently_remove_romdoc_user(
  uuid,
  text,
  boolean
) is
  'Owner-only manual SQL Editor hard-erasure function. Not available through the API or service_role. Aborts transaction on Storage objects or unhandled restrictive references.';

commit;

-- =====================================================
-- MANUAL USAGE — DO NOT PLACE REAL UUIDS IN MIGRATION HISTORY
-- =====================================================
--
-- 1. Preview:
--
-- select public.preview_permanent_user_removal(
--   '00000000-0000-0000-0000-000000000000'::uuid
-- );
--
-- 2. Delete every physical object listed under storageObjects by using:
--    Supabase Dashboard -> Storage.
--
-- 3. Preview again. storageObjects must be [].
--
-- 4. Execute:
--
-- select public.permanently_remove_romdoc_user(
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'DELETE ROMDOC USER 00000000-0000-0000-0000-000000000000',
--   false
-- );
--
-- The third argument must remain false unless:
--   - accepted contract evidence exists for the account;
--   - legal review authorises deleting that acceptance evidence;
--   - every accepted PDF listed by preview was removed from Storage.
--
-- 5. Run the preview once more and preserve only the minimal privacy
--    request completion record outside the erased user profile.
--
-- Auth-only invited Doctor:
--   Use the Auth UUID. The toolkit resolves the Doctor through
--   doctor_invitations.auth_user_id/email even when public.profiles is absent
--   and doctors.profile_id is NULL.
-- =====================================================
