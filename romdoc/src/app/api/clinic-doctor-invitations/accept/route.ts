import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AcceptInvitationBody = {
  token?: unknown;
};

function normalizeString(value: unknown, maximumLength = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function hashInvitationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
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
        error: "Trebuie să fii autentificat ca medic pentru a accepta invitația.",
      },
      {
        status: 401,
      }
    );
  }

  let body: AcceptInvitationBody;

  try {
    body = (await request.json()) as AcceptInvitationBody;
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

  if (!token) {
    return NextResponse.json(
      {
        error: "Linkul invitației nu conține tokenul necesar.",
      },
      {
        status: 400,
      }
    );
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.account_status !== "active") {
    return NextResponse.json(
      {
        error: "Contul tău nu este activ.",
      },
      {
        status: 403,
      }
    );
  }

  if (profile.role !== "doctor") {
    return NextResponse.json(
      {
        error:
          "Doar un cont de medic activ poate accepta invitația clinicii. Dacă tocmai ai creat contul, finalizează mai întâi profilul de medic.",
      },
      {
        status: 403,
      }
    );
  }

  const tokenHash = hashInvitationToken(token);

  const { data: invitation, error: invitationError } = await admin
    .from("clinic_doctor_relationships")
    .select(
      `
        id,
        organization_id,
        invited_doctor_email,
        invitation_status,
        coverage_status,
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
  const currentEmail = user.email?.toLowerCase();

  if (invitedEmail && currentEmail && invitedEmail !== currentEmail) {
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

  const { data: doctor, error: doctorError } = await admin
    .from("doctors")
    .select("id, profile_id, slug")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError || !doctor) {
    return NextResponse.json(
      {
        error:
          "Nu am găsit un profil de medic conectat la contul tău. Finalizează profilul de medic înainte de a accepta invitația clinicii.",
      },
      {
        status: 409,
      }
    );
  }

  const now = new Date().toISOString();

  const { data: updatedInvitation, error: updateError } = await admin
    .from("clinic_doctor_relationships")
    .update({
      doctor_id: doctor.id,
      invitation_status: "accepted",
      accepted_at: now,
      coverage_status: "pending_admin_approval",
    })
    .eq("id", invitation.id)
    .select(
      `
        id,
        organization_id,
        doctor_id,
        invited_doctor_email,
        invitation_status,
        payment_responsibility,
        coverage_status,
        accepted_at
      `
    )
    .maybeSingle();

  if (updateError || !updatedInvitation) {
    console.error("Doctor clinic invitation accept failed:", updateError);

    return NextResponse.json(
      {
        error: "Invitația nu a putut fi acceptată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    invitation: updatedInvitation,
    message:
      "Invitația a fost acceptată. Acoperirea plății de către clinică așteaptă aprobarea RomDoc.",
  });
}
