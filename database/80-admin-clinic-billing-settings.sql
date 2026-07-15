begin;

create table if not exists public.clinic_billing_settings (
  id smallint primary key default 1,
  clinic_doctor_monthly_price_ron numeric(12, 4) not null default 60,
  sms_unit_price_ron numeric(12, 4) not null default 0.35,
  vat_rate numeric(8, 6) not null default 0.21,
  updated_at timestamptz not null default now(),
  updated_by_profile_id uuid null references public.profiles(id) on delete set null,
  constraint clinic_billing_settings_single_row_check check (id = 1),
  constraint clinic_billing_settings_doctor_price_check
    check (clinic_doctor_monthly_price_ron >= 0),
  constraint clinic_billing_settings_sms_price_check
    check (sms_unit_price_ron >= 0),
  constraint clinic_billing_settings_vat_rate_check
    check (vat_rate >= 0 and vat_rate <= 1)
);

insert into public.clinic_billing_settings (
  id,
  clinic_doctor_monthly_price_ron,
  sms_unit_price_ron,
  vat_rate
)
values (
  1,
  60,
  0.35,
  0.21
)
on conflict (id) do update
set
  clinic_doctor_monthly_price_ron =
    case
      when public.clinic_billing_settings.clinic_doctor_monthly_price_ron = 0
        then excluded.clinic_doctor_monthly_price_ron
      else public.clinic_billing_settings.clinic_doctor_monthly_price_ron
    end,
  sms_unit_price_ron =
    case
      when public.clinic_billing_settings.sms_unit_price_ron = 0
        then excluded.sms_unit_price_ron
      else public.clinic_billing_settings.sms_unit_price_ron
    end,
  vat_rate =
    case
      when public.clinic_billing_settings.vat_rate in (0, 0.19)
        then excluded.vat_rate
      else public.clinic_billing_settings.vat_rate
    end,
  updated_at = now();

alter table public.clinic_billing_settings enable row level security;

drop policy if exists
  "Authenticated users can read clinic billing settings"
on public.clinic_billing_settings;

create policy
  "Authenticated users can read clinic billing settings"
on public.clinic_billing_settings
for select
to authenticated
using (true);

comment on table public.clinic_billing_settings is
  'Platform-controlled clinic billing estimate settings. Admin manages these values; Clinic Managers can only read them.';

commit;

select
  id,
  clinic_doctor_monthly_price_ron,
  sms_unit_price_ron,
  vat_rate,
  updated_at
from public.clinic_billing_settings
where id = 1;
