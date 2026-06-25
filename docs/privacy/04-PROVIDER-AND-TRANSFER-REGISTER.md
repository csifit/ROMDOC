# RomDoc Provider and International Transfer Register

Status: **Initial inventory — dashboard and contract verification required**

Do not store API keys or contract documents in this register. Store only contract status, dates, and internal references.

## Provider register

| Provider | Service | Data categories | Likely role | Processing locations / transfers | Contract/DPA status | Verification required |
|---|---|---|---|---|---|---|
| Supabase | PostgreSQL, Auth, Storage | Accounts, appointments, medical files, roles, logs | Processor/subprocessor depending contract | Verify selected region, subprocessors, transfer safeguards | Unknown | Yes |
| Vercel | Hosting, serverless, cron, logs | Requests, IPs, app data in transit, logs | Processor | Verify regions, edge processing, subprocessors | Unknown | Yes |
| Resend | Transactional email | Names, emails, appointment details, delivery metadata | Processor | Verify hosting/subprocessors/transfers | Domain configured; DPA unverified | Yes |
| Stripe | Checkout, subscriptions, invoices | Doctor identity, billing IDs, payment status | Processor and/or independent controller depending activity | Verify Stripe EU terms and transfers | In use; DPA/privacy review needed | Yes |
| Google Maps Platform | Maps and Places | Search location, clinic addresses, IP/device data | Contract-specific; possible independent-controller elements | Verify terms and transfers | API keys configured; privacy review needed | Yes |
| Google Workspace | Human support/privacy email | Correspondence, identity, rights requests | Processor for Workspace service | Verify Workspace DPA, region options, subprocessors | In use | Yes |
| GitHub | Source control | Code, issues, potentially developer identity | Processor for development data | Verify no production personal data or secrets | In use | Yes |
| OpenAI/ChatGPT project workflow | Development assistance | Source snippets, architecture notes; should exclude production personal data | Contract-specific | Verify account plan/data controls before sensitive use | In use for development | Yes |

## Provider-specific checklist

### Supabase

- [ ] Record project region.
- [ ] Download/sign current DPA.
- [ ] Review subprocessor list.
- [ ] Confirm medical buckets are private.
- [ ] Confirm backups and deletion behavior.
- [ ] Confirm Auth log retention.
- [ ] Confirm support-access policy.
- [ ] Confirm data-export capability.
- [ ] Confirm service-role access controls.

### Vercel

- [ ] Confirm production region and function locations.
- [ ] Review DPA and subprocessors.
- [ ] Confirm request-log retention.
- [ ] Ensure medical content is not written to logs.
- [ ] Confirm cron logs and access.
- [ ] Confirm environment-variable access policy.
- [ ] Confirm deletion/export process.

### Resend

- [ ] Confirm DPA and subprocessors.
- [ ] Confirm message-content retention.
- [ ] Confirm delivery-log retention.
- [ ] Confirm EU/international transfer mechanism.
- [ ] Configure Reply-To aliases.
- [ ] Avoid sending medical notes or documents.
- [ ] Confirm API-key least privilege.
- [ ] Confirm SPF/DKIM/DMARC.

### Stripe

- [ ] Confirm live account legal entity.
- [ ] Review DPA/privacy terms.
- [ ] Document where Stripe acts independently.
- [ ] Confirm webhook event retention.
- [ ] Confirm no full card data reaches RomDoc.
- [ ] Confirm invoice/accounting retention.
- [ ] Confirm deletion limitations for regulated records.

### Google Maps Platform

- [ ] Review Maps Platform terms and privacy disclosures.
- [ ] Confirm browser/server API key restrictions.
- [ ] Verify request logs and retention.
- [ ] Determine whether click-to-load or consent is needed for final configuration.
- [ ] Avoid persistent patient-location history.
- [ ] Do not use location for advertising.

### Google Workspace

- [ ] Confirm Workspace DPA.
- [ ] Enable MFA for administrator.
- [ ] Restrict `privacy@romdoc.fit`.
- [ ] Configure retention appropriate to support/privacy cases.
- [ ] Do not forward privacy email to personal accounts.
- [ ] Review admin audit logs.
- [ ] Configure SPF/DKIM/DMARC.

### GitHub

- [ ] Enable MFA.
- [ ] Review repository collaborators.
- [ ] Enable secret scanning if available.
- [ ] Confirm `.env*` exclusions.
- [ ] Search Git history for secrets.
- [ ] Never commit production exports or patient data.

### Development AI tools

- [ ] Never upload real patient documents, health records, API keys, or production database exports.
- [ ] Use synthetic/test data only.
- [ ] Review account data-control terms.
- [ ] Maintain a developer policy for AI-assisted coding.

## Transfer assessment fields

For each provider complete:

- provider legal entity;
- country of establishment;
- data-hosting regions;
- support-access countries;
- transfer mechanism;
- standard contractual clauses where applicable;
- supplementary safeguards;
- subprocessor notification process;
- DPA effective date;
- owner;
- next review date.

## International-transfer decision rule

Do not state that all data remains exclusively in Romania or the EU unless provider contracts and actual configurations support that statement.

The public Privacy Policy should use accurate, qualified language and explain applicable safeguards without presenting uncertain claims as fact.
