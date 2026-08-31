import { Resend } from "resend";

export type ClinicOrganisationLeadNotificationInput = {
  leadId: string;
  preferredSolution: "integrated" | "romdoc";
  priorities: string[];
  organizationType: string;
  doctorCountRange: string;
  desiredNextStep: string;
  organizationName: string;
  contactName: string | null;
  email: string;
  phone: string;
  notes: string | null;
  locale: "ro" | "en" | "de";
};

type NotificationResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
};

const PRIORITY_LABELS: Record<string, string> = {
  online_booking: "Programări online pentru pacienți",
  reduce_phone_calls: "Reducerea apelurilor și programărilor manuale",
  multi_location_management: "Gestionarea mai multor medici / locații",
  existing_system_integration: "Integrare cu website-ul / software-ul existent",
  patient_acquisition: "Vizibilitate online și atragerea de pacienți",
  sms_services: "Confirmări și mementouri prin SMS",
  patient_communication: "Comunicare mai bună cu pacienții",
  other: "Altă prioritate",
};

const ORGANISATION_LABELS: Record<string, string> = {
  independent_clinic: "Clinică medicală independentă",
  multi_location_clinic: "Clinică cu mai multe locații",
  medical_centre: "Centru medical / policlinică",
  private_hospital: "Spital privat / grup de spitale",
  diagnostic_imaging: "Centru de diagnostic / imagistică",
  laboratory: "Laborator",
  other: "Alt tip de organizație",
};

const DOCTOR_COUNT_LABELS: Record<string, string> = {
  "1_5": "1–5",
  "6_20": "6–20",
  "21_50": "21–50",
  "51_100": "51–100",
  "100_plus": "100+",
};

const NEXT_STEP_LABELS: Record<string, string> = {
  intro_meeting: "Întâlnire introductivă scurtă",
  demo: "Demonstrație RomDoc",
  integration_discussion: "Discuție despre integrarea cu sistemul existent",
  email_information: "Informații suplimentare prin e-mail",
  custom_solution: "Discuție despre o soluție personalizată",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function label(map: Record<string, string>, value: string) {
  return map[value] ?? value;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function sendClinicOrganisationLeadNotification(
  input: ClinicOrganisationLeadNotificationInput
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to =
    process.env.ROMDOC_CLINIC_LEADS_EMAIL?.trim() ||
    "admin@romdoc.fit";

  if (!apiKey || !from) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage: "RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
    };
  }

  const resend = new Resend(apiKey);
  const solutionLabel =
    input.preferredSolution === "integrated"
      ? "Soluție integrată în platforma organizației"
      : "Platforma RomDoc pre-construită";

  const priorityLines = input.priorities.map(
    (priority) => `• ${label(PRIORITY_LABELS, priority)}`
  );

  const contactName = input.contactName?.trim() || "—";
  const notes = input.notes?.trim() || "—";

  const subject = `Cerere nouă clinică: ${input.organizationName}`;

  const text = [
    "RomDoc — cerere nouă de la o organizație medicală",
    "",
    `Lead ID: ${input.leadId}`,
    `Organizație: ${input.organizationName}`,
    `Persoană de contact: ${contactName}`,
    `E-mail: ${input.email}`,
    `Telefon: ${input.phone}`,
    `Limbă formular: ${input.locale}`,
    "",
    `Soluție preferată: ${solutionLabel}`,
    `Tip organizație: ${label(ORGANISATION_LABELS, input.organizationType)}`,
    `Număr aproximativ de medici: ${label(
      DOCTOR_COUNT_LABELS,
      input.doctorCountRange
    )}`,
    `Pas dorit: ${label(NEXT_STEP_LABELS, input.desiredNextStep)}`,
    "",
    "Priorități:",
    ...priorityLines,
    "",
    "Observații:",
    notes,
  ].join("\n");

  const htmlPriorities = input.priorities
    .map(
      (priority) =>
        `<li style="margin:0 0 6px">${escapeHtml(
          label(PRIORITY_LABELS, priority)
        )}</li>`
    )
    .join("");

  try {
    const result = await resend.emails.send({
      from,
      to,
      replyTo: input.email,
      subject,
      text,
      html: `
        <!doctype html>
        <html lang="ro">
          <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
            <div style="max-width:720px;margin:0 auto;padding:34px 21px">
              <div style="background:#ffffff;border-radius:21px;padding:34px;border:1px solid #e5e7eb">
                <p style="margin:0 0 13px;color:#036661;font-weight:700">RomDoc</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2">Cerere nouă de la o organizație medicală</h1>

                <div style="margin-top:21px;padding:21px;border-radius:13px;background:#f0eee9">
                  <p style="margin:0 0 8px"><strong>Organizație:</strong> ${escapeHtml(
                    input.organizationName
                  )}</p>
                  <p style="margin:0 0 8px"><strong>Persoană de contact:</strong> ${escapeHtml(
                    contactName
                  )}</p>
                  <p style="margin:0 0 8px"><strong>E-mail:</strong> ${escapeHtml(
                    input.email
                  )}</p>
                  <p style="margin:0"><strong>Telefon:</strong> ${escapeHtml(
                    input.phone
                  )}</p>
                </div>

                <div style="margin-top:21px">
                  <p><strong>Soluție preferată:</strong> ${escapeHtml(
                    solutionLabel
                  )}</p>
                  <p><strong>Tip organizație:</strong> ${escapeHtml(
                    label(ORGANISATION_LABELS, input.organizationType)
                  )}</p>
                  <p><strong>Număr aproximativ de medici:</strong> ${escapeHtml(
                    label(DOCTOR_COUNT_LABELS, input.doctorCountRange)
                  )}</p>
                  <p><strong>Pas dorit:</strong> ${escapeHtml(
                    label(NEXT_STEP_LABELS, input.desiredNextStep)
                  )}</p>
                </div>

                <div style="margin-top:21px">
                  <p style="margin-bottom:8px"><strong>Priorități:</strong></p>
                  <ul style="margin:0;padding-left:21px">${htmlPriorities}</ul>
                </div>

                <div style="margin-top:21px">
                  <p style="margin-bottom:8px"><strong>Observații:</strong></p>
                  <p style="margin:0;white-space:pre-wrap;line-height:1.6">${escapeHtml(
                    notes
                  )}</p>
                </div>

                <p style="margin-top:21px;font-size:12px;color:#6b7280">Lead ID: ${escapeHtml(
                  input.leadId
                )} · Limbă formular: ${escapeHtml(input.locale)}</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (result.error) {
      return {
        sent: false,
        skipped: false,
        providerMessageId: null,
        errorMessage: normalizeError(result.error),
      };
    }

    return {
      sent: true,
      skipped: false,
      providerMessageId: result.data?.id ?? null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      sent: false,
      skipped: false,
      providerMessageId: null,
      errorMessage: normalizeError(error),
    };
  }
}
