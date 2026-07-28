import "server-only";

import { Resend } from "resend";

import type { AppLocale } from "@/lib/i18n/app-locale";

export type SendContractAssignmentEmailInput = {
  locale: AppLocale;
  recipientEmail: string;
  recipientName: string;
  clientName: string;
  packageTitle: string;
  packageVersion: string;
  acceptanceRequired: boolean;
  effectiveAt: string | null;
  contractPageUrl: string;
};

export type SendContractAssignmentEmailResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
};

const COPY = {
  ro: {
    subject: "Documente contractuale RomDoc disponibile",
    heading: "A fost atribuit un nou pachet contractual",
    greeting: (name: string) => `Bună ziua, ${name},`,
    acceptance:
      "Pachetul necesită acceptare electronică. Consultați toate documentele și înregistrați acceptarea din panoul RomDoc.",
    notice:
      "Pachetul este transmis ca informare contractuală. Nu este necesară o nouă acceptare electronică.",
    client: "Parte contractantă",
    package: "Pachet",
    version: "Versiune",
    effective: "Data intrării în vigoare",
    action: "Deschide Contract și documente",
    footer:
      "Documentele publicate nu pot fi modificate. Orice versiune nouă este păstrată separat în istoricul contractual.",
  },
  en: {
    subject: "RomDoc contract documents available",
    heading: "A new contract package has been assigned",
    greeting: (name: string) => `Hello ${name},`,
    acceptance:
      "The package requires electronic acceptance. Review every document and record the acceptance from your RomDoc dashboard.",
    notice:
      "The package is provided as a contractual notice. A new electronic acceptance is not required.",
    client: "Contracting party",
    package: "Package",
    version: "Version",
    effective: "Effective date",
    action: "Open Contract and documents",
    footer:
      "Published documents cannot be changed. Every new version is preserved separately in the contract history.",
  },
  de: {
    subject: "RomDoc-Vertragsunterlagen verfügbar",
    heading: "Ein neues Vertragspaket wurde zugewiesen",
    greeting: (name: string) => `Guten Tag, ${name},`,
    acceptance:
      "Das Paket erfordert eine elektronische Annahme. Prüfen Sie alle Dokumente und erfassen Sie die Annahme im RomDoc-Dashboard.",
    notice:
      "Das Paket wird als vertragliche Mitteilung bereitgestellt. Eine erneute elektronische Annahme ist nicht erforderlich.",
    client: "Vertragspartei",
    package: "Paket",
    version: "Version",
    effective: "Wirksamkeitsdatum",
    action: "Vertrag und Dokumente öffnen",
    footer:
      "Veröffentlichte Dokumente können nicht geändert werden. Jede neue Version wird separat im Vertragsverlauf gespeichert.",
  },
} as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }
  ).format(date);
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Email error");
  }
  return String(error);
}

export async function sendContractAssignmentEmail(
  input: SendContractAssignmentEmailInput
): Promise<SendContractAssignmentEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_CONTRACTS_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage:
        "RESEND_API_KEY and RESEND_CONTRACTS_FROM_EMAIL or RESEND_FROM_EMAIL are required.",
    };
  }

  const copy = COPY[input.locale];
  const resend = new Resend(apiKey);
  const replyTo = process.env.ROMDOC_CONTRACTS_EMAIL?.trim() || undefined;
  const message = input.acceptanceRequired ? copy.acceptance : copy.notice;
  const effectiveDate = formatDate(input.effectiveAt, input.locale);

  try {
    const result = await resend.emails.send({
      from,
      to: input.recipientEmail,
      replyTo,
      subject: `${copy.subject} — ${input.packageTitle}`,
      html: `
        <!doctype html>
        <html lang="${input.locale}">
          <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
            <div style="max-width:640px;margin:0 auto;padding:34px 21px">
              <div style="background:#ffffff;border-radius:21px;padding:34px;border:1px solid #e5e7eb">
                <p style="margin:0 0 13px;color:#036661;font-weight:700">RomDoc</p>
                <h1 style="margin:0;font-size:26px;line-height:1.25">${escapeHtml(copy.heading)}</h1>
                <p style="margin:21px 0 0;line-height:1.7">${escapeHtml(copy.greeting(input.recipientName))}</p>
                <p style="margin:13px 0 0;line-height:1.7">${escapeHtml(message)}</p>

                <div style="margin-top:21px;padding:21px;border-radius:13px;background:#f8fbfa;border:1px solid #d1e7e4">
                  <p style="margin:0 0 8px"><strong>${escapeHtml(copy.client)}:</strong> ${escapeHtml(input.clientName)}</p>
                  <p style="margin:0 0 8px"><strong>${escapeHtml(copy.package)}:</strong> ${escapeHtml(input.packageTitle)}</p>
                  <p style="margin:0 0 8px"><strong>${escapeHtml(copy.version)}:</strong> ${escapeHtml(input.packageVersion)}</p>
                  <p style="margin:0"><strong>${escapeHtml(copy.effective)}:</strong> ${escapeHtml(effectiveDate)}</p>
                </div>

                <p style="margin:21px 0 0">
                  <a href="${escapeHtml(input.contractPageUrl)}" style="display:inline-block;border-radius:13px;background:#036661;color:#ffffff;padding:13px 21px;text-decoration:none;font-weight:700">
                    ${escapeHtml(copy.action)}
                  </a>
                </p>

                <p style="margin:21px 0 0;color:#6b7280;font-size:13px;line-height:1.6">${escapeHtml(copy.footer)}</p>
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
        message,
        "",
        `${copy.client}: ${input.clientName}`,
        `${copy.package}: ${input.packageTitle}`,
        `${copy.version}: ${input.packageVersion}`,
        `${copy.effective}: ${effectiveDate}`,
        "",
        `${copy.action}: ${input.contractPageUrl}`,
        "",
        copy.footer,
      ].join("\n"),
    });

    const providerMessageId = result.data?.id ?? null;

    return {
      sent: Boolean(providerMessageId),
      skipped: false,
      providerMessageId,
      errorMessage: providerMessageId
        ? null
        : result.error?.message ?? "Resend returned no message id.",
    };
  } catch (error) {
    return {
      sent: false,
      skipped: false,
      providerMessageId: null,
      errorMessage: readableError(error),
    };
  }
}
