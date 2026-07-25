begin;

-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 9.1 — Simplified Clinic Manager operational report RPC
--
-- Target project path:
-- ROMDOC/database/92-clinic-manager-operational-reports.sql
--
-- This migration adds:
--   1. a simple monthly/annual interval marker for client billing terms;
--   2. one read-only aggregate RPC for Clinic Manager reports.
--
-- Deliberately not included:
--   - no new Clinic Manager membership restrictions;
--   - no RLS changes;
--   - no restriction to closed months;
--   - no daily subscription proration;
--   - no VAT or gross calculations;
--   - no patient-identifying or medical information.
-- =====================================================

-- =====================================================
-- 1. SUBSCRIPTION BILLING INTERVAL
-- =====================================================
-- Existing rows remain monthly. For an annual organisation price,
-- subscription_unit_price stores the full annual net price and the
-- report applies one twelfth of that amount to the selected month.

alter table public.client_billing_terms
  add column if not exists subscription_billing_interval text
  not null default 'monthly';

alter table public.client_billing_terms
  drop constraint if exists client_billing_terms_subscription_interval_check;

alter table public.client_billing_terms
  add constraint client_billing_terms_subscription_interval_check
  check (subscription_billing_interval in ('monthly', 'annual'));

comment on column public.client_billing_terms.subscription_billing_interval is
  'Billing interval for subscription_unit_price. monthly = the stored price is the monthly net price; annual = the stored price is the full annual net price and monthly reports use one twelfth.';

-- =====================================================
-- 2. CLINIC MANAGER OPERATIONAL REPORT
-- =====================================================

create or replace function public.get_clinic_manager_operational_report(
  target_organization_id uuid,
  target_month date default null,
  target_clinic_id uuid default null,
  target_doctor_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  requesting_profile_id uuid := auth.uid();
  requesting_role text;
  requesting_account_status text;

  bucharest_today date := (now() at time zone 'Europe/Bucharest')::date;
  report_month_start date;
  report_month_end date;
  report_start_ts timestamptz;
  report_end_ts timestamptz;

  organization_name text;

  configured_subscription_price numeric(12,4);
  applied_monthly_subscription_price numeric(12,4);
  configured_sms_price numeric(12,4);
  configured_currency text;
  configured_subscription_interval text;
  pricing_source text := 'global';
begin
  if requesting_profile_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  select
    profile.role,
    profile.account_status
  into
    requesting_role,
    requesting_account_status
  from public.profiles as profile
  where profile.id = requesting_profile_id;

  if requesting_role is null
    or requesting_account_status is distinct from 'active'
  then
    raise exception 'active_profile_required'
      using errcode = '42501';
  end if;

  if requesting_role not in ('clinic_manager', 'admin') then
    raise exception 'clinic_manager_access_required'
      using errcode = '42501';
  end if;

  if target_organization_id is null then
    raise exception 'organization_required'
      using errcode = '22023';
  end if;

  select organization.name
  into organization_name
  from public.clinic_organizations as organization
  where organization.id = target_organization_id;

  if organization_name is null then
    raise exception 'organization_not_found'
      using errcode = 'P0002';
  end if;

  -- Keep the existing flexible membership model. This checks only that the
  -- current Clinic Manager is already an active member of the requested
  -- organisation. It does not add a one-organisation database restriction.
  if requesting_role = 'clinic_manager'
    and not exists (
      select 1
      from public.clinic_organization_members as member
      where member.organization_id = target_organization_id
        and member.profile_id = requesting_profile_id
        and member.status = 'active'
    )
  then
    raise exception 'organization_access_required'
      using errcode = '42501';
  end if;

  -- The previous calendar month is only the default. Current, past, or future
  -- months can still be explicitly requested by the application.
  report_month_start := date_trunc(
    'month',
    coalesce(
      target_month,
      (bucharest_today - interval '1 month')::date
    )::timestamp
  )::date;

  report_month_end := (report_month_start + interval '1 month')::date;

  report_start_ts :=
    report_month_start::timestamp at time zone 'Europe/Bucharest';
  report_end_ts :=
    report_month_end::timestamp at time zone 'Europe/Bucharest';

  if target_clinic_id is not null
    and not exists (
      select 1
      from public.clinic_organization_clinics as organization_clinic
      where organization_clinic.organization_id = target_organization_id
        and organization_clinic.clinic_id = target_clinic_id
    )
  then
    raise exception 'clinic_not_in_organization'
      using errcode = '22023';
  end if;

  if target_doctor_id is not null
    and not (
      exists (
        select 1
        from public.doctors as doctor
        where doctor.id = target_doctor_id
          and doctor.clinic_organization_id = target_organization_id
      )
      or exists (
        select 1
        from public.clinic_doctor_relationships as relationship
        where relationship.organization_id = target_organization_id
          and relationship.doctor_id = target_doctor_id
      )
    )
  then
    raise exception 'doctor_not_in_organization'
      using errcode = '22023';
  end if;

  -- Start with the existing global invoicing counters. Organisation-specific
  -- terms may override either price while leaving the other one on the global
  -- value, matching the current invoicing behaviour.
  select
    settings.clinic_doctor_monthly_price_ron,
    settings.sms_unit_price_ron
  into
    configured_subscription_price,
    configured_sms_price
  from public.clinic_billing_settings as settings
  where settings.id = 1;

  configured_currency := 'EUR';
  configured_subscription_interval := 'monthly';

  -- Prefer the organisation-specific pricing already managed by the invoicing
  -- area. Effective dates are intentionally flexible and only need to overlap
  -- the selected reporting month.
  select
    coalesce(
      terms.subscription_unit_price,
      configured_subscription_price
    ),
    coalesce(terms.sms_unit_price, configured_sms_price),
    terms.currency,
    terms.subscription_billing_interval
  into
    configured_subscription_price,
    configured_sms_price,
    configured_currency,
    configured_subscription_interval
  from public.client_billing_terms as terms
  where terms.client_type = 'clinic_organization'
    and terms.clinic_organization_id = target_organization_id
    and (
      terms.effective_from is null
      or terms.effective_from < report_month_end
    )
    and (
      terms.effective_until is null
      or terms.effective_until >= report_month_start
    )
  limit 1;

  if found then
    pricing_source := 'organization';
  end if;

  configured_subscription_price :=
    coalesce(configured_subscription_price, 0)::numeric(12,4);
  configured_sms_price :=
    coalesce(configured_sms_price, 0)::numeric(12,4);
  configured_currency :=
    case
      when configured_currency in ('RON', 'EUR') then configured_currency
      else 'EUR'
    end;
  configured_subscription_interval :=
    case
      when configured_subscription_interval = 'annual' then 'annual'
      else 'monthly'
    end;

  applied_monthly_subscription_price :=
    case
      when configured_subscription_interval = 'annual'
        then (configured_subscription_price / 12)::numeric(12,4)
      else configured_subscription_price
    end;

  return (
    with
    organization_doctors as (
      select distinct
        doctor.id as doctor_id,
        coalesce(
          doctor_translation.title,
          nullif(
            concat_ws(
              ' ',
              nullif(trim(profile.first_name), ''),
              nullif(trim(profile.last_name), '')
            ),
            ''
          ),
          doctor.slug
        ) as doctor_name
      from public.doctors as doctor
      left join public.profiles as profile
        on profile.id = doctor.profile_id
      left join lateral (
        select translation.title
        from public.doctor_translations as translation
        where translation.doctor_id = doctor.id
        order by
          case when translation.locale = 'ro' then 0 else 1 end,
          translation.locale
        limit 1
      ) as doctor_translation on true
      where
        doctor.clinic_organization_id = target_organization_id
        or exists (
          select 1
          from public.clinic_doctor_relationships as relationship
          where relationship.organization_id = target_organization_id
            and relationship.doctor_id = doctor.id
        )
    ),

    organization_clinics as (
      select distinct
        clinic.id as clinic_id,
        coalesce(clinic_translation.name, clinic.slug) as clinic_name
      from public.clinic_organization_clinics as organization_clinic
      join public.clinics as clinic
        on clinic.id = organization_clinic.clinic_id
      left join lateral (
        select translation.name
        from public.clinic_translations as translation
        where translation.clinic_id = clinic.id
        order by
          case when translation.locale = 'ro' then 0 else 1 end,
          translation.locale
        limit 1
      ) as clinic_translation on true
      where organization_clinic.organization_id = target_organization_id
    ),

    appointment_scope as (
      select
        appointment.id,
        appointment.doctor_id,
        appointment.clinic_id,
        appointment.source,
        appointment.status,
        appointment.effective_start,
        appointment.effective_start::date as appointment_day
      from public.appointments as appointment
      join organization_doctors as organization_doctor
        on organization_doctor.doctor_id = appointment.doctor_id
      where appointment.effective_start >= report_month_start::timestamp
        and appointment.effective_start < report_month_end::timestamp
        and (
          target_clinic_id is null
          or appointment.clinic_id = target_clinic_id
        )
        and (
          target_doctor_id is null
          or appointment.doctor_id = target_doctor_id
        )
    ),

    appointment_totals as (
      select
        count(*)::integer as total_count,
        count(*) filter (where status = 'pending')::integer
          as pending_count,
        count(*) filter (where status = 'confirmed')::integer
          as confirmed_count,
        count(*) filter (where status = 'rescheduled')::integer
          as rescheduled_count,
        count(*) filter (where status = 'completed')::integer
          as completed_count,
        count(*) filter (where status = 'cancelled')::integer
          as cancelled_count,
        count(*) filter (where status = 'no_show')::integer
          as no_show_count,
        count(*) filter (
          where status in ('confirmed', 'rescheduled')
            and effective_start >= (now() at time zone 'Europe/Bucharest')
        )::integer as upcoming_count
      from appointment_scope
    ),

    status_catalog(status_name, sort_order) as (
      values
        ('pending', 1),
        ('confirmed', 2),
        ('rescheduled', 3),
        ('completed', 4),
        ('cancelled', 5),
        ('no_show', 6)
    ),

    status_counts as (
      select
        catalog.status_name,
        catalog.sort_order,
        count(scope.id)::integer as appointment_count
      from status_catalog as catalog
      left join appointment_scope as scope
        on scope.status = catalog.status_name
      group by catalog.status_name, catalog.sort_order
    ),

    source_catalog(source_name, sort_order) as (
      values
        ('online', 1),
        ('phone', 2),
        ('walk_in', 3),
        ('email', 4),
        ('other', 5)
    ),

    source_counts as (
      select
        catalog.source_name,
        catalog.sort_order,
        count(scope.id)::integer as appointment_count
      from source_catalog as catalog
      left join appointment_scope as scope
        on scope.source = catalog.source_name
      group by catalog.source_name, catalog.sort_order
    ),

    timeline_counts as (
      select
        appointment_day,
        count(*)::integer as total_count,
        count(*) filter (where status = 'completed')::integer
          as completed_count,
        count(*) filter (where status = 'cancelled')::integer
          as cancelled_count,
        count(*) filter (where status = 'no_show')::integer
          as no_show_count
      from appointment_scope
      group by appointment_day
    ),

    clinic_appointment_counts as (
      select
        scope.clinic_id,
        clinic.clinic_name,
        count(*)::integer as total_count,
        count(*) filter (where scope.status = 'completed')::integer
          as completed_count,
        count(*) filter (where scope.status = 'cancelled')::integer
          as cancelled_count,
        count(*) filter (where scope.status = 'no_show')::integer
          as no_show_count
      from appointment_scope as scope
      left join organization_clinics as clinic
        on clinic.clinic_id = scope.clinic_id
      group by scope.clinic_id, clinic.clinic_name
    ),

    doctor_appointment_counts as (
      select
        scope.doctor_id,
        doctor.doctor_name,
        count(*)::integer as total_count,
        count(*) filter (where scope.status = 'completed')::integer
          as completed_count,
        count(*) filter (where scope.status = 'cancelled')::integer
          as cancelled_count,
        count(*) filter (where scope.status = 'no_show')::integer
          as no_show_count
      from appointment_scope as scope
      join organization_doctors as doctor
        on doctor.doctor_id = scope.doctor_id
      group by scope.doctor_id, doctor.doctor_name
    ),

    subscription_doctors as (
      select distinct relationship.doctor_id
      from public.clinic_doctor_relationships as relationship
      where relationship.organization_id = target_organization_id
        and relationship.doctor_id is not null
        and relationship.invitation_status = 'accepted'
        and relationship.payment_responsibility = 'clinic_paid'
        and relationship.coverage_status in (
          'active',
          'paused',
          'cancelled',
          'ended'
        )
        and coalesce(
          relationship.coverage_started_at,
          relationship.accepted_at,
          relationship.created_at
        ) < report_end_ts
        and (
          relationship.coverage_ended_at is null
          or relationship.coverage_ended_at >= report_start_ts
        )
        and (
          target_clinic_id is null
          or relationship.clinic_id = target_clinic_id
        )
        and (
          target_doctor_id is null
          or relationship.doctor_id = target_doctor_id
        )
    ),

    organization_sms_scope as (
      select
        sms.id,
        sms.doctor_id,
        sms.clinic_id,
        sms.status
      from public.sms_delivery_logs as sms
      where sms.created_at >= report_start_ts
        and sms.created_at < report_end_ts
        and sms.doctor_id is not null
        and sms.payer_type is distinct from 'romdoc'
        and (
          sms.payer_clinic_organization_id = target_organization_id
          or (
            sms.payer_clinic_organization_id is null
            and (
              exists (
                select 1
                from public.doctors as doctor
                where doctor.id = sms.doctor_id
                  and doctor.clinic_organization_id = target_organization_id
              )
              or exists (
                select 1
                from public.clinic_doctor_relationships as relationship
                where relationship.organization_id = target_organization_id
                  and relationship.doctor_id = sms.doctor_id
                  and relationship.payment_responsibility = 'clinic_paid'
              )
            )
          )
        )
        and (
          target_doctor_id is null
          or sms.doctor_id = target_doctor_id
        )
        and (
          target_clinic_id is null
          or sms.clinic_id = target_clinic_id
          or (
            sms.clinic_id is null
            and exists (
              select 1
              from public.clinic_doctor_relationships as relationship
              where relationship.organization_id = target_organization_id
                and relationship.doctor_id = sms.doctor_id
                and relationship.clinic_id = target_clinic_id
            )
          )
        )
    ),

    sms_by_doctor as (
      select
        sms.doctor_id,
        count(*) filter (where sms.status = 'sent')::integer
          as sent_count,
        count(*)::integer as cost_record_count
      from organization_sms_scope as sms
      group by sms.doctor_id
    ),

    report_doctor_ids as (
      select doctor_id from subscription_doctors
      union
      select doctor_id from sms_by_doctor
      union
      select doctor_id from doctor_appointment_counts
    ),

    doctor_clinic_names as (
      select
        relationship.doctor_id,
        array_agg(
          distinct clinic.clinic_name
          order by clinic.clinic_name
        ) filter (where clinic.clinic_name is not null) as clinic_names
      from public.clinic_doctor_relationships as relationship
      left join organization_clinics as clinic
        on clinic.clinic_id = relationship.clinic_id
      where relationship.organization_id = target_organization_id
        and relationship.doctor_id is not null
      group by relationship.doctor_id
    ),

    doctor_cost_rows as (
      select
        doctor.doctor_id,
        doctor.doctor_name,
        coalesce(clinic_names.clinic_names, array[]::text[]) as clinic_names,
        exists (
          select 1
          from subscription_doctors as subscription
          where subscription.doctor_id = doctor.doctor_id
        ) as has_subscription,
        coalesce(sms.sent_count, 0)::integer as sms_sent,
        coalesce(sms.cost_record_count, 0)::integer as sms_cost_record_count,
        coalesce(appointments.completed_count, 0)::integer
          as completed_appointments
      from report_doctor_ids as report_doctor
      join organization_doctors as doctor
        on doctor.doctor_id = report_doctor.doctor_id
      left join doctor_clinic_names as clinic_names
        on clinic_names.doctor_id = doctor.doctor_id
      left join sms_by_doctor as sms
        on sms.doctor_id = doctor.doctor_id
      left join doctor_appointment_counts as appointments
        on appointments.doctor_id = doctor.doctor_id
    ),

    cost_totals as (
      select
        (select count(*)::integer from subscription_doctors)
          as subscription_count,
        (select count(*)::integer from organization_sms_scope)
          as sms_cost_record_count,
        (select count(*) filter (where status = 'sent')::integer
         from organization_sms_scope)
          as sms_sent_count,
        (select completed_count from appointment_totals)
          as completed_appointments
    )

    select jsonb_build_object(
      'organization',
        jsonb_build_object(
          'id', target_organization_id,
          'name', organization_name
        ),

      'period',
        jsonb_build_object(
          'month', to_char(report_month_start, 'YYYY-MM'),
          'startDate', to_char(report_month_start, 'YYYY-MM-DD'),
          'endDate', to_char(report_month_end - 1, 'YYYY-MM-DD'),
          'isCurrentMonth',
            report_month_start = date_trunc('month', bucharest_today)::date
        ),

      'selectedFilters',
        jsonb_build_object(
          'clinicId', target_clinic_id,
          'doctorId', target_doctor_id
        ),

      'filterOptions',
        jsonb_build_object(
          'clinics',
            coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', clinic.clinic_id,
                    'name', clinic.clinic_name
                  )
                  order by clinic.clinic_name
                )
                from organization_clinics as clinic
              ),
              '[]'::jsonb
            ),
          'doctors',
            coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', doctor.doctor_id,
                    'name', doctor.doctor_name
                  )
                  order by doctor.doctor_name
                )
                from organization_doctors as doctor
              ),
              '[]'::jsonb
            )
        ),

      'summary',
        (
          select jsonb_build_object(
            'total', totals.total_count,
            'pending', totals.pending_count,
            'confirmed', totals.confirmed_count,
            'rescheduled', totals.rescheduled_count,
            'upcoming', totals.upcoming_count,
            'completed', totals.completed_count,
            'cancelled', totals.cancelled_count,
            'noShow', totals.no_show_count,
            'completionRate',
              case
                when totals.total_count = 0 then 0
                else round(
                  totals.completed_count::numeric * 100
                  / totals.total_count,
                  2
                )
              end,
            'cancellationRate',
              case
                when totals.total_count = 0 then 0
                else round(
                  totals.cancelled_count::numeric * 100
                  / totals.total_count,
                  2
                )
              end,
            'noShowRate',
              case
                when totals.total_count = 0 then 0
                else round(
                  totals.no_show_count::numeric * 100
                  / totals.total_count,
                  2
                )
              end
          )
          from appointment_totals as totals
        ),

      'costSummary',
        (
          select jsonb_build_object(
            'subscriptionCount', totals.subscription_count,
            'subscriptionPlan', configured_subscription_interval,
            'configuredSubscriptionPriceNet',
              round(configured_subscription_price, 2),
            'subscriptionUnitPriceNet',
              round(applied_monthly_subscription_price, 2),
            'subscriptionNet',
              round(
                totals.subscription_count
                * applied_monthly_subscription_price,
                2
              ),
            'smsSent', totals.sms_sent_count,
            'smsUnitPriceNet', round(configured_sms_price, 2),
            'smsNet',
              round(
                totals.sms_cost_record_count * configured_sms_price,
                2
              ),
            'totalNet',
              round(
                (
                  totals.subscription_count
                  * applied_monthly_subscription_price
                )
                + (
                  totals.sms_cost_record_count
                  * configured_sms_price
                ),
                2
              ),
            'completedAppointments', totals.completed_appointments,
            'costPerCompletedAppointment',
              case
                when totals.completed_appointments = 0 then 0
                else round(
                  (
                    (
                      totals.subscription_count
                      * applied_monthly_subscription_price
                    )
                    + (
                      totals.sms_cost_record_count
                      * configured_sms_price
                    )
                  ) / totals.completed_appointments,
                  2
                )
              end,
            'currency', configured_currency,
            'pricingSource', pricing_source,
            'amountsAreNet', true
          )
          from cost_totals as totals
        ),

      'timeline',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'date', to_char(timeline.appointment_day, 'YYYY-MM-DD'),
                'total', timeline.total_count,
                'completed', timeline.completed_count,
                'cancelled', timeline.cancelled_count,
                'noShow', timeline.no_show_count
              )
              order by timeline.appointment_day
            )
            from timeline_counts as timeline
          ),
          '[]'::jsonb
        ),

      'byStatus',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'status', status.status_name,
                'count', status.appointment_count
              )
              order by status.sort_order
            )
            from status_counts as status
          ),
          '[]'::jsonb
        ),

      'bySource',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'source', source.source_name,
                'count', source.appointment_count
              )
              order by source.sort_order
            )
            from source_counts as source
          ),
          '[]'::jsonb
        ),

      'byClinic',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'clinicId', clinic.clinic_id,
                'clinicName', clinic.clinic_name,
                'total', clinic.total_count,
                'completed', clinic.completed_count,
                'cancelled', clinic.cancelled_count,
                'noShow', clinic.no_show_count
              )
              order by clinic.clinic_name nulls last
            )
            from clinic_appointment_counts as clinic
          ),
          '[]'::jsonb
        ),

      'byDoctor',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'doctorId', doctor.doctor_id,
                'doctorName', doctor.doctor_name,
                'total', doctor.total_count,
                'completed', doctor.completed_count,
                'cancelled', doctor.cancelled_count,
                'noShow', doctor.no_show_count
              )
              order by doctor.doctor_name
            )
            from doctor_appointment_counts as doctor
          ),
          '[]'::jsonb
        ),

      'costsByDoctor',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'doctorId', cost.doctor_id,
                'doctorName', cost.doctor_name,
                'clinicNames', to_jsonb(cost.clinic_names),
                'subscriptionPlan',
                  case
                    when cost.has_subscription
                      then configured_subscription_interval
                    else null
                  end,
                'subscriptionNet',
                  case
                    when cost.has_subscription
                      then round(applied_monthly_subscription_price, 2)
                    else 0
                  end,
                'smsSent', cost.sms_sent,
                'smsNet',
                  round(
                    cost.sms_cost_record_count * configured_sms_price,
                    2
                  ),
                'totalNet',
                  round(
                    (
                      case
                        when cost.has_subscription
                          then applied_monthly_subscription_price
                        else 0
                      end
                    )
                    + (
                      cost.sms_cost_record_count * configured_sms_price
                    ),
                    2
                  ),
                'completedAppointments', cost.completed_appointments,
                'costPerCompletedAppointment',
                  case
                    when cost.completed_appointments = 0 then 0
                    else round(
                      (
                        (
                          case
                            when cost.has_subscription
                              then applied_monthly_subscription_price
                            else 0
                          end
                        )
                        + (
                          cost.sms_cost_record_count
                          * configured_sms_price
                        )
                      ) / cost.completed_appointments,
                      2
                    )
                  end,
                'currency', configured_currency
              )
              order by cost.doctor_name
            )
            from doctor_cost_rows as cost
          ),
          '[]'::jsonb
        ),

      'noticeCode', 'net_amounts_vat_calculated_at_invoicing'
    )
  );
end;
$function$;

revoke all
on function public.get_clinic_manager_operational_report(
  uuid,
  date,
  uuid,
  uuid
)
from public;

grant execute
on function public.get_clinic_manager_operational_report(
  uuid,
  date,
  uuid,
  uuid
)
to authenticated;

comment on function public.get_clinic_manager_operational_report(
  uuid,
  date,
  uuid,
  uuid
) is
  'Returns aggregate appointment and net operational cost data for one Clinic Organisation and selected month. The previous month is only the default. No patient identity, medical data, VAT, gross amounts, or daily subscription proration are returned.';

commit;
