import { NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_CLINIC_CODES } from "@/lib/api/platform-operator-clinic-codes";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type ClinicActionBody = {
  clinicId?: unknown;
  action?: unknown;
  rejectionReason?: unknown;
  blockReason?: unknown;
};

type ClinicStatus = "pending" | "approved" | "rejected" | "blocked";

type ClinicRow = {
  id: string;
  proposed_by_profile_id: string | null;
  [key: string]: unknown;
};

type DoctorLookupRow = {
  id: string;
  profile_id: string;
  slug: string;
};

type ProposerDetails = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  doctor_id: string | null;
  doctor_slug: string | null;
};

function normalizeString(value: unknown, maximumLength = 1000) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function json(
  body: Record<string, unknown>,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function failure(code: string, error: string, status: number) {
  return json({ code, error }, status);
}

function success(code: string, message: string, extra?: Record<string, unknown>) {
  return json({ code, message, ...extra });
}

export async function GET(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const requestedStatus = request.nextUrl.searchParams.get("status");
  const allowedStatuses: ClinicStatus[] = [
    "pending",
    "approved",
    "rejected",
    "blocked",
  ];
  const status = allowedStatuses.includes(requestedStatus as ClinicStatus)
    ? (requestedStatus as ClinicStatus)
    : null;
  const admin = createAdminClient();

  let query = admin
    .from("clinics")
    .select(`
      id,
      slug,
      city_id,
      email,
      phone,
      website,
      street_address,
      formatted_address,
      address_line_1,
      address_line_2,
      postal_code,
      county_name,
      country_code,
      latitude,
      longitude,
      google_place_id,
      google_maps_uri,
      address_verified_at,
      status,
      proposed_by_profile_id,
      approved_by_profile_id,
      approved_at,
      rejected_at,
      rejection_reason,
      blocked_at,
      blocked_by_profile_id,
      blocked_reason,
      created_at,
      updated_at,
      clinic_translations (locale, name, description),
      cities (id, slug, city_translations (locale, name))
    `)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const [clinicsResult, countResults] = await Promise.all([
    query,
    Promise.all(
      allowedStatuses.map((clinicStatus) =>
        admin
          .from("clinics")
          .select("id", { count: "exact", head: true })
          .eq("status", clinicStatus)
      )
    ),
  ]);

  if (clinicsResult.error) {
    console.error("Admin clinics query failed:", clinicsResult.error);
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicsLoadFailed,
      "Clinicile nu au putut fi încărcate.",
      500
    );
  }

  const clinics = (clinicsResult.data ?? []) as ClinicRow[];
  const statusCounts = Object.fromEntries(
    allowedStatuses.map((clinicStatus, index) => [
      clinicStatus,
      countResults[index]?.count ?? 0,
    ])
  );

  const proposerProfileIds = Array.from(
    new Set(
      clinics
        .map((clinic) => clinic.proposed_by_profile_id)
        .filter((profileId): profileId is string => Boolean(profileId))
    )
  );
  const proposerMap = new Map<string, ProposerDetails>();

  if (proposerProfileIds.length) {
    const [profilesResult, doctorsResult] = await Promise.all([
      admin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", proposerProfileIds),
      admin
        .from("doctors")
        .select("id, profile_id, slug")
        .in("profile_id", proposerProfileIds),
    ]);

    if (profilesResult.error) {
      console.error("Clinic proposer profiles query failed:", profilesResult.error);
    }
    if (doctorsResult.error) {
      console.error("Clinic proposer doctors query failed:", doctorsResult.error);
    }

    const doctorByProfile = new Map(
      ((doctorsResult.data ?? []) as DoctorLookupRow[]).map((doctor) => [doctor.profile_id, doctor])
    );

    for (const profile of profilesResult.data ?? []) {
      const doctor = doctorByProfile.get(profile.id);
      proposerMap.set(profile.id, {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        doctor_id: doctor?.id ?? null,
        doctor_slug: doctor?.slug ?? null,
      });
    }
  }

  return json({
    code: PLATFORM_OPERATOR_CLINIC_CODES.clinicsLoaded,
    clinics: clinics.map((clinic) => ({
      ...clinic,
      proposer: clinic.proposed_by_profile_id
        ? proposerMap.get(clinic.proposed_by_profile_id) ?? null
        : null,
    })),
    statusCounts,
    operatorRole: authorization.role,
    capabilities: {
      canManageClinics: true,
      canDeleteClinics: authorization.role === "admin",
      canBlockClinics: authorization.role === "admin",
    },
  });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  let body: ClinicActionBody;
  try {
    body = (await request.json()) as ClinicActionBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const clinicId = normalizeString(body.clinicId, 100);
  const action = normalizeString(body.action, 50);
  const rejectionReason = normalizeString(body.rejectionReason);
  const blockReason = normalizeString(body.blockReason);

  if (!clinicId) {
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicIdRequired,
      "Clinica lipsește.",
      400
    );
  }

  if (!["approve", "reject", "block", "unblock"].includes(action)) {
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.invalidAction,
      "Acțiunea solicitată nu este validă.",
      400
    );
  }

  if (action === "reject" && rejectionReason.length < 3) {
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicRejectionReasonRequired,
      "Introdu motivul respingerii.",
      400
    );
  }

  if (action === "block" && blockReason.length < 3) {
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicBlockReasonRequired,
      "Introdu motivul blocării.",
      400
    );
  }

  if (action === "block" || action === "unblock") {
    const adminOnly = requireAdministratorCapability(
      authorization.role,
      "Numai administratorii pot bloca sau reactiva clinici."
    );
    if (adminOnly) return adminOnly;
  }

  const admin = createAdminClient();
  const { data: clinic, error: clinicError } = await admin
    .from("clinics")
    .select("id, status, proposed_by_profile_id")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError || !clinic) {
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicNotFound,
      "Clinica nu a fost găsită.",
      404
    );
  }

  const now = new Date().toISOString();

  if (action === "block") {
    if (clinic.status !== "approved") {
      return failure(
        PLATFORM_OPERATOR_CLINIC_CODES.clinicMustBeApprovedForBlocking,
        "Numai clinicile aprobate pot fi blocate.",
        409
      );
    }

    const { data, error } = await admin
      .from("clinics")
      .update({
        status: "blocked",
        blocked_at: now,
        blocked_by_profile_id: authorization.profileId,
        blocked_reason: blockReason,
      })
      .eq("id", clinic.id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Clinic blocking failed:", error);
      return failure(
        PLATFORM_OPERATOR_CLINIC_CODES.clinicBlockConflict,
        "Clinica nu a putut fi blocată. Este posibil ca statutul ei să fi fost modificat între timp.",
        409
      );
    }

    return success(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicBlocked,
      "Clinica a fost blocată și nu mai apare în zonele publice RomDoc."
    );
  }

  if (action === "unblock") {
    if (clinic.status !== "blocked") {
      return failure(
        PLATFORM_OPERATOR_CLINIC_CODES.clinicMustBeBlockedForUnblocking,
        "Numai clinicile blocate pot fi reactivate.",
        409
      );
    }

    const { data, error } = await admin
      .from("clinics")
      .update({
        status: "approved",
        blocked_at: null,
        blocked_by_profile_id: null,
        blocked_reason: null,
      })
      .eq("id", clinic.id)
      .eq("status", "blocked")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Clinic unblocking failed:", error);
      return failure(
        PLATFORM_OPERATOR_CLINIC_CODES.clinicUnblockConflict,
        "Clinica nu a putut fi reactivată. Este posibil ca statutul ei să fi fost modificat între timp.",
        409
      );
    }

    return success(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicUnblocked,
      "Clinica a fost reactivată și este din nou aprobată."
    );
  }

  if (clinic.status !== "pending") {
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicMustBePending,
      "Numai clinicile aflate în așteptare pot fi moderate.",
      409
    );
  }

  if (action === "reject") {
    const { data, error } = await admin
      .from("clinics")
      .update({
        status: "rejected",
        rejected_at: now,
        rejection_reason: rejectionReason,
        approved_at: null,
        approved_by_profile_id: null,
        blocked_at: null,
        blocked_by_profile_id: null,
        blocked_reason: null,
      })
      .eq("id", clinic.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Clinic rejection failed:", error);
      return failure(
        PLATFORM_OPERATOR_CLINIC_CODES.clinicRejectConflict,
        "Clinica nu a putut fi respinsă. Este posibil ca statutul ei să fi fost modificat între timp.",
        409
      );
    }

    return success(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicRejected,
      "Clinica a fost respinsă."
    );
  }

  if (!clinic.proposed_by_profile_id) {
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicProposerMissing,
      "Clinica nu are un medic propunător asociat.",
      409
    );
  }

  const { data: doctor, error: doctorError } = await admin
    .from("doctors")
    .select("id")
    .eq("profile_id", clinic.proposed_by_profile_id)
    .maybeSingle();

  if (doctorError || !doctor) {
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicProposerDoctorMissing,
      "Profilul medicului care a propus clinica nu a fost găsit.",
      409
    );
  }

  const { data: approvedClinic, error: approveError } = await admin
    .from("clinics")
    .update({
      status: "approved",
      approved_by_profile_id: authorization.profileId,
      approved_at: now,
      rejected_at: null,
      rejection_reason: null,
      blocked_at: null,
      blocked_by_profile_id: null,
      blocked_reason: null,
    })
    .eq("id", clinic.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (approveError || !approvedClinic) {
    console.error("Clinic approval failed:", approveError);
    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicApproveConflict,
      "Clinica nu a putut fi aprobată. Este posibil ca statutul ei să fi fost modificat între timp.",
      409
    );
  }

  const { error: associationError } = await admin
    .from("doctor_clinics")
    .upsert(
      { doctor_id: doctor.id, clinic_id: clinic.id },
      { onConflict: "doctor_id,clinic_id" }
    );

  if (associationError) {
    console.error("Approved clinic association failed:", associationError);
    const { error: rollbackError } = await admin
      .from("clinics")
      .update({
        status: "pending",
        approved_by_profile_id: null,
        approved_at: null,
      })
      .eq("id", clinic.id)
      .eq("status", "approved");

    if (rollbackError) {
      console.error("Clinic approval rollback failed:", rollbackError);
    }

    return failure(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicAssociationRollbackFailed,
      "Clinica nu a putut fi asociată medicului. Aprobarea a fost anulată.",
      500
    );
  }

  return success(
    PLATFORM_OPERATOR_CLINIC_CODES.clinicApproved,
    "Clinica a fost aprobată și asociată medicului."
  );
}
