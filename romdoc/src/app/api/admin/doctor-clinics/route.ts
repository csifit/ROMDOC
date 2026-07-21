import { NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_CLINIC_CODES } from "@/lib/api/platform-operator-clinic-codes";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type Body = {
  doctorId?: unknown;
  clinicId?: unknown;
};

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized
  )
    ? normalized
    : "";
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

async function requireAdmin() {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return { authorization: null, response: authorization.response };
  }

  const adminError = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot gestiona asocierile dintre medici și clinici."
  );

  return adminError
    ? { authorization: null, response: adminError }
    : { authorization, response: null };
}

export async function GET(): Promise<Response> {
  const access = await requireAdmin();
  if (access.response) return access.response;

  const admin = createAdminClient();
  const [doctorsResult, clinicsResult, linksResult] = await Promise.all([
    admin
      .from("doctors")
      .select(`
        id,
        slug,
        status,
        email,
        profile:profiles!doctors_profile_id_fkey (
          first_name,
          last_name,
          account_status
        ),
        doctor_translations (locale, title)
      `)
      .order("created_at", { ascending: false }),
    admin
      .from("clinics")
      .select(`
        id,
        slug,
        status,
        formatted_address,
        clinic_translations (locale, name),
        cities (slug, city_translations (locale, name))
      `)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    admin.from("doctor_clinics").select("doctor_id, clinic_id"),
  ]);

  if (doctorsResult.error || clinicsResult.error || linksResult.error) {
    console.error("Admin doctor-clinic load failed:", {
      doctors: doctorsResult.error,
      clinics: clinicsResult.error,
      links: linksResult.error,
    });

    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.doctorClinicDataLoadFailed,
        error: "Medicii, clinicile sau asocierile nu au putut fi încărcate.",
      },
      500
    );
  }

  return json({
    code: PLATFORM_OPERATOR_CLINIC_CODES.doctorClinicDataLoaded,
    doctors: doctorsResult.data ?? [],
    clinics: clinicsResult.data ?? [],
    links: linksResult.data ?? [],
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  const access = await requireAdmin();
  if (access.response) return access.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.invalidJson,
        error: "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const doctorId = normalizeUuid(body.doctorId);
  const clinicId = normalizeUuid(body.clinicId);

  if (!doctorId || !clinicId) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.doctorClinicSelectionInvalid,
        error: "Medicul sau clinica selectată nu este validă.",
      },
      400
    );
  }

  const admin = createAdminClient();
  const [doctorResult, clinicResult] = await Promise.all([
    admin.from("doctors").select("id").eq("id", doctorId).maybeSingle(),
    admin
      .from("clinics")
      .select("id, status")
      .eq("id", clinicId)
      .maybeSingle(),
  ]);

  if (doctorResult.error || !doctorResult.data) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.doctorNotFound,
        error: "Medicul nu a fost găsit.",
      },
      404
    );
  }

  if (clinicResult.error || !clinicResult.data) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.clinicNotFound,
        error: "Clinica nu a fost găsită.",
      },
      404
    );
  }

  if (clinicResult.data.status !== "approved") {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.clinicAssociationApprovedRequired,
        error: "Doar clinicile aprobate pot fi asociate medicilor.",
      },
      409
    );
  }

  const { error } = await admin.from("doctor_clinics").upsert(
    { doctor_id: doctorId, clinic_id: clinicId },
    { onConflict: "doctor_id,clinic_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("Admin doctor-clinic association failed:", error);
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.doctorClinicAssociationFailed,
        error: "Asocierea nu a putut fi salvată.",
      },
      500
    );
  }

  return json(
    {
      code: PLATFORM_OPERATOR_CLINIC_CODES.doctorClinicAssociated,
      message: "Medicul a fost asociat clinicii.",
      doctorId,
      clinicId,
    },
    201
  );
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const access = await requireAdmin();
  if (access.response) return access.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.invalidJson,
        error: "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const doctorId = normalizeUuid(body.doctorId);
  const clinicId = normalizeUuid(body.clinicId);

  if (!doctorId || !clinicId) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.doctorClinicSelectionInvalid,
        error: "Medicul sau clinica selectată nu este validă.",
      },
      400
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("doctor_clinics")
    .delete()
    .eq("doctor_id", doctorId)
    .eq("clinic_id", clinicId);

  if (error) {
    console.error("Admin doctor-clinic removal failed:", error);
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.doctorClinicRemovalFailed,
        error: "Asocierea nu a putut fi eliminată.",
      },
      500
    );
  }

  return json({
    code: PLATFORM_OPERATOR_CLINIC_CODES.doctorClinicRemoved,
    message: "Asocierea dintre medic și clinică a fost eliminată.",
  });
}
