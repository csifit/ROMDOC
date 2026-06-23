-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 63E: PDF generation audit and Storage cleanup
--
-- File:
-- ROMDOC/database/42-medical-note-pdf-cleanup.sql
--
-- Requires:
--   39-patient-medical-folder-foundation.sql
--   40-doctor-medical-folder-workflow.sql
--   41-medical-document-sharing-audit.sql
-- =====================================================

begin;

alter table public.patient_medical_documents
  add column if not exists storage_removed_at timestamptz,
  add column if not exists storage_removal_error text,
  add column if not exists storage_cleanup_attempted_at timestamptz;

alter table public.patient_medical_documents
  drop constraint if exists
    patient_medical_documents_storage_removal_error_check;

alter table public.patient_medical_documents
  add constraint
    patient_medical_documents_storage_removal_error_check
  check (
    storage_removal_error is null
    or char_length(storage_removal_error) <= 2000
  );

comment on column
  public.patient_medical_documents.storage_removed_at
is
  'Timestamp when a soft-deleted Storage-backed file was physically removed.';

comment on column
  public.patient_medical_documents.storage_removal_error
is
  'Last physical Storage cleanup error. Soft-deleted metadata remains authoritative.';

create index if not exists
  idx_patient_medical_documents_storage_cleanup
on public.patient_medical_documents (
  storage_cleanup_attempted_at,
  deleted_at
)
where content_format = 'file'
  and deleted_at is not null
  and storage_removed_at is null;

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
      'downloaded',
      'pdf_generated',
      'storage_removed',
      'storage_cleanup_failed'
    )
  );

alter table public.patient_medical_document_events
  alter column actor_profile_id drop not null;

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
      'admin',
      'system'
    )
  );

alter table public.patient_medical_document_events
  drop constraint if exists
    patient_medical_document_events_system_actor_check;

alter table public.patient_medical_document_events
  add constraint
    patient_medical_document_events_system_actor_check
  check (
    (
      actor_role = 'system'
      and actor_profile_id is null
    )
    or
    (
      actor_role <> 'system'
      and actor_profile_id is not null
    )
  );

commit;
