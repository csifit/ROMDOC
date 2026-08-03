import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import {
  isAnyMedicalFolderShareToken,
  isMedicalFolderShareToken,
  isPermanentEmergencyShareToken,
  isUuid,
  permanentEmergencyShareTokenHint,
  type MedicalFolderShareScope,
} from "@/lib/medical-folder-share-grants";
import {
  verifyPermanentEmergencyShareToken,
} from "@/lib/medical-folder/permanent-emergency-share-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type EmailLocale = "ro" | "en" | "de";

type ShareGrantRow = {
  id: string;
  patient_profile_id: string;
  share_scope: MedicalFolderShareScope;
  expires_at: string | null;
  is_permanent: boolean;
  disabled_at: string | null;
  revoked_at: string | null;
  consumed_at: string | null;
};

type EmailCopy = {
  subject: string;
  heading: string;
  intro: string;
  permanentIntro: string;
  scopeLabel: string;
  expiresLabel: string;
  availabilityLabel: string;
  permanentAvailability: string;
  actionLabel: string;
  securityNotice: string;
  unexpectedNotice: string;
  footer: string;
  scopes: Record<MedicalFolderShareScope, string>;
};

const COPY: Record<EmailLocale, EmailCopy> = {
  ro: {
    subject: "RomDoc — informații medicale partajate",
    heading: "Ai primit un link medical securizat",
    intro:
      "Un pacient RomDoc a ales să îți ofere acces temporar, numai pentru citire, la informațiile selectate.",
    permanentIntro:
      "Un pacient RomDoc a ales să îți ofere acces permanent, numai pentru citire, la Rezumatul medical de urgență.",
    scopeLabel: "Informații partajate",
    expiresLabel: "Linkul expiră",
    availabilityLabel: "Disponibilitate",
    permanentAvailability:
      "Permanent, până când pacientul dezactivează sau înlocuiește codul QR",
    actionLabel: "Deschide informațiile medicale",
    securityNotice:
      "Nu este necesar un cont RomDoc. Nu distribui mai departe acest e-mail sau linkul securizat.",
    unexpectedNotice:
      "Dacă nu te așteptai la acest mesaj, îl poți șterge în siguranță.",
    footer:
      "RomDoc nu este dosarul electronic național de sănătate și nu înlocuiește serviciile medicale de urgență.",
    scopes: {
      emergency_summary: "Rezumat medical de urgență",
      medical_profile: "Profil medical",
      complete_folder: "Dosar medical complet",
      selected_documents: "Documente medicale selectate",
    },
  },
  en: {
    subject: "RomDoc — shared medical information",
    heading: "You received a secure medical link",
    intro:
      "A RomDoc patient chose to give you temporary, read-only access to selected medical information.",
    permanentIntro:
      "A RomDoc patient chose to give you permanent, read-only access to their Emergency Medical Summary.",
    scopeLabel: "Shared information",
    expiresLabel: "The link expires",
    availabilityLabel: "Availability",
    permanentAvailability:
      "Permanent until the patient deactivates or replaces the QR code",
    actionLabel: "Open the medical information",
    securityNotice:
      "A RomDoc account is not required. Do not forward this email or the secure link.",
    unexpectedNotice:
      "If you were not expecting this message, you can safely delete it.",
    footer:
      "RomDoc is not Romania’s national electronic health record and does not replace emergency medical services.",
    scopes: {
      emergency_summary: "Emergency medical summary",
      medical_profile: "Medical profile",
      complete_folder: "Complete Medical Folder",
      selected_documents: "Selected medical documents",
    },
  },
  de: {
    subject: "RomDoc — freigegebene medizinische Informationen",
    heading: "Sie haben einen sicheren medizinischen Link erhalten",
    intro:
      "Ein RomDoc-Patient hat Ihnen einen zeitlich begrenzten, schreibgeschützten Zugriff auf ausgewählte medizinische Informationen gewährt.",
    permanentIntro:
      "Ein RomDoc-Patient hat Ihnen einen dauerhaften, schreibgeschützten Zugriff auf die medizinische Notfallübersicht gewährt.",
    scopeLabel: "Freigegebene Informationen",
    expiresLabel: "Der Link läuft ab",
    availabilityLabel: "Verfügbarkeit",
    permanentAvailability:
      "Dauerhaft, bis der Patient den QR-Code deaktiviert oder ersetzt",
    actionLabel: "Medizinische Informationen öffnen",
    securityNotice:
      "Ein RomDoc-Konto ist nicht erforderlich. Leiten Sie diese E-Mail oder den sicheren Link nicht weiter.",
    unexpectedNotice:
      "Falls Sie diese Nachricht nicht erwartet haben, können Sie sie sicher löschen.",
    footer:
      "RomDoc ist nicht die nationale elektronische Gesundheitsakte Rumäniens und ersetzt keine medizinischen Notfalldienste.",
    scopes: {
      emergency_summary: "Medizinische Notfallübersicht",
      medical_profile: "Medizinisches Profil",
      complete_folder: "Vollständige medizinische Akte",
      selected_documents: "Ausgewählte medizinische Dokumente",
    },
  },
};

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function errorResponse(error: string, message: string, status: number) {
  return NextResponse.json(
    { error, message },
    { status, headers: NO_STORE_HEADERS }
  );
}

function isEmailLocale(value: unknown): value is EmailLocale {
  return value === "ro" || value === "en" || value === "de";
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  return email.length > 0 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSiteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    "";

  if (configured.trim()) {
    return configured.trim().replace(/\/$/, "");
  }

  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`.replace(/\/$/, "")
    : "https://www.romdoc.fit";
}

function formatExpiry(value: string, locale: EmailLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const localeName =
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB";

  return new Intl.DateTimeFormat(localeName, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(date);
}

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorResponse(
      "authentication_required",
      "Trebuie să fii autentificat.",
      401
    );
  }

  if (!user.email_confirmed_at) {
    return errorResponse(
      "active_patient_account_required",
      "Confirmă adresa de e-mail înainte de a trimite partajarea.",
      403
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "patient" ||
    profile.account_status !== "active"
  ) {
    return errorResponse(
      "active_patient_account_required",
      "Este necesar un cont activ de pacient.",
      403
    );
  }

  let body: {
    shareGrantId?: unknown;
    shareToken?: unknown;
    recipientEmail?: unknown;
    locale?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_request", "Datele trimise nu sunt valide.", 400);
  }

  if (!isUuid(body.shareGrantId)) {
    return errorResponse(
      "invalid_share_grant_id",
      "Partajarea selectată nu este validă.",
      400
    );
  }

  if (!isAnyMedicalFolderShareToken(body.shareToken)) {
    return errorResponse(
      "invalid_share_token",
      "Linkul securizat nu este valid.",
      400
    );
  }

  const recipientEmail = normalizeEmail(body.recipientEmail);
  if (!recipientEmail) {
    return errorResponse("invalid_email", "Adresa de e-mail nu este validă.", 400);
  }

  const locale: EmailLocale = isEmailLocale(body.locale) ? body.locale : "ro";
  const shareGrantId = body.shareGrantId.trim();
  const shareToken = body.shareToken;
  const admin = createAdminClient();

  const { data: grantData, error: grantError } = await admin
    .from("medical_folder_share_grants")
    .select(
      "id, patient_profile_id, share_scope, expires_at, is_permanent, disabled_at, revoked_at, consumed_at"
    )
    .eq("id", shareGrantId)
    .eq("patient_profile_id", user.id)
    .maybeSingle();

  if (grantError || !grantData) {
    return errorResponse(
      "share_grant_not_found",
      "Partajarea nu a fost găsită.",
      404
    );
  }

  const grant = grantData as ShareGrantRow;

  if (grant.revoked_at) {
    return errorResponse("share_grant_revoked", "Partajarea a fost revocată.", 409);
  }

  if (grant.is_permanent && grant.disabled_at) {
    return errorResponse(
      "share_disabled",
      "Codul QR permanent de urgență este dezactivat.",
      409
    );
  }

  if (grant.consumed_at) {
    return errorResponse(
      "share_grant_consumed",
      "Partajarea cu o singură utilizare a fost deja folosită.",
      409
    );
  }

  if (
    !grant.is_permanent &&
    (
      !grant.expires_at ||
      new Date(grant.expires_at).getTime() <= Date.now()
    )
  ) {
    return errorResponse(
      "share_grant_expired",
      "Partajarea a expirat.",
      409
    );
  }

  let tokenHint: string;

  if (grant.is_permanent) {
    if (
      !isPermanentEmergencyShareToken(shareToken)
    ) {
      return errorResponse(
        "invalid_share_token",
        "Linkul securizat nu este valid.",
        409
      );
    }

    let verified:
      ReturnType<
        typeof verifyPermanentEmergencyShareToken
      >;

    try {
      verified =
        verifyPermanentEmergencyShareToken(
          shareToken
        );
    } catch {
      return errorResponse(
        "email_configuration_missing",
        "Serviciul pentru codul QR permanent nu este configurat.",
        503
      );
    }

    if (
      !verified ||
      verified.grantId !== grant.id
    ) {
      return errorResponse(
        "invalid_share_token",
        "Linkul securizat nu este valid.",
        409
      );
    }

    tokenHint =
      permanentEmergencyShareTokenHint(
        shareToken
      ) ?? "rdem_";
  } else {
    if (
      !isMedicalFolderShareToken(
        shareToken
      )
    ) {
      return errorResponse(
        "invalid_share_token",
        "Linkul securizat nu este valid.",
        409
      );
    }

    const {
      data: tokenData,
      error: tokenError,
    } = await admin
      .from("medical_folder_share_tokens")
      .select("id, token_hint")
      .eq("share_grant_id", grant.id)
      .eq("token_hash", hashToken(shareToken))
      .is("invalidated_at", null)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return errorResponse(
        "invalid_share_token",
        "Linkul securizat nu mai este activ.",
        409
      );
    }

    tokenHint =
      tokenData.token_hint;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_MEDICAL_FOLDER_FROM_EMAIL ??
    process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return errorResponse(
      "email_configuration_missing",
      "Serviciul de e-mail nu este configurat.",
      503
    );
  }

  const copy = COPY[locale];
  const shareUrl = `${getSiteUrl()}/share/medical-folder#token=${encodeURIComponent(
    shareToken
  )}&channel=email`;
  const scopeLabel = copy.scopes[grant.share_scope];
  const intro = grant.is_permanent
    ? copy.permanentIntro
    : copy.intro;
  const timingLabel = grant.is_permanent
    ? copy.availabilityLabel
    : copy.expiresLabel;
  const timingValue = grant.is_permanent
    ? copy.permanentAvailability
    : formatExpiry(grant.expires_at ?? "", locale);
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from,
    to: recipientEmail,
    subject: copy.subject,
    html: `
      <!doctype html>
      <html lang="${locale}">
        <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
          <div style="max-width:640px;margin:0 auto;padding:32px 16px">
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:32px">
              <p style="margin:0 0 12px;color:#036661;font-size:16px;font-weight:700">RomDoc</p>
              <h1 style="margin:0;font-size:28px;line-height:1.25">${escapeHtml(
                copy.heading
              )}</h1>
              <p style="margin:20px 0 0;line-height:1.7">${escapeHtml(
                intro
              )}</p>

              <div style="margin-top:24px;padding:20px;border:1px solid #e5e7eb;border-radius:14px;background:#f9fafb">
                <p style="margin:0 0 12px"><strong>${escapeHtml(
                  copy.scopeLabel
                )}:</strong> ${escapeHtml(scopeLabel)}</p>
                <p style="margin:0"><strong>${escapeHtml(
                  timingLabel
                )}:</strong> ${escapeHtml(timingValue)}</p>
              </div>

              <p style="margin:24px 0 0">
                <a href="${escapeHtml(
                  shareUrl
                )}" style="display:inline-block;border-radius:10px;background:#036661;color:#ffffff;padding:13px 18px;text-decoration:none;font-weight:700">
                  ${escapeHtml(copy.actionLabel)}
                </a>
              </p>

              <p style="margin:22px 0 0;line-height:1.7;color:#374151">${escapeHtml(
                copy.securityNotice
              )}</p>
              <p style="margin:14px 0 0;line-height:1.7;color:#6b7280;font-size:13px">${escapeHtml(
                copy.unexpectedNotice
              )}</p>
              <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6">${escapeHtml(
                copy.footer
              )}</p>
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
      intro,
      "",
      `${copy.scopeLabel}: ${scopeLabel}`,
      `${timingLabel}: ${timingValue}`,
      "",
      `${copy.actionLabel}: ${shareUrl}`,
      "",
      copy.securityNotice,
      copy.unexpectedNotice,
      "",
      copy.footer,
    ].join("\n"),
  });

  if (result.error || !result.data?.id) {
    return errorResponse("email_send_failed", "E-mailul nu a putut fi trimis.", 502);
  }

  const recipientDomain = recipientEmail.split("@")[1] ?? "";
  const { error: auditError } = await admin
    .from("medical_folder_share_events")
    .insert({
      share_grant_id: grant.id,
      patient_profile_id: user.id,
      document_id: null,
      event_type: "email_sent",
      actor_profile_id: user.id,
      actor_doctor_id: null,
      actor_role: "patient",
      access_channel: "email",
      metadata: {
        token_hint: tokenHint,
        recipient_domain: recipientDomain,
        locale,
        provider_message_id: result.data.id,
        direct_access: true,
        permanent_emergency_share:
          grant.is_permanent,
      },
    });

  if (auditError) {
    console.error(
      "Medical Folder share email audit insert failed:",
      auditError.code
    );
  }

  return NextResponse.json(
    { success: true },
    { headers: NO_STORE_HEADERS }
  );
}
