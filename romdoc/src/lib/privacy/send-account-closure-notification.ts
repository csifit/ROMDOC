import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";

export type ClosureNotificationType =
  | "closure_requested"
  | "closure_cancelled"
  | "processing_started"
  | "closure_completed";

type ClosureLocale = "ro" | "en";

type Input = {
  closureRequestId: string;
  profileId: string;
  recipientEmail: string;
  recipientName: string;
  notificationType: ClosureNotificationType;
  locale?: string | null;
  coolingOffEndsAt?: string | null;
  completedAt?: string | null;
};

export type Result = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

function normalizeLocale(locale?: string | null): ClosureLocale {
  return locale === "en" ? "en" : "ro";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string | null | undefined, locale: ClosureLocale) {
  if (!value) return locale === "ro" ? "Nu este disponibilă" : "Not available";

  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.romdoc.fit").replace(/\/+$/, "");
}

function footer(locale: ClosureLocale) {
  const legalName = process.env.ROMDOC_LEGAL_ENTITY_NAME?.trim();
  const legalAddress = process.env.ROMDOC_LEGAL_ENTITY_ADDRESS?.trim();
  const privacyEmail = process.env.ROMDOC_PRIVACY_EMAIL?.trim() || "privacy@romdoc.fit";
  const operator = legalName && legalAddress
    ? `${escapeHtml(legalName)}, ${escapeHtml(legalAddress)}`
    : locale === "ro" ? "Operatorul platformei RomDoc" : "The RomDoc platform operator";

  return `<p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6">${operator}<br>${locale === "ro" ? "Contact confidențialitate" : "Privacy contact"}: <a href="mailto:${escapeHtml(privacyEmail)}" style="color:#036661">${escapeHtml(privacyEmail)}</a></p>`;
}

function content(input: Input, locale: ClosureLocale) {
  const accountUrl = `${siteUrl()}/patient-dashboard/account`;
  const privacyUrl = `${siteUrl()}/confidentialitate`;
  const ro = locale === "ro";

  switch (input.notificationType) {
    case "closure_requested":
      return {
        subject: ro ? "Cererea ta de închidere a contului RomDoc" : "Your RomDoc account closure request",
        heading: ro ? "Închiderea contului a fost solicitată" : "Account closure requested",
        body: ro
          ? `<p>Cererea ta a fost înregistrată.</p><p>O poți anula până la <strong>${escapeHtml(formatDate(input.coolingOffEndsAt, locale))}</strong>.</p><p>Această cerere nu a șters documente medicale, programări, evidențe contabile sau contul de autentificare.</p>`
          : `<p>Your request was recorded.</p><p>You may cancel it until <strong>${escapeHtml(formatDate(input.coolingOffEndsAt, locale))}</strong>.</p><p>This request did not delete medical, appointment, billing, or authentication records.</p>`,
        button: ro ? "Verifică sau anulează cererea" : "Review or cancel request",
        url: accountUrl,
      };
    case "closure_cancelled":
      return {
        subject: ro ? "Cererea de închidere a contului RomDoc a fost anulată" : "Your RomDoc account closure request was cancelled",
        heading: ro ? "Închiderea contului a fost anulată" : "Account closure cancelled",
        body: ro ? "<p>Cererea a fost anulată, iar contul rămâne activ.</p>" : "<p>The request was cancelled and the account remains active.</p>",
        button: ro ? "Deschide RomDoc" : "Open RomDoc",
        url: siteUrl(),
      };
    case "processing_started":
      return {
        subject: ro ? "A început procesarea închiderii contului RomDoc" : "RomDoc account closure processing has started",
        heading: ro ? "Accesul la cont a fost restricționat" : "Account access has been restricted",
        body: ro
          ? "<p>Perioada de așteptare s-a încheiat și a început procesarea controlată.</p><p>Partajările controlate de pacient au fost revocate. Unele evidențe medicale, de programare, contabile, de securitate sau juridice pot rămâne cu acces restricționat.</p><p>Acest mesaj nu afirmă că toate înregistrările au fost șterse.</p>"
          : "<p>The waiting period ended and reviewed processing started.</p><p>Patient-controlled shares were revoked. Medical, appointment, billing, security, or legal records may remain with restricted access.</p><p>This message does not state that every record was deleted.</p>",
        button: ro ? "Citește Politica de confidențialitate" : "Read the Privacy Policy",
        url: privacyUrl,
      };
    case "closure_completed":
      return {
        subject: ro ? "Procesarea închiderii contului RomDoc a fost finalizată" : "RomDoc account closure processing completed",
        heading: ro ? "Procesarea închiderii a fost finalizată" : "Account closure processing completed",
        body: ro
          ? `<p>Acțiunile aprobate au fost finalizate la ${escapeHtml(formatDate(input.completedAt, locale))}.</p><p>Datele care nu mai erau necesare au fost șterse sau anonimizate. Evidențele obligatorii rămân cu acces restricționat.</p>`
          : `<p>Approved actions were completed on ${escapeHtml(formatDate(input.completedAt, locale))}.</p><p>Data no longer needed was deleted or anonymized. Required records remain with restricted access.</p>`,
        button: ro ? "Citește Politica de confidențialitate" : "Read the Privacy Policy",
        url: privacyUrl,
      };
  }
}

function errorValue(error: unknown) {
  return error instanceof Error
    ? { code: error.name || "EMAIL_ERROR", message: error.message.slice(0, 2000) }
    : { code: "EMAIL_ERROR", message: String(error).slice(0, 2000) };
}

export async function sendAccountClosureNotification(input: Input): Promise<Result> {
  const admin = createAdminClient();
  const locale = normalizeLocale(input.locale);
  const email = input.recipientEmail.trim().toLowerCase();

  const { data: existing, error: lookupError } = await admin
    .from("privacy_account_closure_notification_deliveries")
    .select("id,status,provider_message_id,attempt_count")
    .eq("closure_request_id", input.closureRequestId)
    .eq("notification_type", input.notificationType)
    .maybeSingle();

  if (lookupError) return { sent: false, skipped: false, providerMessageId: null, errorCode: "DELIVERY_LOOKUP_FAILED", errorMessage: lookupError.message };
  if (existing?.status === "sent") return { sent: false, skipped: true, providerMessageId: existing.provider_message_id, errorCode: null, errorMessage: null };

  const { data: delivery, error: deliveryError } = await admin
    .from("privacy_account_closure_notification_deliveries")
    .upsert({
      closure_request_id: input.closureRequestId,
      profile_id: input.profileId,
      notification_type: input.notificationType,
      recipient_email: email,
      locale,
      status: "pending",
      attempt_count: Number(existing?.attempt_count ?? 0) + 1,
      last_attempt_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    }, { onConflict: "closure_request_id,notification_type" })
    .select("id")
    .single();

  if (deliveryError || !delivery) return { sent: false, skipped: false, providerMessageId: null, errorCode: "DELIVERY_CREATE_FAILED", errorMessage: deliveryError?.message ?? "Delivery row not created." };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.ROMDOC_PRIVACY_EMAIL?.trim() || "privacy@romdoc.fit";

  if (!apiKey || !from) {
    await admin.from("privacy_account_closure_notification_deliveries").update({ status: "skipped", error_code: "MISSING_CONFIGURATION", error_message: "RESEND_API_KEY or RESEND_FROM_EMAIL is missing." }).eq("id", delivery.id);
    return { sent: false, skipped: true, providerMessageId: null, errorCode: "MISSING_CONFIGURATION", errorMessage: "RESEND_API_KEY or RESEND_FROM_EMAIL is missing." };
  }

  const copy = content(input, locale);
  const name = escapeHtml(input.recipientName || (locale === "ro" ? "pacient" : "patient"));
  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from,
      to: email,
      replyTo,
      subject: copy.subject,
      html: `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827"><div style="max-width:640px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border-radius:16px;padding:32px"><p style="margin:0 0 12px;color:#036661;font-weight:700">RomDoc</p><h1 style="margin:0;font-size:28px">${escapeHtml(copy.heading)}</h1><p style="margin-top:20px;line-height:1.7">${locale === "ro" ? "Bună" : "Hello"}, ${name}.</p><div style="line-height:1.7">${copy.body}</div><p style="margin-top:28px"><a href="${escapeHtml(copy.url)}" style="display:inline-block;background:#036661;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${escapeHtml(copy.button)}</a></p>${footer(locale)}</div></div></body></html>`,
    });

    if (result.error) throw result.error;
    const providerMessageId = result.data?.id ?? null;
    await admin.from("privacy_account_closure_notification_deliveries").update({ status: "sent", provider_message_id: providerMessageId, sent_at: new Date().toISOString(), error_code: null, error_message: null }).eq("id", delivery.id);
    return { sent: true, skipped: false, providerMessageId, errorCode: null, errorMessage: null };
  } catch (error) {
    const normalized = errorValue(error);
    await admin.from("privacy_account_closure_notification_deliveries").update({ status: "failed", error_code: normalized.code, error_message: normalized.message }).eq("id", delivery.id);
    return { sent: false, skipped: false, providerMessageId: null, errorCode: normalized.code, errorMessage: normalized.message };
  }
}
