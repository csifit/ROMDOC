import { NextRequest, NextResponse } from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const LEAD_STATUSES = new Set([
  "new",
  "contacted",
  "meeting_scheduled",
  "proposal",
  "won",
  "closed",
]);

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function normalizeString(value: unknown, maximumLength = 100) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

async function requireAdmin() {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return {
      authorization,
      response: authorization.response,
    };
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot gestiona solicitările organizațiilor medicale."
  );

  return {
    authorization,
    response: adminOnly,
  };
}

export async function GET(): Promise<Response> {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_organisation_leads")
    .select(`
      id,
      preferred_solution,
      priorities,
      organization_type,
      doctor_count_range,
      desired_next_step,
      organization_name,
      contact_name,
      email,
      phone,
      notes,
      locale,
      status,
      notification_status,
      created_at,
      updated_at,
      status_updated_at
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Clinic organisation leads lookup failed:", error);
    return json(
      {
        error: "Solicitările nu au putut fi încărcate.",
      },
      500
    );
  }

  return json({
    leads: data ?? [],
  });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  let body: {
    leadId?: unknown;
    status?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Cerere JSON invalidă." }, 400);
  }

  const leadId = normalizeString(body.leadId, 100);
  const status = normalizeString(body.status, 50);

  if (!leadId) {
    return json({ error: "Solicitarea lipsește." }, 400);
  }

  if (!LEAD_STATUSES.has(status)) {
    return json({ error: "Statusul nu este valid." }, 400);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("clinic_organisation_leads")
    .update({
      status,
      status_updated_at: now,
      status_updated_by_profile_id: guard.authorization.profileId,
      updated_at: now,
    })
    .eq("id", leadId)
    .select("id, status, status_updated_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    console.error("Clinic organisation lead update failed:", error);
    return json(
      {
        error: "Statusul solicitării nu a putut fi actualizat.",
      },
      500
    );
  }

  return json({
    success: true,
    lead: data,
  });
}
