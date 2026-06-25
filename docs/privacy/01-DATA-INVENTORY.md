# RomDoc Data Inventory

Document owner: Cozumel SRL

Review status: Initial technical inventory

Last reviewed: **25 June 2026**

## Classification scale

| Classification | Meaning |
|---|---|
| Public | Intended for public display |
| Internal | Ordinary platform operational data |
| Confidential | Account, commercial, or professional data |
| Restricted | Authentication, authorization, security, or verification documents |
| Highly restricted | Health data, medical notes, or medical documents |

## 1. Public visitor data

| Data | Source | Purpose | Classification | Storage/location | Notes |
|---|---|---|---|---|---|
| IP address | HTTP request | Delivery, security, abuse prevention | Internal | Vercel/provider logs | Retention must be verified |
| User agent | Browser | Compatibility and security | Internal | Vercel/provider logs | Avoid long retention |
| Requested routes | Browser | Delivery and diagnostics | Internal | Vercel logs | Do not log sensitive query content |
| Language preference | Visitor | Romanian/English experience | Internal | URL or browser storage | Essential preference only |
| Selected map location | Visitor | Nearby doctor search | Confidential | Request/query state | Avoid persistent storage unless necessary |
| Google Place ID | Google selection | Resolve address | Confidential | Request and clinic records where applicable | Never expose server key |
| Approximate coordinates | Google Places | Search and clinic location | Confidential/public depending context | Database/query | Clinic coordinates can be public; patient search location should not be retained unnecessarily |

## 2. Patient account data

| Data | Source | Purpose | Classification | Primary system | Notes |
|---|---|---|---|---|---|
| Profile ID | Supabase Auth | Identity linkage | Confidential | Supabase |
| First and last name | Patient | Account and appointments | Confidential | PostgreSQL |
| Email | Patient/Supabase Auth | Login and transactional communication | Confidential | Supabase Auth/PostgreSQL |
| Email verification state | Supabase Auth | Account security | Restricted | Supabase Auth |
| Password verifier/session | Supabase Auth | Authentication | Restricted | Supabase Auth | RomDoc must never access plaintext password |
| Phone | Patient | Appointment coordination | Confidential | PostgreSQL |
| Role | Platform | Authorization | Restricted | PostgreSQL |
| Account status | Platform/admin | Access control | Restricted | PostgreSQL |
| MFA factors, if enabled | Patient/Supabase | Authentication | Restricted | Supabase Auth |
| Reminder preferences | Patient | Control transactional reminders | Confidential | PostgreSQL |
| Reviews | Patient | Public feedback | Public/confidential | PostgreSQL | Author identity should not be unnecessarily public |

## 3. Appointment data

| Data | Source | Purpose | Classification | Notes |
|---|---|---|---|---|
| Doctor and clinic | Patient/platform | Schedule care | Confidential | May reveal health-related intent |
| Requested/scheduled date and time | Patient/doctor | Appointment management | Confidential |
| Patient name, email, phone | Patient/account | Coordination | Confidential |
| Appointment status | Doctor/staff/patient | Lifecycle management | Confidential |
| Appointment source | Platform/doctor/staff | Audit and workflow | Internal |
| Cancellation/reschedule reason | User | Operational context | Confidential; may be health data |
| Free-text appointment message | Patient | Prepare appointment | Highly restricted when symptoms/health information are included |
| Lifecycle audit events | Platform | Accountability and dispute handling | Restricted |
| Notification delivery metadata | Platform/Resend | Reliability and audit | Confidential |
| Provider message ID | Resend | Delivery troubleshooting | Internal |

## 4. Medical Folder data

| Data | Source | Purpose | Classification | Notes |
|---|---|---|---|---|
| Medical note | Doctor | Clinical record and patient access | Highly restricted |
| Prescription | Doctor/upload | Clinical care | Highly restricted |
| Laboratory result | Doctor/patient upload | Clinical care | Highly restricted |
| Imaging result | Doctor/patient upload | Clinical care | Highly restricted |
| Referral | Doctor | Clinical care | Highly restricted |
| Uploaded file | Doctor/patient | Medical record | Highly restricted |
| Storage path/bucket | Platform | File retrieval | Restricted |
| Signed URL | Server | Temporary authorized access | Restricted | Never persist or log full URL |
| Share recipient | Patient | Document sharing | Highly restricted |
| Share start/expiry/revocation | Patient/platform | Access control | Restricted |
| View/download audit | Platform | Security and accountability | Restricted |
| Soft-deletion metadata | Platform/uploader | Controlled deletion | Restricted |

## 5. Doctor and applicant data

| Data | Purpose | Classification | Public? |
|---|---|---|---|
| Name and professional title | Directory | Public | Yes |
| Public biography | Directory | Public | Yes |
| Specialty | Directory/search | Public | Yes |
| Clinic relationships | Directory/search | Public after approval | Yes |
| Consultation price | Directory | Public | Yes |
| Profile photo | Directory | Public | Yes |
| Contact email/phone | Account/operations | Confidential unless expressly published | Usually no |
| Subscription status | Platform access | Confidential | No |
| Stripe customer/subscription IDs | Billing | Restricted | No |
| Professional registration number | Verification | Restricted | No, unless legally justified |
| Issuing authority and expiration | Verification | Confidential/restricted | Badge status only |
| Verification documents | Credential review | Restricted | No |
| Rejection reason/admin notes | Verification | Restricted | No |
| Verification status and date | Trust badge/search | Public subset | Yes |

## 6. Staff, manager, and administrator data

| Data | Purpose | Classification |
|---|---|---|
| Identity and email | Account | Confidential |
| Role and account status | Authorization | Restricted |
| MFA state and factors | Security | Restricted |
| Trusted administrator IP configuration | Security | Restricted |
| Manager invitations | Account provisioning | Restricted |
| Moderation and management audit events | Accountability | Restricted |
| Exceptional support access reason | Accountability | Restricted |

## 7. Billing data

| Data | System | Classification | Rule |
|---|---|---|---|
| Stripe customer ID | Stripe/PostgreSQL | Restricted | Store identifier only |
| Stripe subscription ID | Stripe/PostgreSQL | Restricted | Store identifier only |
| Price ID/billing interval | PostgreSQL | Confidential | Needed for account management |
| Subscription status/dates | PostgreSQL | Confidential | Needed for access/billing |
| Card data | Stripe | Highly restricted | RomDoc must not store full card details |
| Invoice/payment state | Stripe/PostgreSQL | Confidential | Retain under accounting/legal rules |

## 8. Security and operational data

| Data | Purpose | Classification |
|---|---|---|
| Rate-limit keys/counters | Abuse prevention | Restricted |
| Authorization failures | Security | Restricted |
| Cron worker IDs | Operations | Internal |
| Stripe event IDs | Idempotency | Internal |
| Error messages | Diagnostics | Internal/restricted |
| Storage cleanup errors | Recovery | Restricted |
| IP/user-agent logs | Security | Restricted |
| MFA challenge events | Security | Restricted |

## 9. Data minimization decisions

RomDoc should not collect by default:

- CNP;
- full home address;
- national identity documents for patients;
- medical history in general account profiles;
- insurance data without a defined feature;
- full payment-card data;
- unnecessary copies of verification documents;
- permanent patient-location history;
- behavioural advertising profiles.

## 10. Open verification items

- [ ] Confirm all PostgreSQL columns containing personal data.
- [ ] Confirm all private Storage buckets and file categories.
- [ ] Confirm Vercel log fields and retention.
- [ ] Confirm Supabase Auth logs and retention.
- [ ] Confirm Resend delivery-log retention.
- [ ] Confirm Google Maps/Places request data and retention.
- [ ] Confirm Stripe billing records stored locally.
- [ ] Confirm whether reviews expose patient identity.
- [ ] Confirm whether medical notes are legally the clinic's/doctor's medical record.
