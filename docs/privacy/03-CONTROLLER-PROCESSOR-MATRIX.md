# RomDoc Controller / Processor Responsibility Matrix

Status: **Provisional — legal validation required**

The role is determined per processing activity, not merely per dataset or organization.

## Matrix

| Processing activity | RomDoc provisional role | Doctor/clinic provisional role | Technical provider role | Confidence | Required action |
|---|---|---|---|---|---|
| Platform account creation | Controller | Not involved | Supabase/Vercel as processors or subprocessors | High | Confirm DPAs |
| Authentication and MFA | Controller | Not involved | Supabase as processor | High | Confirm configuration and DPA |
| Public doctor directory | Controller for platform publication | Doctor/clinic supplies and controls professional accuracy; may be separate controller for submitted professional data | Supabase/Vercel processors | Medium | Clarify doctor terms |
| Doctor subscription billing | Controller | Doctor is customer/data subject | Stripe may act as processor and independent controller for regulated payment activities | Medium | Review Stripe terms/DPA |
| Professional verification | Controller | Doctor is data subject | Supabase/Vercel processors | High | Restrict documents and set retention |
| Appointment scheduling | Controller or potentially joint/processor arrangement depending on contracts | Doctor/clinic likely controller for care and appointment use | Supabase/Vercel/Resend processors | Low-medium | Legal analysis and contract allocation |
| Appointment free-text health information | Role depends on who determines purpose and means | Doctor/clinic likely controller for healthcare purpose | RomDoc may be processor or controller for platform purpose | Low | Mandatory legal review |
| Clinical consultation and diagnosis | Not the healthcare provider; should not determine clinical purpose | Doctor/clinic controller | Technical providers only if instructed | High | State clearly in terms |
| Doctor-authored medical notes | Possible processor/platform controller for access/security; not final | Doctor/clinic likely controller and record owner under medical rules | Supabase/Vercel processors | Low | Legal review and provider agreement |
| Patient medical-folder sharing | Controller for platform access mechanism; possible joint role depending on design | Recipient/uploader doctors may be independent controllers for clinical use | Supabase/Vercel processors | Low | DPIA and role agreement |
| Transactional emails | Controller for platform notices | Doctor/clinic may also be controller for clinical communications | Resend processor; email providers independent controllers for delivery | Medium | Add DPA/register details |
| Public reviews | Controller for publication/moderation | Doctor is reviewed subject | Supabase/Vercel processors | High | Review legitimate-interest assessment |
| Security logs and rate limits | Controller | Not normally involved | Vercel/Supabase processors | High | Retention and access policy |
| Privacy-rights requests | Controller for RomDoc processing | Doctor/clinic separately handles requests for its own clinical records | Google Workspace/Resend processors as configured | High | Create case workflow |
| Google Places address lookup | Controller for request purpose | Not normally involved | Google role may include independent-controller elements under its terms | Medium | Review applicable Google terms |
| Stripe fraud/payment compliance | RomDoc controller for customer relationship; Stripe role depends on activity | Doctor is customer | Stripe may be independent controller for legal/payment obligations | Medium | Review current Stripe privacy terms |

## Contract requirements

### Doctor and clinic terms should define

- who controls appointment and clinical data;
- who answers patient requests about medical records;
- who decides medical-record retention;
- confidentiality duties;
- permitted staff access;
- breach notification between parties;
- document deletion and correction;
- what happens when a doctor leaves RomDoc;
- patient-folder sharing responsibilities.

### Article 28 agreements should address

Where RomDoc is processor:

- documented instructions;
- confidentiality;
- security;
- subprocessors;
- assistance with rights requests;
- breach cooperation;
- DPIA assistance;
- deletion/return after service;
- audits.

### Joint controllership

Do not call an arrangement “joint controller” merely because two parties use the same data. Joint control requires shared determination of purposes and essential means. If it applies, responsibilities must be transparently allocated.

## Public wording principles

Good:

- `RomDoc facilitează găsirea medicilor și gestionarea programărilor.`
- `Serviciile medicale sunt furnizate de medicul sau clinica selectată.`
- `RomDoc nu emite licențe medicale.`

Avoid:

- implying RomDoc provides diagnosis or treatment;
- implying RomDoc owns clinical decisions;
- promising deletion of medical records that providers must retain;
- saying all providers are merely processors without contract review.

## Decisions required before launch

- [ ] Legal identity of RomDoc operator.
- [ ] Appointment scheduling role.
- [ ] Medical-note role.
- [ ] Medical-folder hosting/sharing role.
- [ ] Doctor/clinic data-processing agreement structure.
- [ ] Allocation of patient rights requests.
- [ ] Allocation of breach notifications.
- [ ] Allocation of medical-record retention duties.
