# RomDoc Contract Management Manual

**Document version:** 1.0  
**Applies to:** RomDoc Contract Management Phases 5A–5E  
**Last updated:** 28 July 2026  
**Target project path:** `ROMDOC/docs/instructions/contract-management-manual.md`

> This manual explains how the RomDoc contract system is intended to be used by platform administrators, independent Doctors, and Clinic Managers. It describes the implemented RomDoc workflow. It is an operational product manual, not legal advice.

---

## 1. The system in one minute

The complete contract workflow is:

```text
Admin creates a document draft
→ Admin publishes the document
→ Admin creates a package containing published documents
→ Admin publishes the package
→ Admin assigns the package to an eligible client
→ RomDoc sends a notification
→ the client reviews and accepts when acceptance is required
→ RomDoc stores immutable acceptance evidence
→ RomDoc creates a private accepted PDF
→ RomDoc sends a confirmation email
→ any accepted price difference enters the Admin reconciliation queue
→ Admin updates the operational price manually
→ RomDoc verifies that the values match
→ Admin confirms the manual application
```

The most important rule is:

```text
Contractual price = what the client accepted
Operational price = what RomDoc currently uses for billing
```

These are deliberately separate.

The contract system **never automatically changes** `client_billing_terms`. It also never blocks, suspends, hides, bans, or deletes an account because of a contract, invoice, or unpaid amount.

---

## 2. Who uses the contract system

### 2.1 Platform Administrator

A RomDoc Admin can:

- create contract document drafts;
- edit or delete drafts;
- publish immutable document versions;
- create contract packages;
- publish immutable package versions;
- assign packages to eligible clients;
- retry contract notifications;
- create amendments;
- review electronic acceptances;
- download accepted PDFs;
- review accepted-price differences;
- confirm a manually applied operational price after RomDoc verifies the match.

Contract authoring is Admin-only. A platform Manager does not receive contract-authoring authority.

### 2.2 Independent Doctor

An independent Doctor can:

- open `/doctor-dashboard/contract`;
- review assigned contracts and annexes;
- see contractual terms;
- accept a contract electronically;
- download the accepted PDF when ready;
- review the immutable event history.

### 2.3 Clinic-invited Doctor

A clinic-invited Doctor does **not** have an individual Doctor contract in this system.

The Clinic Organisation is the contracting client. Therefore:

- the Contract sidebar link is hidden;
- `/doctor-dashboard/contract` is not available to the clinic-invited Doctor;
- the applicable contract is handled through the Clinic Manager account.

### 2.4 Clinic Manager

A Clinic Manager can open:

```text
/clinic-manager-dashboard/contract
```

An active Organisation member may review the Organisation’s assigned contract information. Electronic acceptance requires the separate contract-signing permission:

```text
can_sign_contracts = true
```

Organisation owners receive this permission by default in the contract foundation. Other Clinic Managers must be explicitly authorised.

---

## 3. Where everything is located

### Admin

```text
/admin/contracts
```

The Admin page contains five tabs:

| Tab | Purpose |
|---|---|
| Clients | Assign published packages and review recent assignments |
| Templates | Create and publish documents and packages |
| Amendments | Create a new document/package version and assign it |
| Acceptances | Review immutable acceptances and accepted PDFs |
| Price updates | Reconcile accepted prices with operational billing prices |

Open the price queue directly with:

```text
/admin/contracts?tab=prices
```

### Independent Doctor

```text
/doctor-dashboard/contract
```

### Clinic Manager

```text
/clinic-manager-dashboard/contract
```

### Manual operational price editor

```text
/admin/invoices
```

This remains the authoritative place for Admin-managed client-specific operational prices.

---

## 4. The six concepts you need to understand

### 4.1 Contract document

A document is one legal text, for example:

- Doctor services contract;
- Clinic Organisation contract;
- pricing annex;
- consolidated billing annex;
- data processing agreement;
- security annex;
- operational annex;
- individual amendment.

A document begins as a **draft**.

While it is a draft, Admin may edit it. After publication, it is immutable.

### 4.2 Contract package

A package is the complete bundle presented to a client.

Example:

```text
Independent Doctor Package v1.0
├── Doctor Services Contract v1.0
├── Pricing Annex v1.0
├── Data Processing Agreement v1.0
└── Security Annex v1.0
```

A package may target only one client type:

- `independent_doctor`; or
- `clinic_organization`.

A package also has one language:

- Romanian;
- English; or
- German.

Only published documents compatible with the package type and language should be included.

### 4.3 Assignment

An assignment connects one published package version to one client.

The client is either:

- one independent Doctor; or
- one Clinic Organisation.

The assignment stores a snapshot of the proposed contractual commercial terms. It does not modify operational billing.

### 4.4 Electronic acceptance

Acceptance records evidence such as:

- the exact package version;
- the exact document versions and HTML snapshots;
- package and document hashes;
- the accepted commercial terms;
- the represented legal entity;
- the representative’s name and capacity;
- the exact checkbox declaration;
- language;
- acceptance timestamp;
- IP address when available;
- user agent;
- an acceptance-evidence SHA-256 hash.

An acceptance is immutable.

### 4.5 Accepted PDF

After acceptance, RomDoc generates a PDF from the immutable snapshots and stores it in the private Storage bucket:

```text
accepted-contracts
```

A ready PDF remains private and is downloaded through a temporary authorised link.

### 4.6 Contract event history

The history is append-only. Events may include:

- assigned;
- notified;
- viewed;
- acceptance started;
- accepted;
- PDF generated or failed;
- confirmation email sent or failed;
- superseded;
- cancelled;
- price update pending;
- price applied.

Existing events are not edited or deleted.

---

## 5. Status glossary

### 5.1 Document and package statuses

| Status | Meaning |
|---|---|
| `draft` | Editable working version |
| `published` | Final immutable version |

### 5.2 Assignment statuses

| Status | Meaning |
|---|---|
| `assigned` | Package was assigned but notification/acceptance is not complete |
| `notified` | Notice-only assignment was successfully notified |
| `awaiting_acceptance` | Client must accept electronically |
| `accepted` | Client accepted; evidence exists |
| `effective` | The assignment is considered in force |
| `superseded` | A later accepted/effective version replaced it |
| `cancelled` | A pending assignment was cancelled manually |
| `terminated` | An accepted/effective relationship was ended through a later controlled process |

### 5.3 PDF statuses

| Status | Meaning |
|---|---|
| `pending` | PDF generation has not completed |
| `ready` | PDF is available |
| `failed` | Acceptance is valid, but PDF generation needs attention |

A failed PDF does not cancel an electronic acceptance.

### 5.4 Price reconciliation states

Operationally, the Admin queue distinguishes:

| State | Meaning |
|---|---|
| Needs update | At least one accepted value differs from the effective operational value |
| Ready to confirm | All tracked values match; Admin may confirm |
| Verified | A comparison-verified `price_applied` event exists |
| Legacy unverified | An older confirmation exists without Phase 5E comparison evidence; verify it once |

---

## 6. Before using contracts for the first time

Confirm that migrations were installed in this order:

```text
94-contract-management-foundation.sql
95-contract-electronic-acceptance.sql
96-contract-admin-management.sql
97-contract-price-reconciliation.sql
```

Confirm the application environment contains:

```env
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_CONTRACTS_FROM_EMAIL=RomDoc <admin@romdoc.fit>
ROMDOC_CONTRACTS_EMAIL=admin@romdoc.fit
NEXT_PUBLIC_SITE_URL=https://www.romdoc.fit
```

Before assigning a contract, also confirm:

- the recipient account exists;
- an independent Doctor has `account_type = independent`;
- the Doctor or Organisation is available in the Admin client list;
- legal and billing details are complete;
- a Clinic Organisation has at least one authorised signer;
- all documents intended for the package are published;
- package language matches the documents;
- the sender domain is verified in Resend.

---

# Part I — Daily Admin operations

## 7. Create the first contract document

Open:

```text
Admin → Contracts → Templates
```

Under **Contract documents**:

1. Select **New draft**.
2. Enter a stable document key.

Recommended examples:

```text
doctor-services-contract
clinic-organization-contract
doctor-pricing-annex
clinic-pricing-annex
data-processing-agreement
security-annex
```

The key should use lowercase letters, numbers, and hyphens.

3. Select the document type.
4. Select the audience:
   - `doctor`;
   - `clinic_organization`;
   - `shared`.
5. Select the language: `RO`, `EN`, or `DE`.
6. Enter a clear title.
7. Enter a version, for example:
   - `1.0`;
   - `1.1`;
   - `2026.1`.
8. Enter the issue date.
9. Add an effective date only when needed.
10. Paste the legal content as safe HTML.
11. Choose whether acceptance is required.
12. Choose whether this document category may later be updated through unilateral notice.
13. Select **Save draft**.
14. Review the saved draft carefully.
15. Select **Publish** only when final.

### Important publication rule

Publication is irreversible.

After publication:

- the title cannot be corrected in place;
- the text cannot be corrected in place;
- the version cannot be replaced;
- the document cannot be deleted.

Create a new version instead.

---

## 8. Create a contract package

Still under:

```text
Admin → Contracts → Templates
```

Under **Contract packages**:

1. Select **New draft**.
2. Enter a stable package key.

Examples:

```text
independent-doctor-standard
clinic-organization-standard
```

3. Select the client type.
4. Select the package language.
5. Enter the package title.
6. Enter the package version.
7. Select the published documents to include.
8. Confirm the documents belong to the correct audience and language.
9. Choose whether electronic acceptance is required.
10. Set an effective timestamp only when needed.
11. Save the package draft.
12. Review the document order and contents.
13. Publish the package.

The payment deadline is fixed by the implemented professional-contract workflow at:

```text
30 calendar days
```

This value is contractual information only. It does not start an automatic account restriction or collection action.

---

## 9. Assign a published package

Open:

```text
Admin → Contracts → Clients
```

1. Select a published package.
2. Choose the recipients:
   - selected compatible clients; or
   - all compatible clients.
3. Review the client type:
   - independent Doctor package → independent Doctors only;
   - Clinic Organisation package → Clinic Organisations only.
4. Enter contractual commercial terms when the package includes client-specific pricing.
5. Use **Keep existing contractual terms** when the new version should retain each client’s prior agreed values.
6. Add an internal note when useful.
7. Select **Assign and notify**.
8. Review the recent assignments table and notification counts.

### What happens next

For a package requiring acceptance:

```text
assigned
→ notification sent
→ awaiting_acceptance
```

For a valid notice-only amendment:

```text
assigned
→ notification sent
→ notified
→ Admin marks effective after the effective time
```

### Duplicate protection

The same package version cannot be assigned twice to the same client. Retry the existing notification or create a new package version.

---

## 10. Retry a failed notification

In the Clients tab:

1. Find the assignment.
2. Review the notification sent and failed counts.
3. Select **Retry notification**.
4. Refresh the page.
5. Confirm at least one recipient has status `sent`.

Notification delivery is idempotent. A successfully sent recipient is not intentionally sent the same assignment repeatedly.

For a Clinic Organisation:

- acceptance-required packages go to authorised signers;
- notice-only packages may use authorised signers and configured billing/contact fallbacks.

---

## 11. Cancel a wrong pending assignment

A pending assignment may be cancelled while its status is:

- `assigned`;
- `notified`;
- `awaiting_acceptance`.

Use **Cancel assignment** in the Clients tab.

Do not use cancellation as a way to edit a package. Correct the source draft or create a new published version.

An already accepted or effective assignment is not treated as an ordinary cancellable pending item.

---

# Part II — Client acceptance

## 12. Independent Doctor acceptance

The independent Doctor opens:

```text
Doctor dashboard → Contract and documents
```

The page contains:

- Overview;
- Documents;
- History.

The Doctor should:

1. Review the contracting party and package version.
2. Review the contractual commercial terms.
3. Open every document accordion.
4. Read the full published content.
5. Confirm legal/billing details are complete.
6. Select the acceptance declaration checkbox.
7. Select **Accept contract**.
8. Wait for the acceptance result.
9. Download the accepted PDF when its status becomes ready.
10. Keep the confirmation email.

### When acceptance is blocked

The page may block acceptance when:

- legal or billing details are incomplete;
- the assignment no longer accepts signatures;
- the account is not the eligible independent Doctor;
- the package is notice-only and does not require acceptance.

A clinic-invited Doctor does not receive this workflow.

---

## 13. Clinic Organisation acceptance

The Clinic Manager opens:

```text
Clinic Manager dashboard → Contract and documents
```

When the Manager belongs to several Organisations, select the correct Organisation first.

The signer should then:

1. Confirm the Organisation shown on the page.
2. Review the package and terms.
3. Read all documents.
4. Confirm their authority to bind that Organisation.
5. Select the acceptance declaration.
6. Accept electronically.
7. Download the accepted PDF when ready.

A Clinic Manager without `can_sign_contracts = true` may review the documents but cannot accept them for the Organisation.

---

## 14. What happens during electronic acceptance

RomDoc performs the following sequence:

1. Validates the assignment and signer.
2. Reads the legal identity from trusted RomDoc records.
3. Creates the immutable acceptance record.
4. Moves the assignment to `accepted`.
5. Snapshots the exact document HTML.
6. Snapshots the accepted commercial terms.
7. Calculates the evidence hash.
8. Creates the pending PDF artifact record.
9. Generates the accepted PDF.
10. Uploads it to private Supabase Storage.
11. Sends a confirmation email.
12. Adds events to the contract history.
13. Creates a non-blocking price follow-up when accepted prices require reconciliation.

### Failure separation

The legal acceptance is recorded before PDF and email completion.

Therefore:

```text
PDF failure ≠ acceptance failure
Email failure ≠ acceptance failure
```

The accepted contract remains valid in RomDoc’s records even when a supporting delivery task needs a retry.

---

# Part III — Amendments

## 15. Decide which amendment type to use

Use this decision rule:

```text
Does the change alter price or another material term?
├── Yes → electronic acceptance required
└── No
    └── Was the source document explicitly marked for unilateral notice?
        ├── Yes → notice-only amendment may be used
        └── No → electronic acceptance required
```

When uncertain, use a new version requiring acceptance.

---

## 16. Create an acceptance-required amendment

Open:

```text
Admin → Contracts → Amendments
```

1. Select the published base package.
2. Select the published document receiving a new version.
3. Enter the new document title and version.
4. Enter the new HTML content.
5. Enter issue and effective dates.
6. Enter the new package title and version.
7. Keep **Electronic acceptance required** enabled.
8. Select the recipients.
9. Choose:
   - keep each client’s existing commercial terms; or
   - replace the contractual commercial terms.
10. For a price amendment, enter the new subscription, SMS, currency, and VAT values.
11. Add an internal note.
12. Select **Publish, assign and notify**.

This operation creates:

```text
new published document version
+ new published package version
+ new client assignments
```

Earlier versions remain intact.

After acceptance, the previous accepted/effective assignment may become `superseded`.

---

## 17. Create a unilateral notice amendment

Use notice-only only when all conditions are satisfied:

- the source document was previously marked as allowing unilateral notice;
- the new package supersedes an existing package;
- each client already has an existing contract assignment;
- commercial price terms remain unchanged;
- at least one notification email is successfully sent;
- the effective timestamp has been reached;
- Admin explicitly selects **Mark effective**.

A notice-only amendment cannot change:

- subscription price;
- SMS unit price;
- currency;
- VAT rate;
- contractual commercial-term hash.

Nothing becomes effective automatically just because time passes.

---

# Part IV — Accepted-price reconciliation

## 18. Why the price queue exists

A client may accept a contractual price, but RomDoc billing still uses:

```text
client-specific operational override
or
global platform rates
```

RomDoc intentionally does not copy an accepted contract price into the billing table.

This prevents a contract workflow from silently changing invoices.

---

## 19. Open the price queue

Open:

```text
/admin/contracts?tab=prices
```

Each work item shows:

- client;
- package version;
- acceptance date;
- accepted contractual values;
- effective operational values;
- operational source;
- comparison date;
- individual override validity;
- field-by-field differences;
- whether confirmation is available.

The accepted side is read from the immutable acceptance snapshot.

The operational side follows the same fallback direction used by billing:

```text
applicable client-specific non-null value
→ otherwise global platform value
```

---

## 20. Understand the comparison fields

Phase 5E compares only accepted fields that exist in the contractual snapshot:

| Field | Meaning |
|---|---|
| `subscriptionUnitPrice` | Subscription unit price |
| `smsUnitPrice` | SMS unit price |
| `currency` | EUR or RON |
| `vatRate` | VAT as a decimal, for example `0.21` for 21% |

It also evaluates whether the individual override applies on the comparison date.

The comparison date uses:

1. assignment effective date, when available;
2. otherwise acceptance date;
3. otherwise current date.

### Example

Accepted contract:

```text
Subscription: 60 EUR
SMS: 0.30 EUR
VAT: 21%
```

Operational configuration:

```text
Subscription: 50 EUR
SMS: 0.30 EUR
VAT: 21%
```

Result:

```text
subscriptionUnitPrice → different
smsUnitPrice → identical
currency → identical
vatRate → identical
```

The confirmation button remains disabled.

---

## 21. Apply the accepted price manually

From the queue:

1. Note the client name and all accepted values.
2. Select **Open manual pricing**.
3. On `/admin/invoices`, find the same client.
4. Enter the accepted subscription price.
5. Enter the accepted SMS price.
6. Select the accepted currency.
7. Enter VAT correctly.
8. Review effective-from and effective-until dates.
9. Save the operational price.
10. Return to:

```text
/admin/contracts?tab=prices
```

11. Refresh the page.
12. Confirm every tracked field shows an identical value.
13. Select **Confirm manual application**.

The API and PostgreSQL repeat the comparison at confirmation time.

A browser modification cannot force a successful confirmation while values differ.

---

## 22. Why an updated price may still appear different

Check the following:

1. **Wrong client selected**  
   The operational override was edited for another Doctor or Organisation.

2. **Wrong currency**  
   `60 EUR` does not match `60 RON`.

3. **VAT format**  
   The UI shows 21%, while the database stores `0.21`.

4. **Null value fallback**  
   A null override field uses the global value.

5. **Future effective date**  
   The override does not yet apply on the contract comparison date.

6. **Expired override**  
   `effective_until` is earlier than the comparison date.

7. **Different SMS price precision**  
   Check decimal precision carefully.

8. **Page not refreshed**  
   Return to the Contracts page and refresh after saving.

9. **Legacy confirmation**  
   A Phase 5D `price_applied` event without comparison evidence must be verified once under Phase 5E.

---

# Part V — Common situations

## 23. Quick decision table

| Situation | Correct action |
|---|---|
| Typo found in a draft | Edit the draft |
| Typo found after publication | Clone/create a new version; never edit the published row |
| Wrong document included in a draft package | Edit the draft package composition |
| Wrong document found after package publication | Create a new package version |
| Package assigned to wrong client but not accepted | Cancel the pending assignment |
| Initial contract for an independent Doctor | Publish Doctor package and assign to that Doctor |
| Contract for a clinic-invited Doctor | Do not assign individual contract; use Clinic Organisation package |
| General non-price update allowed by the source contract | Notice-only amendment may be used |
| Price change | New amendment requiring electronic acceptance |
| Notification email failed | Retry notification |
| Confirmation email failed after acceptance | Acceptance remains recorded; investigate and retry delivery |
| PDF failed after acceptance | Acceptance remains recorded; investigate PDF generation |
| Accepted price differs from billing | Update manually in `/admin/invoices`, then confirm in the queue |
| Client did not pay | Record/reconcile operationally; never auto-block the account |
| Need to remove an old accepted contract | Do not delete it; replace/supersede through a new version |

---

## 24. Common mistakes to avoid

### Do not publish too early

A published version cannot be corrected in place.

Use drafts for review and approval.

### Do not reuse a version number

Use a new version for every published replacement.

### Do not mix client types

A Doctor package is not assignable to a Clinic Organisation and vice versa.

### Do not assign Doctor contracts to clinic-invited Doctors

Their contracting party is the Clinic Organisation.

### Do not use unilateral notice for a price change

Price and material commercial changes require acceptance.

### Do not confirm a price before it matches

The Phase 5E database verification will reject the confirmation.

### Do not treat an unpaid invoice as an account-status instruction

Payment status does not authorise automated blocking, suspension, hiding, banning, or deletion.

### Do not edit contract tables directly

Use the Admin UI and protected server routes. Direct edits can bypass intended workflow context and may be rejected by immutability triggers.

---

# Part VI — Troubleshooting

## 25. A document cannot be published

Review:

- title is present;
- version is valid and unique for the same key/language;
- content is not empty;
- effective date is not earlier than publication;
- the document was created as a draft;
- the Admin session has the required MFA level.

## 26. A package cannot be published

Review:

- the package contains at least one document;
- all included documents are published;
- document language matches package language;
- document audience is compatible;
- package version is unique;
- payment deadline remains 30 days;
- a notice-only package supersedes an existing published package;
- the notice-only package contains an eligible unilateral-notice document.

## 27. A client is missing from the assignment list

For an independent Doctor, confirm:

- Doctor record exists;
- account type is `independent`;
- Doctor status is active;
- linked profile is an active Doctor account.

For a Clinic Organisation, confirm:

- Organisation exists;
- Organisation status is active.

## 28. A Clinic Manager cannot accept

Confirm:

- the member is active;
- the selected Organisation is correct;
- `can_sign_contracts = true`;
- Organisation legal/billing details are complete;
- assignment requires acceptance;
- assignment is still pending acceptance.

## 29. The notification remains failed

Review:

```env
RESEND_API_KEY
RESEND_CONTRACTS_FROM_EMAIL
ROMDOC_CONTRACTS_EMAIL
NEXT_PUBLIC_SITE_URL
```

Also check:

- sender domain verification;
- recipient address;
- Resend logs;
- application server logs;
- whether the recipient already has a successful immutable delivery.

Then use **Retry notification**.

## 30. PDF status is failed

The acceptance itself remains valid.

Review:

- server logs;
- pdfmake font loading;
- `accepted-contracts` Storage bucket;
- service-role key;
- Storage upload permissions;
- artifact failure reason;
- document HTML content.

Do not create a second contract acceptance merely to replace a valid acceptance.

## 31. No price queue item appears

A queue item is expected only when:

- the assignment was accepted;
- accepted commercial terms contain recognised price values;
- a `price_update_pending` event exists;
- there is no comparison-verified `price_applied` event.

A contract without accepted price fields does not require price reconciliation.

## 32. Confirmation returns HTTP 409

This means the database found at least one current mismatch.

Return to the queue, inspect the field differences, update `/admin/invoices`, refresh, and retry.

---

# Part VII — Safety guarantees

## 33. What the contract system never does automatically

The contract system does not automatically:

- change `client_billing_terms`;
- change global billing prices;
- create or mark a SAGA invoice;
- mark an invoice paid;
- block an account;
- suspend an account;
- ban a Supabase Auth user;
- hide a Doctor;
- disable appointments;
- disable a dashboard;
- delete an account;
- delete an accepted contract;
- report invoices to ANAF.

## 34. Manual account controls remain separate

Admin and authorised platform Manager account block/unblock controls are separate from contracts and billing.

They require an explicit human action and must be reserved for exceptional cases.

A contract status, overdue amount, failed payment, unpaid invoice, or missing payment must never call those controls automatically.

---

# Part VIII — Recommended operating procedure

## 35. Recommended review process before publication

For every document or package:

1. Draft the content.
2. Review Romanian characters and formatting.
3. Verify the correct client type.
4. Verify the language.
5. Verify all prices and VAT.
6. Verify the effective date.
7. Review with the appropriate legal/accounting adviser when required.
8. Save the final draft.
9. Perform a second-person review when possible.
10. Publish.
11. Assign first to a controlled test client when introducing a new template.
12. Confirm notification, acceptance, PDF, email, and queue behavior.
13. Assign to the remaining clients.

## 36. Recommended version convention

A simple convention:

```text
1.0  = first published version
1.1  = non-material correction/new accepted version
2.0  = major contract revision
2026.1 = first 2026 commercial version
```

The database enforces uniqueness, not the meaning of the version. Choose one convention and use it consistently.

## 37. Recommended internal notes

Useful internal notes explain:

- why the version was created;
- which previous version it replaces;
- whether pricing changed;
- intended effective date;
- target client group;
- internal approval reference.

Do not place passwords, secrets, medical information, or unnecessary personal data in internal contract notes.

---

# Part IX — Technical reference

## 38. Main database tables

| Table | Purpose |
|---|---|
| `contract_documents` | Versioned document drafts and published versions |
| `contract_packages` | Versioned document bundles |
| `contract_package_documents` | Ordered package composition |
| `client_contract_assignments` | Package assigned to one client |
| `contract_acceptances` | Immutable electronic acceptance evidence |
| `contract_acceptance_artifacts` | Accepted PDF metadata |
| `contract_events` | Append-only assignment history |
| `contract_assignment_email_deliveries` | Idempotent assignment notification delivery |
| `contract_confirmation_email_deliveries` | Idempotent acceptance confirmation delivery |
| `client_billing_terms` | Manual operational client-price override; separate from contracts |
| `clinic_billing_settings` | Global operational price fallback |

## 39. Main application files

```text
ROMDOC/romdoc/src/app/admin/contracts/page.tsx
ROMDOC/romdoc/src/components/admin/contracts/admin-contract-management.tsx
ROMDOC/romdoc/src/lib/contracts/admin-contract-management-data.ts
ROMDOC/romdoc/src/lib/contracts/contract-dashboard-data.ts
ROMDOC/romdoc/src/lib/contracts/contract-price-comparison.ts
ROMDOC/romdoc/src/lib/contracts/contract-acceptance-service.ts
ROMDOC/romdoc/src/app/api/admin/contracts/documents/route.ts
ROMDOC/romdoc/src/app/api/admin/contracts/packages/route.ts
ROMDOC/romdoc/src/app/api/admin/contracts/assignments/route.ts
ROMDOC/romdoc/src/app/api/admin/contracts/amendments/route.ts
ROMDOC/romdoc/src/app/api/contracts/accept/route.ts
ROMDOC/romdoc/src/app/api/contracts/download/route.ts
```

## 40. Migration responsibilities

| Migration | Responsibility |
|---|---|
| 94 | Core immutable document, package, assignment, acceptance, PDF metadata, event, RLS, and private Storage model |
| 95 | Atomic electronic acceptance, document snapshots, PDF orchestration support, confirmation-email delivery |
| 96 | Admin templates, assignments, amendments, notifications, superseding, non-blocking price follow-up |
| 97 | Accepted-price normalisation, effective operational comparison, verified manual reconciliation |

---

# Part X — End-to-end test checklist

## 41. Independent Doctor test

- [ ] Create and publish a Romanian Doctor contract document.
- [ ] Create and publish a Romanian independent Doctor package.
- [ ] Assign it to one independent Doctor.
- [ ] Confirm notification email.
- [ ] Confirm the Doctor sees the sidebar link.
- [ ] Confirm the Doctor can review all documents.
- [ ] Complete acceptance.
- [ ] Confirm acceptance appears in Admin.
- [ ] Confirm PDF becomes ready.
- [ ] Download PDF as Doctor.
- [ ] Download PDF as Admin.
- [ ] Confirm acceptance email.
- [ ] Confirm history events.
- [ ] Confirm clinic-invited Doctor does not see the Contract link.

## 42. Clinic Organisation test

- [ ] Create and publish a Clinic Organisation package.
- [ ] Assign it to one Organisation.
- [ ] Confirm notification reaches an authorised signer.
- [ ] Confirm unauthorised Clinic Manager can review but not accept.
- [ ] Confirm authorised Clinic Manager can accept.
- [ ] Confirm Organisation selector works when the Manager belongs to multiple Organisations.
- [ ] Confirm PDF and confirmation email.

## 43. Price amendment test

- [ ] Create a new price amendment requiring acceptance.
- [ ] Assign it to one controlled client.
- [ ] Accept it.
- [ ] Confirm it enters the price queue.
- [ ] Confirm the button is disabled while values differ.
- [ ] Update the same client manually in `/admin/invoices`.
- [ ] Return to the queue and refresh.
- [ ] Confirm all fields match.
- [ ] Confirm manual application.
- [ ] Refresh and confirm the item leaves the pending queue.
- [ ] Verify a comparison-verified `price_applied` history event exists.
- [ ] Confirm no account status changed.

## 44. Notice-only amendment test

- [ ] Use a source document marked for unilateral notice.
- [ ] Keep all price terms unchanged.
- [ ] Publish and assign the amendment.
- [ ] Confirm at least one notification is sent.
- [ ] Confirm it cannot be marked effective before its effective timestamp.
- [ ] Mark it effective after the timestamp.
- [ ] Confirm the earlier assignment becomes superseded where applicable.

---

## 45. Final mental model

When the contract area feels complex, return to these five sentences:

1. **Drafts may be edited; published versions may not.**
2. **A package is the exact group of documents sent to one type of client.**
3. **Acceptance freezes the identity, wording, documents, terms, date, and evidence.**
4. **Accepted prices do not change billing automatically.**
5. **Admin changes billing manually, and RomDoc only verifies and records that the values match.**
