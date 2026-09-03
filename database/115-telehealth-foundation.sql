-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 115: Telehealth foundation
--
-- Professional verification is intentionally NOT used by
-- any telehealth offer, booking, payment, or room rule.
-- =====================================================

begin;

create table if not exists public.doctor_spoken_languages (
  doctor_id uuid not null
    references public.doctors(id) on delete cascade,
  language_code text not null
    check (language_code ~ '^[a-z]{2,3}$'),
  created_at timestamptz not null default now(),
  primary key (doctor_id, language_code)
);

comment on table public.doctor_spoken_languages is
  'ISO-style language codes spoken by a Doctor. These are not profile translation locales.';

create table if not exists public.doctor_telehealth_restrictions (
  doctor_id uuid primary key
    references public.doctors(id) on delete cascade,
  is_restricted boolean not null default false,
  restricted_at timestamptz,
  restricted_by_profile_id uuid
    references public.profiles(id) on delete set null,
  restriction_reason text
    check (
      restriction_reason is null
      or char_length(trim(restriction_reason)) between 1 and 1000
    ),
  updated_at timestamptz not null default now(),
  check (
    (is_restricted and restricted_at is not null)
    or
    (not is_restricted and restricted_at is null)
  )
);

comment on table public.doctor_telehealth_restrictions is
  'Exceptional Admin restriction for new telehealth activity. It is separate from professional verification and whole-account status.';

create table if not exists public.telehealth_commercial_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null
    check (owner_type in ('doctor', 'clinic_organization')),
  doctor_id uuid
    references public.doctors(id) on delete cascade,
  organization_id uuid
    references public.clinic_organizations(id) on delete cascade,
  stripe_account_id text unique,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (owner_type = 'doctor' and doctor_id is not null and organization_id is null)
    or
    (owner_type = 'clinic_organization' and doctor_id is null and organization_id is not null)
  )
);

create unique index if not exists
  uq_telehealth_commercial_account_doctor
on public.telehealth_commercial_accounts (doctor_id)
where doctor_id is not null;

create unique index if not exists
  uq_telehealth_commercial_account_organization
on public.telehealth_commercial_accounts (organization_id)
where organization_id is not null;

comment on table public.telehealth_commercial_accounts is
  'Stripe Connect recipient owned by an independent Doctor or Clinic Organisation. Never stores Stripe secrets.';

create table if not exists public.telehealth_offers (
  doctor_id uuid primary key
    references public.doctors(id) on delete cascade,
  organization_id uuid
    references public.clinic_organizations(id) on delete cascade,
  commercial_account_id uuid
    references public.telehealth_commercial_accounts(id) on delete set null,
  enabled boolean not null default false,
  price_minor integer
    check (price_minor is null or price_minor between 1 and 100000000),
  currency text not null default 'RON'
    check (currency in ('RON', 'EUR')),
  duration_minutes integer not null default 30
    check (duration_minutes between 5 and 480),
  updated_by_profile_id uuid
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.telehealth_offers is
  'One video-consultation offer per Doctor. Independent Doctors own it directly; the linked Clinic Organisation owns it for clinic-invited Doctors.';

create or replace function public.validate_telehealth_offer_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  doctor_account_type text;
  doctor_organization_id uuid;
  account_owner_type text;
  account_doctor_id uuid;
  account_organization_id uuid;
begin
  select doctor.account_type, doctor.clinic_organization_id
  into doctor_account_type, doctor_organization_id
  from public.doctors as doctor
  where doctor.id = new.doctor_id;

  if doctor_account_type is null then
    raise exception 'telehealth_doctor_not_found' using errcode = '23503';
  end if;

  if doctor_account_type = 'independent' and new.organization_id is not null then
    raise exception 'independent_telehealth_offer_cannot_have_organization'
      using errcode = '23514';
  end if;

  if doctor_account_type = 'clinic_invited'
    and new.organization_id is distinct from doctor_organization_id
  then
    raise exception 'clinic_telehealth_offer_organization_mismatch'
      using errcode = '23514';
  end if;

  if new.commercial_account_id is not null then
    select account.owner_type, account.doctor_id, account.organization_id
    into account_owner_type, account_doctor_id, account_organization_id
    from public.telehealth_commercial_accounts as account
    where account.id = new.commercial_account_id;

    if doctor_account_type = 'independent' and not (
      account_owner_type = 'doctor'
      and account_doctor_id = new.doctor_id
    ) then
      raise exception 'telehealth_commercial_account_owner_mismatch'
        using errcode = '23514';
    end if;

    if doctor_account_type = 'clinic_invited' and not (
      account_owner_type = 'clinic_organization'
      and account_organization_id = new.organization_id
    ) then
      raise exception 'telehealth_commercial_account_owner_mismatch'
        using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_telehealth_offer_owner_write
on public.telehealth_offers;

create trigger validate_telehealth_offer_owner_write
before insert or update
on public.telehealth_offers
for each row execute function public.validate_telehealth_offer_owner();

revoke all on function public.validate_telehealth_offer_owner() from public;

alter table public.appointments
  add column if not exists consultation_mode text not null default 'in_person',
  add column if not exists telehealth_public_reference uuid,
  add column if not exists telehealth_consent_at timestamptz,
  add column if not exists telehealth_consent_version text,
  add column if not exists telehealth_price_minor integer,
  add column if not exists telehealth_currency text,
  add column if not exists telehealth_recipient_type text,
  add column if not exists telehealth_recipient_id uuid;

alter table public.appointments
  drop constraint if exists appointments_consultation_mode_check;

alter table public.appointments
  add constraint appointments_consultation_mode_check
  check (consultation_mode in ('in_person', 'video'));

alter table public.appointments
  drop constraint if exists appointments_video_snapshot_check;

alter table public.appointments
  add constraint appointments_video_snapshot_check
  check (
    consultation_mode = 'in_person'
    or (
      patient_profile_id is not null
      and telehealth_public_reference is not null
      and telehealth_consent_at is not null
      and nullif(trim(telehealth_consent_version), '') is not null
      and telehealth_price_minor > 0
      and telehealth_currency in ('RON', 'EUR')
      and telehealth_recipient_type in ('doctor', 'clinic_organization')
      and telehealth_recipient_id is not null
    )
  );

create unique index if not exists uq_appointments_telehealth_public_reference
on public.appointments (telehealth_public_reference)
where telehealth_public_reference is not null;

comment on column public.appointments.consultation_mode is
  'Consultation delivery mode. Video remains part of the ordinary appointment lifecycle.';
comment on column public.appointments.telehealth_consent_version is
  'Immutable consent text version accepted by the Patient when booking video.';

create table if not exists public.telehealth_payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique
    references public.appointments(id) on delete restrict,
  recipient_type text not null
    check (recipient_type in ('doctor', 'clinic_organization')),
  recipient_id uuid not null,
  stripe_account_id text not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency in ('RON', 'EUR')),
  status text not null default 'checkout_pending'
    check (status in (
      'checkout_pending',
      'paid',
      'failed',
      'cancelled',
      'partially_refunded',
      'refunded'
    )),
  amount_refunded_minor integer not null default 0
    check (amount_refunded_minor >= 0 and amount_refunded_minor <= amount_minor),
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_telehealth_payments_recipient
on public.telehealth_payments (recipient_type, recipient_id, created_at desc);

create unique index if not exists uq_telehealth_payments_payment_intent
on public.telehealth_payments (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;

create table if not exists public.appointment_video_rooms (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique
    references public.appointments(id) on delete restrict,
  provider text not null default 'daily' check (provider = 'daily'),
  provider_room_name text not null unique,
  provider_room_url text not null,
  status text not null default 'available'
    check (status in ('available', 'expired', 'disabled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.appointment_video_rooms is
  'Daily room metadata only. Video, audio, recording and transcription content are never stored.';

create table if not exists public.telehealth_audit_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid
    references public.appointments(id) on delete restrict,
  doctor_id uuid
    references public.doctors(id) on delete restrict,
  event_type text not null check (event_type in (
    'offer_updated',
    'admin_restricted',
    'admin_allowed',
    'consent_recorded',
    'checkout_created',
    'payment_succeeded',
    'payment_failed',
    'refund_created',
    'room_created',
    'room_join_granted',
    'room_join_denied',
    'room_expired'
  )),
  actor_profile_id uuid
    references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_telehealth_audit_appointment
on public.telehealth_audit_events (appointment_id, created_at desc)
where appointment_id is not null;

create or replace function public.prevent_telehealth_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'telehealth_audit_events_are_immutable' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_telehealth_audit_update
on public.telehealth_audit_events;
create trigger prevent_telehealth_audit_update
before update on public.telehealth_audit_events
for each row execute function public.prevent_telehealth_audit_mutation();

drop trigger if exists prevent_telehealth_audit_delete
on public.telehealth_audit_events;
create trigger prevent_telehealth_audit_delete
before delete on public.telehealth_audit_events
for each row execute function public.prevent_telehealth_audit_mutation();

revoke all on function public.prevent_telehealth_audit_mutation() from public;

create or replace function public.is_telehealth_offer_available(
  target_doctor_id uuid
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
    join public.profiles as profile
      on profile.id = doctor.profile_id
    join public.telehealth_offers as offer
      on offer.doctor_id = doctor.id
    join public.telehealth_commercial_accounts as account
      on account.id = offer.commercial_account_id
    left join public.doctor_telehealth_restrictions as restriction
      on restriction.doctor_id = doctor.id
    left join public.clinic_organizations as organization
      on organization.id = doctor.clinic_organization_id
    left join public.clinic_doctor_relationships as relationship
      on relationship.id = doctor.clinic_doctor_relationship_id
    where doctor.id = target_doctor_id
      and doctor.status = 'active'
      and profile.account_status = 'active'
      and coalesce(restriction.is_restricted, false) = false
      and offer.enabled = true
      and offer.price_minor > 0
      and account.details_submitted = true
      and account.charges_enabled = true
      and account.payouts_enabled = true
      and (
        (
          doctor.account_type = 'independent'
          and offer.organization_id is null
          and account.owner_type = 'doctor'
          and account.doctor_id = doctor.id
        )
        or
        (
          doctor.account_type = 'clinic_invited'
          and organization.status = 'active'
          and relationship.invitation_status = 'accepted'
          and relationship.coverage_status = 'active'
          and offer.organization_id = doctor.clinic_organization_id
          and account.owner_type = 'clinic_organization'
          and account.organization_id = doctor.clinic_organization_id
        )
      )
  );
$$;

comment on function public.is_telehealth_offer_available(uuid) is
  'Returns commercial and account readiness for new video bookings. Professional verification, specialty and service are intentionally excluded.';

create or replace function public.get_public_telehealth_offer(
  target_doctor_id uuid
)
returns table (
  doctor_id uuid,
  price_minor integer,
  currency text,
  duration_minutes integer,
  recipient_type text,
  recipient_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    offer.doctor_id,
    offer.price_minor,
    offer.currency,
    offer.duration_minutes,
    account.owner_type as recipient_type,
    case
      when account.owner_type = 'clinic_organization'
        then organization.name
      else coalesce(nullif(trim(doctor.public_name), ''), 'Doctor')
    end as recipient_name
  from public.telehealth_offers as offer
  join public.telehealth_commercial_accounts as account
    on account.id = offer.commercial_account_id
  join public.doctors as doctor
    on doctor.id = offer.doctor_id
  left join public.clinic_organizations as organization
    on organization.id = account.organization_id
  where offer.doctor_id = target_doctor_id
    and public.is_telehealth_offer_available(target_doctor_id);
$$;

create or replace function public.is_telehealth_appointment_participant(
  target_appointment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments as appointment
    left join public.doctors as doctor
      on doctor.id = appointment.doctor_id
    where appointment.id = target_appointment_id
      and appointment.consultation_mode = 'video'
      and (
        appointment.patient_profile_id = auth.uid()
        or doctor.profile_id = auth.uid()
      )
  );
$$;

revoke all on function public.is_telehealth_offer_available(uuid) from public;
revoke all on function public.get_public_telehealth_offer(uuid) from public;
revoke all on function public.is_telehealth_appointment_participant(uuid) from public;
grant execute on function public.is_telehealth_offer_available(uuid) to anon, authenticated, service_role;
grant execute on function public.get_public_telehealth_offer(uuid) to anon, authenticated, service_role;
grant execute on function public.is_telehealth_appointment_participant(uuid) to authenticated, service_role;

alter table public.doctor_spoken_languages enable row level security;
alter table public.doctor_telehealth_restrictions enable row level security;
alter table public.telehealth_commercial_accounts enable row level security;
alter table public.telehealth_offers enable row level security;
alter table public.telehealth_payments enable row level security;
alter table public.appointment_video_rooms enable row level security;
alter table public.telehealth_audit_events enable row level security;

create policy "Public can read Doctor spoken languages"
on public.doctor_spoken_languages for select
to public using (true);

create policy "Doctors manage own spoken languages"
on public.doctor_spoken_languages for all
to authenticated
using (
  exists (
    select 1 from public.doctors as doctor
    where doctor.id = doctor_spoken_languages.doctor_id
      and doctor.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.doctors as doctor
    where doctor.id = doctor_spoken_languages.doctor_id
      and doctor.profile_id = auth.uid()
  )
);

create policy "Admins read telehealth restrictions"
on public.doctor_telehealth_restrictions for select
to authenticated using (public.is_admin());

create policy "Commercial owners read telehealth accounts"
on public.telehealth_commercial_accounts for select
to authenticated using (
  (owner_type = 'doctor' and exists (
    select 1 from public.doctors as doctor
    where doctor.id = telehealth_commercial_accounts.doctor_id
      and doctor.profile_id = auth.uid()
  ))
  or
  (owner_type = 'clinic_organization' and public.is_clinic_organization_member(organization_id))
  or public.is_admin()
);

create policy "Public reads available telehealth offers"
on public.telehealth_offers for select
to public using (
  public.is_telehealth_offer_available(telehealth_offers.doctor_id)
);

create policy "Doctors read own telehealth offer"
on public.telehealth_offers for select
to authenticated using (
  exists (
    select 1 from public.doctors as doctor
    where doctor.id = telehealth_offers.doctor_id
      and doctor.profile_id = auth.uid()
  )
);

create policy "Clinic members read organization telehealth offers"
on public.telehealth_offers for select
to authenticated using (
  organization_id is not null
  and public.is_clinic_organization_member(organization_id)
);

create policy "Participants read own telehealth payments"
on public.telehealth_payments for select
to authenticated using (
  public.is_telehealth_appointment_participant(appointment_id)
  or public.is_admin()
  or (
    recipient_type = 'clinic_organization'
    and public.is_clinic_organization_billing_manager(recipient_id)
  )
);

create policy "Admins read telehealth audit"
on public.telehealth_audit_events for select
to authenticated using (public.is_admin());

revoke all on public.doctor_telehealth_restrictions from anon, authenticated;
revoke all on public.telehealth_commercial_accounts from anon;
revoke insert, update, delete on public.telehealth_commercial_accounts from authenticated;
revoke insert, update, delete on public.telehealth_offers from anon, authenticated;
revoke insert, update, delete on public.telehealth_payments from anon, authenticated;
revoke all on public.appointment_video_rooms from anon, authenticated;
revoke insert, update, delete on public.telehealth_audit_events from anon, authenticated;

grant select on public.doctor_spoken_languages to anon, authenticated;
grant insert, update, delete on public.doctor_spoken_languages to authenticated;
grant select on public.telehealth_offers to anon, authenticated;
grant select on public.telehealth_commercial_accounts to authenticated;
grant select on public.telehealth_payments to authenticated;
grant select on public.telehealth_audit_events to authenticated;

commit;
