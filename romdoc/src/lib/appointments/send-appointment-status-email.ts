import { Resend } from "resend";

import {
  formatAppointmentNotificationDate,
  formatAppointmentNotificationTime,
  getAppointmentNotificationCopy,
  type AppointmentNotificationStatus,
} from "@/lib/appointments/appointment-notification-copy";
import {
  resolveAppointmentNotificationLocale,
  type AppointmentNotificationLocale,
} from "@/lib/appointments/notification-locale";
import { getPublicTelehealthUrl } from "@/lib/telehealth/constants";

export type PatientNotificationStatus =
  AppointmentNotificationStatus;

type SendAppointmentStatusEmailInput = {
  appointmentId: string;
  locale?:
    | AppointmentNotificationLocale
    | null;
  status:
    PatientNotificationStatus;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  clinicName: string;
  scheduledDate:
    string | null;
  scheduledTime:
    string | null;
  rescheduleReason:
    string | null;
  consultationMode?: string;
  telehealthReference?: string | null;
};

export type SendAppointmentStatusEmailResult = {
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

function getPatientRegisterUrl(
  patientEmail: string,
  locale:
    AppointmentNotificationLocale
) {
  const query =
    new URLSearchParams({
      email: patientEmail,
      role: "patient",
      locale,
    });

  return `${getSiteUrl()}/register?${query.toString()}`;
}

function getAppointmentDetailsUrl(
  appointmentId: string,
  locale:
    AppointmentNotificationLocale
) {
  return `${getSiteUrl()}/appointments/${appointmentId}/request-received?locale=${locale}`;
}

function getCalendarDownloadUrl(
  appointmentId: string,
  locale:
    AppointmentNotificationLocale
) {
  return `${getSiteUrl()}/api/appointments/${appointmentId}/calendar?locale=${locale}`;
}

function getGoogleCalendarUrl(
  input: {
    locale:
      AppointmentNotificationLocale;
    doctorName: string;
    clinicName: string;
    scheduledDate:
      string | null;
    scheduledTime:
      string | null;
    telehealthUrl?: string | null;
  }
) {
  if (
    !input.scheduledDate ||
    !input.scheduledTime
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] =
    input.scheduledDate
      .split("-")
      .map(Number);

  const [
    hours,
    minutes,
  ] =
    input.scheduledTime
      .slice(0, 5)
      .split(":")
      .map(Number);

  const start =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hours,
        minutes
      )
    );

  const end =
    new Date(
      start.getTime() +
        30 * 60 * 1000
    );

  function compact(
    value: Date
  ) {
    return value
      .toISOString()
      .slice(0, 19)
      .replaceAll("-", "")
      .replaceAll(":", "");
  }

  const calendarCopy =
    getAppointmentNotificationCopy(
      input.locale
    ).calendar;

  const query =
    new URLSearchParams({
      action: "TEMPLATE",
      text:
        calendarCopy
          .googleTitle(
            input.doctorName
          ),
      dates:
        `${compact(start)}/${compact(end)}`,
      details:
        input.telehealthUrl
          ? `${calendarCopy.googleDescription} ${input.locale === "ro" ? "Consultația nu este înregistrată sau stocată." : input.locale === "de" ? "Die Sprechstunde wird weder aufgezeichnet noch gespeichert." : "The consultation is not recorded or stored."} ${input.telehealthUrl}`
          : calendarCopy.googleDescription,
      location:
        input.telehealthUrl
          ? (input.locale === "ro" ? "Consultație video RomDoc" : input.locale === "de" ? "RomDoc Videosprechstunde" : "RomDoc video consultation")
          : input.clinicName,
      ctz:
        "Europe/Bucharest",
    });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

function stringifyError(
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
sendAppointmentStatusEmail(
  input:
    SendAppointmentStatusEmailInput
): Promise<
  SendAppointmentStatusEmailResult
> {
  const locale =
    resolveAppointmentNotificationLocale(
      input.locale
    );

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
      locale
    );

  const content =
    copy.statuses[
      input.status
    ];

  const patientRegisterUrl =
    getPatientRegisterUrl(
      input.patientEmail,
      locale
    );

  const appointmentDetailsUrl =
    getAppointmentDetailsUrl(
      input.appointmentId,
      locale
    );

  const telehealthUrl = input.consultationMode === "video" && input.telehealthReference
    ? getPublicTelehealthUrl(input.telehealthReference)
    : null;

  const telehealthCopy = locale === "ro"
    ? { title: "Consultație video", notice: "Conținutul audio și video nu este înregistrat, transcris sau stocat de RomDoc ori Daily. Autentifică-te cu contul de Pacient asociat programării înainte de conectare.", action: "Deschide consultația video" }
    : locale === "de"
      ? { title: "Videosprechstunde", notice: "Audio und Video werden weder von RomDoc noch von Daily aufgezeichnet, transkribiert oder gespeichert. Melden Sie sich vor dem Beitritt mit dem Patientenkonto an, das mit dem Termin verknüpft ist.", action: "Videosprechstunde öffnen" }
      : { title: "Video consultation", notice: "Audio and video are not recorded, transcribed, or stored by RomDoc or Daily. Sign in with the Patient account linked to this appointment before joining.", action: "Open video consultation" };

  const calendarDownloadUrl =
    getCalendarDownloadUrl(
      input.appointmentId,
      locale
    );

  const googleCalendarUrl =
    getGoogleCalendarUrl({
      locale:
        locale,
      doctorName:
        input.doctorName,
      clinicName:
        input.clinicName,
      scheduledDate:
        input.scheduledDate,
      scheduledTime:
        input.scheduledTime,
      telehealthUrl,
    });

  const calendarIsAvailable =
    input.status ===
      "confirmed" ||
    input.status ===
      "rescheduled";

  const formattedDate =
    formatAppointmentNotificationDate(
      input.scheduledDate,
      locale
    );

  const formattedTime =
    formatAppointmentNotificationTime(
      input.scheduledTime,
      locale
    );

  const resend =
    new Resend(apiKey);

  try {
    const result =
      await resend.emails.send({
        from,
        to:
          input.patientEmail,
        subject:
          `${content.subject} – ${input.doctorName}`,
        html: `
          <!doctype html>
          <html lang="${locale}">
            <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
              <div style="max-width:640px;margin:0 auto;padding:32px 16px">
                <div style="background:#fff;border-radius:16px;padding:32px">
                  <p style="margin:0 0 12px;color:#036661;font-weight:700">RomDoc</p>
                  <h1 style="margin:0;font-size:28px">${escapeHtml(content.heading)}</h1>
                  <p style="margin-top:20px;line-height:1.7">${escapeHtml(copy.greeting(input.patientName))}</p>
                  <p style="line-height:1.7">${escapeHtml(content.message)}</p>

                  <div style="margin-top:24px;padding:20px;border-radius:12px;background:#f9fafb">
                    <p><strong>${escapeHtml(copy.doctorLabel)}:</strong> ${escapeHtml(input.doctorName)}</p>
                    <p><strong>${escapeHtml(copy.clinicLabel)}:</strong> ${escapeHtml(input.clinicName)}</p>
                    <p><strong>${escapeHtml(copy.dateLabel)}:</strong> ${escapeHtml(formattedDate)}</p>
                    <p><strong>${escapeHtml(copy.timeLabel)}:</strong> ${escapeHtml(formattedTime)}</p>
                  </div>

                  ${telehealthUrl ? `
                    <div style="margin-top:24px;padding:20px;border-radius:12px;border:1px solid #a7f3d0;background:#ecfdf5">
                      <p style="margin:0 0 10px;font-weight:700;color:#036661">${escapeHtml(telehealthCopy.title)}</p>
                      <p style="margin:0;line-height:1.7;color:#374151">${escapeHtml(telehealthCopy.notice)}</p>
                      <p style="margin:18px 0 0"><a href="${escapeHtml(telehealthUrl)}" style="display:inline-block;border-radius:10px;background:#036661;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">${escapeHtml(telehealthCopy.action)}</a></p>
                    </div>
                  ` : ""}

                  ${
                    calendarIsAvailable
                      ? `
                        <div style="margin-top:24px;padding:20px;border-radius:12px;border:1px solid #bfdbfe;background:#eff6ff">
                          <p style="margin:0 0 10px;font-weight:700;color:#1d4ed8">
                            ${escapeHtml(copy.calendar.title)}
                          </p>
                          <p style="margin:0;line-height:1.7;color:#374151">
                            ${escapeHtml(copy.calendar.description)}
                          </p>

                          <p style="margin:18px 0 0">
                            <a
                              href="${escapeHtml(appointmentDetailsUrl)}"
                              style="display:inline-block;margin-right:10px;margin-bottom:10px;border-radius:10px;background:#036661;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700"
                            >
                              ${escapeHtml(copy.calendar.viewAppointment)}
                            </a>

                            <a
                              href="${escapeHtml(calendarDownloadUrl)}"
                              style="display:inline-block;margin-right:10px;margin-bottom:10px;border-radius:10px;background:#1d4ed8;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700"
                            >
                              ${escapeHtml(copy.calendar.downloadCalendar)}
                            </a>

                            ${
                              googleCalendarUrl
                                ? `
                                  <a
                                    href="${escapeHtml(googleCalendarUrl)}"
                                    style="display:inline-block;margin-bottom:10px;border-radius:10px;background:#ffffff;color:#1d4ed8;border:1px solid #1d4ed8;padding:11px 17px;text-decoration:none;font-weight:700"
                                  >
                                    ${escapeHtml(copy.calendar.addGoogleCalendar)}
                                  </a>
                                `
                                : ""
                            }
                          </p>
                        </div>
                      `
                      : ""
                  }

                  ${
                    input.status ===
                    "confirmed"
                      ? `
                        <div style="margin-top:24px;padding:20px;border-radius:12px;border:1px solid #d1fae5;background:#f0fdf4">
                          <p style="margin:0 0 10px;font-weight:700;color:#036661">
                            ${escapeHtml(copy.patientAccount.title)}
                          </p>
                          <p style="margin:0;line-height:1.7;color:#374151">
                            ${escapeHtml(copy.patientAccount.description)}
                          </p>
                          <p style="margin:18px 0 0">
                            <a
                              href="${escapeHtml(patientRegisterUrl)}"
                              style="display:inline-block;border-radius:10px;background:#036661;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700"
                            >
                              ${escapeHtml(copy.patientAccount.actionLabel)}
                            </a>
                          </p>
                        </div>
                      `
                      : ""
                  }

                  ${
                    input.status ===
                      "rescheduled" &&
                    input.rescheduleReason
                      ? `<p style="margin-top:20px"><strong>${escapeHtml(copy.reasonLabel)}:</strong> ${escapeHtml(input.rescheduleReason)}</p>`
                      : ""
                  }

                  <p style="margin-top:28px;color:#6b7280;font-size:13px">
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
          content.message,
          "",
          `${copy.doctorLabel}: ${input.doctorName}`,
          `${copy.clinicLabel}: ${input.clinicName}`,
          `${copy.dateLabel}: ${formattedDate}`,
          `${copy.timeLabel}: ${formattedTime}`,
          telehealthUrl
            ? `${telehealthCopy.title}\n${telehealthCopy.notice}\n${telehealthCopy.action}: ${telehealthUrl}`
            : "",
          input.status ===
              "rescheduled" &&
            input.rescheduleReason
            ? `${copy.reasonLabel}: ${input.rescheduleReason}`
            : "",
          calendarIsAvailable
            ? `${copy.calendar.viewAppointment}: ${appointmentDetailsUrl}`
            : "",
          "",
          copy.tagline,
        ]
          .filter(Boolean)
          .join("\n"),
      });

    if (result.error) {
      const normalized =
        stringifyError(
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
      stringifyError(error);

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
