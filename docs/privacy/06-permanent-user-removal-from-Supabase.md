# 06 — Permanent User Removal from Supabase

**Document name:** `06-permanent-user-removal-from-Supabase.md`  
**Target path:** `ROMDOC/docs/privacy/06-permanent-user-removal-from-Supabase.md`  
**Procedure version:** 1.0  
**Last reviewed:** 28 July 2026  
**Owner:** RomDoc Privacy / Platform Administration  
**Execution method:** Manual only  
**Automation:** Prohibited unless a separately reviewed and approved procedure replaces this document

> This procedure is an internal operational guide. It is not legal advice. Romanian and EU legal-retention requirements must be confirmed with RomDoc’s legal, accounting, and data-protection advisers before deleting records that may need to be retained.

---

## 1. Purpose

This procedure describes how an authorised RomDoc Administrator handles a verified request for permanent account and personal-data erasure from Supabase.

The objective is to:

- permanently delete all personal data that RomDoc is legally permitted and required to erase;
- identify and remove the user’s files from Supabase Storage;
- remove application records linked to the user;
- remove the `public.profiles` record;
- permanently delete the Supabase Auth user only after dependent data has been handled;
- document any data that cannot yet be erased because a legal exception or retention obligation applies;
- prevent erased data from being unintentionally reintroduced after a backup restoration;
- provide the user with a clear final response.

This procedure applies to:

- patients;
- independent Doctors;
- clinic-invited Doctors;
- staff members;
- Clinic Managers;
- platform Managers;
- Administrators;
- invited or partially registered users.

---

## 2. Fundamental rules

### 2.1 The right to erasure is important but not absolute

Under GDPR Article 17, a person may request erasure of personal data in applicable circumstances. RomDoc must respond without undue delay and normally within one month.

Some records may need to be retained when processing remains necessary, for example:

- compliance with a legal obligation;
- public-interest reasons in the area of public health;
- establishment, exercise, or defence of legal claims;
- applicable accounting, tax, contractual, employment, or healthcare-record retention requirements.

When an exception applies, RomDoc must not simply keep the full active account. Instead, it should:

- erase everything not needed;
- retain only the minimum necessary records;
- restrict access and further use;
- remove the records from normal operational interfaces where appropriate;
- document the legal basis and retention period;
- delete or anonymise the retained data when the retention period ends.

### 2.2 Manual execution only

Every removal request must be processed manually by an authorised Administrator.

This procedure does not create or authorise:

- automatic account deletion;
- scheduled deletion;
- payment-triggered deletion;
- contract-triggered deletion;
- automatic account blocking or suspension;
- a generic database deletion function;
- a public self-service “delete everything now” endpoint.

### 2.3 Deletion is irreversible

After live Supabase records, Storage files, and the Auth identity are permanently removed, the operation cannot be reversed through the RomDoc application.

Supabase backups may temporarily contain historical database copies until their normal retention period expires. Backup handling is explained later in this procedure.

### 2.4 Never delete only the Auth user

Deleting only the Supabase Auth user is not a complete erasure procedure.

Personal data may remain in:

- `public.profiles`;
- appointments;
- reviews;
- medical-folder tables;
- Doctor records;
- billing and subscription records;
- contract records;
- support tickets;
- messages and attachments;
- audit and notification tables;
- Supabase Storage;
- backups;
- external processors.

### 2.5 Delete the Auth user last

The Supabase Auth user must be permanently deleted only after:

1. identity is verified;
2. legal-retention decisions are documented;
3. Storage objects are deleted or retained lawfully;
4. dependent database records are deleted, anonymised, or reassigned;
5. shared organisational responsibilities are transferred;
6. the deletion manifest is reviewed.

---

# Part I — Request intake and confirmation

## 3. Step 1 — Send the irreversible-deletion warning email

This is the first operational step after receiving the request.

Send the email from:

```text
RomDoc <admin@romdoc.fit>
```

Send it to the email address currently associated with the RomDoc account whenever possible.

Do not begin permanent deletion until the user has explicitly confirmed the request, except where a legally authorised representative or authority provides an independently valid instruction.

### 3.1 Romanian email template

**Subject:** Confirmare necesară — ștergerea permanentă a contului RomDoc

```text
Bună ziua,

Am primit solicitarea dumneavoastră privind ștergerea permanentă a contului RomDoc și a datelor personale asociate.

Vă rugăm să rețineți că, după finalizarea ștergerii, procedura este definitivă și nu poate fi anulată, inversată sau restaurată prin RomDoc. Veți pierde accesul la cont, programări, mesaje, documente și celelalte informații asociate care pot fi șterse legal.

Înainte de a începe procedura, RomDoc va verifica identitatea solicitantului și va analiza dacă anumite înregistrări trebuie păstrate temporar pentru respectarea unei obligații legale, pentru evidențe contabile, pentru obligații medicale sau pentru constatarea, exercitarea ori apărarea unui drept în instanță. Într-un astfel de caz, vom șterge toate celelalte date și vă vom informa în mod clar ce categorie minimă de date trebuie păstrată, motivul și perioada aplicabilă.

Pentru a confirma solicitarea, vă rugăm să răspundeți la acest mesaj cu textul:

„Confirm că solicit ștergerea permanentă a contului meu RomDoc și înțeleg că procedura finalizată nu poate fi anulată sau inversată.”

Nu vom începe ștergerea permanentă până la primirea confirmării și finalizarea verificării identității.

Cu stimă,
Echipa RomDoc
admin@romdoc.fit
```

### 3.2 English email template

**Subject:** Confirmation required — permanent deletion of your RomDoc account

```text
Hello,

We received your request to permanently delete your RomDoc account and the associated personal data.

Please note that, once the deletion has been completed, the procedure is final and cannot be cancelled, reversed, or restored through RomDoc. You will lose access to the account, appointments, messages, documents, and other associated information that can legally be erased.

Before beginning, RomDoc will verify the requester’s identity and determine whether any limited records must be retained temporarily to comply with a legal obligation, accounting requirement, healthcare-related obligation, or for the establishment, exercise, or defence of legal claims. In that situation, we will erase all other data and clearly inform you which minimum data category must be retained, why, and for how long.

To confirm your request, please reply to this message with:

“I confirm that I request the permanent deletion of my RomDoc account and understand that the completed procedure cannot be cancelled or reversed.”

Permanent deletion will not begin until we receive your confirmation and complete identity verification.

Kind regards,
RomDoc
admin@romdoc.fit
```

### 3.3 German email template

**Subject:** Bestätigung erforderlich — dauerhafte Löschung Ihres RomDoc-Kontos

```text
Guten Tag,

wir haben Ihren Antrag auf dauerhafte Löschung Ihres RomDoc-Kontos und der damit verbundenen personenbezogenen Daten erhalten.

Bitte beachten Sie, dass der Vorgang nach Abschluss endgültig ist und über RomDoc weder abgebrochen noch rückgängig gemacht oder wiederhergestellt werden kann. Sie verlieren den Zugriff auf das Konto, Termine, Nachrichten, Dokumente und weitere verbundene Informationen, die rechtlich gelöscht werden dürfen.

Vor Beginn prüft RomDoc die Identität der antragstellenden Person und ob bestimmte begrenzte Unterlagen vorübergehend aufgrund einer gesetzlichen Pflicht, einer buchhalterischen oder medizinischen Aufbewahrungspflicht oder zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen aufbewahrt werden müssen. In diesem Fall löschen wir alle übrigen Daten und informieren Sie klar darüber, welche minimale Datenkategorie aus welchem Grund und für welchen Zeitraum aufbewahrt werden muss.

Bitte bestätigen Sie den Antrag, indem Sie auf diese Nachricht mit folgendem Text antworten:

„Ich bestätige, dass ich die dauerhafte Löschung meines RomDoc-Kontos beantrage und verstanden habe, dass der abgeschlossene Vorgang nicht abgebrochen oder rückgängig gemacht werden kann.“

Die dauerhafte Löschung beginnt erst nach Eingang Ihrer Bestätigung und Abschluss der Identitätsprüfung.

Mit freundlichen Grüßen
RomDoc
admin@romdoc.fit
```

### 3.4 Record the email

Record:

- request reference number;
- date and time received;
- email address used;
- warning email date and time;
- confirmation date and time;
- Administrator handling the case.

Do not store unnecessary copies of identity documents or excessive personal information in the request record.

---

## 4. Register the request and deadline

Create a manual privacy-request record outside the data scheduled for deletion.

Recommended reference format:

```text
ERASURE-YYYY-NNN
```

Record:

- request reference;
- date received;
- response deadline;
- requester’s claimed identity;
- account email;
- Supabase user UUID when identified;
- account role;
- confirmation status;
- identity-verification status;
- legal-retention review status;
- deletion status;
- completion date;
- responsible Administrator;
- second reviewer, when available.

The normal response deadline is one month from receipt. A complex request may require an extension permitted by GDPR, but the user must be informed within the original one-month period.

---

## 5. Verify the requester’s identity

Use information proportionate to the risk.

Preferred methods:

1. confirmation from the email address registered on the account;
2. confirmation through an authenticated RomDoc session;
3. an existing support request created from the authenticated account;
4. additional account-specific information when the registered email is unavailable.

Do not request a copy of an identity document unless necessary and proportionate.

For a representative acting for another person, verify:

- the identity of the representative;
- the identity of the data subject;
- the representative’s legal authority.

Stop the procedure when identity cannot be verified. Inform the requester what additional verification is needed.

---

# Part II — Scope and legal-retention review

## 6. Identify the account role and linked entities

Determine whether the UUID is connected to:

- a patient profile;
- an independent Doctor;
- a clinic-invited Doctor;
- staff access;
- Clinic Organisation membership;
- Clinic Manager access;
- platform Manager or Admin activity;
- several roles created over time;
- pending invitations;
- a Doctor application;
- more than one Clinic Organisation.

For a Doctor, record the `doctors.id`.

For a patient, record the patient `profiles.id`, which is normally the Supabase Auth UUID.

For a Clinic Manager or staff member, identify all Organisation, Doctor, and Clinic relationships.

---

## 7. Decide what must be erased, anonymised, reassigned, or retained

Create a case-specific retention decision before touching production data.

Classify every located data category as one of:

| Decision | Meaning |
|---|---|
| Delete | Permanently remove the record or file |
| Anonymise | Permanently remove identifying data while retaining non-identifiable information |
| Reassign | Transfer an organisational or operational record to another authorised account |
| Retain restricted | Keep only because a documented legal exception or retention duty applies |
| Not related | Record is not personal data of the requester |

### 7.1 Possible retention categories

Obtain professional advice before deciding retention periods for:

- invoices and accounting records;
- tax records;
- payment and Stripe reconciliation records;
- accepted contracts and acceptance evidence;
- records required for legal claims;
- medical records or healthcare documentation;
- audit records necessary to prove lawful access or clinical action;
- security and fraud-prevention records;
- employee or contractor records.

### 7.2 Data retained under an exception

For every retained category, document:

- table or storage location;
- exact fields retained;
- lawful basis or legal obligation;
- purpose;
- access restrictions;
- retention deadline;
- planned deletion or anonymisation date;
- responsible reviewer.

Do not retain the active Auth account merely because a historical record must remain.

---

## 8. Offer access or export before deletion when appropriate

Ask whether the user wants a copy of their personal data before permanent deletion.

When requested and legally appropriate, provide the export before deleting the source records.

Do not include:

- another person’s private data;
- internal secrets;
- service-role credentials;
- information that would adversely affect the rights and freedoms of others.

Record the export date and delivery method.

---

# Part III — Build the manual deletion manifest

## 9. Create the deletion manifest

The deletion manifest is the central checklist for one person.

It must contain at least:

```text
Request reference:
Supabase Auth UUID:
Profile UUID:
Doctor UUID, when applicable:
Organisation IDs:
Appointment IDs:
Storage buckets and paths:
Database tables found:
External processors found:
Retention exceptions:
Deletion operator:
Reviewer:
Scheduled execution date:
```

Do not rely only on foreign-key cascade behavior.

RomDoc’s schema contains a mixture of:

- `ON DELETE CASCADE`;
- `ON DELETE SET NULL`;
- `ON DELETE RESTRICT`;
- records containing copied names, email addresses, phone numbers, or snapshots without a live profile relation.

Each category must be reviewed explicitly.

---

## 10. Search by all known identifiers

Search the production database and Storage using:

- Supabase Auth UUID;
- profile UUID;
- Doctor UUID;
- Organisation membership UUIDs;
- current email address;
- previous email addresses when known;
- phone number;
- full name;
- appointment IDs;
- support-ticket IDs;
- Storage object paths;
- Stripe customer/subscription IDs stored in Supabase;
- contract assignment and acceptance IDs.

A UUID search alone is insufficient because some RomDoc records store copied text such as:

- patient name;
- patient email;
- patient phone;
- representative name;
- represented entity;
- billing email;
- review author name;
- support-message text;
- notification recipient.

---

## 11. RomDoc data-category checklist

The exact schema must be reviewed at execution time. The following list is a minimum inventory, not a substitute for inspecting the current database.

### 11.1 Authentication and profile

- `auth.users`;
- Auth identities connected to the user;
- active sessions and refresh tokens managed by Supabase Auth;
- `public.profiles`;
- profile preferences and locale;
- notification preferences;
- invitation records;
- account-status and account-closure metadata;
- rate-limit records linked to the profile.

### 11.2 Patient data

- appointments linked through `patient_profile_id`;
- copied appointment name, email, and phone fields;
- appointment history and audit events;
- appointment messages;
- appointment-message attachments;
- patient reminder preferences;
- notification-delivery records;
- saved Doctors;
- reviews and moderation data;
- patient medical profile fields;
- medical-folder documents;
- medical-document sharing permissions;
- medical access audit records;
- support tickets and support messages;
- email and SMS logs where the recipient is identifiable.

### 11.3 Doctor data

- `doctors`;
- Doctor translations and biography;
- profile photo and storage path;
- specialties and Clinic relationships;
- services and prices;
- availability, breaks, days off, and calendar settings;
- Doctor-created appointments and copied patient data;
- staff invitations and staff relationships;
- professional verification submissions;
- verification documents;
- Doctor billing profile;
- Stripe subscription references;
- SMS balances, periods, payments, and logs;
- Clinic Organisation relationships;
- reviews about the Doctor;
- support tickets;
- contract assignments, acceptances, accepted PDFs, and events.

### 11.4 Clinic Manager, staff, Manager, and Admin data

- Clinic Organisation memberships;
- Clinic and Doctor relationship records;
- invitations;
- permission records;
- appointment actions;
- support messages;
- audit history;
- records created, reviewed, verified, blocked, or approved by that profile;
- contract authoring or acceptance actions;
- billing changes and invoice actions.

These records often require reassignment or restricted retention rather than blind deletion because they may affect other users or prove administrative actions.

### 11.5 Shared and copied data

Review records where the user’s identifiers may be embedded but the row belongs to another entity:

- appointment patient fields;
- clinic contact details;
- billing profiles;
- contract entity snapshots;
- email-delivery recipient fields;
- SMS recipient fields;
- audit event JSON;
- internal notes;
- support-message bodies;
- file names;
- generated PDF content.

---

# Part IV — Manual Supabase Storage removal

## 12. Identify every Storage object

Review at least these RomDoc buckets when applicable:

```text
doctor-photo-staging
doctor-profile-photos
doctor-verification-documents
patient-medical-folder
appointment-message-attachments
accepted-contracts
```

Also inspect the current Supabase Storage dashboard for newer buckets not listed here.

Objects may be located through:

- a database metadata row;
- a user/profile UUID folder;
- a Doctor UUID folder;
- an appointment or message UUID;
- an acceptance UUID;
- Storage ownership metadata;
- a recorded `storage_path`.

### Important

Some server-uploaded objects may not have the user as their Storage owner because service-role uploads can create objects without ordinary end-user ownership. Search by path and metadata as well as owner.

---

## 13. Delete Storage files before metadata and Auth deletion

For objects classified **Delete**:

1. open Supabase Dashboard;
2. open **Storage**;
3. select the correct bucket;
4. locate the exact object path from the manifest;
5. verify the object belongs to the request;
6. download only when an approved retention/export purpose requires it;
7. permanently delete the object through the Storage interface;
8. confirm it no longer appears;
9. record bucket, path, and deletion time in the manifest.

### Do not delete Storage objects by deleting `storage.objects` rows in SQL

Removing only the metadata row does not remove the physical file and may create an orphaned object.

Delete the file through the Supabase Storage interface or an approved Storage client.

### Auth dependency

Supabase may refuse to delete an Auth user who still owns Storage objects. This is another reason Storage removal must occur before Auth deletion.

---

## 14. Special Storage decisions

### Doctor public photo

When deleting a Doctor account:

- remove staging uploads;
- remove the public profile photo;
- remove `photo_url` and `photo_storage_path`;
- confirm the public CDN URL no longer serves the photo after normal cache expiry.

### Medical Folder

Medical-folder files require a legal-retention decision before deletion.

When deletion is approved:

- delete the actual Storage object first;
- delete or anonymise the associated metadata;
- remove active sharing permissions;
- review access-audit records separately.

### Appointment attachments

Delete:

- the actual file;
- attachment metadata;
- message content when erasable;
- copied file names containing personal information.

### Accepted contracts

Do not automatically delete accepted contract PDFs or acceptance evidence.

First determine whether they must be retained for contractual or legal claims. When retention is required:

- restrict them to the minimum authorised personnel;
- remove them from active account access;
- record the retention deadline;
- delete them after expiry.

---

# Part V — Manual database removal

## 15. Use a reviewed, case-specific database plan

Database deletion may be performed manually through:

- Supabase Table Editor for a small, clearly identified set of rows; or
- a one-time, case-specific SQL transaction prepared and independently reviewed for the identified UUIDs.

This document intentionally provides no generic executable deletion code.

Before execution:

- confirm production project;
- confirm exact UUIDs;
- review foreign-key dependencies;
- confirm Storage deletion;
- confirm retention decisions;
- take screenshots or export only the deletion manifest, not unnecessary personal data;
- have a second reviewer check the target identifiers when possible.

Never use an unrestricted `CASCADE` operation without reviewing its effect on other people and shared entities.

---

## 16. Recommended database deletion order

Use this conceptual order and adapt it to the case.

### Stage A — Stop references from creating ambiguity

- record all IDs in the manifest;
- identify current pending operations;
- resolve ownership of shared Organisations, Clinics, and staff teams;
- transfer required administrative ownership to another authorised person;
- cancel pending invitations that belong only to the departing user.

Do not automatically block or suspend the account.

### Stage B — Delete or anonymise user-owned child content

Examples:

- saved Doctors;
- preferences;
- reminder settings;
- messages and attachments approved for deletion;
- support content approved for deletion;
- draft applications;
- draft verification submissions;
- unused uploads;
- unaccepted pending contract assignments when legally appropriate.

### Stage C — Handle appointments and medical data

For each appointment and related record, decide:

- delete completely;
- anonymise copied identifiers;
- retain restricted because of a legal or healthcare obligation.

When anonymising, remove or replace all direct identifiers consistently, including:

- `patient_profile_id`;
- patient name;
- email;
- phone;
- notes containing identity;
- message content;
- attachment names;
- notification recipient;
- audit JSON containing personal details.

Anonymisation must be irreversible in practice. Replacing the profile UUID while leaving the same name, email, and phone is not anonymisation.

### Stage D — Handle reviews

Depending on the approved decision:

- delete the review;
- anonymise the reviewer identity while retaining non-identifiable content;
- delete copied patient name and profile references;
- retain moderation evidence only when necessary and lawful.

### Stage E — Handle Doctor-specific data

For an independent or clinic-invited Doctor:

- remove public directory content approved for deletion;
- remove translations, services, availability, and photo references;
- delete or withdraw verification submissions and files when permitted;
- handle Doctor–Clinic and Organisation relationships;
- reassign staff or organisational responsibilities;
- handle billing, subscription, invoice, and contract records according to retention decisions;
- remove the Doctor record only after dependent rows are resolved.

Do not delete a shared Clinic merely because one Doctor leaves.

### Stage F — Handle staff and management relationships

- remove Clinic Organisation membership;
- remove Doctor staff relationship;
- cancel invitations;
- transfer ownership or required permissions;
- retain or pseudonymise audit evidence when necessary;
- ensure no Organisation is left without an authorised owner.

### Stage G — Handle billing, Stripe references, invoices, and contracts

For each record, apply the retention decision.

When deletion is not legally permitted:

- remove unnecessary contact fields;
- restrict processing;
- retain only what is required;
- prevent normal account access;
- record the deletion date for the end of the retention period.

Do not change historical invoice amounts or accepted contract evidence merely to remove the active account.

### Stage H — Delete profile-level rows

After all dependencies are resolved:

1. confirm no required records still reference the profile through `ON DELETE RESTRICT`;
2. delete remaining erasable profile-linked rows;
3. delete the `public.profiles` row;
4. verify the profile UUID no longer appears in active application tables except approved restricted-retention records.

---

# Part VI — Permanent Supabase Auth deletion

## 17. Perform the final pre-deletion review

Before deleting the Auth user, confirm:

- irreversible warning email was sent;
- explicit confirmation was received;
- identity was verified;
- response deadline is controlled;
- legal-retention review is complete;
- export was provided when requested;
- Storage objects were deleted or lawfully retained;
- database rows were deleted, anonymised, reassigned, or restricted;
- shared ownership was transferred;
- second-person review was completed when available;
- the exact Auth UUID matches the manifest.

This is the final stop point.

---

## 18. Permanently delete the Auth user

In Supabase Dashboard:

1. open the correct production project;
2. open **Authentication → Users**;
3. search by the exact Auth UUID and registered email;
4. open the user;
5. compare the UUID with the manifest;
6. choose permanent deletion, not soft deletion;
7. confirm the irreversible operation;
8. record the date, time, and Administrator;
9. verify the user no longer appears in Authentication.

### Why permanent rather than soft deletion

A soft-deleted Auth record preserves data in the Auth schema. It is not the appropriate final step when the approved outcome is permanent Auth removal.

### Session note

Supabase JWTs may remain technically valid until expiration after Auth deletion. The application’s database checks and missing profile should prevent continued normal use, but the case should be monitored until the token lifetime has elapsed.

---

# Part VII — Verification after deletion

## 19. Perform a post-deletion search

Repeat the identifier search using:

- Auth UUID;
- profile UUID;
- Doctor UUID;
- email;
- phone;
- full name;
- Storage paths;
- appointment IDs;
- contract IDs;
- Stripe references.

Check:

- Authentication users;
- public tables;
- Storage;
- public Doctor pages;
- search results;
- dashboards;
- API responses;
- notification queues;
- support area;
- contract area;
- billing area.

Every remaining match must be:

- approved restricted-retention data;
- irreversibly anonymised data; or
- unrelated to the requester.

Document the reason for every retained match.

---

## 20. Verify public removal

For a Doctor or public reviewer, check:

- homepage;
- Doctor directory;
- Doctor profile URL;
- specialty and city pages;
- search engines and cached previews where relevant;
- public Storage photo URLs.

RomDoc can remove the source immediately, but external search-engine or CDN caches may require additional time or a separate removal request.

---

## 21. Verify application access

Confirm:

- login is no longer possible;
- password reset does not recreate access;
- dashboard routes do not show the account;
- Clinic and staff access is removed;
- saved sessions no longer provide usable application access;
- invitations do not recreate the old role unintentionally.

Do not recreate a user automatically with the same email.

---

# Part VIII — Backups and restoration controls

## 22. Understand backup limitations

Deleting live production rows does not necessarily remove them immediately from existing database backups.

Supabase backup retention depends on the project plan and configured Point-in-Time Recovery period. The actual retention visible in the Supabase Dashboard is authoritative for the RomDoc project.

Supabase database backups contain database data and Storage metadata, but not the actual Storage file objects. Deleted Storage files are therefore handled separately from database-backup rotation.

---

## 23. Record the backup-expiry date

For each completed erasure:

1. check **Supabase Dashboard → Database → Backups**;
2. record whether daily backups or Point-in-Time Recovery are active;
3. record the earliest backup/PITR restore point that may contain the deleted data;
4. calculate the date when the last pre-deletion recovery point expires;
5. add that date to the request record.

Do not restore an old production backup without considering completed erasure requests.

---

## 24. Reapply deletion after any restoration

Maintain a minimal, access-restricted erasure register containing only what is needed to reapply deletion after a disaster recovery restoration.

Recommended minimum:

- request reference;
- deleted Auth UUID;
- deletion completion timestamp;
- backup-expiry date;
- status;
- minimal list of exceptional retained categories.

After restoring a backup made before deletion:

1. review the erasure register;
2. re-delete restored personal data;
3. reapply anonymisation and restrictions;
4. re-delete restored Storage metadata where applicable;
5. confirm Storage files themselves were not reintroduced from a separate external backup;
6. record the reapplication.

The erasure register must not become a replacement profile database.

---

## 25. External and off-site backups

Review any RomDoc-managed backup outside Supabase, including:

- Google Cloud Storage;
- downloaded Supabase dumps;
- local administrator backups;
- staging database copies;
- exported CSV files;
- temporary migration files;
- support attachments;
- encrypted archival media.

Delete the person’s erasable data from these copies where technically and legally appropriate, or document:

- why immediate selective deletion is not possible;
- security controls;
- prohibition on normal operational use;
- expiry date;
- procedure to reapply deletion if restored.

---

# Part IX — Related processors and systems

## 26. Check systems outside Supabase

A complete GDPR response may require action outside Supabase.

Review, as applicable:

- Resend delivery logs and email content;
- Stripe customer, subscription, payment, and invoice data;
- Vercel logs;
- Google Workspace or other mailboxes;
- Google Cloud backups;
- SMS provider logs;
- SAGA and accounting records;
- ANAF/e-Factura records;
- analytics and error-monitoring systems;
- exported spreadsheets;
- support systems;
- local development databases;
- staging environments.

Apply the same four-way classification:

- delete;
- anonymise;
- reassign;
- retain restricted.

Processor data that is legally required for financial or security records may have separate retention rules.

---

# Part X — Completion communication and record

## 27. Send the completion email

Send the completion email after the live Supabase deletion has been verified.

### Romanian completion template

**Subject:** Finalizarea solicitării de ștergere a contului RomDoc

```text
Bună ziua,

Vă confirmăm că procedura de ștergere a contului RomDoc a fost finalizată la data de [DATA ȘI ORA].

Contul de autentificare și datele personale care au putut fi șterse legal au fost eliminate din sistemul operațional RomDoc.

[ELIMINAȚI ACEST PARAGRAF DACĂ NU SE APLICĂ]
O categorie limitată de înregistrări trebuie păstrată temporar pentru următorul motiv: [MOTIVUL ȘI TEMEIUL]. Accesul este restricționat, datele nu vor mai fi utilizate în scopul funcționării contului, iar termenul de păstrare este [DATA/PERIOADA].

Copiile istorice din sistemele de backup securizate pot exista până la expirarea perioadei normale de retenție a backupurilor. Aceste copii nu sunt utilizate în activitatea curentă. Dacă un backup este restaurat, RomDoc va reaplica ștergerea.

Procedura finalizată este definitivă și nu poate fi anulată sau inversată.

Referința solicitării: [ERASURE-YYYY-NNN]

Cu stimă,
Echipa RomDoc
admin@romdoc.fit
```

### English completion template

**Subject:** Completion of your RomDoc account deletion request

```text
Hello,

We confirm that the RomDoc account deletion procedure was completed on [DATE AND TIME].

The authentication account and personal data that RomDoc was legally permitted to erase have been removed from the live operational system.

[REMOVE THIS PARAGRAPH WHEN NOT APPLICABLE]
A limited category of records must be retained temporarily for the following reason: [REASON AND LEGAL BASIS]. Access is restricted, the records will no longer be used for account operation, and the retention deadline is [DATE/PERIOD].

Historical copies may remain in secured backups until the normal backup-retention period expires. These copies are not used for normal operations. RomDoc will reapply the deletion if a backup is restored.

The completed procedure is final and cannot be cancelled or reversed.

Request reference: [ERASURE-YYYY-NNN]

Kind regards,
RomDoc
admin@romdoc.fit
```

---

## 28. Keep a minimal compliance record

After completion, retain only the minimum necessary evidence that RomDoc handled the request.

Recommended fields:

- request reference;
- received date;
- verified date;
- completion date;
- outcome;
- categories erased;
- categories retained under an exception;
- legal basis for retention;
- retention expiry;
- operator;
- reviewer;
- backup-expiry date;
- completion-email date.

Avoid retaining:

- the full deleted profile;
- unnecessary identity-document copies;
- complete exports;
- medical details;
- unrelated message content.

---

# Part XI — Stop conditions and escalation

## 29. Stop the procedure and escalate when

- identity is uncertain;
- two users may share the same contact information;
- the account belongs to a minor or represented person and authority is unclear;
- healthcare-record retention is uncertain;
- legal proceedings or complaints are active;
- financial records may be legally required;
- the user is the sole owner of a Clinic Organisation;
- deleting a Doctor would affect other Doctors, patients, or Clinics;
- a foreign-key restriction is not understood;
- the deletion would remove another person’s data;
- Storage ownership or path is ambiguous;
- a contract acceptance or invoice may need retention;
- the production backup was recently restored;
- any Administrator is unsure about the result.

Escalate to the responsible privacy, legal, accounting, or technical adviser before continuing.

---

# Part XII — Final checklist

## 30. Permanent removal checklist

### Request and identity

- [ ] Request registered.
- [ ] Step 1 irreversible-deletion warning email sent.
- [ ] Explicit confirmation received.
- [ ] Identity verified.
- [ ] GDPR response deadline recorded.
- [ ] Export offered or provided where applicable.

### Scope and retention

- [ ] Account role identified.
- [ ] All linked UUIDs recorded.
- [ ] Legal-retention review completed.
- [ ] Every category classified: delete, anonymise, reassign, or retain restricted.
- [ ] Retention deadlines documented.
- [ ] Shared Organisation ownership resolved.

### Storage

- [ ] All relevant buckets reviewed.
- [ ] Exact Storage paths recorded.
- [ ] Deletable files removed through Storage.
- [ ] No Storage metadata-only deletion used.
- [ ] Public photo URL checked.
- [ ] Retained files restricted and documented.

### Database

- [ ] Patient records handled.
- [ ] Appointments and copied identifiers handled.
- [ ] Messages and attachments handled.
- [ ] Reviews handled.
- [ ] Medical Folder handled.
- [ ] Doctor data handled.
- [ ] Clinic/staff/Manager memberships handled.
- [ ] Support records handled.
- [ ] Notifications and audit JSON reviewed.
- [ ] Billing and Stripe references reviewed.
- [ ] Contracts and accepted PDFs reviewed.
- [ ] Profile row deleted after dependencies.
- [ ] No other user’s data was deleted.

### Authentication

- [ ] Final UUID comparison completed.
- [ ] Permanent Auth deletion selected.
- [ ] Auth user no longer appears.
- [ ] Login and reset access tested.

### Verification and completion

- [ ] Post-deletion UUID search completed.
- [ ] Email, phone, and name search completed.
- [ ] Public pages checked.
- [ ] External processors reviewed.
- [ ] Backup retention and expiry recorded.
- [ ] Restore re-deletion register updated.
- [ ] Completion email sent.
- [ ] Minimal compliance record retained.
- [ ] Case closed.

---

## 31. Final operational principle

```text
Confirm first.
Verify identity.
Decide legal retention.
Inventory everything.
Delete Storage files before Auth.
Handle child and copied data before profiles.
Delete the Auth user last.
Search again.
Record backup expiry.
Never automate account deletion.
```

---

## 32. Authoritative references used for this procedure

- Regulation (EU) 2016/679, Article 17 — Right to erasure.
- European Commission — Dealing with individuals’ requests and requests to erase personal data.
- European Data Protection Board — Data-subject rights and right-to-erasure guidance.
- Supabase Documentation — User Management and permanent Auth user deletion.
- Supabase Documentation — Storage object deletion.
- Supabase Documentation — Database backups and Point-in-Time Recovery.
- Current RomDoc database migrations and Storage-bucket definitions.

Review these sources and the RomDoc production schema whenever this procedure is updated.
