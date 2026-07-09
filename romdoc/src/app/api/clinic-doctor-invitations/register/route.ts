import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RegisterInviteBody = {
  token?: unknown;
  userId?: unknown;
  email?: unknown;
};

function normalizeString(value: unknown, maximumLength = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function normalizeEmail(value: unknown) {
  return normalizeString(value, 320).toLowerCase();
}

function hashInvitationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: RegisterInviteBody;

  try {
    body = (await request.json()) as RegisterInviteBody;
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

  const token = normalizeString(body.token, 500);
  const userId = normalizeString(body.userId, 100);
  const email = normalizeEmail(body.email);

  if (!token || !userId || !email) {
    return NextResponse.json(
      {
        error: "Datele invitației sunt incomplete.",
      },
      {
        status: 400,
      }
    );
  }

  const admin = createAdminClient();
  const tokenHash = hashInvitationToken(token);

  const { data: invitation, error: invitationError } = await admin
    .from("clinic_doctor_relationships")
    .select(
      `
        id,
        invited_doctor_email,
        invitation_status,
        expires_at
      `
    )
    .eq("invitation_token_hash", tokenHash)
    .maybeSingle();

  if (invitationError || !invitation) {
    return NextResponse.json(
      {
        error: "Invitația nu a fost găsită sau linkul nu este valid.",
      },
      {
        status: 404,
      }
    );
  }

  if (invitation.invitation_status !== "pending") {
    return NextResponse.json(
      {
        error: "Această invitație nu mai este disponibilă.",
      },
      {
        status: 409,
      }
    );
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    await admin
      .from("clinic_doctor_relationships")
      .update({
        invitation_status: "expired",
      })
      .eq("id", invitation.id);

    return NextResponse.json(
      {
        error: "Această invitație a expirat.",
      },
      {
        status: 409,
      }
    );
  }

  const invitedEmail = invitation.invited_doctor_email?.toLowerCase();

  if (invitedEmail && invitedEmail !== email) {
    return NextResponse.json(
      {
        error:
          "Această invitație a fost trimisă pentru o altă adresă de e-mail.",
      },
      {
        status: 403,
      }
    );
  }

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(
    userId
  );

  if (authUserError || !authUser.user) {
    return NextResponse.json(
      {
        error: "Contul creat nu a putut fi verificat.",
      },
      {
        status: 404,
      }
    );
  }

  if (authUser.user.email?.toLowerCase() !== email) {
    return NextResponse.json(
      {
        error: "E-mailul contului creat nu corespunde invitației.",
      },
      {
        status: 403,
      }
    );
  }

  const now = new Date().toISOString();

  const { data: updatedInvitation, error: updateError } = await admin
    .from("clinic_doctor_relationships")
    .update({
      accepted_profile_id: userId,
      accepted_account_email: email,
      invitation_status: "accepted",
      accepted_at: now,
      coverage_status: "active",
    })
    .eq("id", invitation.id)
    .select(
      `
        id,
        organization_id,
        invited_doctor_email,
        accepted_profile_id,
        accepted_account_email,
        invitation_status,
        payment_responsibility,
        coverage_status,
        accepted_at
      `
    )
    .maybeSingle();

  if (updateError || !updatedInvitation) {
    console.error("Clinic invited doctor registration link failed:", updateError);

    return NextResponse.json(
      {
        error: "Invitația nu a putut fi conectată la contul medicului.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    invitation: updatedInvitation,
    message:
      "Contul de medic a fost conectat la invitația clinicii. Abonamentul este acoperit de clinică.",
  });
}
