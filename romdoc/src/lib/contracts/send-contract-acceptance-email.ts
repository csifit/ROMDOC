import "server-only";

import { Resend } from "resend";

import type { AppLocale } from "@/lib/i18n/app-locale";

export type SendContractAcceptanceEmailInput = {
  locale: AppLocale;
  recipientEmail: string;
  recipientName: string;
  representedEntityName: string;
  packageTitle: string;
  packageVersion: string;
  acceptedAt: string;
  paymentDeadlineDays: number;
  contractPageUrl: string;
  pdfFileName: string | null;
  pdfBuffer: Buffer | null;
};

export type SendContractAcceptanceEmailResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
};

const COPY: Record<
  AppLocale,
  {
    subject: string;
    heading: string;
    greeting: (name: string) => string;
    intro: string;
    entity: string;
    package: string;
    version: string;
    acceptedAt: string;
    paymentDeadline: string;
    calendarDays: string;
    attachment: string;
    noAttachment: string;
    action: string;
    security: string;
  }
> = {
  ro: {
    subject: "Confirmarea acceptării contractului RomDoc",
    heading: "Contractul RomDoc a fost acceptat",
    greeting: (name) => `Bună ziua, ${name},`,
    intro:
      "Acceptarea electronică a fost înregistrată. Pachetul contractual și dovada acceptării sunt păstrate în mod imuabil în RomDoc.",
    entity: "Parte contractantă",
    package: "Pachet contractual",
    version: "Versiune",
    acceptedAt: "Acceptat la",
    paymentDeadline: "Termen de plată",
    calendarDays: "zile calendaristice de la emiterea facturii",
    attachment:
      "Pachetul contractual acceptat este atașat acestui e-mail în format PDF.",
    noAttachment:
      "PDF-ul nu a putut fi atașat acestui mesaj. Îl puteți descărca în siguranță din pagina Contract și documente.",
    action: "Deschide Contract și documente",
    security:
      "Păstrați acest mesaj și documentul atașat pentru evidența dumneavoastră. Nu răspundeți cu date medicale sau informații despre pacienți.",
  },
  en: {
    subject: "RomDoc contract acceptance confirmation",
    heading: "Your RomDoc contract was accepted",
    greeting: (name) => `Hello ${name},`,
    intro:
      "The electronic acceptance has been recorded. The contract package and acceptance evidence are retained immutably by RomDoc.",
    entity: "Contracting party",
    package: "Contract package",
    version: "Version",
    acceptedAt: "Accepted on",
    paymentDeadline: "Payment deadline",
    calendarDays: "calendar days from the invoice issue date",
    attachment:
      "The accepted contract package is attached to this email as a PDF.",
    noAttachment:
      "The PDF could not be attached to this message. You can download it securely from the Contract and documents page.",
    action: "Open Contract and documents",
    security:
      "Keep this message and the attached document for your records. Do not reply with medical information or patient data.",
  },
  de: {
    subject: "Bestätigung der Annahme des RomDoc-Vertrags",
    heading: "Ihr RomDoc-Vertrag wurde angenommen",
    greeting: (name) => `Guten Tag ${name},`,
    intro:
      "Die elektronische Annahme wurde erfasst. Das Vertragspaket und der Annahmenachweis werden von RomDoc unveränderlich aufbewahrt.",
    entity: "Vertragspartei",
    package: "Vertragspaket",
    version: "Version",
    acceptedAt: "Angenommen am",
    paymentDeadline: "Zahlungsfrist",
    calendarDays: "Kalendertage ab Rechnungsdatum",
    attachment:
      "Das angenommene Vertragspaket ist dieser E-Mail als PDF beigefügt.",
    noAttachment:
      "Das PDF konnte dieser Nachricht nicht beigefügt werden. Sie können es sicher auf der Seite Vertrag und Dokumente herunterladen.",
    action: "Vertrag und Dokumente öffnen",
    security:
      "Bewahren Sie diese Nachricht und das beigefügte Dokument für Ihre Unterlagen auf. Antworten Sie nicht mit medizinischen Informationen oder Patientendaten.",
  },
};

const DATE_LOCALES: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAcceptedAt(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown };
    if (typeof candidate.message === "string") return candidate.message;
  }

  return String(error);
}

export async function sendContractAcceptanceEmail(
  input: SendContractAcceptanceEmailInput
): Promise<SendContractAcceptanceEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_CONTRACTS_FROM_EMAIL ??
    process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage: "RESEND_API_KEY or contract sender email is not configured.",
    };
  }

  const copy = COPY[input.locale];
  const replyTo =
    process.env.ROMDOC_CONTRACTS_EMAIL ??
    process.env.ROMDOC_LEGAL_EMAIL ??
    "privacy@romdoc.fit";
  const acceptedAt = formatAcceptedAt(input.acceptedAt, input.locale);
  const attachmentAvailable =
    input.pdfBuffer !== null &&
    input.pdfFileName !== null &&
    input.pdfBuffer.byteLength <= 25 * 1024 * 1024;

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: input.recipientEmail,
      replyTo,
      subject: `${copy.subject} - ${input.representedEntityName}`,
      html: `
        <!doctype html>
        <html lang="${input.locale}">
          <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
            <div style="max-width:680px;margin:0 auto;padding:34px 16px">
              <div style="background:#ffffff;border-radius:21px;padding:34px;border:1px solid #e5e7eb">
                <p style="margin:0 0 13px;color:#036661;font-size:16px;font-weight:700">RomDoc</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2">${escapeHtml(copy.heading)}</h1>
                <p style="margin:21px 0 0;line-height:1.7">${escapeHtml(copy.greeting(input.recipientName))}</p>
                <p style="line-height:1.7">${escapeHtml(copy.intro)}</p>

                <div style="margin-top:21px;padding:21px;border-radius:13px;background:#f9fafb">
                  <p style="margin:0 0 8px"><strong>${escapeHtml(copy.entity)}:</strong> ${escapeHtml(input.representedEntityName)}</p>
                  <p style="margin:0 0 8px"><strong>${escapeHtml(copy.package)}:</strong> ${escapeHtml(input.packageTitle)}</p>
                  <p style="margin:0 0 8px"><strong>${escapeHtml(copy.version)}:</strong> ${escapeHtml(input.packageVersion)}</p>
                  <p style="margin:0 0 8px"><strong>${escapeHtml(copy.acceptedAt)}:</strong> ${escapeHtml(acceptedAt)}</p>
                  <p style="margin:0"><strong>${escapeHtml(copy.paymentDeadline)}:</strong> ${input.paymentDeadlineDays} ${escapeHtml(copy.calendarDays)}</p>
                </div>

                <p style="margin-top:21px;line-height:1.7">
                  ${escapeHtml(attachmentAvailable ? copy.attachment : copy.noAttachment)}
                </p>

                <p style="margin:21px 0 0">
                  <a href="${escapeHtml(input.contractPageUrl)}" style="display:inline-block;border-radius:13px;background:#036661;color:#ffffff;padding:13px 21px;text-decoration:none;font-weight:700">
                    ${escapeHtml(copy.action)}
                  </a>
                </p>

                <p style="margin-top:34px;color:#6b7280;font-size:13px;line-height:1.6">
                  ${escapeHtml(copy.security)}
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: [
        "RomDoc",
        "",
        copy.heading,
        "",
        copy.greeting(input.recipientName),
        copy.intro,
        "",
        `${copy.entity}: ${input.representedEntityName}`,
        `${copy.package}: ${input.packageTitle}`,
        `${copy.version}: ${input.packageVersion}`,
        `${copy.acceptedAt}: ${acceptedAt}`,
        `${copy.paymentDeadline}: ${input.paymentDeadlineDays} ${copy.calendarDays}`,
        "",
        attachmentAvailable ? copy.attachment : copy.noAttachment,
        input.contractPageUrl,
        "",
        copy.security,
      ].join("\n"),
      attachments: attachmentAvailable
        ? [
            {
              filename: input.pdfFileName as string,
              content: (input.pdfBuffer as Buffer).toString("base64"),
            },
          ]
        : undefined,
    });

    if (error) {
      return {
        sent: false,
        skipped: false,
        providerMessageId: null,
        errorMessage: normalizeError(error),
      };
    }

    return {
      sent: true,
      skipped: false,
      providerMessageId: data?.id ?? null,
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
