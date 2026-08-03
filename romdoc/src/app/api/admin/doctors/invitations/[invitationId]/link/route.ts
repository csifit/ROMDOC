import {
  NextResponse,
} from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      invitationId: string;
    }>;
  }
): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot consulta linkul invitației."
  );

  if (adminOnly) {
    return adminOnly;
  }

  const { invitationId } = await context.params;
  const normalizedInvitationId = invitationId.trim();

  if (!normalizedInvitationId) {
    return json(
      {
        code: "doctor_invitation_id_required",
        error: "Invitația lipsește.",
      },
      400
    );
  }

  const admin = createAdminClient();

  const {
    data: invitation,
    error,
  } = await admin
    .from("doctor_invitations")
    .select(`
      id,
      status,
      expires_at,
      invitation_action_link
    `)
    .eq("id", normalizedInvitationId)
    .maybeSingle();

  if (error) {
    console.error("Doctor invitation link query failed:", error);

    return json(
      {
        code: "doctor_invitation_link_load_failed",
        error: "Linkul invitației nu a putut fi încărcat.",
      },
      500
    );
  }

  if (!invitation) {
    return json(
      {
        code: "doctor_invitation_not_found",
        error: "Invitația nu a fost găsită.",
      },
      404
    );
  }

  if (invitation.status !== "sent") {
    return json(
      {
        code: "doctor_invitation_link_unavailable",
        error: "Linkul este disponibil numai pentru invitațiile trimise și active.",
      },
      409
    );
  }

  if (
    !invitation.expires_at ||
    new Date(invitation.expires_at).getTime() <= Date.now()
  ) {
    await admin
      .from("doctor_invitations")
      .update({
        status: "expired",
      })
      .eq("id", invitation.id)
      .eq("status", "sent");

    return json(
      {
        code: "doctor_invitation_link_expired",
        error: "Linkul invitației a expirat.",
      },
      410
    );
  }

  if (!invitation.invitation_action_link) {
    return json(
      {
        code: "doctor_invitation_link_missing",
        error:
          "Această invitație a fost creată înainte de activarea istoricului de linkuri. Trimite o invitație nouă.",
      },
      404
    );
  }

  return json({
    code: "doctor_invitation_link_loaded",
    actionLink: invitation.invitation_action_link,
    expiresAt: invitation.expires_at,
  });
}
