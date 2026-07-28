-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Phase 5D — Admin contract templates, assignments,
-- unilateral amendments and manual price follow-up
--
-- Target project path:
-- ROMDOC/database/96-contract-admin-management.sql
--
-- Important account-access rule:
--   This migration never blocks, suspends, bans, hides or deletes an account.
--   Payment and contract statuses remain informational/contractual only.
--
-- Important billing rule:
--   This migration never writes to public.client_billing_terms.
--   Admin's existing manual client-price editor remains authoritative.
-- =====================================================

begin;

create extension if not exists pgcrypto;

-- =====================================================
-- 1. IDEMPOTENT CONTRACT-ASSIGNMENT EMAIL DELIVERY
-- =====================================================

create table if not exists public.contract_assignment_email_deliveries (
  id uuid primary key default gen_random_uuid(),

  assignment_id uuid not null
    references public.client_contract_assignments(id)
    on update cascade
    on delete restrict,

  recipient_profile_id uuid
    references public.profiles(id)
    on update cascade
    on delete set null,

  recipient_email text not null,
  locale text not null default 'ro',

  status text not null default 'pending',
  attempt_count smallint not null default 1,

  provider_message_id text,
  last_error text,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contract_assignment_email_recipient_check
    check (
      char_length(trim(recipient_email)) between 3 and 320
      and position('@' in recipient_email) > 1
    ),

  constraint contract_assignment_email_locale_check
    check (locale in ('ro', 'en', 'de')),

  constraint contract_assignment_email_status_check
    check (status in ('pending', 'sent', 'failed')),

  constraint contract_assignment_email_attempt_check
    check (attempt_count between 1 and 100),

  constraint contract_assignment_email_error_check
    check (
      last_error is null
      or char_length(trim(last_error)) between 1 and 2000
    ),

  constraint contract_assignment_email_state_check
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

  unique (assignment_id, recipient_email)
);

comment on table public.contract_assignment_email_deliveries is
  'Idempotent notification-delivery state for a newly assigned contract or amendment. No email body is stored.';

create index if not exists idx_contract_assignment_email_status
  on public.contract_assignment_email_deliveries(status, claimed_at);

alter table public.contract_assignment_email_deliveries
  enable row level security;

revoke all on table public.contract_assignment_email_deliveries
  from public, anon, authenticated;

grant select, insert, update
  on table public.contract_assignment_email_deliveries
  to service_role;

create or replace function public.protect_contract_assignment_email_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'Contract assignment email delivery records cannot be deleted.';
  end if;

  if old.status = 'sent' then
    raise exception 'A sent contract assignment email delivery is immutable.';
  end if;

  if new.id <> old.id
    or new.assignment_id <> old.assignment_id
    or new.recipient_email <> old.recipient_email
    or new.created_at <> old.created_at
  then
    raise exception 'Contract assignment email delivery identity cannot be changed.';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.protect_contract_assignment_email_delivery()
  from public;

drop trigger if exists protect_contract_assignment_email_update
  on public.contract_assignment_email_deliveries;

create trigger protect_contract_assignment_email_update
before update on public.contract_assignment_email_deliveries
for each row execute function public.protect_contract_assignment_email_delivery();

drop trigger if exists protect_contract_assignment_email_delete
  on public.contract_assignment_email_deliveries;

create trigger protect_contract_assignment_email_delete
before delete on public.contract_assignment_email_deliveries
for each row execute function public.protect_contract_assignment_email_delivery();

-- =====================================================
-- 2. ADMIN AND COMMERCIAL-TERM HELPERS
-- =====================================================

create or replace function public.is_active_contract_admin(
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.profiles
    where id = target_profile_id
      and role = 'admin'
      and account_status = 'active'
  );
$function$;

revoke all on function public.is_active_contract_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.is_active_contract_admin(uuid)
  to service_role;

create or replace function public.contract_terms_have_price_values(
  target_terms jsonb
)
returns boolean
language sql
immutable
security definer
set search_path = public
as $function$
  select
    jsonb_typeof(coalesce(target_terms, '{}'::jsonb)) = 'object'
    and coalesce(target_terms, '{}'::jsonb) ?| array[
      'subscriptionUnitPrice',
      'smsUnitPrice',
      'vatRate',
      'subscription_unit_price',
      'sms_unit_price',
      'vat_rate'
    ];
$function$;

revoke all on function public.contract_terms_have_price_values(jsonb)
  from public, anon, authenticated;
grant execute on function public.contract_terms_have_price_values(jsonb)
  to service_role;

-- =====================================================
-- 3. NOTICE-ONLY PACKAGE SAFETY
-- =====================================================

create or replace function public.validate_contract_package_acceptance_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.payment_deadline_days <> 30 then
    raise exception 'RomDoc professional contracts require a 30-calendar-day payment deadline.';
  end if;

  if new.status = 'published' and new.requires_acceptance = false then
    if new.supersedes_package_id is null then
      raise exception 'A notice-only package must supersede an existing published package.';
    end if;

    if not exists (
      select 1
      from public.contract_package_documents as link
      join public.contract_documents as document
        on document.id = link.document_id
      where link.package_id = new.id
        and document.unilateral_notice_allowed = true
    ) then
      raise exception 'A notice-only package must contain a document explicitly permitted for unilateral notice.';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.validate_contract_package_acceptance_mode()
  from public;

drop trigger if exists a_validate_contract_package_acceptance_mode
  on public.contract_packages;

create trigger a_validate_contract_package_acceptance_mode
before insert or update on public.contract_packages
for each row execute function public.validate_contract_package_acceptance_mode();

-- =====================================================
-- 4. ASSIGNMENT VALIDATION AND NOTICE-ONLY TRANSITIONS
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
  computed_terms_hash text;
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

  if new.client_type = 'independent_doctor' and not exists (
    select 1
    from public.doctors
    where id = new.doctor_id
      and account_type = 'independent'
  ) then
    raise exception 'Doctor contract packages may be assigned only to independent Doctor accounts.';
  end if;

  if new.acceptance_required is distinct from selected_package.requires_acceptance then
    raise exception 'Assignment acceptance mode must match the published package acceptance mode.';
  end if;

  if new.payment_deadline_days is null then
    new.payment_deadline_days := 30;
  end if;

  if new.payment_deadline_days <> 30 then
    raise exception 'RomDoc professional contracts require a 30-calendar-day payment deadline.';
  end if;

  if jsonb_typeof(coalesce(new.commercial_terms, '{}'::jsonb)) <> 'object' then
    raise exception 'Contractual commercial terms must be a JSON object.';
  end if;

  new.commercial_terms := coalesce(new.commercial_terms, '{}'::jsonb);
  computed_terms_hash := encode(
    digest(convert_to(new.commercial_terms::text, 'UTF8'), 'sha256'),
    'hex'
  );
  new.commercial_terms_hash := computed_terms_hash;

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
      raise exception 'Contractual terms cannot change after an assignment leaves assigned status. Create a new assignment instead.';
    end if;

    if old.status <> new.status then
      if not (
        (old.status = 'assigned' and new.status in ('notified', 'awaiting_acceptance', 'accepted', 'effective', 'cancelled'))
        or (old.status = 'notified' and new.status in ('awaiting_acceptance', 'accepted', 'effective', 'cancelled'))
        or (old.status = 'awaiting_acceptance' and new.status in ('accepted', 'cancelled'))
        or (old.status = 'accepted' and new.status in ('effective', 'superseded', 'terminated'))
        or (old.status = 'effective' and new.status in ('superseded', 'terminated'))
      ) then
        raise exception 'Invalid client contract assignment status transition: % -> %.', old.status, new.status;
      end if;

      if new.status = 'effective' and new.acceptance_required = true
        and old.status <> 'accepted'
      then
        raise exception 'An acceptance-required assignment may become effective only after acceptance.';
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

  if new.acceptance_required = false then
    if new.supersedes_assignment_id is null then
      raise exception 'A notice-only assignment must supersede an existing assignment.';
    end if;

    if previous_assignment.commercial_terms_hash <> computed_terms_hash then
      raise exception 'A notice-only amendment cannot change contractual commercial prices or billing terms.';
    end if;
  end if;

  if new.effective_at is null then
    new.effective_at := selected_package.effective_at;
  end if;

  if new.status = 'effective'
    and new.effective_at is not null
    and new.effective_at > now()
  then
    raise exception 'A notice-only assignment cannot be marked effective before its effective timestamp.';
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

revoke all on function public.prepare_client_contract_assignment()
  from public;

-- Existing trigger from migration 94 continues to call this replaced function.

-- =====================================================
-- 5. BATCH PACKAGE ASSIGNMENT
-- =====================================================

create or replace function public.admin_assign_contract_package_batch(
  target_admin_profile_id uuid,
  target_package_id uuid,
  target_client_ids uuid[],
  target_commercial_terms jsonb default '{}'::jsonb,
  target_keep_existing_terms boolean default false,
  target_effective_at timestamptz default null,
  target_internal_notes text default null
)
returns table (
  assignment_id uuid,
  client_id uuid
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_package public.contract_packages%rowtype;
  selected_client_id uuid;
  previous_assignment public.client_contract_assignments%rowtype;
  selected_terms jsonb;
  created_assignment_id uuid;
begin
  if not public.is_active_contract_admin(target_admin_profile_id) then
    raise exception 'Only an active RomDoc administrator may assign contract packages.';
  end if;

  if target_client_ids is null
    or cardinality(target_client_ids) = 0
    or cardinality(target_client_ids) > 500
  then
    raise exception 'Select between 1 and 500 contract clients.';
  end if;

  select *
  into selected_package
  from public.contract_packages
  where id = target_package_id;

  if not found or selected_package.status <> 'published' then
    raise exception 'Only a published contract package may be assigned.';
  end if;

  if selected_package.payment_deadline_days <> 30 then
    raise exception 'RomDoc professional contracts require a 30-calendar-day payment deadline.';
  end if;

  if jsonb_typeof(coalesce(target_commercial_terms, '{}'::jsonb)) <> 'object' then
    raise exception 'Contractual commercial terms must be a JSON object.';
  end if;

  for selected_client_id in
    select distinct value
    from unnest(target_client_ids) as value
  loop
    previous_assignment := null;

    if selected_package.contract_type = 'independent_doctor' then
      if not exists (
        select 1
        from public.doctors as doctor
        join public.profiles as profile
          on profile.id = doctor.profile_id
        where doctor.id = selected_client_id
          and doctor.account_type = 'independent'
          and doctor.status = 'active'
          and profile.role = 'doctor'
          and profile.account_status = 'active'
      ) then
        raise exception 'Independent Doctor client % is not eligible for a contract assignment.', selected_client_id;
      end if;

      if exists (
        select 1
        from public.client_contract_assignments
        where package_id = selected_package.id
          and doctor_id = selected_client_id
      ) then
        raise exception 'This package version was already assigned to Doctor %. Retry the existing notification or create a new package version.', selected_client_id;
      end if;

      select *
      into previous_assignment
      from public.client_contract_assignments
      where doctor_id = selected_client_id
        and status in ('assigned', 'notified', 'awaiting_acceptance', 'accepted', 'effective')
      order by assigned_at desc
      limit 1
      for update;
    else
      if not exists (
        select 1
        from public.clinic_organizations
        where id = selected_client_id
          and status = 'active'
      ) then
        raise exception 'Clinic Organisation client % is not active.', selected_client_id;
      end if;

      if exists (
        select 1
        from public.client_contract_assignments
        where package_id = selected_package.id
          and clinic_organization_id = selected_client_id
      ) then
        raise exception 'This package version was already assigned to Clinic Organisation %. Retry the existing notification or create a new package version.', selected_client_id;
      end if;

      select *
      into previous_assignment
      from public.client_contract_assignments
      where clinic_organization_id = selected_client_id
        and status in ('assigned', 'notified', 'awaiting_acceptance', 'accepted', 'effective')
      order by assigned_at desc
      limit 1
      for update;
    end if;

    if target_keep_existing_terms and previous_assignment.id is not null then
      selected_terms := previous_assignment.commercial_terms;
    else
      selected_terms := coalesce(target_commercial_terms, '{}'::jsonb);
    end if;

    if selected_package.requires_acceptance = false then
      if previous_assignment.id is null then
        raise exception 'A notice-only assignment requires an existing client contract.';
      end if;

      selected_terms := previous_assignment.commercial_terms;
    end if;

    if previous_assignment.id is not null
      and previous_assignment.status in ('assigned', 'notified', 'awaiting_acceptance')
    then
      update public.client_contract_assignments
      set
        status = 'cancelled',
        updated_by_profile_id = target_admin_profile_id
      where id = previous_assignment.id;

    end if;

    insert into public.client_contract_assignments (
      package_id,
      client_type,
      doctor_id,
      clinic_organization_id,
      status,
      acceptance_required,
      commercial_terms,
      payment_deadline_days,
      effective_at,
      supersedes_assignment_id,
      internal_notes,
      created_by_profile_id,
      updated_by_profile_id
    )
    values (
      selected_package.id,
      selected_package.contract_type,
      case
        when selected_package.contract_type = 'independent_doctor'
          then selected_client_id
        else null
      end,
      case
        when selected_package.contract_type = 'clinic_organization'
          then selected_client_id
        else null
      end,
      'assigned',
      selected_package.requires_acceptance,
      selected_terms,
      30,
      coalesce(target_effective_at, selected_package.effective_at),
      case
        when previous_assignment.id is not null
          and previous_assignment.status in ('accepted', 'effective')
          then previous_assignment.id
        else null
      end,
      nullif(left(trim(coalesce(target_internal_notes, '')), 5000), ''),
      target_admin_profile_id,
      target_admin_profile_id
    )
    returning id into created_assignment_id;


    assignment_id := created_assignment_id;
    client_id := selected_client_id;
    return next;
  end loop;
end;
$function$;

revoke all on function public.admin_assign_contract_package_batch(
  uuid,
  uuid,
  uuid[],
  jsonb,
  boolean,
  timestamptz,
  text
) from public, anon, authenticated;

grant execute on function public.admin_assign_contract_package_batch(
  uuid,
  uuid,
  uuid[],
  jsonb,
  boolean,
  timestamptz,
  text
) to service_role;

-- =====================================================
-- 6. ASSIGNMENT STATUS ACTIONS
-- =====================================================

create or replace function public.admin_mark_contract_assignment_notified(
  target_admin_profile_id uuid,
  target_assignment_id uuid,
  target_sent_recipient_count integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_assignment public.client_contract_assignments%rowtype;
begin
  if not public.is_active_contract_admin(target_admin_profile_id) then
    raise exception 'Only an active RomDoc administrator may mark contract notifications.';
  end if;

  if coalesce(target_sent_recipient_count, 0) < 1 then
    raise exception 'At least one contract notification must have been sent.';
  end if;

  select *
  into selected_assignment
  from public.client_contract_assignments
  where id = target_assignment_id
  for update;

  if not found then
    raise exception 'Contract assignment not found.';
  end if;

  if selected_assignment.status not in ('assigned', 'notified', 'awaiting_acceptance') then
    return;
  end if;

  update public.client_contract_assignments
  set
    status = case
      when acceptance_required then 'awaiting_acceptance'
      else 'notified'
    end,
    notified_at = coalesce(notified_at, now()),
    updated_by_profile_id = target_admin_profile_id
  where id = selected_assignment.id;

  if not exists (
    select 1
    from public.contract_events
    where assignment_id = selected_assignment.id
      and event_type = 'notified'
  ) then
    insert into public.contract_events (
      assignment_id,
      event_type,
      actor_profile_id,
      event_data
    )
    values (
      selected_assignment.id,
      'notified',
      target_admin_profile_id,
      jsonb_build_object(
        'sentRecipientCount', target_sent_recipient_count
      )
    );
  end if;
end;
$function$;

revoke all on function public.admin_mark_contract_assignment_notified(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.admin_mark_contract_assignment_notified(uuid, uuid, integer)
  to service_role;

create or replace function public.admin_mark_notice_contract_effective(
  target_admin_profile_id uuid,
  target_assignment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_assignment public.client_contract_assignments%rowtype;
  previous_assignment public.client_contract_assignments%rowtype;
begin
  if not public.is_active_contract_admin(target_admin_profile_id) then
    raise exception 'Only an active RomDoc administrator may activate a notice-only amendment.';
  end if;

  select *
  into selected_assignment
  from public.client_contract_assignments
  where id = target_assignment_id
  for update;

  if not found then
    raise exception 'Contract assignment not found.';
  end if;

  if selected_assignment.acceptance_required then
    raise exception 'Acceptance-required assignments cannot use the notice-only activation action.';
  end if;

  if selected_assignment.status not in ('assigned', 'notified') then
    raise exception 'Only an assigned or notified notice-only amendment may become effective.';
  end if;

  if selected_assignment.notified_at is null
    or not exists (
      select 1
      from public.contract_assignment_email_deliveries as delivery
      where delivery.assignment_id = selected_assignment.id
        and delivery.status = 'sent'
    )
  then
    raise exception 'The notice-only amendment must be successfully emailed before it can become effective.';
  end if;

  if selected_assignment.effective_at is not null
    and selected_assignment.effective_at > now()
  then
    raise exception 'The amendment effective timestamp has not been reached.';
  end if;

  update public.client_contract_assignments
  set
    status = 'effective',
    notified_at = coalesce(notified_at, now()),
    updated_by_profile_id = target_admin_profile_id
  where id = selected_assignment.id;

  if selected_assignment.supersedes_assignment_id is not null then
    select *
    into previous_assignment
    from public.client_contract_assignments
    where id = selected_assignment.supersedes_assignment_id
    for update;

    if found and previous_assignment.status in ('accepted', 'effective') then
      update public.client_contract_assignments
      set
        status = 'superseded',
        updated_by_profile_id = target_admin_profile_id
      where id = previous_assignment.id;

    end if;
  end if;

end;
$function$;

revoke all on function public.admin_mark_notice_contract_effective(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_mark_notice_contract_effective(uuid, uuid)
  to service_role;

create or replace function public.admin_cancel_contract_assignment(
  target_admin_profile_id uuid,
  target_assignment_id uuid,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_assignment public.client_contract_assignments%rowtype;
begin
  if not public.is_active_contract_admin(target_admin_profile_id) then
    raise exception 'Only an active RomDoc administrator may cancel a contract assignment.';
  end if;

  select *
  into selected_assignment
  from public.client_contract_assignments
  where id = target_assignment_id
  for update;

  if not found then
    raise exception 'Contract assignment not found.';
  end if;

  if selected_assignment.status not in ('assigned', 'notified', 'awaiting_acceptance') then
    raise exception 'Only a pending contract assignment may be cancelled.';
  end if;

  update public.client_contract_assignments
  set
    status = 'cancelled',
    updated_by_profile_id = target_admin_profile_id
  where id = selected_assignment.id;

end;
$function$;

revoke all on function public.admin_cancel_contract_assignment(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_cancel_contract_assignment(uuid, uuid, text)
  to service_role;

create or replace function public.admin_mark_contract_price_applied(
  target_admin_profile_id uuid,
  target_assignment_id uuid,
  target_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_assignment public.client_contract_assignments%rowtype;
  selected_acceptance_id uuid;
begin
  if not public.is_active_contract_admin(target_admin_profile_id) then
    raise exception 'Only an active RomDoc administrator may confirm a manual price update.';
  end if;

  select *
  into selected_assignment
  from public.client_contract_assignments
  where id = target_assignment_id;

  if not found or selected_assignment.status not in ('accepted', 'effective') then
    raise exception 'Only an accepted or effective assignment may be marked as manually applied.';
  end if;

  if not public.contract_terms_have_price_values(selected_assignment.commercial_terms) then
    raise exception 'This assignment does not contain contractual price values.';
  end if;

  if not exists (
    select 1
    from public.contract_events
    where assignment_id = selected_assignment.id
      and event_type = 'price_update_pending'
  ) then
    raise exception 'This assignment does not have a pending manual price-update event.';
  end if;

  if exists (
    select 1
    from public.contract_events
    where assignment_id = selected_assignment.id
      and event_type = 'price_applied'
  ) then
    return;
  end if;

  select id
  into selected_acceptance_id
  from public.contract_acceptances
  where assignment_id = selected_assignment.id;

  insert into public.contract_events (
    assignment_id,
    acceptance_id,
    event_type,
    actor_profile_id,
    event_data
  )
  values (
    selected_assignment.id,
    selected_acceptance_id,
    'price_applied',
    target_admin_profile_id,
    jsonb_build_object(
      'manualOperationalPriceChangeConfirmed', true,
      'note', nullif(left(trim(coalesce(target_note, '')), 1000), '')
    )
  );
end;
$function$;

revoke all on function public.admin_mark_contract_price_applied(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_mark_contract_price_applied(uuid, uuid, text)
  to service_role;

-- =====================================================
-- 7. ASSIGNMENT-NOTIFICATION EMAIL CLAIMING
-- =====================================================

create or replace function public.claim_contract_assignment_email_delivery(
  target_assignment_id uuid,
  target_recipient_profile_id uuid,
  target_recipient_email text,
  target_locale text
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
  selected_delivery public.contract_assignment_email_deliveries%rowtype;
  normalized_email text;
  normalized_locale text;
begin
  if not exists (
    select 1
    from public.client_contract_assignments
    where id = target_assignment_id
  ) then
    raise exception 'Contract assignment not found.';
  end if;

  normalized_email := lower(trim(target_recipient_email));
  normalized_locale := case
    when target_locale in ('ro', 'en', 'de') then target_locale
    else 'ro'
  end;

  insert into public.contract_assignment_email_deliveries (
    assignment_id,
    recipient_profile_id,
    recipient_email,
    locale
  )
  values (
    target_assignment_id,
    target_recipient_profile_id,
    normalized_email,
    normalized_locale
  )
  on conflict (assignment_id, recipient_email) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    return query
    select inserted_id, true;
    return;
  end if;

  select *
  into selected_delivery
  from public.contract_assignment_email_deliveries
  where assignment_id = target_assignment_id
    and recipient_email = normalized_email
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

  update public.contract_assignment_email_deliveries
  set
    recipient_profile_id = target_recipient_profile_id,
    locale = normalized_locale,
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

revoke all on function public.claim_contract_assignment_email_delivery(
  uuid,
  uuid,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.claim_contract_assignment_email_delivery(
  uuid,
  uuid,
  text,
  text
) to service_role;

create or replace function public.complete_contract_assignment_email_delivery(
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
  selected_delivery public.contract_assignment_email_deliveries%rowtype;
begin
  select *
  into selected_delivery
  from public.contract_assignment_email_deliveries
  where id = target_delivery_id
  for update;

  if not found then
    raise exception 'Contract assignment email delivery not found.';
  end if;

  if selected_delivery.status = 'sent' then
    return;
  end if;

  if target_sent then
    if nullif(trim(coalesce(target_provider_message_id, '')), '') is null then
      raise exception 'A provider message id is required for a sent email.';
    end if;

    update public.contract_assignment_email_deliveries
    set
      status = 'sent',
      provider_message_id = left(trim(target_provider_message_id), 500),
      last_error = null,
      sent_at = now(),
      updated_at = now()
    where id = selected_delivery.id;
  else
    update public.contract_assignment_email_deliveries
    set
      status = 'failed',
      provider_message_id = null,
      last_error = left(
        trim(coalesce(target_error, 'Unknown contract assignment email error.')),
        2000
      ),
      sent_at = null,
      updated_at = now()
    where id = selected_delivery.id;
  end if;
end;
$function$;

revoke all on function public.complete_contract_assignment_email_delivery(
  uuid,
  boolean,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.complete_contract_assignment_email_delivery(
  uuid,
  boolean,
  text,
  text
) to service_role;

-- =====================================================
-- 8. ATOMIC AMENDMENT VERSION + PACKAGE + ASSIGNMENTS
-- =====================================================

create or replace function public.admin_create_contract_amendment_batch(
  target_admin_profile_id uuid,
  target_source_document_id uuid,
  target_source_package_id uuid,
  target_document_title text,
  target_document_version text,
  target_document_content_html text,
  target_document_issue_date date,
  target_document_effective_at timestamptz,
  target_package_title text,
  target_package_version text,
  target_package_effective_at timestamptz,
  target_requires_acceptance boolean,
  target_client_ids uuid[],
  target_commercial_terms jsonb default '{}'::jsonb,
  target_keep_existing_terms boolean default true,
  target_internal_notes text default null
)
returns table (
  document_id uuid,
  package_id uuid,
  assignment_ids uuid[]
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  source_document public.contract_documents%rowtype;
  source_package public.contract_packages%rowtype;
  created_document_id uuid;
  created_package_id uuid;
  created_assignment_ids uuid[];
begin
  if not public.is_active_contract_admin(target_admin_profile_id) then
    raise exception 'Only an active RomDoc administrator may create contract amendments.';
  end if;

  select *
  into source_document
  from public.contract_documents
  where id = target_source_document_id;

  if not found or source_document.status <> 'published' then
    raise exception 'The source contract document must be published.';
  end if;

  select *
  into source_package
  from public.contract_packages
  where id = target_source_package_id;

  if not found or source_package.status <> 'published' then
    raise exception 'The source contract package must be published.';
  end if;

  if not exists (
    select 1
    from public.contract_package_documents
    where package_id = source_package.id
      and document_id = source_document.id
  ) then
    raise exception 'The selected source document is not part of the selected source package.';
  end if;

  if target_requires_acceptance = false
    and source_document.unilateral_notice_allowed = false
  then
    raise exception 'This document is not authorised for unilateral notice. Client acceptance is required.';
  end if;

  if target_requires_acceptance = false
    and target_keep_existing_terms = false
    and public.contract_terms_have_price_values(target_commercial_terms)
  then
    raise exception 'Price or billing-term amendments always require client acceptance.';
  end if;

  insert into public.contract_documents (
    document_key,
    document_type,
    audience,
    locale,
    title,
    version,
    content_html,
    metadata,
    requires_acceptance,
    unilateral_notice_allowed,
    status,
    issue_date,
    effective_at,
    supersedes_document_id,
    created_by_profile_id
  )
  values (
    source_document.document_key,
    source_document.document_type,
    source_document.audience,
    source_document.locale,
    trim(target_document_title),
    trim(target_document_version),
    target_document_content_html,
    source_document.metadata,
    target_requires_acceptance,
    source_document.unilateral_notice_allowed,
    'draft',
    coalesce(target_document_issue_date, current_date),
    target_document_effective_at,
    source_document.id,
    target_admin_profile_id
  )
  returning id into created_document_id;

  update public.contract_documents
  set
    status = 'published',
    published_by_profile_id = target_admin_profile_id
  where id = created_document_id;

  insert into public.contract_packages (
    package_key,
    contract_type,
    locale,
    title,
    version,
    status,
    requires_acceptance,
    payment_deadline_days,
    metadata,
    effective_at,
    supersedes_package_id,
    created_by_profile_id
  )
  values (
    source_package.package_key,
    source_package.contract_type,
    source_package.locale,
    trim(target_package_title),
    trim(target_package_version),
    'draft',
    target_requires_acceptance,
    30,
    source_package.metadata,
    target_package_effective_at,
    source_package.id,
    target_admin_profile_id
  )
  returning id into created_package_id;

  insert into public.contract_package_documents (
    package_id,
    document_id,
    display_order,
    is_required,
    section_label
  )
  select
    created_package_id,
    case
      when link.document_id = source_document.id
        then created_document_id
      else link.document_id
    end,
    link.display_order,
    link.is_required,
    link.section_label
  from public.contract_package_documents as link
  where link.package_id = source_package.id
  order by link.display_order;

  update public.contract_packages
  set
    status = 'published',
    published_by_profile_id = target_admin_profile_id
  where id = created_package_id;

  select array_agg(result.assignment_id order by result.assignment_id)
  into created_assignment_ids
  from public.admin_assign_contract_package_batch(
    target_admin_profile_id,
    created_package_id,
    target_client_ids,
    target_commercial_terms,
    target_keep_existing_terms,
    target_package_effective_at,
    target_internal_notes
  ) as result;

  document_id := created_document_id;
  package_id := created_package_id;
  assignment_ids := coalesce(created_assignment_ids, '{}'::uuid[]);
  return next;
end;
$function$;

revoke all on function public.admin_create_contract_amendment_batch(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  date,
  timestamptz,
  text,
  text,
  timestamptz,
  boolean,
  uuid[],
  jsonb,
  boolean,
  text
) from public, anon, authenticated;

grant execute on function public.admin_create_contract_amendment_batch(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  date,
  timestamptz,
  text,
  text,
  timestamptz,
  boolean,
  uuid[],
  jsonb,
  boolean,
  text
) to service_role;

-- =====================================================
-- 9. ACCEPTANCE RPC: SUPERSEDE PREVIOUS VERSION AND
--    CREATE NON-BLOCKING MANUAL PRICE FOLLOW-UP EVENT
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
  previous_assignment public.client_contract_assignments%rowtype;
  existing_acceptance public.contract_acceptances%rowtype;
  created_acceptance_id uuid;
  artifact_path text;
  artifact_file_name text;
  price_changed boolean := false;
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


  if selected_assignment.supersedes_assignment_id is not null then
    select *
    into previous_assignment
    from public.client_contract_assignments
    where id = selected_assignment.supersedes_assignment_id
    for update;

    if found then
      price_changed :=
        public.contract_terms_have_price_values(selected_assignment.commercial_terms)
        and previous_assignment.commercial_terms_hash
          <> selected_assignment.commercial_terms_hash;

      if previous_assignment.status in ('accepted', 'effective') then
        update public.client_contract_assignments
        set
          status = 'superseded',
          updated_by_profile_id = target_accepted_by_profile_id
        where id = previous_assignment.id;

      end if;
    end if;
  else
    price_changed :=
      public.contract_terms_have_price_values(selected_assignment.commercial_terms);
  end if;

  if price_changed then
    insert into public.contract_events (
      assignment_id,
      acceptance_id,
      event_type,
      actor_profile_id,
      event_data
    )
    values (
      selected_assignment.id,
      created_acceptance_id,
      'price_update_pending',
      target_accepted_by_profile_id,
      jsonb_build_object(
        'automaticBillingUpdate', false,
        'manualAdminActionRequired', true,
        'operationalBillingTableUnchanged', true
      )
    );
  end if;

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

-- =====================================================
-- 10. BACKFILL PRICE-FOLLOW-UP EVENTS FOR ANY ACCEPTED
--     ASSIGNMENTS CREATED BEFORE THIS MIGRATION
-- =====================================================

insert into public.contract_events (
  assignment_id,
  acceptance_id,
  event_type,
  actor_profile_id,
  event_data
)
select
  assignment.id,
  acceptance.id,
  'price_update_pending',
  acceptance.accepted_by_profile_id,
  jsonb_build_object(
    'automaticBillingUpdate', false,
    'manualAdminActionRequired', true,
    'operationalBillingTableUnchanged', true,
    'backfilledByMigration96', true
  )
from public.client_contract_assignments as assignment
join public.contract_acceptances as acceptance
  on acceptance.assignment_id = assignment.id
where assignment.status in ('accepted', 'effective')
  and public.contract_terms_have_price_values(assignment.commercial_terms)
  and not exists (
    select 1
    from public.contract_events as event
    where event.assignment_id = assignment.id
      and event.event_type = 'price_update_pending'
  );

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
    'admin_assign_contract_package_batch',
    'admin_create_contract_amendment_batch',
    'admin_mark_contract_assignment_notified',
    'admin_mark_notice_contract_effective',
    'admin_cancel_contract_assignment',
    'admin_mark_contract_price_applied',
    'claim_contract_assignment_email_delivery',
    'complete_contract_assignment_email_delivery'
  )
order by routine_name;

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'contract_assignment_email_deliveries'
order by ordinal_position;

-- Expected: zero contract-related triggers on account and operational billing tables.
select
  trigger_name,
  event_object_table,
  event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in (
    'profiles',
    'doctor_subscriptions',
    'client_billing_terms'
  )
  and trigger_name ilike '%contract%';
