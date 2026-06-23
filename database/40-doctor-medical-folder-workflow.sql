-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 63B: Doctor upload and medical-note workflow
--
-- File:
-- ROMDOC/database/40-doctor-medical-folder-workflow.sql
--
-- Requires:
--   39-patient-medical-folder-foundation.sql
--
-- Adds:
--   - text-only medical note support
--   - document audit events
--   - stricter document consistency checks
-- =====================================================

begin;

alter table public.patient_medical_documents
  add column if not exists content_text text,
  add column if not exists content_format text
    default 'file';

alter table public.patient_medical_documents
  drop constraint if exists
    patient_medical_documents_content_format_check;

alter table public.patient_medical_documents
  add constraint
    patient_medical_documents_content_format_check
  check (
    content_format in (
      'file',
      'text'
    )
  );

alter table public.patient_medical_documents
  drop constraint if exists
    patient_medical_documents_content_text_check;

alter table public.patient_medical_documents
  add constraint
    patient_medical_documents_content_text_check
  check (
    content_text is null
    or char_length(trim(content_text))
      between 1 and 20000
  );

alter table public.patient_medical_documents
  drop constraint if exists
    patient_medical_documents_content_consistency_check;

alter table public.patient_medical_documents
  add constraint
    patient_medical_documents_content_consistency_check
  check (
    (
      content_format = 'file'
      and content_text is null
      and nullif(trim(storage_path), '') is not null
      and nullif(trim(original_file_name), '') is not null
      and mime_type in (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
      and file_size_bytes > 0
    )
    or
    (
      content_format = 'text'
      and document_type = 'consultation_note'
      and nullif(trim(content_text), '') is not null
      and storage_path = ''
      and original_file_name = ''
      and mime_type = 'text/plain'
      and file_size_bytes = 0
    )
  )
  not valid;

-- Existing rows are file records.
update public.patient_medical_documents
set content_format = 'file'
where content_format is null;

alter table public.patient_medical_documents
  validate constraint
    patient_medical_documents_content_consistency_check;

-- Existing file-only constraints must allow text notes.
alter table public.patient_medical_documents
  drop constraint if exists
    patient_medical_documents_path_check;

alter table public.patient_medical_documents
  add constraint
    patient_medical_documents_path_check
  check (
    content_format = 'text'
    or nullif(trim(storage_path), '') is not null
  );

alter table public.patient_medical_documents
  drop constraint if exists
    patient_medical_documents_file_name_check;

alter table public.patient_medical_documents
  add constraint
    patient_medical_documents_file_name_check
  check (
    content_format = 'text'
    or char_length(trim(original_file_name))
      between 1 and 255
  );

alter table public.patient_medical_documents
  drop constraint if exists
    patient_medical_documents_mime_check;

alter table public.patient_medical_documents
  add constraint
    patient_medical_documents_mime_check
  check (
    (
      content_format = 'file'
      and mime_type in (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
    )
    or
    (
      content_format = 'text'
      and mime_type = 'text/plain'
    )
  );

alter table public.patient_medical_documents
  drop constraint if exists
    patient_medical_documents_size_check;

alter table public.patient_medical_documents
  add constraint
    patient_medical_documents_size_check
  check (
    (
      content_format = 'file'
      and file_size_bytes > 0
      and file_size_bytes <= 20971520
    )
    or
    (
      content_format = 'text'
      and file_size_bytes = 0
    )
  );

-- Allow empty storage path only for text notes.
alter table public.patient_medical_documents
  drop constraint if exists
    patient_medical_documents_storage_bucket_storage_path_key;

create unique index if not exists
  idx_patient_medical_documents_unique_storage_object
on public.patient_medical_documents (
  storage_bucket,
  storage_path
)
where content_format = 'file';

comment on column
  public.patient_medical_documents.content_text
is
  'Text-only consultation note content. Never used for uploaded files.';

comment on column
  public.patient_medical_documents.content_format
is
  'Either file for Storage-backed documents or text for consultation notes.';

-- =====================================================
-- DOCUMENT AUDIT EVENTS
-- =====================================================

create table if not exists
  public.patient_medical_document_events (
    id uuid primary key default gen_random_uuid(),

    document_id uuid not null
      references public.patient_medical_documents(id)
      on update cascade
      on delete restrict,

    patient_profile_id uuid not null
      references public.profiles(id)
      on update cascade
      on delete restrict,

    appointment_id uuid
      references public.appointments(id)
      on update cascade
      on delete set null,

    event_type text not null
      check (
        event_type in (
          'created',
          'soft_deleted'
        )
      ),

    actor_profile_id uuid not null
      references public.profiles(id)
      on update cascade
      on delete restrict,

    actor_role text not null
      check (
        actor_role in (
          'doctor',
          'admin'
        )
      ),

    metadata jsonb not null
      default '{}'::jsonb,

    created_at timestamptz not null
      default now()
  );

create index if not exists
  idx_patient_medical_document_events_document
on public.patient_medical_document_events (
  document_id,
  created_at asc
);

create index if not exists
  idx_patient_medical_document_events_patient
on public.patient_medical_document_events (
  patient_profile_id,
  created_at desc
);

create or replace function
  public.record_patient_medical_document_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role_value text;
begin
  select role
  into actor_role_value
  from public.profiles
  where id = auth.uid();

  if tg_op = 'INSERT' then
    insert into
      public.patient_medical_document_events (
        document_id,
        patient_profile_id,
        appointment_id,
        event_type,
        actor_profile_id,
        actor_role,
        metadata
      )
    values (
      new.id,
      new.patient_profile_id,
      new.appointment_id,
      'created',
      new.uploaded_by_profile_id,
      coalesce(actor_role_value, 'doctor'),
      jsonb_build_object(
        'document_type',
        new.document_type,
        'content_format',
        new.content_format,
        'mime_type',
        new.mime_type,
        'file_size_bytes',
        new.file_size_bytes
      )
    );

    return new;
  end if;

  if old.deleted_at is null
    and new.deleted_at is not null
  then
    insert into
      public.patient_medical_document_events (
        document_id,
        patient_profile_id,
        appointment_id,
        event_type,
        actor_profile_id,
        actor_role,
        metadata
      )
    values (
      new.id,
      new.patient_profile_id,
      new.appointment_id,
      'soft_deleted',
      new.deleted_by_profile_id,
      coalesce(actor_role_value, 'doctor'),
      '{}'::jsonb
    );
  end if;

  return new;
end;
$$;

drop trigger if exists
  record_patient_medical_document_event_trigger
on public.patient_medical_documents;

create trigger
  record_patient_medical_document_event_trigger
after insert or update of deleted_at
on public.patient_medical_documents
for each row
execute function
  public.record_patient_medical_document_event();

create or replace function
  public.prevent_patient_medical_document_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception
    'patient_medical_document_events_are_immutable'
    using errcode = '55000';
end;
$$;

drop trigger if exists
  prevent_patient_medical_document_event_update
on public.patient_medical_document_events;

create trigger
  prevent_patient_medical_document_event_update
before update
on public.patient_medical_document_events
for each row
execute function
  public.prevent_patient_medical_document_event_mutation();

drop trigger if exists
  prevent_patient_medical_document_event_delete
on public.patient_medical_document_events;

create trigger
  prevent_patient_medical_document_event_delete
before delete
on public.patient_medical_document_events
for each row
execute function
  public.prevent_patient_medical_document_event_mutation();

alter table public.patient_medical_document_events
  enable row level security;

create policy
  "Patients can read own medical document events"
on public.patient_medical_document_events
for select
to authenticated
using (
  patient_profile_id = auth.uid()
  and public.is_active_patient_profile(
    auth.uid()
  )
);

create policy
  "Doctors can read accessible medical document events"
on public.patient_medical_document_events
for select
to authenticated
using (
  public.doctor_can_access_patient_folder(
    patient_profile_id
  )
);

create policy
  "Admins can read medical document events"
on public.patient_medical_document_events
for select
to authenticated
using (
  public.is_admin()
);

revoke all
on table public.patient_medical_document_events
from public, anon, authenticated;

grant select
on table public.patient_medical_document_events
to authenticated;

commit;
