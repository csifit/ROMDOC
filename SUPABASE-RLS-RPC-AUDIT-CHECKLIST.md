# RomDoc Step 66A — Supabase RLS and RPC permission audit checklist

## Audit rule

Step 66A is read-only. Do not change policies or grants until the live SQL audit results have been saved and reviewed.

## Critical findings

Treat these as release blockers:

- a client-accessible `public` table has RLS disabled;
- a sensitive storage bucket is public;
- an anonymous user can execute a privileged `SECURITY DEFINER` RPC;
- a write policy allows `anon` or `PUBLIC` without a narrowly justified condition;
- a doctor, staff member, or patient can access another user's private records;
- medical-folder or verification documents can be read without the intended authorization relationship.

## High-priority findings

Review immediately:

- RLS enabled but no policy exists;
- a `SECURITY DEFINER` function has no fixed `search_path`;
- `EXECUTE` remains granted to `PUBLIC` on application RPCs;
- an authenticated role can execute an admin-only or service-only RPC;
- multiple permissive policies overlap for the same command and role;
- an owner-rights view exposes RLS-protected data;
- sensitive tables are unnecessarily included in Realtime publication.

## RomDoc role boundaries

### Anonymous

May read only intentionally public directory data:

- active doctors;
- approved clinics;
- active specialties and cities;
- public translations;
- published and approved reviews;
- public availability needed for booking discovery.

Anonymous users must not:

- create appointments;
- read profiles;
- read private appointment data;
- call patient, doctor, staff, admin, reminder, verification, or medical-folder mutation RPCs;
- read private storage objects.

### Patient

May:

- read and update the patient's own allowed profile fields;
- create an appointment for the authenticated patient;
- read appointment history belonging to that patient;
- cancel the patient's own eligible appointment through the approved RPC;
- read the patient's own medical folder and audit history;
- manage the patient's own document-sharing permissions.

Must not:

- reschedule appointments;
- modify lifecycle audit records;
- read another patient's records;
- delete documents uploaded by a doctor;
- impersonate another patient by submitting a different profile ID.

### Doctor

May access only the doctor's own practice data:

- profile;
- services;
- specialties;
- clinics/clinic proposals;
- availability;
- appointments assigned to that doctor;
- authorized patient-folder items and documents;
- professional-verification submission owned by that doctor.

Must not:

- access another doctor's appointments or patients;
- approve the doctor's own verification;
- approve clinics;
- change platform roles or subscription records directly;
- execute admin-only expiration or review RPCs.

### Staff

May manage appointments only for the assigned doctor and clinic.

Must not manage:

- doctor profile;
- specialties;
- services;
- clinics;
- availability;
- verification;
- billing;
- reviews;
- medical-folder data unless explicitly added later.

### Admin

Admin access must be verified from the current authenticated profile inside every privileged RPC or through a narrowly reviewed helper such as `public.is_admin()`.

Admin-only functions should not be executable by `anon`. Prefer explicit `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` followed by the minimum required grant when the function is intended only for server-side `service_role` execution.

## SECURITY DEFINER review

For every function:

1. Confirm `set search_path = public` or a stricter safe value.
2. Confirm all sensitive objects are schema-qualified.
3. Confirm the function validates `auth.uid()` or an appropriate server-only secret/role.
4. Confirm supplied profile IDs cannot override the caller's identity.
5. Confirm the function checks resource ownership after locking or loading the target row.
6. Confirm status transitions use an allowlist.
7. Confirm error messages do not disclose private data.
8. Confirm `EXECUTE` is revoked from unintended roles.
9. Confirm trigger-only helper functions are not exposed as public RPCs.
10. Confirm return values do not leak private columns.

## Storage review

Private buckets expected for:

- doctor verification documents;
- patient medical-folder documents;
- generated medical PDFs where applicable.

For each private bucket verify separate policies for:

- INSERT;
- SELECT;
- UPDATE, only if required;
- DELETE, only for the permitted uploader/owner.

Do not rely only on filename prefixes supplied by the client. Cross-check the storage path against a database record and authenticated ownership relationship.

## Completion criteria

Step 66A is complete when:

- all 20 SQL result sets have been reviewed;
- the summary reports zero public tables without RLS;
- no sensitive bucket is public;
- every callable `SECURITY DEFINER` function has an intended role matrix;
- no privileged RPC is unintentionally executable by `PUBLIC` or `anon`;
- all high-risk findings are assigned to Step 66B remediation;
- no remediation SQL has been run prematurely.
