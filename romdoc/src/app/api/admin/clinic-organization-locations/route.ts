import { NextRequest, NextResponse } from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LocationActionBody = {
  organizationClinicId?: unknown;
  action?: unknown;
};

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
        clinic_translations:
          | Array<{
              locale: string;
              name: string;
            }>
          | null;
        cities:
          | {
              slug: string | null;
              city_translations:
                | Array<{
                    locale: string;
                    name: string;
                  }>
                | null;
            }
          | Array<{
              slug: string | null;
              city_translations:
                | Array<{
                    locale: string;
                    name: string;
                  }>
                | null;
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
        clinic_translations:
          | Array<{
              locale: string;
              name: string;
            }>
          | null;
        cities:
          | {
              slug: string | null;
              city_translations:
                | Array<{
                    locale: string;
                    name: string;
                  }>
                | null;
            }
          | Array<{
              slug: string | null;
              city_translations:
                | Array<{
                    locale: string;
                    name: string;
                  }>
                | null;
            }>
          | null;
      }>
    | null;
};

function normalizeString(value: unknown, maximumLength = 200) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function getFirstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export async function GET(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnlyResponse = requireAdministratorCapability(
    authorization.role,
    "Numai administratorii pot verifica locațiile organizațiilor de clinică."
  );

  if (adminOnlyResponse) {
    return adminOnlyResponse;
  }

  const requestedStatus = request.nextUrl.searchParams.get("status");
  const allowedStatuses = ["pending", "active", "removed"];
  const status =
    requestedStatus && allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : "pending";

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("clinic_organization_clinics")
    .select(
      `
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
        )
      `
    )
    .eq("status", status)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Admin clinic organization locations query failed:", error);

    return NextResponse.json(
      {
        error: "Locațiile organizațiilor nu au putut fi încărcate.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const locations = ((data ?? []) as ClinicOrganizationLocationRow[]).map(
    (location) => ({
      ...location,
      clinic_organizations: getFirstRelation(location.clinic_organizations),
      clinics: getFirstRelation(location.clinics),
    })
  );

  return NextResponse.json(
    {
      locations,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnlyResponse = requireAdministratorCapability(
    authorization.role,
    "Numai administratorii pot aproba sau respinge locații pentru organizații de clinică."
  );

  if (adminOnlyResponse) {
    return adminOnlyResponse;
  }

  let body: LocationActionBody;

  try {
    body = (await request.json()) as LocationActionBody;
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

  const organizationClinicId = normalizeString(body.organizationClinicId, 100);
  const action = normalizeString(body.action, 50);

  if (!organizationClinicId) {
    return NextResponse.json(
      {
        error: "Legătura dintre organizație și locație lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      {
        error: "Acțiunea solicitată nu este validă.",
      },
      {
        status: 400,
      }
    );
  }

  const admin = createAdminClient();

  const { data: organizationClinic, error: organizationClinicError } = await admin
    .from("clinic_organization_clinics")
    .select(
      `
        id,
        organization_id,
        clinic_id,
        status,
        clinic_organizations (
          id,
          status
        ),
        clinics (
          id,
          status,
          latitude,
          longitude
        )
      `
    )
    .eq("id", organizationClinicId)
    .maybeSingle();

  if (organizationClinicError || !organizationClinic) {
    return NextResponse.json(
      {
        error: "Locația solicitată nu a fost găsită.",
      },
      {
        status: 404,
      }
    );
  }

  const organization = getFirstRelation(organizationClinic.clinic_organizations);
  const clinic = getFirstRelation(organizationClinic.clinics);

  if (!organization || !clinic) {
    return NextResponse.json(
      {
        error: "Organizația sau clinica asociată nu mai există.",
      },
      {
        status: 409,
      }
    );
  }

  if (organization.status !== "active") {
    return NextResponse.json(
      {
        error: "Organizația clinicii trebuie să fie activă înainte de aprobarea locației.",
      },
      {
        status: 409,
      }
    );
  }

  if (organizationClinic.status !== "pending") {
    return NextResponse.json(
      {
        error: "Numai locațiile aflate în verificare pot fi moderate.",
      },
      {
        status: 409,
      }
    );
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    const { data: rejectedLink, error: rejectError } = await admin
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

    if (rejectError || !rejectedLink) {
      console.error("Clinic organization location rejection failed:", rejectError);

      return NextResponse.json(
        {
          error:
            "Locația nu a putut fi respinsă. Este posibil ca statusul ei să fi fost modificat între timp.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      message: "Locația a fost respinsă pentru această organizație.",
    });
  }

  if (clinic.status === "blocked" || clinic.status === "rejected") {
    return NextResponse.json(
      {
        error:
          "Această clinică este blocată sau respinsă și nu poate fi activată pentru organizație.",
      },
      {
        status: 409,
      }
    );
  }

  if (clinic.latitude === null || clinic.longitude === null) {
    return NextResponse.json(
      {
        error:
          "Locația nu are coordonate valide. Nu poate apărea pe hartă fără latitudine și longitudine.",
      },
      {
        status: 409,
      }
    );
  }

  if (clinic.status !== "approved") {
    const { data: approvedClinic, error: approveClinicError } = await admin
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

    if (approveClinicError || !approvedClinic) {
      console.error("Clinic public approval for organization location failed:", approveClinicError);

      return NextResponse.json(
        {
          error:
            "Clinica nu a putut fi aprobată pentru afișarea publică pe hartă.",
        },
        {
          status: 409,
        }
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
    console.error("Clinic organization location approval failed:", approveLinkError);

    return NextResponse.json(
      {
        error:
          "Locația nu a putut fi activată pentru organizație. Clinica poate fi aprobată, dar legătura organizației nu a fost activată.",
      },
      {
        status: 409,
      }
    );
  }

  return NextResponse.json({
    message:
      "Locația a fost aprobată pentru organizație și este eligibilă pentru afișarea pe harta publică.",
  });
}
