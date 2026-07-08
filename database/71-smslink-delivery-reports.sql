-- =====================================================
-- ROMDOC SMSLINK DELIVERY REPORTS
-- File: ROMDOC/database/71-smslink-delivery-reports.sql
-- =====================================================

alter table public.sms_delivery_logs
  add column if not exists delivery_report_status text,
  add column if not exists delivery_report_received_at timestamptz,
  add column if not exists delivery_report_raw jsonb,
  add column if not exists provider_status_code text,
  add column if not exists provider_status_message text,
  add column if not exists delivered_at timestamptz,
  add column if not exists failed_at timestamptz;

alter table public.sms_delivery_logs
  drop constraint if exists sms_delivery_logs_delivery_report_status_check;

alter table public.sms_delivery_logs
  add constraint sms_delivery_logs_delivery_report_status_check
  check (
    delivery_report_status is null
    or delivery_report_status in (
      'accepted',
      'delivered',
      'failed',
      'expired',
      'unknown'
    )
  );

create index if not exists idx_sms_delivery_logs_provider_message
  on public.sms_delivery_logs(provider, provider_message_id)
  where provider_message_id is not null;

create index if not exists idx_sms_delivery_logs_delivery_report_status
  on public.sms_delivery_logs(delivery_report_status, delivery_report_received_at desc)
  where delivery_report_status is not null;
