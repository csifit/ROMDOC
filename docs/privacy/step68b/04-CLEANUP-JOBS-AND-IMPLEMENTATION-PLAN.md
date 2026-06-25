# Cleanup Jobs and Implementation Plan

## Proposed implementation phases

### 68B-1 — Database foundation

Create migration:

`ROMDOC/database/48-privacy-retention-and-account-closure.sql`

Proposed additions:

- account closure request table;
- legal-hold table;
- retention execution log;
- account-status values;
- helper functions for hold checks;
- restricted privacy-admin policies.

### 68B-2 — Patient closure request UI

Create:

- `ROMDOC/romdoc/src/app/patient-dashboard/account/page.tsx`
- `ROMDOC/romdoc/src/components/patient/patient-account-settings.tsx`
- `ROMDOC/romdoc/src/app/api/patient/account-closure/route.ts`

The UI should be calm and not prominent in normal appointment flows.

### 68B-3 — Retention processor cron

Create:

`ROMDOC/romdoc/src/app/api/cron/privacy-retention/route.ts`

Recommended schedule:

- daily during low traffic;
- bounded batch size;
- `CRON_SECRET` authentication;
- stale-lock recovery;
- dry-run mode in Preview only;
- no personal data in response summaries.

### 68B-4 — Anonymization executor

Implement server-side routines for:

- ordinary patient profile anonymization;
- review author anonymization;
- support-ticket cleanup;
- expired invitation cleanup;
- email-delivery log cleanup;
- security-log cleanup;
- verification-document cleanup;
- Storage deletion after database authorization.

### 68B-5 — Privacy-case administration

Create later in Step 68D:

- privacy request cases;
- identity verification;
- export/delete/restrict workflows;
- completion evidence.

## Retention execution log

Proposed table:

`privacy_retention_runs`

Columns:

- `id`
- `policy_version`
- `job_type`
- `started_at`
- `completed_at`
- `status`
- `scanned_count`
- `deleted_count`
- `anonymized_count`
- `held_count`
- `failed_count`
- `error_summary`

Do not store record contents in this table.

## Dry-run requirement

Before enabling deletion in Production:

1. run in report-only mode;
2. review counts;
3. sample affected records using authorized internal tooling;
4. verify legal holds;
5. confirm backups;
6. enable deletion per data class, not all at once.
