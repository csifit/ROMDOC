# Step 66A — Supabase RLS and RPC permission audit

Create:

- `ROMDOC/database/audits/44-supabase-rls-rpc-permission-audit.sql`
- `ROMDOC/SUPABASE-RLS-RPC-AUDIT-CHECKLIST.md`

No migration should be applied in Step 66A.

## Run

1. Open Supabase Dashboard.
2. Open SQL Editor.
3. Paste or open `44-supabase-rls-rpc-permission-audit.sql`.
4. Run each numbered query separately.
5. Export or copy each result.
6. Compare the results against the checklist.
7. Do not change policies until Step 66B remediation is prepared.

## Main audit areas

- RLS coverage and policy inventory;
- broad or unconditional write policies;
- direct grants to `anon` and `authenticated`;
- SECURITY DEFINER RPC ownership, search path, and EXECUTE grants;
- views that may bypass caller RLS;
- private storage buckets and `storage.objects` policies;
- overlapping permissive policies;
- Realtime publication exposure.
