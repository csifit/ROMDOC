-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 116: Telehealth anonymous privilege hardening
--
-- RLS already returns no rows to anonymous callers for these
-- tables. Revoke table-level SELECT as an additional boundary.
-- =====================================================

begin;

revoke all on public.telehealth_payments from anon;
revoke all on public.telehealth_audit_events from anon;

commit;
