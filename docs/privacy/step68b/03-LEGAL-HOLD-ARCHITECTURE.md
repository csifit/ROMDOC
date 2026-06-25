# Legal Hold Architecture

Operator: `[Cozumel SRL]`
Registered address: `[410154, Oradea, Str. Dr. Louis Pasteur 38, ap 31, jud. Bihor, Romania]`

> COMPANY DETAILS REQUIRED BEFORE LAUNCH.

## Purpose

A legal hold temporarily prevents deletion or anonymization of narrowly defined records when required for a dispute, investigation, regulatory request, fraud case, security incident, or legal obligation.

## Rules

1. A legal hold is exceptional, not a default retention extension.
2. It must target specific records or subjects.
3. It must include a reason and owner.
4. It must have a review date.
5. It must not make retained data available to ordinary users or managers.
6. Release the hold promptly when no longer necessary.

## Proposed table

`privacy_legal_holds`

Recommended columns:

- `id uuid primary key`
- `subject_profile_id uuid null`
- `resource_type text not null`
- `resource_id uuid null`
- `scope_json jsonb not null default '{}'`
- `reason text not null`
- `legal_reference text null`
- `status text not null` (`active`, `released`, `expired`)
- `created_by_profile_id uuid not null`
- `approved_by_profile_id uuid null`
- `created_at timestamptz not null`
- `review_at timestamptz not null`
- `released_at timestamptz null`
- `release_reason text null`

## Authorization

- create: administrator only, ideally dual approval for medical data;
- view: administrator/privacy officer only;
- manager: no access;
- doctor: no platform legal-hold management;
- patient: informed only where legally appropriate;
- service role: cleanup jobs may read active holds to skip deletion.

## Cleanup integration

Before deleting any retained resource, cleanup logic must call a database function such as:

`is_resource_under_legal_hold(resource_type, resource_id, subject_profile_id)`

If true:

- skip deletion;
- record `legal_hold_skip` in the cleanup audit;
- do not expose hold details in ordinary application responses.
