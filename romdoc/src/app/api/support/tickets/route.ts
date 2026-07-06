import {
  NextRequest,
  NextResponse,
} from "next/server";
import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupportRequesterType =
  | "patient"
  | "doctor"
  | "clinic"
  | "visitor";

type SupportCategory =
  | "patient_support"
  | "doctor_support"
  | "profile_correction"
  | "booking_problem"
  | "privacy_request"
  | "technical_problem"
  | "other";

type SupportTicketRequestBody = {
  requesterType?: string;
  category?: string;
  subject?: string;
  message?: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string | null;
  relatedUrl?: string | null;
  appointmentId?: string | null;
  website?: string | null;
};

const REQUESTER_TYPES = new Set([
  "patient",
  "doctor",
  "clinic",
  "visitor",
]);

const CATEGORIES = new Set([
  "patient_support",
  "doctor_support",
  "profile_correction",
  "booking_problem",
  "privacy_request",
  "technical_problem",
  "other",
]);

const CATEGORY_LABELS: Record<
  SupportCategory,
  string
> = {
  patient_support: "Suport pacient",
  doctor_support: "Suport medic",
  profile_correction: "Corectare profil",
  booking_problem: "Problemă programare",
  privacy_request: "Confidențialitate / date personale",
  technical_problem: "Problemă tehnică",
  other: "Altă solicitare",
};

function getRoutingEmail(
  category: SupportCategory
) {
  if (category === "doctor_support") {
    return (
      process.env.SUPPORT_DOCTOR_EMAIL ??
      "medici@romdoc.fit"
    );
  }

  if (category === "privacy_request") {
    return (
      process.env.SUPPORT_PRIVACY_EMAIL ??
      "privacy@romdoc.fit"
    );
  }

  return (
    process.env.SUPPORT_EMAIL ??
    "support@romdoc.fit"
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function normalizeOptionalText(
  value: string | null | undefined
) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0
    ? trimmed
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

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "https://www.romdoc.fit";
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    let body: SupportTicketRequestBody;

    try {
      body =
        (await request.json()) as SupportTicketRequestBody;
    } catch {
      return jsonError(
        "Cererea nu conține date JSON valide.",
        400
      );
    }

    // Simple honeypot. Real users never fill this hidden field.
    if (
      body.website &&
      body.website.trim().length > 0
    ) {
      return NextResponse.json(
        { success: true },
        {
          status: 201,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const requesterType =
      body.requesterType?.trim() as
        | SupportRequesterType
        | undefined;

    const category =
      body.category?.trim() as
        | SupportCategory
        | undefined;

    const subject =
      body.subject?.trim() ?? "";

    const message =
      body.message?.trim() ?? "";

    const requesterName =
      body.requesterName?.trim() ?? "";

    const requesterEmail =
      body.requesterEmail
        ?.trim()
        .toLowerCase() ?? "";

    const requesterPhone = normalizeOptionalText(
      body.requesterPhone
    );

    const relatedUrl = normalizeOptionalText(
      body.relatedUrl
    );

    const appointmentId = normalizeOptionalText(
      body.appointmentId
    );

    if (
      !requesterType ||
      !REQUESTER_TYPES.has(requesterType)
    ) {
      return jsonError(
        "Selectează cine trimite solicitarea.",
        400
      );
    }

    if (
      !category ||
      !CATEGORIES.has(category)
    ) {
      return jsonError(
        "Selectează categoria solicitării.",
        400
      );
    }

    if (
      requesterName.length < 2 ||
      requesterName.length > 120
    ) {
      return jsonError(
        "Introdu un nume valid.",
        400
      );
    }

    if (
      !isEmail(requesterEmail) ||
      requesterEmail.length > 180
    ) {
      return jsonError(
        "Introdu o adresă de e-mail validă.",
        400
      );
    }

    if (
      requesterPhone &&
      requesterPhone.length > 40
    ) {
      return jsonError(
        "Numărul de telefon este prea lung.",
        400
      );
    }

    if (
      subject.length < 4 ||
      subject.length > 180
    ) {
      return jsonError(
        "Subiectul trebuie să aibă între 4 și 180 de caractere.",
        400
      );
    }

    if (
      message.length < 10 ||
      message.length > 4000
    ) {
      return jsonError(
        "Mesajul trebuie să aibă între 10 și 4000 de caractere.",
        400
      );
    }

    if (
      relatedUrl &&
      relatedUrl.length > 600
    ) {
      return jsonError(
        "Linkul introdus este prea lung.",
        400
      );
    }

    if (
      appointmentId &&
      !isUuid(appointmentId)
    ) {
      return jsonError(
        "ID-ul programării nu este valid.",
        400
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const requesterProfileId =
      user?.id ?? null;

    const routedToEmail =
      getRoutingEmail(category);

    const adminClient =
      createAdminClient();

    const {
      data: insertedTicket,
      error: insertError,
    } = await adminClient
      .from("support_tickets")
      .insert({
        requester_profile_id:
          requesterProfileId,
        requester_type: requesterType,
        category,
        subject,
        message,
        requester_name: requesterName,
        requester_email: requesterEmail,
        requester_phone: requesterPhone,
        related_url: relatedUrl,
        appointment_id: appointmentId,
        routed_to_email: routedToEmail,
        source: "contact_page",
        user_agent:
          request.headers.get("user-agent"),
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error(
        "Support ticket insert failed:",
        insertError
      );

      return jsonError(
        "Solicitarea nu a putut fi salvată. Încearcă din nou.",
        500
      );
    }

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const resendFromEmail =
      process.env.RESEND_FROM_EMAIL ??
      "RomDoc <notificari@romdoc.fit>";

    if (resendApiKey) {
      const resend = new Resend(
        resendApiKey
      );

      const ticketUrl = `${getSiteUrl()}/admin/support`;
      const safeTicketId = escapeHtml(
        insertedTicket.id
      );
      const safeCategory = escapeHtml(
        CATEGORY_LABELS[category]
      );
      const safeSubject = escapeHtml(
        subject
      );
      const safeMessage = escapeHtml(
        message
      );
      const safeRequesterName = escapeHtml(
        requesterName
      );
      const safeRequesterEmail = escapeHtml(
        requesterEmail
      );
      const safeRequesterPhone = requesterPhone
        ? escapeHtml(requesterPhone)
        : "—";
      const safeRelatedUrl = relatedUrl
        ? escapeHtml(relatedUrl)
        : "—";
      const safeAppointmentId = appointmentId
        ? escapeHtml(appointmentId)
        : "—";

      const internalSubject = `[RomDoc Support] ${CATEGORY_LABELS[category]} — ${subject}`;

      const internalHtml = `
        <!doctype html>
        <html lang="ro">
          <body style="margin:0;padding:0;background:#f0eee9;color:#111827;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
              <div style="background:#ffffff;border-radius:16px;padding:28px;">
                <p style="margin:0 0 8px;color:#036661;font-weight:700;">RomDoc Support</p>
                <h1 style="margin:0;font-size:24px;line-height:1.35;">${safeSubject}</h1>
                <p style="margin-top:16px;line-height:1.7;">A fost creat un tichet nou.</p>

                <div style="margin-top:20px;padding:18px;border-radius:12px;background:#f9fafb;line-height:1.7;">
                  <p style="margin:0 0 8px;"><strong>ID tichet:</strong> ${safeTicketId}</p>
                  <p style="margin:0 0 8px;"><strong>Categorie:</strong> ${safeCategory}</p>
                  <p style="margin:0 0 8px;"><strong>Nume:</strong> ${safeRequesterName}</p>
                  <p style="margin:0 0 8px;"><strong>E-mail:</strong> ${safeRequesterEmail}</p>
                  <p style="margin:0 0 8px;"><strong>Telefon:</strong> ${safeRequesterPhone}</p>
                  <p style="margin:0 0 8px;"><strong>Link relevant:</strong> ${safeRelatedUrl}</p>
                  <p style="margin:0;"><strong>ID programare:</strong> ${safeAppointmentId}</p>
                </div>

                <div style="margin-top:22px;">
                  <p style="margin:0 0 8px;font-weight:700;">Mesaj</p>
                  <p style="margin:0;white-space:pre-wrap;line-height:1.7;">${safeMessage}</p>
                </div>

                <p style="margin-top:24px;color:#6b7280;font-size:13px;">
                  Admin support: ${escapeHtml(ticketUrl)}
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      const confirmationHtml = `
        <!doctype html>
        <html lang="ro">
          <body style="margin:0;padding:0;background:#f0eee9;color:#111827;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
              <div style="background:#ffffff;border-radius:16px;padding:28px;">
                <h1 style="margin:0;font-size:24px;line-height:1.35;">Am primit solicitarea ta</h1>
                <p style="margin-top:18px;line-height:1.7;">Bună, ${safeRequesterName}.</p>
                <p style="line-height:1.7;">Solicitarea ta a fost trimisă către echipa RomDoc potrivită.</p>
                <div style="margin-top:20px;padding:18px;border-radius:12px;background:#f9fafb;line-height:1.7;">
                  <p style="margin:0 0 8px;"><strong>ID tichet:</strong> ${safeTicketId}</p>
                  <p style="margin:0 0 8px;"><strong>Categorie:</strong> ${safeCategory}</p>
                  <p style="margin:0;"><strong>Subiect:</strong> ${safeSubject}</p>
                </div>
                <p style="margin-top:22px;color:#6b7280;line-height:1.7;">
                  Acest tichet este pentru suport privind utilizarea platformei RomDoc. Nu include sfaturi medicale și nu înlocuiește comunicarea directă cu medicul sau clinica.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      const internalEmail =
        await resend.emails.send({
          from: resendFromEmail,
          to: routedToEmail,
          replyTo: requesterEmail,
          subject: internalSubject,
          html: internalHtml,
        });

      if (internalEmail.error) {
        console.error(
          "Support internal email failed:",
          internalEmail.error
        );
      }

      const confirmationEmail =
        await resend.emails.send({
          from: resendFromEmail,
          to: requesterEmail,
          replyTo: routedToEmail,
          subject:
            "Am primit solicitarea ta către RomDoc",
          html: confirmationHtml,
        });

      if (confirmationEmail.error) {
        console.error(
          "Support confirmation email failed:",
          confirmationEmail.error
        );
      }
    } else {
      console.error(
        "RESEND_API_KEY is not configured. Support ticket was saved without sending email."
      );
    }

    return NextResponse.json(
      {
        success: true,
        ticketId: insertedTicket.id,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Support ticket API failed:",
      error
    );

    return jsonError(
      "A apărut o eroare neașteptată. Încearcă din nou.",
      500
    );
  }
}
