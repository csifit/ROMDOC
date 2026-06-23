import { Resend } from "resend";

export type PatientNotificationStatus =
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show";

type SendAppointmentStatusEmailInput = {
  status: PatientNotificationStatus;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  clinicName: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  rescheduleReason: string | null;
};

export type SendAppointmentStatusEmailResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date: string | null) {
  if (!date) return "Data nu este disponibilă";

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatTime(time: string | null) {
  return time ? time.slice(0, 5) : "Ora nu este disponibilă";
}

function getContent(status: PatientNotificationStatus) {
  switch (status) {
    case "confirmed":
      return {
        subject: "Programare confirmată",
        heading: "Programarea ta a fost confirmată",
        message: "Medicul sau clinica a confirmat programarea ta.",
      };
    case "rescheduled":
      return {
        subject: "Programare reprogramată",
        heading: "Programarea ta a fost reprogramată",
        message: "Data sau ora programării tale a fost modificată.",
      };
    case "cancelled":
      return {
        subject: "Programare anulată",
        heading: "Programarea ta a fost anulată",
        message: "Programarea a fost anulată. Poți solicita o nouă programare prin RomDoc.",
      };
    case "completed":
      return {
        subject: "Consultație finalizată",
        heading: "Consultația a fost marcată ca finalizată",
        message: "Programarea ta a fost înregistrată ca finalizată în RomDoc.",
      };
    case "no_show":
      return {
        subject: "Neprezentare înregistrată",
        heading: "Programarea a fost marcată ca neprezentare",
        message: "Clinica a înregistrat faptul că pacientul nu s-a prezentat la programare.",
      };
  }
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return {
      code: error.name || "EMAIL_ERROR",
      message: error.message,
    };
  }

  if (
    typeof error === "object" &&
    error !== null
  ) {
    const candidate = error as {
      name?: unknown;
      message?: unknown;
    };

    return {
      code:
        typeof candidate.name === "string"
          ? candidate.name
          : "EMAIL_ERROR",
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : JSON.stringify(error),
    };
  }

  return {
    code: "EMAIL_ERROR",
    message: String(error),
  };
}

export async function sendAppointmentStatusEmail(
  input: SendAppointmentStatusEmailInput
): Promise<SendAppointmentStatusEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "MISSING_CONFIGURATION",
      errorMessage:
        "RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
    };
  }

  const content = getContent(input.status);
  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from,
      to: input.patientEmail,
      subject: `${content.subject} – ${input.doctorName}`,
      html: `
        <!doctype html>
        <html lang="ro">
          <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
            <div style="max-width:640px;margin:0 auto;padding:32px 16px">
              <div style="background:#fff;border-radius:16px;padding:32px">
                <p style="margin:0 0 12px;color:#036661;font-weight:700">RomDoc</p>
                <h1 style="margin:0;font-size:28px">${escapeHtml(content.heading)}</h1>
                <p style="margin-top:20px;line-height:1.7">Bună, ${escapeHtml(input.patientName)}.</p>
                <p style="line-height:1.7">${escapeHtml(content.message)}</p>
                <div style="margin-top:24px;padding:20px;border-radius:12px;background:#f9fafb">
                  <p><strong>Medic:</strong> ${escapeHtml(input.doctorName)}</p>
                  <p><strong>Clinică:</strong> ${escapeHtml(input.clinicName)}</p>
                  <p><strong>Data:</strong> ${formatDate(input.scheduledDate)}</p>
                  <p><strong>Ora:</strong> ${formatTime(input.scheduledTime)}</p>
                </div>
                ${
                  input.status === "rescheduled" &&
                  input.rescheduleReason
                    ? `<p style="margin-top:20px"><strong>Motiv:</strong> ${escapeHtml(input.rescheduleReason)}</p>`
                    : ""
                }
                <p style="margin-top:28px;color:#6b7280;font-size:13px">RomDoc — găsește medicul potrivit.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (result.error) {
      const normalized = stringifyError(result.error);

      return {
        sent: false,
        skipped: false,
        providerMessageId: null,
        errorCode: normalized.code,
        errorMessage: normalized.message,
      };
    }

    return {
      sent: true,
      skipped: false,
      providerMessageId: result.data?.id ?? null,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    const normalized = stringifyError(error);

    return {
      sent: false,
      skipped: false,
      providerMessageId: null,
      errorCode: normalized.code,
      errorMessage: normalized.message,
    };
  }
}
