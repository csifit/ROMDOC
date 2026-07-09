import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CoverageAction = "approve" | "pause" | "end";

type CoverageRequestBody = {
  relationshipId?: unknown;
  action?: unknown;
  pauseReason?: unknown;
};

function normalizeString(value: unknown, maximumLength = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function isCoverageAction(value: string): value is CoverageAction {
  return value === "approve" || value === "pause" || value === "end";
}

export async function PATCH(request: NextRequest): Promise<Response> {
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
    profile.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    return NextResponse.json(
      {
        error: "Doar administratorul poate modifica acoperirea clinicii.",
      },
      {
        status: 403,
      }
    );
  }

  let body: CoverageRequestBody;

  try {
    body = (await request.json()) as CoverageRequestBody;
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

  const relationshipId = normalizeString(body.relationshipId, 100);
  const action = normalizeString(body.action, 30);
  const pauseReason = normalizeString(body.pauseReason, 500);

  if (!relationshipId) {
    return NextResponse.json(
      {
        error: "Lipsește relația medic-clinică.",
      },
      {
        status: 400,
      }
    );
  }

  if (!isCoverageAction(action)) {
    return NextResponse.json(
      {
        error: "Acțiunea nu este validă.",
      },
      {
        status: 400,
      }
    );
  }

  const { data: relationship, error: relationshipError } = await admin
    .from("clinic_doctor_relationships")
    .select(
      `
        id,
        invitation_status,
        payment_responsibility,
        coverage_status,
        doctor_id
      `
    )
    .eq("id", relationshipId)
    .maybeSingle();

  if (relationshipError || !relationship) {
    return NextResponse.json(
      {
        error: "Relația medic-clinică nu a fost găsită.",
      },
      {
        status: 404,
      }
    );
  }

  if (relationship.payment_responsibility !== "clinic_paid") {
    return NextResponse.json(
      {
        error: "Această relație nu este plătită de clinică.",
      },
      {
        status: 409,
      }
    );
  }

  const now = new Date().toISOString();

  const updatePayload: Record<string, string | null> = {};

  if (action === "approve") {
    if (relationship.invitation_status !== "accepted" || !relationship.doctor_id) {
      return NextResponse.json(
        {
          error:
            "Poți aproba acoperirea doar după ce medicul acceptă invitația.",
        },
        {
          status: 409,
        }
      );
    }

    updatePayload.coverage_status = "active";
    updatePayload.approved_by_profile_id = user.id;
    updatePayload.approved_at = now;
    updatePayload.coverage_started_at = now;
    updatePayload.coverage_ended_at = null;
    updatePayload.paused_at = null;
    updatePayload.pause_reason = null;
  }

  if (action === "pause") {
    updatePayload.coverage_status = "paused";
    updatePayload.paused_at = now;
    updatePayload.pause_reason = pauseReason || "Pauză setată de administrator.";
  }

  if (action === "end") {
    updatePayload.coverage_status = "ended";
    updatePayload.coverage_ended_at = now;
  }

  const { data: updatedRelationship, error: updateError } = await admin
    .from("clinic_doctor_relationships")
    .update(updatePayload)
    .eq("id", relationship.id)
    .select(
      `
        id,
        invitation_status,
        payment_responsibility,
        coverage_status,
        approved_at,
        coverage_started_at,
        coverage_ended_at,
        paused_at,
        pause_reason
      `
    )
    .maybeSingle();

  if (updateError || !updatedRelationship) {
    console.error("Admin clinic coverage update failed:", updateError);

    return NextResponse.json(
      {
        error: "Acoperirea clinicii nu a putut fi actualizată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    relationship: updatedRelationship,
    message: "Acoperirea clinicii a fost actualizată.",
  });
}
