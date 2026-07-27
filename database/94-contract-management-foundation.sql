-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Phase 5A — Contract management foundation
--
-- Target project path:
-- ROMDOC/database/94-contract-management-foundation.sql
--
-- Adds:
--   1. Immutable, versioned contract and annex documents.
--   2. Immutable, versioned contract packages.
--   3. Doctor and Clinic Organisation package assignments.
--   4. Immutable electronic acceptance evidence.
--   5. Accepted PDF artifact metadata and a private Storage bucket.
--   6. Append-only contract event history.
--   7. Strict RLS for Doctors, authorised Clinic Managers and Admins.
--   8. An explicit Clinic Organisation contract-signatory permission.
--
-- Important billing decision:
--   Contractual commercial terms are stored as snapshots only.
--   This migration does NOT modify public.client_billing_terms and creates
--   no trigger or function that changes operational client prices.
--   Admin's existing manual client-price editor remains authoritative.
--
-- Payment deadline:
--   Every new client contract assignment defaults to 30 calendar days.
--
-- Direct browser writes:
--   Intentionally disabled. Later phases will use validated server routes
--   with the service-role client after role and AAL2 checks.
-- =====================================================

begin;

create extension if not exists pgcrypto;

-- =====================================================
-- 1. PRIVATE ACCEPTED-CONTRACT STORAGE BUCKET
-- =====================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'accepted-contracts',
  'accepted-contracts',
  false,
  26214400,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =====================================================
-- 2. CLINIC ORGANISATION CONTRACT SIGNATORIES
-- =====================================================
-- This is separate from appointment, billing and organisation-management
-- permissions. Existing organisation owners are authorised by default.

alter table public.clinic_organization_members
  add column if not exists can_sign_contracts boolean not null default false;

update public.clinic_organization_members
set can_sign_contracts = true
where member_role = 'owner'
  and can_sign_contracts = false;

comment on column public.clinic_organization_members.can_sign_contracts is
  'Explicit permission to accept RomDoc contracts on behalf of the Clinic Organisation. Existing owners are enabled by this migration; other members require an Admin-managed authorisation.';

-- =====================================================
-- 3. VERSIONED CONTRACT DOCUMENTS
-- =====================================================

create table if not exists public.contract_documents (
  id uuid primary key default gen_random_uuid(),

  document_key text not null,
  document_type text not null,
  audience text not null,
  locale text not null default 'ro',

  title text not null,
  version text not null,
  content_html text not null,
  content_hash text not null default repeat('0', 64),
  metadata jsonb not null default '{}'::jsonb,

  requires_acceptance boolean not null default true,
  unilateral_notice_allowed boolean not null default false,

  status text not null default 'draft',
  issue_date date not null default current_date,
  effective_at timestamptz,
  published_at timestamptz,

  supersedes_document_id uuid
    references public.contract_documents(id)
    on update cascade
    on delete restrict,

  created_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,

  published_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contract_documents_key_check
    check (document_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  constraint contract_documents_type_check
    check (
      document_type in (
        'doctor_contract',
        'clinic_contract',
        'pricing_annex',
        'consolidated_billing_annex',
        'data_processing_annex',
        'security_annex',
        'operational_annex',
        'individual_amendment',
        'other_annex'
      )
    ),

  constraint contract_documents_audience_check
    check (audience in ('doctor', 'clinic_organization', 'shared')),

  constraint contract_documents_locale_check
    check (locale in ('ro', 'en', 'de')),

  constraint contract_documents_title_check
    check (char_length(trim(title)) between 2 and 250),

  constraint contract_documents_version_check
    check (version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$'),

  constraint contract_documents_content_check
    check (char_length(trim(content_html)) >= 1),

  constraint contract_documents_hash_check
    check (content_hash ~ '^[a-f0-9]{64}$'),

  constraint contract_documents_metadata_check
    check (jsonb_typeof(metadata) = 'object'),

  constraint contract_documents_status_check
    check (status in ('draft', 'published')),

  constraint contract_documents_publication_check
    check (
      (
        status = 'draft'
        and published_at is null
        and published_by_profile_id is null
      )
      or
      (
        status = 'published'
        and published_at is not null
        and published_by_profile_id is not null
      )
    ),

  constraint contract_documents_effective_date_check
    check (
      published_at is null
      or effective_at is null
      or effective_at >= published_at
    ),

  constraint contract_documents_supersedes_check
    check (supersedes_document_id is null or supersedes_document_id <> id),

  unique (document_key, locale, version)
);

comment on table public.contract_documents is
  'Versioned RomDoc contract and annex documents. Drafts may be edited. Published rows are immutable and are superseded only by creating a new row with a different version.';

comment on column public.contract_documents.metadata is
  'Optional machine-readable document metadata. Pricing metadata is contractual information only and never updates operational billing prices.';

comment on column public.contract_documents.unilateral_notice_allowed is
  'Indicates that the base contract may permit this document category to take effect by notice. Material changes may still require an assignment with acceptance_required = true.';

create index if not exists idx_contract_documents_type_audience
  on public.contract_documents(document_type, audience, locale, status);

create index if not exists idx_contract_documents_supersedes
  on public.contract_documents(supersedes_document_id)
  where supersedes_document_id is not null;

-- =====================================================
-- 4. VERSIONED CONTRACT PACKAGES
-- =====================================================

create table if not exists public.contract_packages (
  id uuid primary key default gen_random_uuid(),

  package_key text not null,
  contract_type text not null,
  locale text not null default 'ro',
  title text not null,
  version text not null,

  status text not null default 'draft',
  requires_acceptance boolean not null default true,
  payment_deadline_days smallint not null default 30,
  metadata jsonb not null default '{}'::jsonb,

  effective_at timestamptz,
  published_at timestamptz,
  manifest_hash text,

  supersedes_package_id uuid
    references public.contract_packages(id)
    on update cascade
    on delete restrict,

  created_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,

  published_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contract_packages_key_check
    check (package_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  constraint contract_packages_type_check
    check (contract_type in ('independent_doctor', 'clinic_organization')),

  constraint contract_packages_locale_check
    check (locale in ('ro', 'en', 'de')),

  constraint contract_packages_title_check
    check (char_length(trim(title)) between 2 and 250),

  constraint contract_packages_version_check
    check (version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$'),

  constraint contract_packages_status_check
    check (status in ('draft', 'published')),

  constraint contract_packages_payment_deadline_check
    check (payment_deadline_days between 1 and 365),

  constraint contract_packages_metadata_check
    check (jsonb_typeof(metadata) = 'object'),

  constraint contract_packages_manifest_hash_check
    check (manifest_hash is null or manifest_hash ~ '^[a-f0-9]{64}$'),

  constraint contract_packages_publication_check
    check (
      (
        status = 'draft'
        and published_at is null
        and published_by_profile_id is null
        and manifest_hash is null
      )
      or
      (
        status = 'published'
        and published_at is not null
        and published_by_profile_id is not null
        and manifest_hash is not null
      )
    ),

  constraint contract_packages_effective_date_check
    check (
      published_at is null
      or effective_at is null
      or effective_at >= published_at
    ),

  constraint contract_packages_supersedes_check
    check (supersedes_package_id is null or supersedes_package_id <> id),

  unique (package_key, locale, version)
);

comment on table public.contract_packages is
  'Immutable published bundles of one contract and its applicable annex versions. New versions supersede old packages without editing historical packages.';

comment on column public.contract_packages.payment_deadline_days is
  'Contractual invoice payment deadline snapshot. Defaults to 30 calendar days and does not modify SAGA or operational billing configuration.';

create index if not exists idx_contract_packages_type_locale
  on public.contract_packages(contract_type, locale, status);

create index if not exists idx_contract_packages_supersedes
  on public.contract_packages(supersedes_package_id)
  where supersedes_package_id is not null;

-- =====================================================
-- 5. PACKAGE DOCUMENT COMPOSITION
-- =====================================================

create table if not exists public.contract_package_documents (
  package_id uuid not null
    references public.contract_packages(id)
    on update cascade
    on delete restrict,

  document_id uuid not null
    references public.contract_documents(id)
    on update cascade
    on delete restrict,

  display_order smallint not null,
  is_required boolean not null default true,
  section_label text,
  created_at timestamptz not null default now(),

  primary key (package_id, document_id),

  constraint contract_package_documents_order_check
    check (display_order between 1 and 100),

  constraint contract_package_documents_section_check
    check (
      section_label is null
      or char_length(trim(section_label)) between 1 and 150
    ),

  unique (package_id, display_order)
);

comment on table public.contract_package_documents is
  'Ordered document composition of a contract package. Composition may change only while the package remains a draft.';

create index if not exists idx_contract_package_documents_document
  on public.contract_package_documents(document_id);

-- =====================================================
-- 6. CLIENT CONTRACT ASSIGNMENTS
-- =====================================================

create table if not exists public.client_contract_assignments (
  id uuid primary key default gen_random_uuid(),

  package_id uuid not null
    references public.contract_packages(id)
    on update cascade
    on delete restrict,

  client_type text not null,

  doctor_id uuid
    references public.doctors(id)
    on update cascade
    on delete restrict,

  clinic_organization_id uuid
    references public.clinic_organizations(id)
    on update cascade
    on delete restrict,

  status text not null default 'assigned',
  acceptance_required boolean not null default true,

  commercial_terms jsonb not null default '{}'::jsonb,
  commercial_terms_hash text not null default repeat('0', 64),
  payment_deadline_days smallint not null,

  assigned_at timestamptz not null default now(),
  notified_at timestamptz,
  effective_at timestamptz,

  supersedes_assignment_id uuid
    references public.client_contract_assignments(id)
    on update cascade
    on delete restrict,

  internal_notes text,

  created_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,

  updated_by_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_contract_assignments_client_type_check
    check (client_type in ('independent_doctor', 'clinic_organization')),

  constraint client_contract_assignments_target_check
    check (
      (
        client_type = 'independent_doctor'
        and doctor_id is not null
        and clinic_organization_id is null
      )
      or
      (
        client_type = 'clinic_organization'
        and clinic_organization_id is not null
        and doctor_id is null
      )
    ),

  constraint client_contract_assignments_status_check
    check (
      status in (
        'assigned',
        'notified',
        'awaiting_acceptance',
        'accepted',
        'effective',
        'superseded',
        'cancelled',
        'terminated'
      )
    ),

  constraint client_contract_assignments_terms_check
    check (jsonb_typeof(commercial_terms) = 'object'),

  constraint client_contract_assignments_terms_hash_check
    check (commercial_terms_hash ~ '^[a-f0-9]{64}$'),

  constraint client_contract_assignments_payment_deadline_check
    check (payment_deadline_days between 1 and 365),

  constraint client_contract_assignments_effective_date_check
    check (effective_at is null or effective_at >= assigned_at),

  constraint client_contract_assignments_supersedes_check
    check (supersedes_assignment_id is null or supersedes_assignment_id <> id),

  constraint client_contract_assignments_notes_check
    check (
      internal_notes is null
      or char_length(trim(internal_notes)) between 1 and 5000
    )
);

comment on table public.client_contract_assignments is
  'Assigns a published contract package to one independent Doctor or Clinic Organisation. Contractual terms are snapshots only and never update public.client_billing_terms automatically.';

comment on column public.client_contract_assignments.commercial_terms is
  'Client-specific contractual proposal, such as accepted subscription or SMS prices. It is intentionally separate from operational billing prices configured manually by Admin.';

create unique index if not exists uq_client_contract_assignment_doctor_package
  on public.client_contract_assignments(package_id, doctor_id)
  where client_type = 'independent_doctor';

create unique index if not exists uq_client_contract_assignment_org_package
  on public.client_contract_assignments(package_id, clinic_organization_id)
  where client_type = 'clinic_organization';

create index if not exists idx_client_contract_assignments_doctor_status
  on public.client_contract_assignments(doctor_id, status, assigned_at desc)
  where doctor_id is not null;

create index if not exists idx_client_contract_assignments_org_status
  on public.client_contract_assignments(clinic_organization_id, status, assigned_at desc)
  where clinic_organization_id is not null;

create index if not exists idx_client_contract_assignments_pending
  on public.client_contract_assignments(status, notified_at, assigned_at desc)
  where status in ('assigned', 'notified', 'awaiting_acceptance');

-- =====================================================
-- 7. IMMUTABLE ELECTRONIC ACCEPTANCE EVIDENCE
-- =====================================================

create table if not exists public.contract_acceptances (
  id uuid primary key default gen_random_uuid(),

  assignment_id uuid not null unique
    references public.client_contract_assignments(id)
    on update cascade
    on delete restrict,

  accepted_by_profile_id uuid not null
    references public.profiles(id)
    on update cascade
    on delete restrict,

  doctor_id uuid
    references public.doctors(id)
    on update cascade
    on delete restrict,

  clinic_organization_id uuid
    references public.clinic_organizations(id)
    on update cascade
    on delete restrict,

  represented_entity_name text not null,
  representative_name text not null,
  representative_capacity text not null,
  represented_entity_snapshot jsonb not null,

  accepted_locale text not null,
  checkbox_text text not null,

  package_version text not null,
  package_manifest_hash text not null,
  document_manifest jsonb not null,

  commercial_terms_snapshot jsonb not null,
  commercial_terms_hash text not null,
  payment_deadline_days smallint not null,

  ip_address inet,
  user_agent text,

  acceptance_evidence_hash text not null default repeat('0', 64),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint contract_acceptances_target_check
    check (
      (doctor_id is not null and clinic_organization_id is null)
      or
      (doctor_id is null and clinic_organization_id is not null)
    ),

  constraint contract_acceptances_entity_name_check
    check (char_length(trim(represented_entity_name)) between 2 and 250),

  constraint contract_acceptances_representative_name_check
    check (char_length(trim(representative_name)) between 2 and 250),

  constraint contract_acceptances_capacity_check
    check (char_length(trim(representative_capacity)) between 2 and 150),

  constraint contract_acceptances_entity_snapshot_check
    check (jsonb_typeof(represented_entity_snapshot) = 'object'),

  constraint contract_acceptances_locale_check
    check (accepted_locale in ('ro', 'en', 'de')),

  constraint contract_acceptances_checkbox_check
    check (char_length(trim(checkbox_text)) between 20 and 4000),

  constraint contract_acceptances_package_hash_check
    check (package_manifest_hash ~ '^[a-f0-9]{64}$'),

  constraint contract_acceptances_document_manifest_check
    check (jsonb_typeof(document_manifest) = 'array'),

  constraint contract_acceptances_commercial_terms_check
    check (jsonb_typeof(commercial_terms_snapshot) = 'object'),

  constraint contract_acceptances_commercial_terms_hash_check
    check (commercial_terms_hash ~ '^[a-f0-9]{64}$'),

  constraint contract_acceptances_payment_deadline_check
    check (payment_deadline_days between 1 and 365),

  constraint contract_acceptances_evidence_hash_check
    check (acceptance_evidence_hash ~ '^[a-f0-9]{64}$')
);

comment on table public.contract_acceptances is
  'Immutable legal evidence of one electronic contract-package acceptance. The database builds the exact document manifest and snapshots contractual terms at insert time.';

comment on column public.contract_acceptances.acceptance_evidence_hash is
  'SHA-256 hash of the package manifest, contractual terms, represented entity, checkbox wording, locale and acceptance timestamp.';

create index if not exists idx_contract_acceptances_doctor
  on public.contract_acceptances(doctor_id, accepted_at desc)
  where doctor_id is not null;

create index if not exists idx_contract_acceptances_org
  on public.contract_acceptances(clinic_organization_id, accepted_at desc)
  where clinic_organization_id is not null;

create index if not exists idx_contract_acceptances_profile
  on public.contract_acceptances(accepted_by_profile_id, accepted_at desc);

-- =====================================================
-- 8. ACCEPTED PDF ARTIFACT METADATA
-- =====================================================

create table if not exists public.contract_acceptance_artifacts (
  id uuid primary key default gen_random_uuid(),

  acceptance_id uuid not null unique
    references public.contract_acceptances(id)
    on update cascade
    on delete restrict,

  status text not null default 'pending',

  storage_bucket text not null default 'accepted-contracts',
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default 'application/pdf',

  file_size_bytes bigint,
  checksum_sha256 text,
  generated_at timestamptz,
  failure_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contract_acceptance_artifacts_status_check
    check (status in ('pending', 'ready', 'failed')),

  constraint contract_acceptance_artifacts_bucket_check
    check (storage_bucket = 'accepted-contracts'),

  constraint contract_acceptance_artifacts_path_check
    check (nullif(trim(storage_path), '') is not null),

  constraint contract_acceptance_artifacts_file_name_check
    check (
      char_length(trim(file_name)) between 5 and 255
      and lower(file_name) like '%.pdf'
    ),

  constraint contract_acceptance_artifacts_mime_check
    check (mime_type = 'application/pdf'),

  constraint contract_acceptance_artifacts_size_check
    check (
      file_size_bytes is null
      or (file_size_bytes > 0 and file_size_bytes <= 26214400)
    ),

  constraint contract_acceptance_artifacts_checksum_check
    check (
      checksum_sha256 is null
      or checksum_sha256 ~ '^[a-f0-9]{64}$'
    ),

  constraint contract_acceptance_artifacts_failure_check
    check (
      failure_reason is null
      or char_length(trim(failure_reason)) between 1 and 2000
    ),

  constraint contract_acceptance_artifacts_state_check
    check (
      (
        status = 'pending'
        and file_size_bytes is null
        and checksum_sha256 is null
        and generated_at is null
        and failure_reason is null
      )
      or
      (
        status = 'ready'
        and file_size_bytes is not null
        and checksum_sha256 is not null
        and generated_at is not null
        and failure_reason is null
      )
      or
      (
        status = 'failed'
        and generated_at is null
        and failure_reason is not null
      )
    )
);

comment on table public.contract_acceptance_artifacts is
  'Private PDF artifact generated from immutable acceptance evidence. A ready artifact becomes immutable and remains downloadable from the accepted-contracts bucket.';

create index if not exists idx_contract_acceptance_artifacts_status
  on public.contract_acceptance_artifacts(status, created_at);

-- =====================================================
-- 9. APPEND-ONLY CONTRACT EVENT HISTORY
-- =====================================================

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),

  assignment_id uuid not null
    references public.client_contract_assignments(id)
    on update cascade
    on delete restrict,

  acceptance_id uuid
    references public.contract_acceptances(id)
    on update cascade
    on delete restrict,

  event_type text not null,

  actor_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint contract_events_type_check
    check (
      event_type in (
        'assigned',
        'notified',
        'viewed',
        'downloaded',
        'acceptance_started',
        'accepted',
        'became_effective',
        'superseded',
        'cancelled',
        'terminated',
        'pdf_generation_started',
        'pdf_generated',
        'pdf_generation_failed',
        'confirmation_email_sent',
        'confirmation_email_failed',
        'price_update_pending',
        'price_applied'
      )
    ),

  constraint contract_events_data_check
    check (jsonb_typeof(event_data) = 'object')
);

comment on table public.contract_events is
  'Append-only operational and legal history for contract assignments. Rows may be inserted by validated server workflows but never updated or deleted.';

create index if not exists idx_contract_events_assignment_created
  on public.contract_events(assignment_id, created_at desc);

create index if not exists idx_contract_events_acceptance_created
  on public.contract_events(acceptance_id, created_at desc)
  where acceptance_id is not null;

-- =====================================================
-- 10. DOCUMENT IMMUTABILITY AND HASHING
-- =====================================================

create or replace function public.prepare_contract_document_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  previous_document public.contract_documents%rowtype;
begin
  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'Contract documents must be created as drafts before publication.';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'published' then
      raise exception 'Published contract documents are immutable. Create a new version instead.';
    end if;
    if new.id <> old.id
      or new.document_key <> old.document_key
      or new.audience <> old.audience
      or new.locale <> old.locale
      or new.created_by_profile_id <> old.created_by_profile_id
      or new.created_at <> old.created_at
    then
      raise exception 'The document identity and creation evidence cannot be changed.';
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
      raise exception 'A new document version may supersede only a published version of the same document key, audience and locale.';
    end if;
  end if;

  new.content_hash := encode(
    digest(convert_to(new.content_html, 'UTF8'), 'sha256'),
    'hex'
  );
  new.updated_at := now();

  if new.status = 'draft' then
    new.published_at := null;
    new.published_by_profile_id := null;
  elsif new.status = 'published' then
    if tg_op <> 'UPDATE' or old.status <> 'draft' then
      raise exception 'Only a draft contract document may be published.';
    end if;

    if new.published_by_profile_id is null then
      raise exception 'published_by_profile_id is required when publishing a contract document.';
    end if;

    new.published_at := now();

    if new.effective_at is not null and new.effective_at < new.published_at then
      raise exception 'A contract document effective date cannot be earlier than its publication timestamp.';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.prepare_contract_document_version() from public;

create or replace function public.protect_contract_document_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if old.status = 'published' then
    raise exception 'Published contract documents cannot be deleted.';
  end if;

  return old;
end;
$function$;

revoke all on function public.protect_contract_document_delete() from public;

drop trigger if exists prepare_contract_document_version
  on public.contract_documents;

create trigger prepare_contract_document_version
before insert or update on public.contract_documents
for each row execute function public.prepare_contract_document_version();

drop trigger if exists protect_contract_document_delete
  on public.contract_documents;

create trigger protect_contract_document_delete
before delete on public.contract_documents
for each row execute function public.protect_contract_document_delete();

-- =====================================================
-- 11. PACKAGE COMPOSITION AND IMMUTABILITY
-- =====================================================

create or replace function public.protect_contract_package_composition()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_package public.contract_packages%rowtype;
  selected_document public.contract_documents%rowtype;
  selected_package_id uuid;
  selected_document_id uuid;
begin
  selected_package_id := case when tg_op = 'DELETE' then old.package_id else new.package_id end;
  selected_document_id := case when tg_op = 'DELETE' then old.document_id else new.document_id end;

  select *
  into selected_package
  from public.contract_packages
  where id = selected_package_id;

  if not found then
    raise exception 'Contract package not found.';
  end if;

  if selected_package.status <> 'draft' then
    raise exception 'Published contract package composition is immutable.';
  end if;

  if tg_op <> 'DELETE' then
    select *
    into selected_document
    from public.contract_documents
    where id = selected_document_id;

    if not found then
      raise exception 'Contract document not found.';
    end if;

    if selected_document.locale <> selected_package.locale then
      raise exception 'Package and document locales must match.';
    end if;

    if not (
      selected_document.audience = 'shared'
      or (
        selected_package.contract_type = 'independent_doctor'
        and selected_document.audience = 'doctor'
      )
      or (
        selected_package.contract_type = 'clinic_organization'
        and selected_document.audience = 'clinic_organization'
      )
    ) then
      raise exception 'The document audience does not match the contract package type.';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function public.protect_contract_package_composition() from public;

drop trigger if exists protect_contract_package_composition
  on public.contract_package_documents;

create trigger protect_contract_package_composition
before insert or update or delete on public.contract_package_documents
for each row execute function public.protect_contract_package_composition();

create or replace function public.prepare_contract_package_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  previous_package public.contract_packages%rowtype;
  linked_count integer;
  unpublished_count integer;
  invalid_count integer;
  manifest_source text;
begin
  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'Contract packages must be created as drafts before publication.';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'published' then
      raise exception 'Published contract packages are immutable. Create a new version instead.';
    end if;
    if new.id <> old.id
      or new.package_key <> old.package_key
      or new.contract_type <> old.contract_type
      or new.locale <> old.locale
      or new.created_by_profile_id <> old.created_by_profile_id
      or new.created_at <> old.created_at
    then
      raise exception 'The package identity and creation evidence cannot be changed.';
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
      raise exception 'A new package version may supersede only a published version of the same package key, contract type and locale.';
    end if;
  end if;

  new.updated_at := now();

  if new.status = 'draft' then
    new.published_at := null;
    new.published_by_profile_id := null;
    new.manifest_hash := null;
  elsif new.status = 'published' then
    if tg_op <> 'UPDATE' or old.status <> 'draft' then
      raise exception 'Only a draft contract package may be published.';
    end if;

    if new.published_by_profile_id is null then
      raise exception 'published_by_profile_id is required when publishing a contract package.';
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
      raise exception 'A contract package must contain at least one document before publication.';
    end if;

    if unpublished_count > 0 then
      raise exception 'Every document in a published package must already be published.';
    end if;

    if invalid_count > 0 then
      raise exception 'One or more documents do not match the package locale or audience.';
    end if;

    new.published_at := now();

    if new.effective_at is not null and new.effective_at < new.published_at then
      raise exception 'A contract package effective date cannot be earlier than its publication timestamp.';
    end if;

    new.manifest_hash := encode(
      digest(convert_to(manifest_source, 'UTF8'), 'sha256'),
      'hex'
    );
  end if;

  return new;
end;
$function$;

revoke all on function public.prepare_contract_package_version() from public;

create or replace function public.protect_contract_package_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if old.status = 'published' then
    raise exception 'Published contract packages cannot be deleted.';
  end if;

  return old;
end;
$function$;

revoke all on function public.protect_contract_package_delete() from public;

drop trigger if exists prepare_contract_package_version
  on public.contract_packages;

create trigger prepare_contract_package_version
before insert or update on public.contract_packages
for each row execute function public.prepare_contract_package_version();

drop trigger if exists protect_contract_package_delete
  on public.contract_packages;

create trigger protect_contract_package_delete
before delete on public.contract_packages
for each row execute function public.protect_contract_package_delete();

-- =====================================================
-- 12. ASSIGNMENT VALIDATION AND CONTRACTUAL TERMS HASH
-- =====================================================

create or replace function public.prepare_client_contract_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_package public.contract_packages%rowtype;
  previous_assignment public.client_contract_assignments%rowtype;
begin
  select *
  into selected_package
  from public.contract_packages
  where id = new.package_id;

  if not found or selected_package.status <> 'published' then
    raise exception 'Only a published contract package may be assigned to a client.';
  end if;

  if selected_package.contract_type <> new.client_type then
    raise exception 'The contract package type does not match the client type.';
  end if;

  if tg_op = 'INSERT' and new.status <> 'assigned' then
    raise exception 'A client contract assignment must start with status assigned.';
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
      raise exception 'The assigned package, client target and creation evidence cannot be changed.';
    end if;

    if old.status <> 'assigned' and (
      new.commercial_terms is distinct from old.commercial_terms
      or new.payment_deadline_days <> old.payment_deadline_days
      or new.acceptance_required <> old.acceptance_required
      or new.supersedes_assignment_id is distinct from old.supersedes_assignment_id
    ) then
      raise exception 'Contractual terms cannot change after an assignment leaves draft assignment status. Create a new assignment instead.';
    end if;

    if old.status <> new.status then
      if not (
        (old.status = 'assigned' and new.status in ('notified', 'awaiting_acceptance', 'accepted', 'cancelled'))
        or (old.status = 'notified' and new.status in ('awaiting_acceptance', 'accepted', 'cancelled'))
        or (old.status = 'awaiting_acceptance' and new.status in ('accepted', 'cancelled'))
        or (old.status = 'accepted' and new.status in ('effective', 'superseded', 'terminated'))
        or (old.status = 'effective' and new.status in ('superseded', 'terminated'))
      ) then
        raise exception 'Invalid client contract assignment status transition: % -> %.', old.status, new.status;
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
      raise exception 'A new assignment may supersede only an assignment for the same client.';
    end if;
  end if;

  new.commercial_terms_hash := encode(
    digest(convert_to(new.commercial_terms::text, 'UTF8'), 'sha256'),
    'hex'
  );

  if new.payment_deadline_days is null then
    new.payment_deadline_days := coalesce(selected_package.payment_deadline_days, 30);
  end if;

  if new.effective_at is null then
    new.effective_at := selected_package.effective_at;
  end if;

  if new.status in ('notified', 'awaiting_acceptance', 'accepted', 'effective')
    and new.notified_at is null
  then
    new.notified_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.prepare_client_contract_assignment() from public;

drop trigger if exists prepare_client_contract_assignment
  on public.client_contract_assignments;

create trigger prepare_client_contract_assignment
before insert or update on public.client_contract_assignments
for each row execute function public.prepare_client_contract_assignment();

-- =====================================================
-- 13. ACCEPTANCE SNAPSHOT AND IMMUTABILITY
-- =====================================================

create or replace function public.prepare_contract_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_assignment public.client_contract_assignments%rowtype;
  selected_package public.contract_packages%rowtype;
  generated_manifest jsonb;
  evidence_source text;
begin
  select *
  into selected_assignment
  from public.client_contract_assignments
  where id = new.assignment_id;

  if not found then
    raise exception 'Contract assignment not found.';
  end if;

  if selected_assignment.status not in ('assigned', 'notified', 'awaiting_acceptance') then
    raise exception 'This contract assignment is not available for acceptance.';
  end if;

  select *
  into selected_package
  from public.contract_packages
  where id = selected_assignment.package_id;

  if not found or selected_package.status <> 'published' then
    raise exception 'The assigned contract package is not published.';
  end if;

  if selected_assignment.client_type = 'independent_doctor' then
    if not exists (
      select 1
      from public.doctors as doctor
      join public.profiles as profile
        on profile.id = doctor.profile_id
      where doctor.id = selected_assignment.doctor_id
        and doctor.profile_id = new.accepted_by_profile_id
        and profile.role = 'doctor'
        and profile.account_status = 'active'
    ) then
      raise exception 'Only the active Doctor account may accept this Doctor contract.';
    end if;
  else
    if not exists (
      select 1
      from public.clinic_organization_members as member
      join public.profiles as profile
        on profile.id = member.profile_id
      where member.organization_id = selected_assignment.clinic_organization_id
        and member.profile_id = new.accepted_by_profile_id
        and member.status = 'active'
        and member.can_sign_contracts = true
        and profile.role = 'clinic_manager'
        and profile.account_status = 'active'
    ) then
      raise exception 'This Clinic Manager is not authorised to sign contracts for the Clinic Organisation.';
    end if;
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'displayOrder', link.display_order,
      'required', link.is_required,
      'sectionLabel', link.section_label,
      'documentId', document.id,
      'documentKey', document.document_key,
      'documentType', document.document_type,
      'audience', document.audience,
      'locale', document.locale,
      'title', document.title,
      'version', document.version,
      'contentHash', document.content_hash,
      'issueDate', document.issue_date,
      'effectiveAt', document.effective_at,
      'requiresAcceptance', document.requires_acceptance,
      'metadata', document.metadata
    )
    order by link.display_order
  )
  into generated_manifest
  from public.contract_package_documents as link
  join public.contract_documents as document
    on document.id = link.document_id
  where link.package_id = selected_assignment.package_id;

  if generated_manifest is null or jsonb_array_length(generated_manifest) = 0 then
    raise exception 'The contract package has no document manifest.';
  end if;

  new.doctor_id := selected_assignment.doctor_id;
  new.clinic_organization_id := selected_assignment.clinic_organization_id;
  new.accepted_locale := selected_package.locale;
  new.package_version := selected_package.version;
  new.package_manifest_hash := selected_package.manifest_hash;
  new.document_manifest := generated_manifest;
  new.commercial_terms_snapshot := selected_assignment.commercial_terms;
  new.commercial_terms_hash := selected_assignment.commercial_terms_hash;
  new.payment_deadline_days := selected_assignment.payment_deadline_days;
  new.accepted_at := now();
  new.created_at := new.accepted_at;

  evidence_source := concat_ws(
    '|',
    new.assignment_id::text,
    new.accepted_by_profile_id::text,
    coalesce(new.doctor_id::text, ''),
    coalesce(new.clinic_organization_id::text, ''),
    trim(new.represented_entity_name),
    trim(new.representative_name),
    trim(new.representative_capacity),
    new.represented_entity_snapshot::text,
    new.accepted_locale,
    trim(new.checkbox_text),
    new.package_version,
    new.package_manifest_hash,
    new.document_manifest::text,
    new.commercial_terms_hash,
    new.payment_deadline_days::text,
    new.accepted_at::text
  );

  new.acceptance_evidence_hash := encode(
    digest(convert_to(evidence_source, 'UTF8'), 'sha256'),
    'hex'
  );

  return new;
end;
$function$;

revoke all on function public.prepare_contract_acceptance() from public;

create or replace function public.prevent_contract_acceptance_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  raise exception 'Contract acceptance evidence is immutable and cannot be updated or deleted.';
end;
$function$;

revoke all on function public.prevent_contract_acceptance_change() from public;

drop trigger if exists prepare_contract_acceptance
  on public.contract_acceptances;

create trigger prepare_contract_acceptance
before insert on public.contract_acceptances
for each row execute function public.prepare_contract_acceptance();

drop trigger if exists prevent_contract_acceptance_update
  on public.contract_acceptances;

create trigger prevent_contract_acceptance_update
before update on public.contract_acceptances
for each row execute function public.prevent_contract_acceptance_change();

drop trigger if exists prevent_contract_acceptance_delete
  on public.contract_acceptances;

create trigger prevent_contract_acceptance_delete
before delete on public.contract_acceptances
for each row execute function public.prevent_contract_acceptance_change();

-- =====================================================
-- 14. ACCEPTED PDF ARTIFACT PATH AND STATE PROTECTION
-- =====================================================

create or replace function public.prepare_contract_acceptance_artifact()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_acceptance public.contract_acceptances%rowtype;
  expected_prefix text;
begin
  select *
  into selected_acceptance
  from public.contract_acceptances
  where id = new.acceptance_id;

  if not found then
    raise exception 'Contract acceptance not found.';
  end if;

  if selected_acceptance.doctor_id is not null then
    expected_prefix := concat(
      'doctors/',
      selected_acceptance.doctor_id::text,
      '/',
      selected_acceptance.id::text,
      '/'
    );
  else
    expected_prefix := concat(
      'organizations/',
      selected_acceptance.clinic_organization_id::text,
      '/',
      selected_acceptance.id::text,
      '/'
    );
  end if;

  if not (new.storage_path like expected_prefix || '%') then
    raise exception 'Accepted contract storage path must begin with %.', expected_prefix;
  end if;

  if lower(new.storage_path) not like '%.pdf' then
    raise exception 'Accepted contract artifacts must use a .pdf storage path.';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'ready' then
      raise exception 'A ready accepted-contract PDF artifact is immutable.';
    end if;

    if new.id <> old.id
      or new.acceptance_id <> old.acceptance_id
      or new.storage_bucket <> old.storage_bucket
      or new.storage_path <> old.storage_path
      or new.file_name <> old.file_name
      or new.mime_type <> old.mime_type
      or new.created_at <> old.created_at
    then
      raise exception 'Accepted-contract PDF artifact identity cannot be changed.';
    end if;

    if old.status = 'pending' and new.status not in ('pending', 'ready', 'failed') then
      raise exception 'Invalid PDF artifact status transition.';
    end if;

    if old.status = 'failed' and new.status not in ('failed', 'pending', 'ready') then
      raise exception 'Invalid PDF artifact retry transition.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.prepare_contract_acceptance_artifact() from public;

create or replace function public.prevent_contract_acceptance_artifact_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  raise exception 'Accepted-contract PDF artifact records cannot be deleted.';
end;
$function$;

revoke all on function public.prevent_contract_acceptance_artifact_delete() from public;

drop trigger if exists prepare_contract_acceptance_artifact
  on public.contract_acceptance_artifacts;

create trigger prepare_contract_acceptance_artifact
before insert or update on public.contract_acceptance_artifacts
for each row execute function public.prepare_contract_acceptance_artifact();

drop trigger if exists prevent_contract_acceptance_artifact_delete
  on public.contract_acceptance_artifacts;

create trigger prevent_contract_acceptance_artifact_delete
before delete on public.contract_acceptance_artifacts
for each row execute function public.prevent_contract_acceptance_artifact_delete();

-- =====================================================
-- 15. APPEND-ONLY EVENT PROTECTION AND AUTOMATIC EVENTS
-- =====================================================

create or replace function public.prevent_contract_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  raise exception 'Contract events are append-only and cannot be updated or deleted.';
end;
$function$;

revoke all on function public.prevent_contract_event_change() from public;

drop trigger if exists prevent_contract_event_update
  on public.contract_events;

create trigger prevent_contract_event_update
before update on public.contract_events
for each row execute function public.prevent_contract_event_change();

drop trigger if exists prevent_contract_event_delete
  on public.contract_events;

create trigger prevent_contract_event_delete
before delete on public.contract_events
for each row execute function public.prevent_contract_event_change();

create or replace function public.record_contract_assignment_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  mapped_event_type text;
begin
  if tg_op = 'INSERT' then
    mapped_event_type := 'assigned';
  elsif new.status is distinct from old.status then
    mapped_event_type := case new.status
      when 'notified' then 'notified'
      when 'effective' then 'became_effective'
      when 'superseded' then 'superseded'
      when 'cancelled' then 'cancelled'
      when 'terminated' then 'terminated'
      else null
    end;
  end if;

  if mapped_event_type is not null then
    insert into public.contract_events (
      assignment_id,
      event_type,
      actor_profile_id,
      event_data
    )
    values (
      new.id,
      mapped_event_type,
      coalesce(new.updated_by_profile_id, new.created_by_profile_id),
      jsonb_build_object(
        'packageId', new.package_id,
        'clientType', new.client_type,
        'previousStatus', case when tg_op = 'UPDATE' then old.status else null end,
        'status', new.status,
        'paymentDeadlineDays', new.payment_deadline_days,
        'commercialTermsHash', new.commercial_terms_hash
      )
    );
  end if;

  return new;
end;
$function$;

revoke all on function public.record_contract_assignment_event() from public;

drop trigger if exists record_contract_assignment_event
  on public.client_contract_assignments;

create trigger record_contract_assignment_event
after insert or update on public.client_contract_assignments
for each row execute function public.record_contract_assignment_event();

create or replace function public.record_contract_acceptance_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.contract_events (
    assignment_id,
    acceptance_id,
    event_type,
    actor_profile_id,
    event_data
  )
  values (
    new.assignment_id,
    new.id,
    'accepted',
    new.accepted_by_profile_id,
    jsonb_build_object(
      'packageVersion', new.package_version,
      'packageManifestHash', new.package_manifest_hash,
      'acceptanceEvidenceHash', new.acceptance_evidence_hash,
      'acceptedLocale', new.accepted_locale,
      'paymentDeadlineDays', new.payment_deadline_days,
      'commercialTermsHash', new.commercial_terms_hash
    )
  );

  return new;
end;
$function$;

revoke all on function public.record_contract_acceptance_event() from public;

drop trigger if exists record_contract_acceptance_event
  on public.contract_acceptances;

create trigger record_contract_acceptance_event
after insert on public.contract_acceptances
for each row execute function public.record_contract_acceptance_event();

create or replace function public.record_contract_artifact_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_assignment_id uuid;
  mapped_event_type text;
begin
  if tg_op = 'INSERT' then
    mapped_event_type := 'pdf_generation_started';
  elsif new.status is distinct from old.status then
    mapped_event_type := case new.status
      when 'pending' then 'pdf_generation_started'
      when 'ready' then 'pdf_generated'
      when 'failed' then 'pdf_generation_failed'
      else null
    end;
  end if;

  if mapped_event_type is null then
    return new;
  end if;

  select acceptance.assignment_id
  into selected_assignment_id
  from public.contract_acceptances as acceptance
  where acceptance.id = new.acceptance_id;

  insert into public.contract_events (
    assignment_id,
    acceptance_id,
    event_type,
    event_data
  )
  values (
    selected_assignment_id,
    new.acceptance_id,
    mapped_event_type,
    jsonb_build_object(
      'artifactId', new.id,
      'status', new.status,
      'storagePath', new.storage_path,
      'checksumSha256', new.checksum_sha256,
      'fileSizeBytes', new.file_size_bytes,
      'failureReason', new.failure_reason
    )
  );

  return new;
end;
$function$;

revoke all on function public.record_contract_artifact_event() from public;

drop trigger if exists record_contract_artifact_event
  on public.contract_acceptance_artifacts;

create trigger record_contract_artifact_event
after insert or update on public.contract_acceptance_artifacts
for each row execute function public.record_contract_artifact_event();

-- =====================================================
-- 16. ACCESS HELPERS
-- =====================================================

create or replace function public.is_current_contract_doctor(
  target_doctor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.doctors as doctor
    join public.profiles as profile
      on profile.id = doctor.profile_id
    where doctor.id = target_doctor_id
      and doctor.profile_id = auth.uid()
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  );
$function$;

create or replace function public.can_sign_clinic_organization_contract(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.clinic_organization_members as member
    join public.profiles as profile
      on profile.id = member.profile_id
    where member.organization_id = target_organization_id
      and member.profile_id = auth.uid()
      and member.status = 'active'
      and member.can_sign_contracts = true
      and profile.role = 'clinic_manager'
      and profile.account_status = 'active'
  );
$function$;

create or replace function public.can_access_contract_assignment(
  target_assignment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.client_contract_assignments as assignment
    where assignment.id = target_assignment_id
      and (
        public.is_admin()
        or (
          assignment.client_type = 'independent_doctor'
          and public.is_current_contract_doctor(assignment.doctor_id)
        )
        or (
          assignment.client_type = 'clinic_organization'
          and public.is_clinic_organization_member(
            assignment.clinic_organization_id
          )
        )
      )
  );
$function$;

create or replace function public.can_accept_contract_assignment(
  target_assignment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.client_contract_assignments as assignment
    where assignment.id = target_assignment_id
      and assignment.status in ('assigned', 'notified', 'awaiting_acceptance')
      and assignment.acceptance_required = true
      and (
        (
          assignment.client_type = 'independent_doctor'
          and public.is_current_contract_doctor(assignment.doctor_id)
        )
        or (
          assignment.client_type = 'clinic_organization'
          and public.can_sign_clinic_organization_contract(
            assignment.clinic_organization_id
          )
        )
      )
  );
$function$;

create or replace function public.can_access_contract_package(
  target_package_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    public.is_admin()
    or exists (
      select 1
      from public.client_contract_assignments as assignment
      where assignment.package_id = target_package_id
        and public.can_access_contract_assignment(assignment.id)
    );
$function$;

create or replace function public.can_access_contract_document(
  target_document_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    public.is_admin()
    or exists (
      select 1
      from public.contract_package_documents as link
      join public.client_contract_assignments as assignment
        on assignment.package_id = link.package_id
      where link.document_id = target_document_id
        and public.can_access_contract_assignment(assignment.id)
    );
$function$;

create or replace function public.can_access_contract_acceptance(
  target_acceptance_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.contract_acceptances as acceptance
    where acceptance.id = target_acceptance_id
      and public.can_access_contract_assignment(acceptance.assignment_id)
  );
$function$;

create or replace function public.can_read_accepted_contract_storage_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $function$
  select exists (
    select 1
    from public.contract_acceptance_artifacts as artifact
    join public.contract_acceptances as acceptance
      on acceptance.id = artifact.acceptance_id
    where artifact.storage_bucket = 'accepted-contracts'
      and artifact.storage_path = object_name
      and artifact.status = 'ready'
      and public.can_access_contract_assignment(acceptance.assignment_id)
  );
$function$;

revoke all on function public.is_current_contract_doctor(uuid) from public;
revoke all on function public.can_sign_clinic_organization_contract(uuid) from public;
revoke all on function public.can_access_contract_assignment(uuid) from public;
revoke all on function public.can_accept_contract_assignment(uuid) from public;
revoke all on function public.can_access_contract_package(uuid) from public;
revoke all on function public.can_access_contract_document(uuid) from public;
revoke all on function public.can_access_contract_acceptance(uuid) from public;
revoke all on function public.can_read_accepted_contract_storage_object(text) from public;

grant execute on function public.is_current_contract_doctor(uuid)
  to authenticated, service_role;
grant execute on function public.can_sign_clinic_organization_contract(uuid)
  to authenticated, service_role;
grant execute on function public.can_access_contract_assignment(uuid)
  to authenticated, service_role;
grant execute on function public.can_accept_contract_assignment(uuid)
  to authenticated, service_role;
grant execute on function public.can_access_contract_package(uuid)
  to authenticated, service_role;
grant execute on function public.can_access_contract_document(uuid)
  to authenticated, service_role;
grant execute on function public.can_access_contract_acceptance(uuid)
  to authenticated, service_role;
grant execute on function public.can_read_accepted_contract_storage_object(text)
  to authenticated, service_role;

-- =====================================================
-- 17. TABLE RLS
-- =====================================================

alter table public.contract_documents enable row level security;
alter table public.contract_packages enable row level security;
alter table public.contract_package_documents enable row level security;
alter table public.client_contract_assignments enable row level security;
alter table public.contract_acceptances enable row level security;
alter table public.contract_acceptance_artifacts enable row level security;
alter table public.contract_events enable row level security;

-- Safe re-run cleanup.
drop policy if exists "Contract clients can read assigned published documents"
  on public.contract_documents;
drop policy if exists "Contract clients can read assigned published packages"
  on public.contract_packages;
drop policy if exists "Contract clients can read assigned package composition"
  on public.contract_package_documents;
drop policy if exists "Contract clients can read own assignments"
  on public.client_contract_assignments;
drop policy if exists "Contract clients can read own acceptances"
  on public.contract_acceptances;
drop policy if exists "Contract clients can read own PDF artifact metadata"
  on public.contract_acceptance_artifacts;
drop policy if exists "Contract clients can read own contract events"
  on public.contract_events;

create policy "Contract clients can read assigned published documents"
on public.contract_documents
for select
to authenticated
using (
  status = 'published'
  and public.can_access_contract_document(id)
);

create policy "Contract clients can read assigned published packages"
on public.contract_packages
for select
to authenticated
using (
  status = 'published'
  and public.can_access_contract_package(id)
);

create policy "Contract clients can read assigned package composition"
on public.contract_package_documents
for select
to authenticated
using (
  public.can_access_contract_package(package_id)
);

create policy "Contract clients can read own assignments"
on public.client_contract_assignments
for select
to authenticated
using (
  public.can_access_contract_assignment(id)
);

create policy "Contract clients can read own acceptances"
on public.contract_acceptances
for select
to authenticated
using (
  public.can_access_contract_assignment(assignment_id)
);

create policy "Contract clients can read own PDF artifact metadata"
on public.contract_acceptance_artifacts
for select
to authenticated
using (
  public.can_access_contract_acceptance(acceptance_id)
);

create policy "Contract clients can read own contract events"
on public.contract_events
for select
to authenticated
using (
  public.can_access_contract_assignment(assignment_id)
);

-- Browser clients receive read-only table privileges. All writes remain server-side.
revoke all on table public.contract_documents
  from public, anon, authenticated;
revoke all on table public.contract_packages
  from public, anon, authenticated;
revoke all on table public.contract_package_documents
  from public, anon, authenticated;
revoke all on table public.client_contract_assignments
  from public, anon, authenticated;
revoke all on table public.contract_acceptances
  from public, anon, authenticated;
revoke all on table public.contract_acceptance_artifacts
  from public, anon, authenticated;
revoke all on table public.contract_events
  from public, anon, authenticated;

grant select on table public.contract_documents to authenticated;
grant select on table public.contract_packages to authenticated;
grant select on table public.contract_package_documents to authenticated;
grant select on table public.client_contract_assignments to authenticated;
grant select on table public.contract_acceptances to authenticated;
grant select on table public.contract_acceptance_artifacts to authenticated;
grant select on table public.contract_events to authenticated;

-- Explicit server-side privileges. Immutable triggers still protect published
-- documents, published packages, acceptance evidence and append-only events.
grant select, insert, update, delete on table public.contract_documents to service_role;
grant select, insert, update, delete on table public.contract_packages to service_role;
grant select, insert, update, delete on table public.contract_package_documents to service_role;
grant select, insert, update, delete on table public.client_contract_assignments to service_role;
grant select, insert, update, delete on table public.contract_acceptances to service_role;
grant select, insert, update, delete on table public.contract_acceptance_artifacts to service_role;
grant select, insert, update, delete on table public.contract_events to service_role;

-- =====================================================
-- 18. STORAGE RLS
-- =====================================================

drop policy if exists "Contract clients can read accepted contract PDFs"
  on storage.objects;

create policy "Contract clients can read accepted contract PDFs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'accepted-contracts'
  and public.can_read_accepted_contract_storage_object(name)
);

-- No authenticated INSERT, UPDATE or DELETE policy is created for this bucket.
-- Later validated server routes will generate and upload PDFs with service role.

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
where id = 'accepted-contracts';

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'contract_documents',
    'contract_packages',
    'contract_package_documents',
    'client_contract_assignments',
    'contract_acceptances',
    'contract_acceptance_artifacts',
    'contract_events'
  )
order by table_name;

select
  column_name,
  data_type,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clinic_organization_members'
  and column_name = 'can_sign_contracts';

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where (
  schemaname = 'public'
  and tablename in (
    'contract_documents',
    'contract_packages',
    'contract_package_documents',
    'client_contract_assignments',
    'contract_acceptances',
    'contract_acceptance_artifacts',
    'contract_events'
  )
)
or (
  schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'Contract clients can read accepted contract PDFs'
)
order by schemaname, tablename, policyname;

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'contract_documents',
    'contract_packages',
    'contract_package_documents',
    'client_contract_assignments',
    'contract_acceptances',
    'contract_acceptance_artifacts',
    'contract_events'
  )
order by event_object_table, trigger_name, event_manipulation;

-- Confirm that no contract trigger was attached to operational billing terms.
select
  trigger_name
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table = 'client_billing_terms'
  and trigger_name ilike '%contract%';
-- Expected result: zero rows.
