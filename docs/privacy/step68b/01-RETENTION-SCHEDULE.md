# RomDoc Data Retention Schedule

Owner: `[Cozumel SRL]`
Registered address: `410154, Oradea, Str. Dr. Louis Pasteur 38, ap 31, jud. Bihor, Romania`
Privacy contact: `[privacy@romdoc.fit]`
Policy version: Draft 1

> COMPANY DETAILS REQUIRED BEFORE LAUNCH: complete the legal name, registered address, company registration number, VAT number if applicable, and privacy contact.

## Principles

1. Retain personal data only for defined purposes.
2. Use the shortest defensible period.
3. Separate active data from restricted archives.
4. Do not erase records subject to legal, accounting, medical, fraud, dispute, or security obligations.
5. Anonymize where identity is no longer necessary.
6. Review every retention class annually.

## Retention classes

| Class | Default period | End action | Notes |
|---|---:|---|---|
| Active account profile | Account lifetime | Closure workflow | Ordinary profile data only |
| Closure request record | 3 years after completion | Delete/anonymize | Evidence of request handling |
| Authentication sessions | Provider/session lifetime | Automatic expiry | Supabase Auth |
| MFA factors and audit metadata | Account lifetime + 12 months | Delete/restrict | Never store TOTP secrets outside provider |
| Routine security logs | 12 months | Delete/anonymize | Shorter where feasible |
| Confirmed security incidents | 24 months after closure | Restricted deletion review | Extend only when necessary |
| Rate-limit counters | Hours to 30 days | Automatic delete | Depends on counter type |
| Abuse/block evidence | 12 months after last event | Review/delete | Extend for active disputes |
| Appointment scheduling metadata | 5 years after final status | Delete/anonymize review | Legal review required |
| Cancelled appointment without care | 3 years after cancellation | Delete/anonymize | Legal review required |
| Appointment lifecycle audit | 5 years | Restricted delete/anonymize review | Preserve accountability |
| Medical notes | Provider statutory period | Provider-controlled retention | Never use generic platform period |
| Medical-folder files | By document type/provider duty | Restricted cleanup | Sharing revocation is immediate |
| Medical-document access logs | 5 years | Restricted deletion review | High-sensitivity audit evidence |
| Reviews | While published + 3 years after removal | Delete/anonymize | Preserve moderation evidence |
| Review moderation logs | 3 years | Delete/anonymize | Extend for dispute |
| Doctor professional verification, active | Verification lifetime | Supersede/restrict | Public table stores only status/dates |
| Superseded verification documents | 24 months | Delete | Legal review required |
| Rejected verification documents | 12 months after final decision | Delete | Extend for dispute only |
| Stripe subscription metadata | 5 years after financial year | Restricted archive | Confirm with accountant |
| Accounting/tax evidence | Statutory Romanian period | Controlled deletion | Confirm exact document classes |
| Transactional email delivery logs | 12 months | Delete/anonymize | Do not retain full email body |
| Failed email diagnostics | 6 months | Delete | No sensitive content |
| Manager/admin invitations | 12 months after expiry/revocation | Delete/anonymize | Tokens must not be readable |
| Privacy-rights cases | 3 years after closure | Restricted archive/delete | Evidence of compliance |
| Support tickets | 3 years after closure | Delete/anonymize | Shorter for routine issues |
| Cron execution summaries | 12 months | Delete | Avoid personal data |
| Webhook event IDs | 5 years or billing record period | Restricted archive | Store minimal payload metadata |

## Medical-data exception

Patient account closure or deletion must not automatically destroy doctor/clinic records that must be retained for healthcare or legal reasons.

Required behavior:

- remove public and ordinary account access;
- revoke sharing immediately;
- restrict retained medical records;
- preserve provider access only where legally justified;
- show the patient which categories could not be erased and why.

## Review cadence

- quarterly during the first year after launch;
- annually thereafter;
- immediately after legal, product, or provider changes.
