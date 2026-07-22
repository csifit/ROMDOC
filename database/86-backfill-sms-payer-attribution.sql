-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Group 7G.1 Fix 2: Backfill SMS payer attribution
--
-- Project path:
-- ROMDOC/database/86-backfill-sms-payer-attribution.sql
--
-- Purpose:
-- - Preserve SMS logs already sent before payer fields were populated.
-- - Attribute clinic-invited Doctor SMS usage to the immutable Clinic
--   Organisation stored on public.doctors.clinic_organization_id.
-- - Keep Independent Doctor SMS usage assigned to the Doctor.
--
-- This migration does not create invoices and does not modify SMS content.
-- =====================================================

begin;

-- Older sent logs may have a null invoice status. They are billable usage,
-- provided that the delivery status is "sent".
update public.sms_delivery_logs
set invoice_status = 'uninvoiced'
where status = 'sent'
  and invoice_status is null;

-- The Doctor account model makes account_type and clinic_organization_id
-- immutable. It is therefore safe to use them to repair older payer metadata.
update public.sms_delivery_logs as sms
set
  payer_type = 'clinic_organization',
  payer_clinic_organization_id = doctor.clinic_organization_id,
  payer_note = case
    when nullif(trim(sms.payer_note), '') is null
      then 'Backfilled from the immutable Doctor account link by Group 7G.1 Fix 2.'
    else sms.payer_note
  end
from public.doctors as doctor
where doctor.id = sms.doctor_id
  and doctor.account_type = 'clinic_invited'
  and doctor.clinic_organization_id is not null
  and sms.status = 'sent'
  and sms.invoice_status <> 'not_billable'
  and coalesce(sms.payer_type, 'doctor') in (
    'doctor',
    'clinic_organization'
  )
  and (
    sms.payer_type is distinct from 'clinic_organization'
    or sms.payer_clinic_organization_id
      is distinct from doctor.clinic_organization_id
  );

-- Ensure Independent Doctor logs do not retain an accidental Clinic payer.
-- Explicit RomDoc/not-billable assignments are intentionally left unchanged.
update public.sms_delivery_logs as sms
set
  payer_type = 'doctor',
  payer_clinic_organization_id = null,
  payer_note = case
    when nullif(trim(sms.payer_note), '') is null
      then 'Backfilled from the immutable Independent Doctor account type by Group 7G.1 Fix 2.'
    else sms.payer_note
  end
from public.doctors as doctor
where doctor.id = sms.doctor_id
  and doctor.account_type = 'independent'
  and sms.status = 'sent'
  and sms.invoice_status <> 'not_billable'
  and coalesce(sms.payer_type, 'doctor') in (
    'doctor',
    'clinic_organization'
  )
  and (
    sms.payer_type is distinct from 'doctor'
    or sms.payer_clinic_organization_id is not null
  );

commit;

-- =====================================================
-- OPTIONAL VERIFICATION
-- Shows sent SMS usage for the current Bucharest month.
-- =====================================================
select
  sms.created_at,
  sms.event,
  sms.status,
  sms.invoice_status,
  sms.doctor_id,
  doctor.account_type,
  sms.payer_type,
  sms.payer_clinic_organization_id,
  doctor.clinic_organization_id as doctor_organization_id
from public.sms_delivery_logs as sms
left join public.doctors as doctor
  on doctor.id = sms.doctor_id
where sms.status = 'sent'
  and sms.created_at >= (
    date_trunc('month', now() at time zone 'Europe/Bucharest')
      at time zone 'Europe/Bucharest'
  )
  and sms.created_at < (
    (date_trunc('month', now() at time zone 'Europe/Bucharest')
      + interval '1 month')
      at time zone 'Europe/Bucharest'
  )
order by sms.created_at desc;
