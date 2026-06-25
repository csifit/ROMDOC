# Step 68B-1 — Privacy database foundation

## Migration

Create:

`ROMDOC/database/48-privacy-retention-and-account-closure.sql`

Run it once in the Supabase SQL Editor.

## What this migration does

- preserves existing `active` and `blocked` account states;
- adds `closure_requested`, `restricted`, and `anonymized`;
- records account-closure workflows;
- records append-oriented closure events;
- creates narrowly scoped legal holds;
- records retention dry runs and execution runs;
- adds a service-role legal-hold check;
- adds authenticated self-service closure RPCs;
- does not delete Auth users;
- does not delete appointments;
- does not delete medical records;
- does not delete Storage objects;
- does not enable the retention executor yet.

## Self-service RPCs

Authenticated non-admin/non-manager users may call:

```sql
select public.request_own_account_closure(
  'Optional reason'
);
```

During the 30-day cooling-off period:

```sql
select public.cancel_own_account_closure();
```

To read the latest status:

```sql
select *
from public.get_own_account_closure_status();
```

## Important product behavior

Requesting closure changes:

```text
profiles.account_status
active → closure_requested
```

This means current route guards that require `account_status = active`
will restrict dashboard access after the request.

The later API/UI step must:

1. show a clear confirmation before calling the RPC;
2. explain the 30-day cooling-off period;
3. sign the user out after a successful request;
4. provide a controlled cancellation/recovery route;
5. not claim that every legal or medical record was immediately deleted.

## Legal holds

Legal holds are service-role managed only.

Managers and ordinary authenticated users receive no direct table access.

Each hold requires:

- a defined resource scope;
- a reason category;
- a written reason;
- creator;
- review date;
- optional expiry;
- release reason.

## Dry-run first

`privacy_retention_runs.run_type` supports:

- `dry_run`
- `execute`

No executor is provided in this step. The future retention cron must begin
with dry-run mode and must check `has_active_privacy_legal_hold()` before
any eligible deletion or anonymization.

## Company information

No company legal name or address is required inside this database migration.

You will still need to complete company details later in the public Privacy,
Terms, Legal Information, and rights-response documents before launch.
