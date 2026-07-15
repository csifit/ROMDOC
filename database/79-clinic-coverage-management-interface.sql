begin;

create table if not exists public.clinic_billing_settings (
  id smallint primary key default 1,
  clinic_doctor_monthly_price_ron numeric(12,4) not null default 60,
  sms_unit_price_ron numeric(12,4) not null default 0,
  vat_rate numeric(8,6) not null default 0.19,
  updated_at timestamptz not null default now(),
  updated_by_profile_id uuid null references public.profiles(id) on delete set null,
  constraint clinic_billing_settings_single_row_check check (id = 1),
  constraint clinic_billing_settings_doctor_price_check check (clinic_doctor_monthly_price_ron >= 0),
  constraint clinic_billing_settings_sms_price_check check (sms_unit_price_ron >= 0),
  constraint clinic_billing_settings_vat_rate_check check (vat_rate >= 0 and vat_rate <= 1)
);

insert into public.clinic_billing_settings (
  id,
  clinic_doctor_monthly_price_ron,
  sms_unit_price_ron,
  vat_rate
)
values (1, 60, 0, 0.19)
on conflict (id) do nothing;

alter table public.clinic_billing_settings enable row level security;

drop policy if exists "Authenticated users can read clinic billing settings"
on public.clinic_billing_settings;

create policy "Authenticated users can read clinic billing settings"
on public.clinic_billing_settings
for select
to authenticated
using (true);

create or replace function public.get_clinic_manager_monthly_coverage_summary(
  target_organization_id uuid,
  target_month date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  requesting_profile_id uuid := auth.uid();
  month_start timestamptz;
  month_end timestamptz;
  doctor_price numeric(12,4);
  sms_price numeric(12,4);
  configured_vat_rate numeric(8,6);
  result jsonb;
begin
  if requesting_profile_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.clinic_organization_members membership
    where membership.organization_id = target_organization_id
      and membership.profile_id = requesting_profile_id
      and membership.status = 'active'
  ) then
    raise exception 'clinic_organization_access_denied' using errcode = '42501';
  end if;

  month_start := date_trunc('month', coalesce(target_month, current_date)::timestamp)
    at time zone 'Europe/Bucharest';
  month_end := month_start + interval '1 month';

  select
    clinic_doctor_monthly_price_ron,
    sms_unit_price_ron,
    vat_rate
  into doctor_price, sms_price, configured_vat_rate
  from public.clinic_billing_settings
  where id = 1;

  doctor_price := coalesce(doctor_price, 60);
  sms_price := coalesce(sms_price, 0);
  configured_vat_rate := coalesce(configured_vat_rate, 0.19);

  with relationship_rows as (
    select
      relationship.id as relationship_id,
      relationship.organization_id,
      relationship.doctor_id,
      relationship.clinic_id,
      relationship.invitation_status,
      relationship.payment_responsibility,
      relationship.coverage_status,
      relationship.accepted_at,
      relationship.coverage_started_at,
      relationship.accepted_account_email,
      relationship.invited_doctor_email,
      doctor.profile_id,
      doctor.slug,
      coalesce(
        (
          select translation.title
          from public.doctor_translations translation
          where translation.doctor_id = doctor.id
          order by case when translation.locale = 'ro' then 0 else 1 end, translation.locale
          limit 1
        ),
        nullif(concat_ws(' ', profile.first_name, profile.last_name), ''),
        doctor.slug,
        relationship.accepted_account_email,
        relationship.invited_doctor_email,
        'Medic invitat'
      ) as doctor_name,
      coalesce(
        (
          select translation.name
          from public.clinic_translations translation
          where translation.clinic_id = relationship.clinic_id
          order by case when translation.locale = 'ro' then 0 else 1 end, translation.locale
          limit 1
        ),
        clinic.slug
      ) as clinic_name,
      clinic.formatted_address as clinic_address,
      (
        relationship.doctor_id is not null
        and relationship.payment_responsibility = 'clinic_paid'
        and relationship.coverage_status = 'active'
      ) as subscription_billable
    from public.clinic_doctor_relationships relationship
    left join public.doctors doctor on doctor.id = relationship.doctor_id
    left join public.profiles profile on profile.id = doctor.profile_id
    left join public.clinics clinic on clinic.id = relationship.clinic_id
    where relationship.organization_id = target_organization_id
      and relationship.payment_responsibility = 'clinic_paid'
  ),
  sms_counts as (
    select
      sms.doctor_id,
      count(*) filter (where sms.event = 'confirmed')::integer as confirmation_sms_count,
      count(*) filter (where sms.event = 'reminder_24_hours')::integer as reminder_24h_sms_count,
      count(*)::integer as total_sms_count
    from public.sms_delivery_logs sms
    join relationship_rows relationship on relationship.doctor_id = sms.doctor_id
    where sms.status = 'sent'
      and sms.created_at >= month_start
      and sms.created_at < month_end
    group by sms.doctor_id
  ),
  doctor_cost_rows as (
    select
      relationship.*,
      case when relationship.subscription_billable then doctor_price else 0 end::numeric(12,4) as subscription_cost_ron,
      coalesce(sms.confirmation_sms_count, 0) as confirmation_sms_count,
      coalesce(sms.reminder_24h_sms_count, 0) as reminder_24h_sms_count,
      coalesce(sms.total_sms_count, 0) as total_sms_count,
      (coalesce(sms.total_sms_count, 0) * sms_price)::numeric(12,4) as sms_cost_ron
    from relationship_rows relationship
    left join sms_counts sms on sms.doctor_id = relationship.doctor_id
  ),
  totals as (
    select
      count(*) filter (where subscription_billable)::integer as active_doctor_count,
      coalesce(sum(subscription_cost_ron), 0)::numeric(12,4) as subscription_subtotal_ron,
      coalesce(sum(confirmation_sms_count), 0)::integer as confirmation_sms_count,
      coalesce(sum(reminder_24h_sms_count), 0)::integer as reminder_24h_sms_count,
      coalesce(sum(total_sms_count), 0)::integer as total_sms_count,
      coalesce(sum(sms_cost_ron), 0)::numeric(12,4) as sms_subtotal_ron
    from doctor_cost_rows
  )
  select jsonb_build_object(
    'monthStart', to_char(month_start at time zone 'Europe/Bucharest', 'YYYY-MM-DD'),
    'monthEndExclusive', to_char(month_end at time zone 'Europe/Bucharest', 'YYYY-MM-DD'),
    'organization', (
      select to_jsonb(organization)
      from public.clinic_organizations organization
      where organization.id = target_organization_id
    ),
    'billingProfile', (
      select to_jsonb(billing) - 'organization_id'
      from public.clinic_organization_billing_profiles billing
      where billing.organization_id = target_organization_id
    ),
    'locations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', clinic.id,
          'name', coalesce((
            select translation.name
            from public.clinic_translations translation
            where translation.clinic_id = clinic.id
            order by case when translation.locale = 'ro' then 0 else 1 end, translation.locale
            limit 1
          ), clinic.slug),
          'formattedAddress', clinic.formatted_address
        ) order by clinic.slug
      )
      from public.clinic_organization_clinics organization_clinic
      join public.clinics clinic on clinic.id = organization_clinic.clinic_id
      where organization_clinic.organization_id = target_organization_id
        and organization_clinic.status = 'active'
        and clinic.status = 'approved'
    ), '[]'::jsonb),
    'prices', jsonb_build_object(
      'clinicDoctorMonthlyPriceRon', doctor_price,
      'smsUnitPriceRon', sms_price,
      'vatRate', configured_vat_rate
    ),
    'totals', (
      select jsonb_build_object(
        'activeDoctorCount', active_doctor_count,
        'subscriptionSubtotalRon', subscription_subtotal_ron,
        'confirmationSmsCount', confirmation_sms_count,
        'reminder24hSmsCount', reminder_24h_sms_count,
        'totalSmsCount', total_sms_count,
        'smsSubtotalRon', sms_subtotal_ron,
        'subtotalBeforeVatRon', (subscription_subtotal_ron + sms_subtotal_ron)::numeric(12,4),
        'estimatedVatRon', ((subscription_subtotal_ron + sms_subtotal_ron) * configured_vat_rate)::numeric(12,4),
        'estimatedTotalRon', ((subscription_subtotal_ron + sms_subtotal_ron) * (1 + configured_vat_rate))::numeric(12,4)
      )
      from totals
    ),
    'doctors', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'relationshipId', doctor.relationship_id,
          'doctorId', doctor.doctor_id,
          'profileId', doctor.profile_id,
          'doctorName', doctor.doctor_name,
          'email', coalesce(doctor.accepted_account_email, doctor.invited_doctor_email),
          'invitationStatus', doctor.invitation_status,
          'coverageStatus', doctor.coverage_status,
          'acceptedAt', doctor.accepted_at,
          'coverageStartedAt', doctor.coverage_started_at,
          'clinicId', doctor.clinic_id,
          'clinicName', doctor.clinic_name,
          'clinicAddress', doctor.clinic_address,
          'subscriptionBillable', doctor.subscription_billable,
          'subscriptionCostRon', doctor.subscription_cost_ron,
          'confirmationSmsCount', doctor.confirmation_sms_count,
          'reminder24hSmsCount', doctor.reminder_24h_sms_count,
          'totalSmsCount', doctor.total_sms_count,
          'smsCostRon', doctor.sms_cost_ron,
          'estimatedDoctorSubtotalRon', (doctor.subscription_cost_ron + doctor.sms_cost_ron)::numeric(12,4)
        ) order by doctor.doctor_name
      )
      from doctor_cost_rows doctor
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_clinic_manager_monthly_coverage_summary(uuid, date) from public;
grant execute on function public.get_clinic_manager_monthly_coverage_summary(uuid, date) to authenticated;

comment on table public.clinic_billing_settings is
  'Platform-controlled rates used for clinic billing overview estimates. Clinic Managers have read-only access.';

comment on function public.get_clinic_manager_monthly_coverage_summary(uuid, date) is
  'Returns a secure monthly overview/audit estimate for an organization. It never generates invoices.';

commit;
