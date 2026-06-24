import { Resend } from "resend";

export type AppointmentReminderType =
  | "48_hours"
  | "24_hours";

type SendAppointmentReminderEmailInput = {
  reminderType: AppointmentReminderType;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  clinicName: string;
  scheduledDate: string;
  scheduledTime: string;
};

export type SendAppointmentReminderEmailResult = {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      code: error.name || "EMAIL_ERROR",
      message: error.message,
    };
  }

  if (typeof error === "object" && error !== null) {
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

export async function sendAppointmentReminderEmail(
  input: SendAppointmentReminderEmailInput
): Promise<SendAppointmentReminderEmailResult> {
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

  if (!input.patientEmail.trim()) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "MISSING_RECIPIENT",
      errorMessage: "Patient email is missing.",
    };
  }

  const hours =
    input.reminderType === "48_hours" ? 48 : 24;

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from,
      to: input.patientEmail,
      subject: `Reamintire programare – ${input.doctorName}`,
      html: `
        <!doctype html>
        <html lang="ro">
          <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
            <div style="max-width:640px;margin:0 auto;padding:32px 16px">
              <div style="background:#fff;border-radius:16px;padding:32px">
                <p style="margin:0 0 12px;color:#036661;font-weight:700">RomDoc</p>
                <h1 style="margin:0;font-size:28px">Reamintire programare</h1>
                <p style="margin-top:20px;line-height:1.7">
                  Bună, ${escapeHtml(input.patientName)}.
                </p>
                <p style="line-height:1.7">
                  Îți reamintim că programarea ta este peste aproximativ ${hours} de ore.
                </p>
                <div style="margin-top:24px;padding:20px;border-radius:12px;background:#f9fafb">
                  <p><strong>Medic:</strong> ${escapeHtml(input.doctorName)}</p>
                  <p><strong>Clinică:</strong> ${escapeHtml(input.clinicName)}</p>
                  <p><strong>Data:</strong> ${escapeHtml(formatDate(input.scheduledDate))}</p>
                  <p><strong>Ora:</strong> ${escapeHtml(formatTime(input.scheduledTime))}</p>
                </div>
                <p style="margin-top:28px;color:#6b7280;font-size:13px">
                  RomDoc — găsește medicul potrivit.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (result.error) {
      const normalized = normalizeError(result.error);

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
    const normalized = normalizeError(error);

    return {
      sent: false,
      skipped: false,
      providerMessageId: null,
      errorCode: normalized.code,
      errorMessage: normalized.message,
    };
  }
}
