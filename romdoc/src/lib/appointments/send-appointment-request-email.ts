import { Resend } from "resend";

import {
  formatAppointmentNotificationDate,
  formatAppointmentNotificationTime,
  getAppointmentNotificationCopy,
} from "@/lib/appointments/appointment-notification-copy";
import type {
  AppointmentNotificationLocale,
} from "@/lib/appointments/notification-locale";

type SendAppointmentRequestEmailInput = {
  appointmentId: string;
  locale:
    AppointmentNotificationLocale;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorName: string;
  clinicName: string;
  requestedDate: string;
  requestedTime: string;
  notes: string | null;
};

export type SendAppointmentRequestEmailResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId:
    string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

function escapeHtml(
  value: string
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSiteUrl() {
  const configuredUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    process.env
      .NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    "";

  if (
    configuredUrl.trim()
  ) {
    return configuredUrl
      .trim()
      .replace(/\/$/, "");
  }

  if (
    process.env.VERCEL_URL
  ) {
    return `https://${process.env.VERCEL_URL}`
      .replace(/\/$/, "");
  }

  return "https://www.romdoc.fit";
}

function normalizeError(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return {
      code:
        error.name ||
        "EMAIL_ERROR",
      message:
        error.message,
    };
  }

  if (
    typeof error ===
      "object" &&
    error !== null
  ) {
    const candidate =
      error as {
        name?: unknown;
        message?: unknown;
      };

    return {
      code:
        typeof candidate.name ===
          "string"
          ? candidate.name
          : "EMAIL_ERROR",
      message:
        typeof candidate.message ===
          "string"
          ? candidate.message
          : JSON.stringify(
              error
            ),
    };
  }

  return {
    code: "EMAIL_ERROR",
    message: String(error),
  };
}

export async function
sendAppointmentRequestEmail(
  input:
    SendAppointmentRequestEmailInput
): Promise<
  SendAppointmentRequestEmailResult
> {
  const apiKey =
    process.env.RESEND_API_KEY;

  const from =
    process.env
      .RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      sent: false,
      skipped: true,
      providerMessageId:
        null,
      errorCode:
        "MISSING_CONFIGURATION",
      errorMessage:
        "RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
    };
  }

  const copy =
    getAppointmentNotificationCopy(
      input.locale
    );

  const formattedDate =
    formatAppointmentNotificationDate(
      input.requestedDate,
      input.locale
    );

  const formattedTime =
    formatAppointmentNotificationTime(
      input.requestedTime,
      input.locale
    );

  const detailsUrl =
    `${getSiteUrl()}/appointments/${input.appointmentId}/request-received?locale=${input.locale}`;

  const resend =
    new Resend(apiKey);

  try {
    const result =
      await resend.emails.send({
        from,
        to:
          input.patientEmail,
        subject:
          `${copy.request.subject} – ${input.doctorName}`,
        html: `
          <!doctype html>
          <html lang="${input.locale}">
            <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
              <div style="max-width:640px;margin:0 auto;padding:32px 16px">
                <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:32px">
                  <p style="margin:0 0 12px;color:#036661;font-size:16px;font-weight:700">RomDoc</p>
                  <h1 style="margin:0;color:#111827;font-size:28px;line-height:1.25">
                    ${escapeHtml(copy.request.heading)}
                  </h1>

                  <p style="margin:22px 0 0;line-height:1.7">
                    ${escapeHtml(copy.greeting(input.patientName))}
                  </p>

                  <p style="margin:14px 0 0;line-height:1.7">
                    ${escapeHtml(copy.request.message)}
                  </p>

                  <div style="margin-top:24px;padding:20px;border:1px solid #e5e7eb;border-radius:14px;background:#f9fafb">
                    <p style="margin:0 0 12px"><strong>${escapeHtml(copy.doctorLabel)}:</strong> ${escapeHtml(input.doctorName)}</p>
                    <p style="margin:0 0 12px"><strong>${escapeHtml(copy.clinicLabel)}:</strong> ${escapeHtml(input.clinicName)}</p>
                    <p style="margin:0 0 12px"><strong>${escapeHtml(copy.dateLabel)}:</strong> ${escapeHtml(formattedDate)}</p>
                    <p style="margin:0 0 12px"><strong>${escapeHtml(copy.timeLabel)}:</strong> ${escapeHtml(formattedTime)}</p>
                    <p style="margin:0"><strong>${escapeHtml(copy.phoneLabel)}:</strong> ${escapeHtml(input.patientPhone)}</p>
                  </div>

                  ${
                    input.notes
                      ? `
                        <p style="margin:20px 0 0;line-height:1.7">
                          <strong>${escapeHtml(copy.notesLabel)}:</strong>
                          ${escapeHtml(input.notes)}
                        </p>
                      `
                      : ""
                  }

                  <p style="margin:24px 0 0">
                    <a
                      href="${escapeHtml(detailsUrl)}"
                      style="display:inline-block;border-radius:10px;background:#036661;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700"
                    >
                      ${escapeHtml(copy.request.actionLabel)}
                    </a>
                  </p>

                  <p style="margin:28px 0 0;color:#6b7280;font-size:13px">
                    ${escapeHtml(copy.tagline)}
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: [
          "RomDoc",
          "",
          copy.request.heading,
          "",
          copy.greeting(
            input.patientName
          ),
          copy.request.message,
          "",
          `${copy.doctorLabel}: ${input.doctorName}`,
          `${copy.clinicLabel}: ${input.clinicName}`,
          `${copy.dateLabel}: ${formattedDate}`,
          `${copy.timeLabel}: ${formattedTime}`,
          `${copy.phoneLabel}: ${input.patientPhone}`,
          input.notes
            ? `${copy.notesLabel}: ${input.notes}`
            : "",
          "",
          `${copy.request.actionLabel}: ${detailsUrl}`,
          "",
          copy.closing,
        ]
          .filter(Boolean)
          .join("\n"),
      });

    if (result.error) {
      const normalized =
        normalizeError(
          result.error
        );

      return {
        sent: false,
        skipped: false,
        providerMessageId:
          null,
        errorCode:
          normalized.code,
        errorMessage:
          normalized.message,
      };
    }

    return {
      sent: true,
      skipped: false,
      providerMessageId:
        result.data?.id ??
        null,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    const normalized =
      normalizeError(error);

    return {
      sent: false,
      skipped: false,
      providerMessageId:
        null,
      errorCode:
        normalized.code,
      errorMessage:
        normalized.message,
    };
  }
}
