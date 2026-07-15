begin;

create or replace function public.get_admin_clinic_billing_month_summary(
  target_month date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  requesting_profile_id uuid := auth.uid();

  month_start timestamptz;
  month_end timestamptz;

  doctor_price numeric(12,4) := 60;
  sms_price numeric(12,4) := 0.35;
  configured_vat_rate numeric(8,6) := 0.21;

  organization_row record;
  organization_summary jsonb;
  organization_summaries jsonb := '[]'::jsonb;

  active_doctor_count integer;
  confirmation_sms_count integer;
  reminder_sms_count integer;
  total_sms_count integer;
  approved_location_count integer;

  subscription_subtotal numeric(12,4);
  sms_subtotal numeric(12,4);
  subtotal_before_vat numeric(12,4);
  estimated_vat numeric(12,4);
  estimated_total numeric(12,4);

  global_organization_count integer := 0;
  global_location_count integer := 0;
  global_active_doctor_count integer := 0;
  global_confirmation_sms_count integer := 0;
  global_reminder_sms_count integer := 0;
  global_total_sms_count integer := 0;
  global_subscription_subtotal numeric(12,4) := 0;
  global_sms_subtotal numeric(12,4) := 0;
  global_subtotal_before_vat numeric(12,4) := 0;
  global_estimated_vat numeric(12,4) := 0;
  global_estimated_total numeric(12,4) := 0;

  doctor_rows jsonb;
  billing_profile jsonb;
begin
  if requesting_profile_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = requesting_profile_id
      and profile.role = 'admin'
      and profile.account_status = 'active'
  ) then
    raise exception 'admin_access_required'
      using errcode = '42501';
  end if;

  month_start :=
    date_trunc(
      'month',
      coalesce(target_month, current_date)::timestamp
    ) at time zone 'Europe/Bucharest';

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

  for organization_row in
    select
      organization.id,
      organization.name,
      organization.status,
      organization.contact_email,
      organization.contact_phone
    from public.clinic_organizations as organization
    where organization.status = 'active'
    order by organization.name
  loop
    global_organization_count := global_organization_count + 1;

    select count(*)::integer
    into approved_location_count
    from public.clinic_organization_clinics as organization_clinic
    join public.clinics as clinic
      on clinic.id = organization_clinic.clinic_id
    where organization_clinic.organization_id = organization_row.id
      and organization_clinic.status = 'active'
      and clinic.status = 'approved';

    select count(*)::integer
    into active_doctor_count
    from public.clinic_doctor_relationships as relationship
    where relationship.organization_id = organization_row.id
      and relationship.payment_responsibility = 'clinic_paid'
      and relationship.coverage_status = 'active'
      and coalesce(
        nullif(trim(relationship.accepted_account_email), ''),
        nullif(trim(relationship.invited_doctor_email), '')
      ) is not null;

    select
      count(*) filter (
        where sms.event = 'confirmed'
      )::integer,

      count(*) filter (
        where sms.event = 'reminder_24_hours'
      )::integer,

      count(*)::integer
    into
      confirmation_sms_count,
      reminder_sms_count,
      total_sms_count
    from public.sms_delivery_logs as sms
    where sms.status = 'sent'
      and sms.event in ('confirmed', 'reminder_24_hours')
      and sms.created_at >= month_start
      and sms.created_at < month_end
      and exists (
        select 1
        from public.clinic_doctor_relationships as relationship
        where relationship.organization_id = organization_row.id
          and relationship.payment_responsibility = 'clinic_paid'
          and relationship.coverage_status = 'active'
          and relationship.doctor_id = sms.doctor_id
      );

    approved_location_count := coalesce(approved_location_count, 0);
    active_doctor_count := coalesce(active_doctor_count, 0);
    confirmation_sms_count := coalesce(confirmation_sms_count, 0);
    reminder_sms_count := coalesce(reminder_sms_count, 0);
    total_sms_count := coalesce(total_sms_count, 0);

    subscription_subtotal :=
      (active_doctor_count * doctor_price)::numeric(12,4);

    sms_subtotal :=
      (total_sms_count * sms_price)::numeric(12,4);

    subtotal_before_vat :=
      (subscription_subtotal + sms_subtotal)::numeric(12,4);

    estimated_vat :=
      (subtotal_before_vat * configured_vat_rate)::numeric(12,4);

    estimated_total :=
      (subtotal_before_vat + estimated_vat)::numeric(12,4);

    select
      to_jsonb(billing) - 'organization_id'
    into billing_profile
    from public.clinic_organization_billing_profiles as billing
    where billing.organization_id = organization_row.id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'relationshipId',
            relationship.id,

          'doctorId',
            relationship.doctor_id,

          'doctorName',
            coalesce(
              (
                select translation.title
                from public.doctor_translations as translation
                where translation.doctor_id = relationship.doctor_id
                order by
                  case
                    when translation.locale = 'ro' then 0
                    else 1
                  end,
                  translation.locale
                limit 1
              ),
              nullif(
                concat_ws(
                  ' ',
                  doctor_profile.first_name,
                  doctor_profile.last_name
                ),
                ''
              ),
              relationship.accepted_account_email,
              relationship.invited_doctor_email,
              'Medic invitat'
            ),

          'email',
            coalesce(
              relationship.accepted_account_email,
              relationship.invited_doctor_email
            ),

          'coverageStatus',
            relationship.coverage_status,

          'clinicName',
            coalesce(
              (
                select clinic_translation.name
                from public.clinic_translations as clinic_translation
                where clinic_translation.clinic_id = relationship.clinic_id
                order by
                  case
                    when clinic_translation.locale = 'ro' then 0
                    else 1
                  end,
                  clinic_translation.locale
                limit 1
              ),
              clinic.slug
            ),

          'subscriptionCostRon',
            doctor_price,

          'confirmationSmsCount',
            coalesce((
              select count(*)::integer
              from public.sms_delivery_logs as doctor_sms
              where doctor_sms.doctor_id = relationship.doctor_id
                and doctor_sms.status = 'sent'
                and doctor_sms.event = 'confirmed'
                and doctor_sms.created_at >= month_start
                and doctor_sms.created_at < month_end
            ), 0),

          'reminder24hSmsCount',
            coalesce((
              select count(*)::integer
              from public.sms_delivery_logs as doctor_sms
              where doctor_sms.doctor_id = relationship.doctor_id
                and doctor_sms.status = 'sent'
                and doctor_sms.event = 'reminder_24_hours'
                and doctor_sms.created_at >= month_start
                and doctor_sms.created_at < month_end
            ), 0),

          'totalSmsCount',
            coalesce((
              select count(*)::integer
              from public.sms_delivery_logs as doctor_sms
              where doctor_sms.doctor_id = relationship.doctor_id
                and doctor_sms.status = 'sent'
                and doctor_sms.event in ('confirmed', 'reminder_24_hours')
                and doctor_sms.created_at >= month_start
                and doctor_sms.created_at < month_end
            ), 0),

          'smsCostRon',
            (
              coalesce((
                select count(*)::integer
                from public.sms_delivery_logs as doctor_sms
                where doctor_sms.doctor_id = relationship.doctor_id
                  and doctor_sms.status = 'sent'
                  and doctor_sms.created_at >= month_start
                  and doctor_sms.created_at < month_end
              ), 0) * sms_price
            )::numeric(12,4),

          'estimatedDoctorTotalRon',
            (
              doctor_price +
              (
                coalesce((
                  select count(*)::integer
                  from public.sms_delivery_logs as doctor_sms
                  where doctor_sms.doctor_id = relationship.doctor_id
                    and doctor_sms.status = 'sent'
                    and doctor_sms.created_at >= month_start
                    and doctor_sms.created_at < month_end
                ), 0) * sms_price
              )
            )::numeric(12,4)
        )
        order by
          coalesce(
            relationship.accepted_account_email,
            relationship.invited_doctor_email
          )
      ),
      '[]'::jsonb
    )
    into doctor_rows
    from public.clinic_doctor_relationships as relationship
    left join public.doctors as doctor
      on doctor.id = relationship.doctor_id
    left join public.profiles as doctor_profile
      on doctor_profile.id = doctor.profile_id
    left join public.clinics as clinic
      on clinic.id = relationship.clinic_id
    where relationship.organization_id = organization_row.id
      and relationship.payment_responsibility = 'clinic_paid'
      and relationship.coverage_status = 'active'
      and coalesce(
        nullif(trim(relationship.accepted_account_email), ''),
        nullif(trim(relationship.invited_doctor_email), '')
      ) is not null;

    organization_summary := jsonb_build_object(
      'organization',
        jsonb_build_object(
          'id', organization_row.id,
          'name', organization_row.name,
          'status', organization_row.status,
          'contactEmail', organization_row.contact_email,
          'contactPhone', organization_row.contact_phone
        ),

      'billingProfile',
        billing_profile,

      'approvedLocationCount',
        approved_location_count,

      'activeDoctorCount',
        active_doctor_count,

      'confirmationSmsCount',
        confirmation_sms_count,

      'reminder24hSmsCount',
        reminder_sms_count,

      'totalSmsCount',
        total_sms_count,

      'subscriptionSubtotalRon',
        subscription_subtotal,

      'smsSubtotalRon',
        sms_subtotal,

      'subtotalBeforeVatRon',
        subtotal_before_vat,

      'estimatedVatRon',
        estimated_vat,

      'estimatedTotalRon',
        estimated_total,

      'doctors',
        doctor_rows
    );

    organization_summaries :=
      organization_summaries ||
      jsonb_build_array(organization_summary);

    global_location_count :=
      global_location_count + approved_location_count;

    global_active_doctor_count :=
      global_active_doctor_count + active_doctor_count;

    global_confirmation_sms_count :=
      global_confirmation_sms_count + confirmation_sms_count;

    global_reminder_sms_count :=
      global_reminder_sms_count + reminder_sms_count;

    global_total_sms_count :=
      global_total_sms_count + total_sms_count;

    global_subscription_subtotal :=
      global_subscription_subtotal + subscription_subtotal;

    global_sms_subtotal :=
      global_sms_subtotal + sms_subtotal;

    global_subtotal_before_vat :=
      global_subtotal_before_vat + subtotal_before_vat;

    global_estimated_vat :=
      global_estimated_vat + estimated_vat;

    global_estimated_total :=
      global_estimated_total + estimated_total;
  end loop;

  return jsonb_build_object(
    'monthStart',
      to_char(
        month_start at time zone 'Europe/Bucharest',
        'YYYY-MM-DD'
      ),

    'monthEndExclusive',
      to_char(
        month_end at time zone 'Europe/Bucharest',
        'YYYY-MM-DD'
      ),

    'prices',
      jsonb_build_object(
        'clinicDoctorMonthlyPriceRon',
          doctor_price,

        'smsUnitPriceRon',
          sms_price,

        'vatRate',
          configured_vat_rate
      ),

    'totals',
      jsonb_build_object(
        'organizationCount',
          global_organization_count,

        'approvedLocationCount',
          global_location_count,

        'activeDoctorCount',
          global_active_doctor_count,

        'confirmationSmsCount',
          global_confirmation_sms_count,

        'reminder24hSmsCount',
          global_reminder_sms_count,

        'totalSmsCount',
          global_total_sms_count,

        'subscriptionSubtotalRon',
          global_subscription_subtotal,

        'smsSubtotalRon',
          global_sms_subtotal,

        'subtotalBeforeVatRon',
          global_subtotal_before_vat,

        'estimatedVatRon',
          global_estimated_vat,

        'estimatedTotalRon',
          global_estimated_total
      ),

    'organizations',
      organization_summaries
  );
end;
$function$;

revoke all
on function public.get_admin_clinic_billing_month_summary(date)
from public;

grant execute
on function public.get_admin_clinic_billing_month_summary(date)
to authenticated;

comment on function public.get_admin_clinic_billing_month_summary(date) is
  'Returns a live clinic billing overview for an active RomDoc administrator. Uses current configured prices and does not create invoices or locked billing snapshots.';

commit;
