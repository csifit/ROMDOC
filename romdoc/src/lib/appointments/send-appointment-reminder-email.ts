import { Resend } from "resend";

import {
  formatAppointmentNotificationDate,
  formatAppointmentNotificationTime,
  getAppointmentNotificationCopy,
  type AppointmentReminderKind,
} from "@/lib/appointments/appointment-notification-copy";
import type {
  AppointmentNotificationLocale,
} from "@/lib/appointments/notification-locale";

export type AppointmentReminderType =
  AppointmentReminderKind;

type SendAppointmentReminderEmailInput = {
  locale:
    AppointmentNotificationLocale;
  reminderType:
    AppointmentReminderType;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  clinicName: string;
  scheduledDate: string;
  scheduledTime: string;
  cancellationUrl: string;
  consultationMode?: "in_person" | "video";
  telehealthReference?: string | null;
  idempotencyKey: string;
};

export type SendAppointmentReminderEmailResult = {
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
sendAppointmentReminderEmail(
  input:
    SendAppointmentReminderEmailInput
): Promise<
  SendAppointmentReminderEmailResult
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

  if (
    !input.patientEmail.trim()
  ) {
    return {
      sent: false,
      skipped: true,
      providerMessageId:
        null,
      errorCode:
        "MISSING_RECIPIENT",
      errorMessage:
        "Patient email is missing.",
    };
  }

  let cancellationUrl: URL;

  try {
    cancellationUrl =
      new URL(
        input.cancellationUrl
      );
  } catch {
    return {
      sent: false,
      skipped: true,
      providerMessageId:
        null,
      errorCode:
        "INVALID_CANCELLATION_URL",
      errorMessage:
        "The cancellation URL is invalid.",
    };
  }

  if (
    ![
      "http:",
      "https:",
    ].includes(
      cancellationUrl.protocol
    )
  ) {
    return {
      sent: false,
      skipped: true,
      providerMessageId:
        null,
      errorCode:
        "INVALID_CANCELLATION_URL",
      errorMessage:
        "The cancellation URL must use HTTP or HTTPS.",
    };
  }

  cancellationUrl.searchParams.set(
    "locale",
    input.locale
  );

  const copy =
    getAppointmentNotificationCopy(
      input.locale
    );

  const content =
    copy.reminders[
      input.reminderType
    ];

  const formattedDate =
    formatAppointmentNotificationDate(
      input.scheduledDate,
      input.locale
    );

  const formattedTime =
    formatAppointmentNotificationTime(
      input.scheduledTime,
      input.locale
    );

  const resend =
    new Resend(apiKey);

  const telehealthUrl = input.consultationMode === "video" && input.telehealthReference
    ? `${cancellationUrl.origin}/telehealth/${encodeURIComponent(input.telehealthReference)}`
    : null;

  const telehealthCopy = input.locale === "ro"
    ? { title: "Consultație video", notice: "Conținutul audio și video nu este înregistrat, transcris sau stocat de RomDoc ori Daily. Autentifică-te cu contul de Pacient asociat programării.", action: "Deschide consultația video" }
    : input.locale === "de"
      ? { title: "Videosprechstunde", notice: "Audio und Video werden weder von RomDoc noch von Daily aufgezeichnet, transkribiert oder gespeichert. Melden Sie sich mit dem Patientenkonto an, das mit dem Termin verknüpft ist.", action: "Videosprechstunde öffnen" }
      : { title: "Video consultation", notice: "Audio and video are not recorded, transcribed, or stored by RomDoc or Daily. Sign in with the Patient account linked to this appointment.", action: "Open video consultation" };

  try {
    const result =
      await resend.emails.send(
        {
          from,
          to:
            input.patientEmail,
          subject:
            `${content.subject} – ${input.doctorName}`,
          html: `
            <!doctype html>
            <html lang="${input.locale}">
              <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
                <div style="max-width:640px;margin:0 auto;padding:32px 16px">
                  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:32px">
                    <p style="margin:0 0 12px;color:#036661;font-size:16px;font-weight:700">RomDoc</p>

                    <h1 style="margin:0;color:#111827;font-size:28px;line-height:1.25">
                      ${escapeHtml(content.heading)}
                    </h1>

                    <p style="margin:22px 0 0;line-height:1.7">
                      ${escapeHtml(copy.greeting(input.patientName))}
                    </p>

                    <p style="margin:14px 0 0;line-height:1.7">
                      ${escapeHtml(content.introduction)}
                    </p>

                    <div style="margin-top:24px;padding:20px;border:1px solid #e5e7eb;border-radius:14px;background:#f9fafb">
                      <p style="margin:0 0 12px"><strong>${escapeHtml(copy.doctorLabel)}:</strong> ${escapeHtml(input.doctorName)}</p>
                      <p style="margin:0 0 12px"><strong>${escapeHtml(copy.clinicLabel)}:</strong> ${escapeHtml(input.clinicName)}</p>
                      <p style="margin:0 0 12px"><strong>${escapeHtml(copy.dateLabel)}:</strong> ${escapeHtml(formattedDate)}</p>
                      <p style="margin:0"><strong>${escapeHtml(copy.timeLabel)}:</strong> ${escapeHtml(formattedTime)}</p>
                    </div>

                    <p style="margin:22px 0 0;line-height:1.7">
                      ${escapeHtml(content.notice)}
                    </p>

                    ${telehealthUrl ? `
                      <div style="margin-top:24px;padding:20px;border:1px solid #a7f3d0;border-radius:14px;background:#ecfdf5">
                        <p style="margin:0 0 10px;font-weight:700;color:#036661">${escapeHtml(telehealthCopy.title)}</p>
                        <p style="margin:0;line-height:1.7;color:#374151">${escapeHtml(telehealthCopy.notice)}</p>
                        <p style="margin:18px 0 0"><a href="${escapeHtml(telehealthUrl)}" style="display:inline-block;border-radius:10px;background:#036661;padding:12px 18px;color:#ffffff;font-weight:700;text-decoration:none">${escapeHtml(telehealthCopy.action)}</a></p>
                      </div>
                    ` : ""}

                    <div style="margin-top:26px">
                      <a
                        href="${escapeHtml(cancellationUrl.toString())}"
                        style="display:inline-block;border-radius:10px;background:#036661;padding:13px 20px;color:#ffffff;font-weight:700;text-decoration:none"
                      >
                        ${escapeHtml(copy.reminderAction)}
                      </a>
                    </div>

                    <p style="margin:18px 0 0;color:#6b7280;font-size:13px;line-height:1.6">
                      ${escapeHtml(copy.reminderLoginNotice)}
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
            content.heading,
            "",
            copy.greeting(
              input.patientName
            ),
            content.introduction,
            "",
            `${copy.doctorLabel}: ${input.doctorName}`,
            `${copy.clinicLabel}: ${input.clinicName}`,
            `${copy.dateLabel}: ${formattedDate}`,
            `${copy.timeLabel}: ${formattedTime}`,
            "",
            content.notice,
            ...(telehealthUrl ? ["", telehealthCopy.title, telehealthCopy.notice, `${telehealthCopy.action}: ${telehealthUrl}`] : []),
            "",
            `${copy.reminderAction}: ${cancellationUrl.toString()}`,
            "",
            copy.reminderLoginNotice,
          ].join("\n"),
        },
        {
          idempotencyKey:
            input.idempotencyKey,
        }
      );

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
