begin;

-- Simple billing rule:
-- one clinic-paid active relationship with an accepted/invited email
-- equals one billable clinic-doctor subscription.
--
-- No doctor_id, profile lookup, account merge, or fallback resolution is required.

CREATE OR REPLACE FUNCTION public.get_clinic_manager_monthly_coverage_summary(target_organization_id uuid, target_month date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    settings.clinic_doctor_monthly_price_ron,
    settings.sms_unit_price_ron,
    settings.vat_rate
  into
    doctor_price,
    sms_price,
    configured_vat_rate
  from public.clinic_billing_settings as settings
  where settings.id = 1;

  doctor_price := coalesce(doctor_price, 60);
  sms_price := coalesce(sms_price, 0.35);
  configured_vat_rate := coalesce(configured_vat_rate, 0.21);

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
        coalesce(
          nullif(trim(relationship.accepted_account_email), ''),
          nullif(trim(relationship.invited_doctor_email), '')
        ) is not null
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
$function$;

revoke all
on function public.get_clinic_manager_monthly_coverage_summary(uuid, date)
from public;

grant execute
on function public.get_clinic_manager_monthly_coverage_summary(uuid, date)
to authenticated;

commit;

select
  id,
  accepted_account_email,
  invited_doctor_email,
  payment_responsibility,
  coverage_status,
  (
    coalesce(
      nullif(trim(accepted_account_email), ''),
      nullif(trim(invited_doctor_email), '')
    ) is not null
    and payment_responsibility = 'clinic_paid'
    and coverage_status = 'active'
  ) as subscription_billable
from public.clinic_doctor_relationships
where payment_responsibility = 'clinic_paid'
order by created_at desc;
