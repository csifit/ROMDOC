# RomDoc Processing Activities Register

This is RomDoc's initial Article 30-style Record of Processing Activities (ROPA).

Legal bases and retention periods marked **LEGAL REVIEW** are proposed technical positions, not final legal conclusions.

## Register fields

Each activity records:

- purpose;
- data subjects;
- data categories;
- special-category data;
- recipients;
- proposed Article 6 basis;
- proposed Article 9 condition where relevant;
- retention;
- security;
- owner;
- status.

---

## PA-01 — Public healthcare directory

**Purpose**

Publish searchable doctor, specialty, city, and approved-clinic information.

**Data subjects**

Doctors and clinic contacts.

**Data**

Public name, title, biography, specialty, clinic, public photo, prices, ratings, verification badge.

**Special-category data**

Normally no patient health data.

**Recipients**

Public internet users, search engines, Vercel, Supabase.

**Proposed Article 6 basis**

Contract and/or legitimate interests, depending on doctor agreement. **LEGAL REVIEW**

**Retention**

While doctor account/profile is active; unpublish promptly after suspension or closure; retain restricted evidence as necessary.

**Security**

Admin/doctor role controls; approval status; public-field allowlist.

**Owner**

Platform operations.

**Status**

Implemented; legal basis and doctor terms require review.

---

## PA-02 — Patient account and authentication

**Purpose**

Create and secure patient accounts and provide appointment/folder access.

**Data subjects**

Patients.

**Data**

Name, email, phone, role, account status, email verification, sessions, optional MFA.

**Special-category data**

Not inherently, unless account fields are misused for health information.

**Recipients**

Supabase, Vercel, authorized RomDoc support.

**Proposed Article 6 basis**

Contract — service requested by the user. **LEGAL REVIEW**

**Retention**

Active account lifetime; proposed 30-day closure period; then deletion/anonymization except restricted legal/security records.

**Security**

Supabase Auth, RLS, email verification, role checks, MFA where enabled.

**Owner**

Platform security.

**Status**

Implemented; closure workflow missing.

---

## PA-03 — Appointment request and lifecycle

**Purpose**

Allow patients to request appointments and doctors/staff to manage them.

**Data subjects**

Patients, doctors, staff.

**Data**

Identity, contact details, doctor, clinic, date/time, status, free-text reason, cancellation/rescheduling details.

**Special-category data**

Yes, where free text or appointment context reveals health information.

**Recipients**

Selected doctor and clinic, authorized staff, Resend, Supabase, Vercel.

**Proposed Article 6 basis**

Contract/steps requested by patient and possibly legitimate interests for audit/security. **LEGAL REVIEW**

**Proposed Article 9 condition**

Potential healthcare provision/management condition involving professionals subject to confidentiality, or another condition depending on RomDoc's role. **LEGAL REVIEW REQUIRED**

**Retention**

Proposed:
- ordinary scheduling metadata: 3–5 years;
- cancelled requests without care: 24–36 months;
- clinical records follow medical-provider duties.

**Security**

Authenticated patient accounts, RLS, doctor/staff scope, lifecycle RPCs, audit history, email logs.

**Owner**

Appointment operations.

**Status**

Implemented; legal-role and retention review required.

---

## PA-04 — Appointment transactional emails and reminders

**Purpose**

Send confirmations, status changes, cancellations, completion notices, and reminders.

**Data subjects**

Patients and doctors.

**Data**

Name, email, doctor, clinic, appointment date/time, status.

**Special-category data**

Appointment context may infer health-related information.

**Recipients**

Resend and email infrastructure.

**Proposed Article 6 basis**

Contract/performance of requested service; legitimate interests for reliability. **LEGAL REVIEW**

**Consent**

Not marketing consent. Patient reminder preferences remain available.

**Retention**

Proposed delivery metadata:
- success: 12 months;
- failure diagnostics: 6–12 months.

**Security**

Provider idempotency, delivery logs, no clinical details beyond necessity.

**Owner**

Platform operations.

**Status**

Implemented; Reply-To and retention policy pending.

---

## PA-05 — Doctor account, subscription, and billing

**Purpose**

Onboard doctors, manage paid access, process subscription lifecycle.

**Data subjects**

Doctors and applicants.

**Data**

Identity, contact details, application, specialty, Stripe identifiers, plan, status, dates.

**Special-category data**

No, unless professional data incidentally includes health information.

**Recipients**

Stripe, Supabase, Vercel, authorized administrators.

**Proposed Article 6 basis**

Contract; legal obligation for financial records. **LEGAL REVIEW**

**Retention**

Account lifetime plus accounting/legal retention; payment-card data remains with Stripe.

**Security**

Stripe Checkout, signed webhooks, event idempotency, server-side service role.

**Owner**

Billing operations.

**Status**

Implemented; accounting retention requires Romanian review.

---

## PA-06 — Professional verification

**Purpose**

Verify doctors' identity and existing right to practise; display trust badge.

**Data subjects**

Doctors.

**Data**

Registration number, authority, professional title, expiration, supporting documents, review decisions.

**Special-category data**

Normally no health data; identity documents may be highly sensitive.

**Recipients**

Authorized administrators/managers only as permitted, Supabase Storage.

**Proposed Article 6 basis**

Contract and/or legitimate interests in platform trust and fraud prevention. **LEGAL REVIEW**

**Retention**

Proposed:
- active evidence while verification is active;
- superseded evidence: 12–24 months;
- rejected evidence: 12 months after final rejection;
- retain public status/dates separately.

**Security**

Private bucket, signed URLs, AAL2/MFA for privileged access, audit events.

**Owner**

Professional verification.

**Status**

Implemented; document minimization and legal retention require review.

---

## PA-07 — Patient Medical Folder

**Purpose**

Allow doctors to create/upload clinical records and patients to view/share them.

**Data subjects**

Patients and doctors.

**Data**

Medical notes, prescriptions, results, referrals, files, sharing permissions, access logs.

**Special-category data**

Yes — health data.

**Recipients**

Patient, uploading doctor, explicitly authorized doctor, technical providers.

**Proposed Article 6 basis**

Contract and/or legal obligation depending on activity. **LEGAL REVIEW**

**Proposed Article 9 condition**

Healthcare provision/management by or under responsibility of professionals subject to confidentiality may be relevant. RomDoc's own role must be assessed. **LEGAL REVIEW REQUIRED**

**Retention**

By record/document type and medical-provider duty. Patient account closure must not automatically delete legally retained clinical records.

**Security**

Private Storage, RLS, signed URLs, sharing expiry/revocation, audit events, no default staff/admin access.

**Owner**

Medical data governance.

**Status**

Implemented foundation; DPIA and final role mapping required.

---

## PA-08 — Reviews and moderation

**Purpose**

Collect and publish patient reviews and moderate inappropriate content.

**Data subjects**

Patients and doctors.

**Data**

Rating, review text, appointment linkage, moderation status/reason.

**Special-category data**

Possible if patient includes health details in review text.

**Recipients**

Public users for published review, administrators/managers, Supabase/Vercel.

**Proposed Article 6 basis**

Legitimate interests and/or contract. **LEGAL REVIEW**

**Retention**

Published while relevant; hidden/removed audit evidence for a defined period, proposed 3 years.

**Security**

Only eligible patients; moderation states; avoid public patient identity where unnecessary.

**Owner**

Trust and safety.

**Status**

Implemented; public identity and retention require confirmation.

---

## PA-09 — Security, abuse prevention, MFA, and audit

**Purpose**

Protect accounts, prevent unauthorized access, investigate incidents.

**Data subjects**

All users and visitors.

**Data**

IP, user agent, role, access attempts, MFA state, rate-limit records, audit events.

**Special-category data**

Not intentionally.

**Recipients**

Authorized security personnel, Supabase, Vercel.

**Proposed Article 6 basis**

Legitimate interests and legal obligations. **LEGAL REVIEW**

**Retention**

Routine: 6–12 months; incidents: up to 24 months or until closure.

**Security**

Restricted access, redaction, no secrets/tokens in logs.

**Owner**

Platform security.

**Status**

Implemented in parts; retention and alerting pending.

---

## PA-10 — Support and privacy requests

**Purpose**

Resolve support issues and exercise data-subject rights.

**Data subjects**

Users, doctors, visitors.

**Data**

Identity, request, correspondence, verification evidence, resolution log.

**Special-category data**

Possible if request concerns medical records.

**Recipients**

Authorized support/privacy staff; email provider.

**Proposed Article 6 basis**

Legal obligation for GDPR rights; contract/support where applicable.

**Retention**

Proposed 3 years after closure of request, subject to claims/legal review.

**Security**

Identity verification, restricted case access, no ordinary manager access to privacy cases unless authorized.

**Owner**

Privacy lead.

**Status**

Formal case-management workflow not yet implemented.

---

## PA-11 — Platform analytics

**Current status**

No non-essential analytics should be assumed active.

**Rule**

If introduced:

- define exact tool and purpose;
- conduct cookie/storage assessment;
- obtain prior consent where required;
- minimize IP/user identifiers;
- never use health or appointment data for behavioural advertising;
- add separate ROPA entry.

---

## PA-12 — Legal and financial compliance

**Purpose**

Maintain invoices, subscription evidence, disputes, and required company records.

**Data subjects**

Doctors, customers, counterparties.

**Data**

Identity, billing IDs, invoices, payment status, correspondence.

**Proposed Article 6 basis**

Legal obligation and contract.

**Retention**

Set according to Romanian accounting/tax requirements. **LEGAL REVIEW**

**Owner**

Finance/legal.

**Status**

Requires formal retention determination.
