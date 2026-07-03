import { NextRequest, NextResponse } from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        doctor_translations (
          locale,
          title
        )
      `)
      .order("created_at", { ascending: false }),

    admin
      .from("clinics")
      .select(`
        id,
        slug,
        status,
        formatted_address,
        clinic_translations (
          locale,
          name
        ),
        cities (
          slug,
          city_translations (
            locale,
            name
          )
        )
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

    return NextResponse.json(
      { error: "Medicii, clinicile sau asocierile nu au putut fi încărcate." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      doctors: doctorsResult.data ?? [],
      clinics: clinicsResult.data ?? [],
      links: linksResult.data ?? [],
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const access = await requireAdmin();
  if (access.response) return access.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const doctorId = normalizeUuid(body.doctorId);
  const clinicId = normalizeUuid(body.clinicId);

  if (!doctorId || !clinicId) {
    return NextResponse.json(
      { error: "Medicul sau clinica selectată nu este validă." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const [doctorResult, clinicResult] = await Promise.all([
    admin.from("doctors").select("id").eq("id", doctorId).maybeSingle(),
    admin.from("clinics").select("id, status").eq("id", clinicId).maybeSingle(),
  ]);

  if (doctorResult.error || !doctorResult.data) {
    return NextResponse.json({ error: "Medicul nu a fost găsit." }, { status: 404 });
  }

  if (clinicResult.error || !clinicResult.data) {
    return NextResponse.json({ error: "Clinica nu a fost găsită." }, { status: 404 });
  }

  if (clinicResult.data.status !== "approved") {
    return NextResponse.json(
      { error: "Doar clinicile aprobate pot fi asociate medicilor." },
      { status: 409 }
    );
  }

  const { error } = await admin.from("doctor_clinics").upsert(
    { doctor_id: doctorId, clinic_id: clinicId },
    { onConflict: "doctor_id,clinic_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("Admin doctor-clinic association failed:", error);
    return NextResponse.json(
      { error: "Asocierea nu a putut fi salvată." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Medicul a fost asociat clinicii.", doctorId, clinicId },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const access = await requireAdmin();
  if (access.response) return access.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const doctorId = normalizeUuid(body.doctorId);
  const clinicId = normalizeUuid(body.clinicId);

  if (!doctorId || !clinicId) {
    return NextResponse.json(
      { error: "Medicul sau clinica selectată nu este validă." },
      { status: 400 }
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
    return NextResponse.json(
      { error: "Asocierea nu a putut fi eliminată." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Asocierea dintre medic și clinică a fost eliminată." },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
