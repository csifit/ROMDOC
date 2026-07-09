import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type InvitationRequestBody = {
  organizationId?: unknown;
  doctorEmail?: unknown;
};

type EmailSendResult = {
  sent: boolean;
  error: string | null;
};

function normalizeString(value: unknown, maximumLength = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function normalizeEmail(value: unknown) {
  return normalizeString(value, 320).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createInvitationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashInvitationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function sendInvitationEmail({
  doctorEmail,
  organizationName,
  inviteUrl,
}: {
  doctorEmail: string;
  organizationName: string;
  inviteUrl: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      sent: false,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  const resend = new Resend(apiKey);
  const fromAddress =
    process.env.RESEND_FROM ?? "RomDoc <programari@romdoc.fit>";

  try {
    await resend.emails.send({
      from: fromAddress,
      to: doctorEmail,
      subject: `${organizationName} te invită pe RomDoc`,
      text: [
        `Bună ziua,`,
        ``,
        `${organizationName} te-a invitat să te alături pe RomDoc ca medic asociat clinicii.`,
        ``,
        `Pentru a continua, deschide linkul de mai jos:`,
        inviteUrl,
        ``,
        `Dacă nu te așteptai la această invitație, poți ignora acest mesaj.`,
        ``,
        `Echipa RomDoc`,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h1 style="font-size:20px;margin:0 0 16px">Invitație RomDoc</h1>
          <p>Bună ziua,</p>
          <p><strong>${organizationName}</strong> te-a invitat să te alături pe RomDoc ca medic asociat clinicii.</p>
          <p>
            <a href="${inviteUrl}" style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
              Deschide invitația
            </a>
          </p>
          <p style="font-size:13px;color:#6b7280">Dacă butonul nu funcționează, copiază acest link în browser:</p>
          <p style="font-size:13px;color:#374151;word-break:break-all">${inviteUrl}</p>
          <p style="font-size:13px;color:#6b7280">Dacă nu te așteptai la această invitație, poți ignora acest mesaj.</p>
          <p>Echipa RomDoc</p>
        </div>
      `,
    });

    return {
      sent: true,
      error: null,
    };
  } catch (error) {
    console.error("Clinic doctor invitation email failed:", error);

    return {
      sent: false,
      error:
        error instanceof Error
          ? error.message
          : "Invitation e-mail could not be sent.",
    };
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "Trebuie să fii autentificat.",
      },
      {
        status: 401,
      }
    );
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "clinic_manager" ||
    profile.account_status !== "active"
  ) {
    return NextResponse.json(
      {
        error: "Nu ai permisiunea necesară.",
      },
      {
        status: 403,
      }
    );
  }

  let body: InvitationRequestBody;

  try {
    body = (await request.json()) as InvitationRequestBody;
  } catch {
    return NextResponse.json(
      {
        error: "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      }
    );
  }

  const organizationId = normalizeString(body.organizationId, 100);
  const doctorEmail = normalizeEmail(body.doctorEmail);

  if (!organizationId) {
    return NextResponse.json(
      {
        error: "Selectează organizația clinicii.",
      },
      {
        status: 400,
      }
    );
  }

  if (!isValidEmail(doctorEmail)) {
    return NextResponse.json(
      {
        error: "Introdu o adresă de e-mail validă pentru medic.",
      },
      {
        status: 400,
      }
    );
  }

  const { data: membership, error: membershipError } = await admin
    .from("clinic_organization_members")
    .select("id, member_role, status")
    .eq("organization_id", organizationId)
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json(
      {
        error: "Nu ai acces la această organizație de clinică.",
      },
      {
        status: 403,
      }
    );
  }

  const { data: organization, error: organizationError } = await admin
    .from("clinic_organizations")
    .select("id, name, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    return NextResponse.json(
      {
        error: "Organizația clinicii nu a fost găsită.",
      },
      {
        status: 404,
      }
    );
  }

  if (organization.status !== "active") {
    return NextResponse.json(
      {
        error:
          "Poți invita medici doar după ce organizația clinicii este aprobată de RomDoc.",
      },
      {
        status: 409,
      }
    );
  }

  const { data: existingInvitation, error: existingInvitationError } =
    await admin
      .from("clinic_doctor_relationships")
      .select("id, invitation_status, coverage_status")
      .eq("organization_id", organizationId)
      .eq("invited_doctor_email", doctorEmail)
      .in("invitation_status", ["pending", "accepted"])
      .maybeSingle();

  if (existingInvitationError) {
    console.error(
      "Existing clinic doctor invitation query failed:",
      existingInvitationError
    );

    return NextResponse.json(
      {
        error: "Invitația nu a putut fi verificată.",
      },
      {
        status: 500,
      }
    );
  }

  if (existingInvitation) {
    return NextResponse.json(
      {
        error:
          "Există deja o invitație activă sau acceptată pentru acest medic în această organizație.",
      },
      {
        status: 409,
      }
    );
  }

  const invitationToken = createInvitationToken();
  const invitationTokenHash = hashInvitationToken(invitationToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const inviteUrl = new URL("/register", baseUrl);
  inviteUrl.searchParams.set("role", "doctor");
  inviteUrl.searchParams.set("clinic_invite", invitationToken);
  inviteUrl.searchParams.set("email", doctorEmail);

  const { data: invitation, error: invitationError } = await admin
    .from("clinic_doctor_relationships")
    .insert({
      organization_id: organizationId,
      invited_doctor_email: doctorEmail,
      invitation_token_hash: invitationTokenHash,
      invitation_status: "pending",
      payment_responsibility: "clinic_paid",
      coverage_status: "pending_admin_approval",
      invited_by_profile_id: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select(
      `
        id,
        organization_id,
        invited_doctor_email,
        invitation_status,
        payment_responsibility,
        coverage_status,
        expires_at,
        created_at
      `
    )
    .maybeSingle();

  if (invitationError || !invitation) {
    console.error("Clinic doctor invitation insert failed:", invitationError);

    return NextResponse.json(
      {
        error: "Invitația nu a putut fi creată.",
      },
      {
        status: 500,
      }
    );
  }

  const emailResult = await sendInvitationEmail({
    doctorEmail,
    organizationName: organization.name,
    inviteUrl: inviteUrl.toString(),
  });

  return NextResponse.json({
    invitation,
    inviteUrl: inviteUrl.toString(),
    emailSent: emailResult.sent,
    emailError: emailResult.error,
    message: emailResult.sent
      ? "Invitația a fost creată și trimisă medicului."
      : "Invitația a fost creată. E-mailul nu a fost trimis automat, dar poți copia linkul de invitație.",
  });
}
