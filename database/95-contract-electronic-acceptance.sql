-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Phase 5C — Electronic contract acceptance
--
-- Target project path:
-- ROMDOC/database/95-contract-electronic-acceptance.sql
--
-- Adds:
--   1. Independent-Doctor-only contract eligibility at database level.
--   2. Exact HTML document snapshots inside immutable acceptance evidence.
--   3. One atomic RPC for acceptance + assignment status + PDF artifact row.
--   4. Idempotent confirmation-email delivery claiming and audit events.
--
-- Important billing decision:
--   This migration does NOT update public.client_billing_terms.
--   Admin's existing manual client-price editor remains authoritative.
-- =====================================================

begin;

create extension if not exists pgcrypto;

-- =====================================================
-- 1. INDEPENDENT-DOCTOR-ONLY CONTRACT ACCESS
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
      and doctor.account_type = 'independent'
      and profile.role = 'doctor'
      and profile.account_status = 'active'
  );
$function$;

revoke all on function public.is_current_contract_doctor(uuid) from public;
grant execute on function public.is_current_contract_doctor(uuid)
  to authenticated, service_role;

-- =====================================================
-- 2. EXACT ACCEPTANCE DOCUMENT SNAPSHOTS
-- =====================================================
-- Phase 5A stored the immutable document identifiers and hashes.
-- Phase 5C also snapshots the exact published HTML used at acceptance time.

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

  if selected_assignment.status not in (
    'assigned',
    'notified',
    'awaiting_acceptance'
  ) then
    raise exception 'This contract assignment is not available for acceptance.';
  end if;

  if selected_assignment.acceptance_required is not true then
    raise exception 'This contract assignment does not require electronic acceptance.';
  end if;

  if selected_assignment.payment_deadline_days <> 30 then
    raise exception 'RomDoc professional contracts require a 30-calendar-day payment deadline.';
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
        and doctor.account_type = 'independent'
        and profile.role = 'doctor'
        and profile.account_status = 'active'
    ) then
      raise exception 'Only the active independent Doctor account may accept this Doctor contract.';
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
      'contentHtml', document.content_html,
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

  if generated_manifest is null
    or jsonb_array_length(generated_manifest) = 0
  then
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

-- =====================================================
-- 3. ATOMIC ELECTRONIC ACCEPTANCE RPC
-- =====================================================

create or replace function public.accept_contract_assignment_electronically(
  target_assignment_id uuid,
  target_accepted_by_profile_id uuid,
  target_represented_entity_name text,
  target_representative_name text,
  target_representative_capacity text,
  target_represented_entity_snapshot jsonb,
  target_checkbox_text text,
  target_ip_address inet default null,
  target_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_assignment public.client_contract_assignments%rowtype;
  selected_package public.contract_packages%rowtype;
  existing_acceptance public.contract_acceptances%rowtype;
  created_acceptance_id uuid;
  artifact_path text;
  artifact_file_name text;
begin
  select *
  into selected_assignment
  from public.client_contract_assignments
  where id = target_assignment_id
  for update;

  if not found then
    raise exception 'Contract assignment not found.';
  end if;

  select *
  into existing_acceptance
  from public.contract_acceptances
  where assignment_id = target_assignment_id;

  if found then
    if existing_acceptance.accepted_by_profile_id
      <> target_accepted_by_profile_id
    then
      raise exception 'This contract assignment was already accepted by another authorised account.';
    end if;

    return existing_acceptance.id;
  end if;

  if selected_assignment.status not in (
    'assigned',
    'notified',
    'awaiting_acceptance'
  ) then
    raise exception 'This contract assignment is not available for acceptance.';
  end if;

  if selected_assignment.acceptance_required is not true then
    raise exception 'This contract assignment does not require electronic acceptance.';
  end if;

  if selected_assignment.payment_deadline_days <> 30 then
    raise exception 'RomDoc professional contracts require a 30-calendar-day payment deadline.';
  end if;

  select *
  into selected_package
  from public.contract_packages
  where id = selected_assignment.package_id;

  if not found or selected_package.status <> 'published' then
    raise exception 'The assigned contract package is not published.';
  end if;

  insert into public.contract_acceptances (
    assignment_id,
    accepted_by_profile_id,
    represented_entity_name,
    representative_name,
    representative_capacity,
    represented_entity_snapshot,
    accepted_locale,
    checkbox_text,
    package_version,
    package_manifest_hash,
    document_manifest,
    commercial_terms_snapshot,
    commercial_terms_hash,
    payment_deadline_days,
    ip_address,
    user_agent
  )
  values (
    selected_assignment.id,
    target_accepted_by_profile_id,
    trim(target_represented_entity_name),
    trim(target_representative_name),
    trim(target_representative_capacity),
    coalesce(target_represented_entity_snapshot, '{}'::jsonb),
    selected_package.locale,
    trim(target_checkbox_text),
    selected_package.version,
    selected_package.manifest_hash,
    '[]'::jsonb,
    selected_assignment.commercial_terms,
    selected_assignment.commercial_terms_hash,
    selected_assignment.payment_deadline_days,
    target_ip_address,
    nullif(left(trim(coalesce(target_user_agent, '')), 2000), '')
  )
  returning id into created_acceptance_id;

  update public.client_contract_assignments
  set
    status = 'accepted',
    notified_at = coalesce(notified_at, now()),
    updated_by_profile_id = target_accepted_by_profile_id
  where id = selected_assignment.id;

  if selected_assignment.client_type = 'independent_doctor' then
    artifact_path := concat(
      'doctors/',
      selected_assignment.doctor_id::text,
      '/',
      created_acceptance_id::text,
      '/RomDoc-contract-',
      created_acceptance_id::text,
      '.pdf'
    );
  else
    artifact_path := concat(
      'organizations/',
      selected_assignment.clinic_organization_id::text,
      '/',
      created_acceptance_id::text,
      '/RomDoc-contract-',
      created_acceptance_id::text,
      '.pdf'
    );
  end if;

  artifact_file_name := concat(
    'RomDoc-contract-',
    selected_package.version,
    '-',
    to_char(current_date, 'YYYY-MM-DD'),
    '.pdf'
  );

  insert into public.contract_acceptance_artifacts (
    acceptance_id,
    status,
    storage_bucket,
    storage_path,
    file_name,
    mime_type
  )
  values (
    created_acceptance_id,
    'pending',
    'accepted-contracts',
    artifact_path,
    artifact_file_name,
    'application/pdf'
  )
  on conflict (acceptance_id) do nothing;

  return created_acceptance_id;
end;
$function$;

revoke all on function public.accept_contract_assignment_electronically(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  inet,
  text
) from public, anon, authenticated;

grant execute on function public.accept_contract_assignment_electronically(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  inet,
  text
) to service_role;

comment on function public.accept_contract_assignment_electronically(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  inet,
  text
) is
  'Atomically creates immutable acceptance evidence, marks the assignment accepted and creates the pending private PDF artifact row. Service-role only.';

-- =====================================================
-- 4. IDEMPOTENT CONFIRMATION-EMAIL DELIVERY
-- =====================================================

create table if not exists public.contract_confirmation_email_deliveries (
  id uuid primary key default gen_random_uuid(),

  acceptance_id uuid not null
    references public.contract_acceptances(id)
    on update cascade
    on delete restrict,

  notification_type text not null default 'acceptance_confirmation',
  recipient_email text not null,
  status text not null default 'pending',
  attempt_count smallint not null default 1,

  provider_message_id text,
  last_error text,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contract_confirmation_email_type_check
    check (notification_type = 'acceptance_confirmation'),

  constraint contract_confirmation_email_recipient_check
    check (
      char_length(trim(recipient_email)) between 3 and 320
      and position('@' in recipient_email) > 1
    ),

  constraint contract_confirmation_email_status_check
    check (status in ('pending', 'sent', 'failed')),

  constraint contract_confirmation_email_attempt_check
    check (attempt_count between 1 and 100),

  constraint contract_confirmation_email_error_check
    check (
      last_error is null
      or char_length(trim(last_error)) between 1 and 2000
    ),

  constraint contract_confirmation_email_state_check
    check (
      (
        status = 'pending'
        and provider_message_id is null
        and sent_at is null
        and last_error is null
      )
      or
      (
        status = 'sent'
        and provider_message_id is not null
        and sent_at is not null
        and last_error is null
      )
      or
      (
        status = 'failed'
        and provider_message_id is null
        and sent_at is null
        and last_error is not null
      )
    ),

  unique (acceptance_id, notification_type)
);

comment on table public.contract_confirmation_email_deliveries is
  'Idempotent delivery state for the electronic contract acceptance confirmation email. No email body is stored.';

create index if not exists idx_contract_confirmation_email_status
  on public.contract_confirmation_email_deliveries(status, claimed_at);

alter table public.contract_confirmation_email_deliveries
  enable row level security;

revoke all on table public.contract_confirmation_email_deliveries
  from public, anon, authenticated;

grant select, insert, update
  on table public.contract_confirmation_email_deliveries
  to service_role;

create or replace function public.claim_contract_confirmation_email_delivery(
  target_acceptance_id uuid,
  target_recipient_email text
)
returns table (
  delivery_id uuid,
  should_send boolean
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  inserted_id uuid;
  selected_delivery public.contract_confirmation_email_deliveries%rowtype;
begin
  if not exists (
    select 1
    from public.contract_acceptances
    where id = target_acceptance_id
  ) then
    raise exception 'Contract acceptance not found.';
  end if;

  insert into public.contract_confirmation_email_deliveries (
    acceptance_id,
    recipient_email
  )
  values (
    target_acceptance_id,
    lower(trim(target_recipient_email))
  )
  on conflict (acceptance_id, notification_type) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    return query
    select inserted_id, true;
    return;
  end if;

  select *
  into selected_delivery
  from public.contract_confirmation_email_deliveries
  where acceptance_id = target_acceptance_id
    and notification_type = 'acceptance_confirmation'
  for update;

  if selected_delivery.status = 'sent' then
    return query
    select selected_delivery.id, false;
    return;
  end if;

  if selected_delivery.status = 'pending'
    and selected_delivery.claimed_at > now() - interval '10 minutes'
  then
    return query
    select selected_delivery.id, false;
    return;
  end if;

  update public.contract_confirmation_email_deliveries
  set
    recipient_email = lower(trim(target_recipient_email)),
    status = 'pending',
    attempt_count = least(attempt_count + 1, 100),
    provider_message_id = null,
    last_error = null,
    claimed_at = now(),
    sent_at = null,
    updated_at = now()
  where id = selected_delivery.id;

  return query
  select selected_delivery.id, true;
end;
$function$;

revoke all on function public.claim_contract_confirmation_email_delivery(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_contract_confirmation_email_delivery(uuid, text)
  to service_role;

create or replace function public.complete_contract_confirmation_email_delivery(
  target_delivery_id uuid,
  target_sent boolean,
  target_provider_message_id text default null,
  target_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_delivery public.contract_confirmation_email_deliveries%rowtype;
  selected_assignment_id uuid;
begin
  select *
  into selected_delivery
  from public.contract_confirmation_email_deliveries
  where id = target_delivery_id
  for update;

  if not found then
    raise exception 'Contract confirmation email delivery not found.';
  end if;

  if selected_delivery.status = 'sent' then
    return;
  end if;

  if target_sent then
    if nullif(trim(coalesce(target_provider_message_id, '')), '') is null then
      raise exception 'A provider message id is required for a sent email.';
    end if;

    update public.contract_confirmation_email_deliveries
    set
      status = 'sent',
      provider_message_id = left(trim(target_provider_message_id), 500),
      last_error = null,
      sent_at = now(),
      updated_at = now()
    where id = selected_delivery.id;
  else
    update public.contract_confirmation_email_deliveries
    set
      status = 'failed',
      provider_message_id = null,
      last_error = left(
        trim(coalesce(target_error, 'Unknown confirmation email error.')),
        2000
      ),
      sent_at = null,
      updated_at = now()
    where id = selected_delivery.id;
  end if;

  select acceptance.assignment_id
  into selected_assignment_id
  from public.contract_acceptances as acceptance
  where acceptance.id = selected_delivery.acceptance_id;

  insert into public.contract_events (
    assignment_id,
    acceptance_id,
    event_type,
    event_data
  )
  values (
    selected_assignment_id,
    selected_delivery.acceptance_id,
    case
      when target_sent then 'confirmation_email_sent'
      else 'confirmation_email_failed'
    end,
    jsonb_build_object(
      'deliveryId', selected_delivery.id,
      'recipientEmail', selected_delivery.recipient_email,
      'providerMessageId', case
        when target_sent then left(trim(target_provider_message_id), 500)
        else null
      end,
      'attemptCount', selected_delivery.attempt_count,
      'error', case
        when target_sent then null
        else left(
          trim(coalesce(target_error, 'Unknown confirmation email error.')),
          2000
        )
      end
    )
  );
end;
$function$;

revoke all on function public.complete_contract_confirmation_email_delivery(
  uuid,
  boolean,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.complete_contract_confirmation_email_delivery(
  uuid,
  boolean,
  text,
  text
) to service_role;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'accept_contract_assignment_electronically',
    'claim_contract_confirmation_email_delivery',
    'complete_contract_confirmation_email_delivery'
  )
order by routine_name;

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'contract_confirmation_email_deliveries'
order by ordinal_position;

-- Expected: zero contract-related triggers on the manual operational pricing table.
select
  trigger_name,
  event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'client_billing_terms'
  and trigger_name ilike '%contract%';
