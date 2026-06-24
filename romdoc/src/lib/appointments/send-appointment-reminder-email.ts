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
  cancellationUrl: string;
  idempotencyKey: string;
};

export type SendAppointmentReminderEmailResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type ReminderContent = {
  subject: string;
  heading: string;
  introduction: string;
  notice: string;
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

function getReminderContent(
  reminderType: AppointmentReminderType
): ReminderContent {
  if (reminderType === "48_hours") {
    return {
      subject: "Programarea ta este peste 48 de ore",
      heading: "Reamintire pentru programarea ta",
      introduction:
        "Programarea ta medicală este programată peste aproximativ 48 de ore.",
      notice:
        "Verifică data, ora și clinica. Dacă nu mai poți ajunge, te rugăm să anulezi programarea din contul tău RomDoc.",
    };
  }

  return {
    subject: "Programarea ta este mâine",
    heading: "Programarea ta este în aproximativ 24 de ore",
    introduction:
      "Îți reamintim că programarea ta medicală este în aproximativ 24 de ore.",
    notice:
      "Te rugăm să ajungi la timp. Dacă nu mai poți participa, anulează programarea cât mai curând din contul tău RomDoc.",
  };
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

  let cancellationUrl: URL;

  try {
    cancellationUrl = new URL(input.cancellationUrl);
  } catch {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "INVALID_CANCELLATION_URL",
      errorMessage: "The cancellation URL is invalid.",
    };
  }

  if (!["http:", "https:"].includes(cancellationUrl.protocol)) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "INVALID_CANCELLATION_URL",
      errorMessage:
        "The cancellation URL must use HTTP or HTTPS.",
    };
  }

  const content = getReminderContent(
    input.reminderType
  );

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send(
      {
        from,
      to: input.patientEmail,
      subject: `${content.subject} – ${input.doctorName}`,
      html: `
        <!doctype html>
        <html lang="ro">
          <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
            <div style="max-width:640px;margin:0 auto;padding:32px 16px">
              <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:32px">
                <p style="margin:0 0 12px;color:#036661;font-size:16px;font-weight:700">
                  RomDoc
                </p>

                <h1 style="margin:0;color:#111827;font-size:28px;line-height:1.25">
                  ${escapeHtml(content.heading)}
                </h1>

                <p style="margin:22px 0 0;line-height:1.7">
                  Bună, ${escapeHtml(input.patientName)}.
                </p>

                <p style="margin:14px 0 0;line-height:1.7">
                  ${escapeHtml(content.introduction)}
                </p>

                <div style="margin-top:24px;padding:20px;border:1px solid #e5e7eb;border-radius:14px;background:#f9fafb">
                  <p style="margin:0 0 12px">
                    <strong>Medic:</strong>
                    ${escapeHtml(input.doctorName)}
                  </p>

                  <p style="margin:0 0 12px">
                    <strong>Clinică:</strong>
                    ${escapeHtml(input.clinicName)}
                  </p>

                  <p style="margin:0 0 12px">
                    <strong>Data:</strong>
                    ${escapeHtml(formatDate(input.scheduledDate))}
                  </p>

                  <p style="margin:0">
                    <strong>Ora:</strong>
                    ${escapeHtml(formatTime(input.scheduledTime))}
                  </p>
                </div>

                <p style="margin:22px 0 0;line-height:1.7">
                  ${escapeHtml(content.notice)}
                </p>

                <div style="margin-top:26px">
                  <a
                    href="${escapeHtml(cancellationUrl.toString())}"
                    style="display:inline-block;border-radius:10px;background:#036661;padding:13px 20px;color:#ffffff;font-weight:700;text-decoration:none"
                  >
                    Vezi sau anulează programarea
                  </a>
                </div>

                <p style="margin:18px 0 0;color:#6b7280;font-size:13px;line-height:1.6">
                  Pentru siguranța ta, trebuie să te autentifici în contul RomDoc înainte de a anula programarea.
                </p>

                <p style="margin:28px 0 0;color:#6b7280;font-size:13px">
                  RomDoc — găsește medicul potrivit.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
        text: [
          "RomDoc",
        "",
        content.heading,
        "",
        `Bună, ${input.patientName}.`,
        content.introduction,
        "",
        `Medic: ${input.doctorName}`,
        `Clinică: ${input.clinicName}`,
        `Data: ${formatDate(input.scheduledDate)}`,
        `Ora: ${formatTime(input.scheduledTime)}`,
        "",
        content.notice,
        "",
        `Vezi sau anulează programarea: ${cancellationUrl.toString()}`,
        "",
        "Trebuie să te autentifici în contul RomDoc înainte de anulare.",
        ].join("\n"),
      },
      {
        idempotencyKey:
          input.idempotencyKey,
      }
    );

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
