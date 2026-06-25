# Step 68A Launch Actions

Priority legend:

- P0 — required before real patient launch;
- P1 — required before public commercial promotion;
- P2 — should follow shortly after launch.

## P0 — Legal identity and governance

- [ ] Insert RomDoc operator's legal name.
- [ ] Insert registration/company information.
- [ ] Insert registered address.
- [ ] Make `privacy@romdoc.fit` operational.
- [ ] Assign privacy owner.
- [ ] Decide whether a DPO must be appointed.
- [ ] Record legal-review contact.
- [ ] Approve controller/processor roles.

## P0 — Health-data legal assessment

- [ ] Map Article 6 basis for appointments.
- [ ] Map Article 9 condition for appointment health information.
- [ ] Map Article 6/9 position for medical notes.
- [ ] Map Article 6/9 position for Medical Folder.
- [ ] Confirm doctor/clinic confidentiality framework.
- [ ] Determine medical-record ownership and retention.
- [ ] Determine whether RomDoc acts as processor, controller, or joint controller for each medical activity.

## P0 — DPIA

- [ ] Assess ANSPDCP Decision no. 174/2018.
- [ ] Complete DPIA screening.
- [ ] Complete full DPIA if required or prudent.
- [ ] Record risks and safeguards.
- [ ] Obtain legal/privacy approval.
- [ ] Reassess after major feature changes.

## P0 — Public transparency

- [ ] Replace Privacy Policy draft warning with approved content.
- [ ] Add operator identity.
- [ ] Add precise purposes and legal bases.
- [ ] Add Article 9 explanations.
- [ ] Add provider/recipient categories.
- [ ] Add international transfer safeguards.
- [ ] Add retention periods/criteria.
- [ ] Add ANSPDCP complaint right.
- [ ] Add `privacy@romdoc.fit`.
- [ ] Add policy version/effective date.
- [ ] Finalize Cookie Policy based on production audit.

## P0 — Subtle product notices

- [ ] Add concise notice to appointment form.
- [ ] Add Terms and Privacy links to registration.
- [ ] Add upload notice to Medical Folder.
- [ ] Show recipient and expiry before sharing.
- [ ] Add emergency disclaimer near appointment reason.
- [ ] Do not add generic GDPR checkbox.
- [ ] Do not add essential-only cookie banner.

## P0 — Data access boundaries

- [ ] Confirm staff has no Medical Folder access by default.
- [ ] Confirm managers have no medical-content access by default.
- [ ] Confirm administrators have no routine medical-content access.
- [ ] Add exceptional support-access reason and audit if needed.
- [ ] Confirm private Storage and short-lived signed URLs.
- [ ] Confirm signed URLs are not logged.
- [ ] Confirm doctors cannot browse unrelated patients.

## P0 — Provider governance

- [ ] Complete provider register.
- [ ] Obtain/review DPAs.
- [ ] Review international transfer safeguards.
- [ ] Review subprocessor lists.
- [ ] Confirm actual regions and log retention.
- [ ] Review Google Maps privacy behavior.
- [ ] Prohibit real patient data in development AI tools.

## P1 — Retention and deletion

- [ ] Obtain Romanian medical-record retention advice.
- [ ] Obtain accounting/tax retention advice.
- [ ] Approve appointment retention.
- [ ] Approve verification-document retention.
- [ ] Approve email-log retention.
- [ ] Approve security-log retention.
- [ ] Implement account closure states.
- [ ] Implement anonymization/deletion workflow.
- [ ] Implement legal hold.
- [ ] Test Storage cleanup after eligible deletion.

## P1 — Rights requests

- [ ] Create privacy case register.
- [ ] Define identity verification.
- [ ] Define access export procedure.
- [ ] Define correction procedure.
- [ ] Define deletion/restriction procedure.
- [ ] Define portability scope.
- [ ] Define response approval.
- [ ] Define doctor/clinic referral for clinical records.
- [ ] Track deadlines.
- [ ] Maintain completion evidence.
- [ ] Add ANSPDCP complaint information.

## P1 — Contracts with doctors and clinics

- [ ] Define clinical responsibility.
- [ ] Define record retention.
- [ ] Define patient-right allocation.
- [ ] Define breach notification.
- [ ] Define staff access.
- [ ] Define Medical Folder upload/sharing.
- [ ] Define departure/closure behavior.
- [ ] Define correction/deletion of professional data.
- [ ] Include processor clauses where applicable.

## P1 — Incident readiness

- [ ] Define data-breach owner.
- [ ] Define internal escalation.
- [ ] Define severity/risk assessment.
- [ ] Define provider escalation.
- [ ] Define ANSPDCP notification decision.
- [ ] Define affected-person notification decision.
- [ ] Create incident log.
- [ ] Test one tabletop scenario.

## P2 — Automation and self-service

- [ ] Patient account closure request.
- [ ] Patient data export.
- [ ] Privacy request status page.
- [ ] Automated retention jobs.
- [ ] Retention exception/legal-hold UI.
- [ ] Provider review reminders.
- [ ] Annual ROPA review reminder.
- [ ] Policy-change version history.

## Recommended Step 68B

Proceed next with:

**Step 68B — Retention, account closure, deletion/anonymization, and legal-hold architecture**

Deliverables should include:

1. database retention-policy schema;
2. account closure state model;
3. deletion/anonymization job design;
4. Medical Folder retention exceptions;
5. legal-hold model;
6. privacy audit events;
7. no destructive code until retention rules receive legal approval.
