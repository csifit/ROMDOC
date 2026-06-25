# Account Closure and Anonymization Workflow

Controller placeholder: `[Cozumel SRL]`, `[410154, Oradea, Str. Dr. Louis Pasteur 38, ap 31, jud. Bihor, Romania]`

> COMPANY DETAILS REQUIRED BEFORE LAUNCH.

## Account states

Recommended `profiles.account_status` lifecycle:

- `active`
- `blocked`
- `closure_requested`
- `restricted`
- `anonymized`

Do not hard-delete the profile row immediately.

## Patient closure workflow

1. Patient submits a closure request while authenticated.
2. Require password re-authentication or another strong verification step.
3. Record request time, requester, policy version, and request ID.
4. Revoke active sessions.
5. Disable new appointments and optional communications.
6. Revoke all medical-document shares immediately.
7. Remove public-facing content attributable to the patient where appropriate.
8. Separate data into:
   - deletable ordinary account data;
   - anonymizable platform records;
   - restricted legally retained records;
   - provider-controlled medical records.
9. Apply a 30-day reversible waiting period unless legal review requires another period.
10. Complete anonymization/deletion.
11. Send a closure-completion notice.
12. Keep only minimal evidence of request handling.

## Doctor closure workflow

Doctor closure is more complex because the account may be linked to:

- public profile;
- patient appointments;
- medical notes;
- uploaded documents;
- professional verification;
- Stripe/accounting records;
- staff relationships.

Required behavior:

- immediately unlist public profile when closure is accepted;
- stop new bookings;
- preserve existing patient access where legally required;
- disable staff access;
- retain medical and financial records under their correct retention class;
- never allow a manager to hard-delete the doctor through an ordinary UI action.

## Anonymization fields

When legally permitted, replace identity fields with non-identifying values:

- first name → `Deleted`
- last name → `User`
- email → irreversible synthetic value, for example `deleted+<uuid>@invalid.romdoc`
- phone → null
- avatar/photo → remove
- public biography → remove
- free-text support and appointment content → delete or redact where no longer needed

Do not use reversible encryption as “anonymization” if RomDoc can still restore the identity.

## Referential integrity

Use a stable internal subject ID after anonymization so audit and appointment relationships remain technically valid without ordinary identity data.

## Closure exclusions

A deletion request may not result in deletion where data remains necessary for:

- legal obligations;
- accounting/tax duties;
- defence of legal claims;
- medical-record duties;
- fraud or security investigations;
- active disputes or complaints.

Every exclusion must record:

- data category;
- legal/operational reason;
- responsible owner;
- review date;
- final deletion date or review trigger.
