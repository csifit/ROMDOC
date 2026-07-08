-- =====================================================
-- ROMDOC SMSLINK PROVIDER
-- File: ROMDOC/database/70-smslink-provider.sql
-- =====================================================

-- This migration changes the default SMS provider from Twilio to SMSLink
-- and allows both providers in historical rows. Existing Twilio log rows
-- remain valid, while new RomDoc SMS settings and delivery logs use SMSLink.

alter table public.sms_platform_settings
  alter column provider set default 'smslink';

alter table public.sms_delivery_logs
  alter column provider set default 'smslink';

alter table public.sms_platform_settings
  drop constraint if exists sms_platform_settings_provider_check;

alter table public.sms_platform_settings
  add constraint sms_platform_settings_provider_check
  check (provider in ('twilio', 'smslink'));

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_provider_check;

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_provider_check
  check (provider in ('twilio', 'smslink'));

update public.sms_platform_settings
set
  provider = 'smslink',
  updated_at = now()
where id = 1
  and provider = 'twilio';
