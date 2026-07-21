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

type LocationActionBody = {
  organizationClinicId?: unknown;
  action?: unknown;
};

type LocationStatus = "pending" | "active" | "removed";

type ClinicOrganizationLocationRow = {
  id: string;
  organization_id: string;
  clinic_id: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  clinic_organizations:
    | {
        id: string;
        name: string;
        status: string;
        contact_email: string | null;
        contact_phone: string | null;
      }
    | Array<{
        id: string;
        name: string;
        status: string;
        contact_email: string | null;
        contact_phone: string | null;
      }>
    | null;
  clinics:
    | {
        id: string;
        slug: string;
        status: string;
        formatted_address: string | null;
        google_maps_uri: string | null;
        latitude: number | string | null;
        longitude: number | string | null;
        clinic_translations: Array<{ locale: string; name: string }> | null;
        cities:
          | {
              slug: string | null;
              city_translations: Array<{ locale: string; name: string }> | null;
            }
          | Array<{
              slug: string | null;
              city_translations: Array<{ locale: string; name: string }> | null;
            }>
          | null;
      }
    | Array<{
        id: string;
        slug: string;
        status: string;
        formatted_address: string | null;
        google_maps_uri: string | null;
        latitude: number | string | null;
        longitude: number | string | null;
        clinic_translations: Array<{ locale: string; name: string }> | null;
        cities:
          | {
              slug: string | null;
              city_translations: Array<{ locale: string; name: string }> | null;
            }
          | Array<{
              slug: string | null;
              city_translations: Array<{ locale: string; name: string }> | null;
            }>
          | null;
      }>
    | null;
};

function normalizeString(value: unknown, maximumLength = 200) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Numai administratorii pot verifica locațiile organizațiilor de clinică."
  );
  if (adminOnly) return adminOnly;

  const allowedStatuses: LocationStatus[] = ["pending", "active", "removed"];
  const requestedStatus = request.nextUrl.searchParams.get("status");
  const status = allowedStatuses.includes(requestedStatus as LocationStatus)
    ? (requestedStatus as LocationStatus)
    : "pending";
  const admin = createAdminClient();

  const [locationsResult, countResults] = await Promise.all([
    admin
      .from("clinic_organization_clinics")
      .select(`
        id,
        organization_id,
        clinic_id,
        status,
        created_at,
        approved_at,
        clinic_organizations (
          id,
          name,
          status,
          contact_email,
          contact_phone
        ),
        clinics (
          id,
          slug,
          status,
          formatted_address,
          google_maps_uri,
          latitude,
          longitude,
          clinic_translations (locale, name),
          cities (slug, city_translations (locale, name))
        )
      `)
      .eq("status", status)
      .order("created_at", { ascending: false }),
    Promise.all(
      allowedStatuses.map((locationStatus) =>
        admin
          .from("clinic_organization_clinics")
          .select("id", { count: "exact", head: true })
          .eq("status", locationStatus)
      )
    ),
  ]);

  if (locationsResult.error) {
    console.error(
      "Admin clinic organization locations query failed:",
      locationsResult.error
    );
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.organizationLocationsLoadFailed,
        error: "Locațiile organizațiilor nu au putut fi încărcate.",
      },
      500
    );
  }

  const locations = (
    (locationsResult.data ?? []) as ClinicOrganizationLocationRow[]
  ).map((location) => ({
    ...location,
    clinic_organizations: first(location.clinic_organizations),
    clinics: first(location.clinics),
  }));

  return json({
    code: PLATFORM_OPERATOR_CLINIC_CODES.organizationLocationsLoaded,
    locations,
    statusCounts: Object.fromEntries(
      allowedStatuses.map((locationStatus, index) => [
        locationStatus,
        countResults[index]?.count ?? 0,
      ])
    ),
  });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Numai administratorii pot aproba sau respinge locații pentru organizații de clinică."
  );
  if (adminOnly) return adminOnly;

  let body: LocationActionBody;
  try {
    body = (await request.json()) as LocationActionBody;
  } catch {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.invalidJson,
        error: "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const organizationClinicId = normalizeString(body.organizationClinicId, 100);
  const action = normalizeString(body.action, 50);

  if (!organizationClinicId) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.organizationLocationIdRequired,
        error: "Legătura dintre organizație și locație lipsește.",
      },
      400
    );
  }

  if (action !== "approve" && action !== "reject") {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.invalidAction,
        error: "Acțiunea solicitată nu este validă.",
      },
      400
    );
  }

  const admin = createAdminClient();
  const { data: organizationClinic, error: organizationClinicError } =
    await admin
      .from("clinic_organization_clinics")
      .select(`
        id,
        organization_id,
        clinic_id,
        status,
        clinic_organizations (id, status),
        clinics (id, status, latitude, longitude)
      `)
      .eq("id", organizationClinicId)
      .maybeSingle();

  if (organizationClinicError || !organizationClinic) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.organizationLocationNotFound,
        error: "Locația solicitată nu a fost găsită.",
      },
      404
    );
  }

  const organization = first(organizationClinic.clinic_organizations);
  const clinic = first(organizationClinic.clinics);

  if (!organization || !clinic) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.organizationOrClinicMissing,
        error: "Organizația sau clinica asociată nu mai există.",
      },
      409
    );
  }

  if (organization.status !== "active") {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.organizationInactive,
        error:
          "Organizația clinicii trebuie să fie activă înainte de aprobarea locației.",
      },
      409
    );
  }

  if (organizationClinic.status !== "pending") {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.organizationLocationMustBePending,
        error: "Numai locațiile aflate în verificare pot fi moderate.",
      },
      409
    );
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    const { data, error } = await admin
      .from("clinic_organization_clinics")
      .update({
        status: "removed",
        approved_by_profile_id: null,
        approved_at: null,
      })
      .eq("id", organizationClinic.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Clinic organization location rejection failed:", error);
      return json(
        {
          code:
            PLATFORM_OPERATOR_CLINIC_CODES.organizationLocationRejectConflict,
          error:
            "Locația nu a putut fi respinsă. Este posibil ca statusul ei să fi fost modificat între timp.",
        },
        409
      );
    }

    return json({
      code: PLATFORM_OPERATOR_CLINIC_CODES.organizationLocationRejected,
      message: "Locația a fost respinsă pentru această organizație.",
    });
  }

  if (clinic.status === "blocked" || clinic.status === "rejected") {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.clinicNotEligibleForOrganization,
        error:
          "Această clinică este blocată sau respinsă și nu poate fi activată pentru organizație.",
      },
      409
    );
  }

  if (clinic.latitude === null || clinic.longitude === null) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.clinicCoordinatesMissing,
        error:
          "Locația nu are coordonate valide. Nu poate apărea pe hartă fără latitudine și longitudine.",
      },
      409
    );
  }

  if (clinic.status !== "approved") {
    const { data, error } = await admin
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
      .in("status", ["pending", "approved"])
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Clinic public approval for organization location failed:", error);
      return json(
        {
          code: PLATFORM_OPERATOR_CLINIC_CODES.clinicPublicApproveFailed,
          error:
            "Clinica nu a putut fi aprobată pentru afișarea publică pe hartă.",
        },
        409
      );
    }
  }

  const { data: approvedLink, error: approveLinkError } = await admin
    .from("clinic_organization_clinics")
    .update({
      status: "active",
      approved_by_profile_id: authorization.profileId,
      approved_at: now,
    })
    .eq("id", organizationClinic.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (approveLinkError || !approvedLink) {
    console.error(
      "Clinic organization location approval failed:",
      approveLinkError
    );
    return json(
      {
        code:
          PLATFORM_OPERATOR_CLINIC_CODES.organizationLocationApproveConflict,
        error:
          "Locația nu a putut fi activată pentru organizație. Clinica poate fi aprobată, dar legătura organizației nu a fost activată.",
      },
      409
    );
  }

  return json({
    code: PLATFORM_OPERATOR_CLINIC_CODES.organizationLocationApproved,
    message:
      "Locația a fost aprobată pentru organizație și este eligibilă pentru afișarea pe harta publică.",
  });
}
