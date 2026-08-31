import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClinicOrganizationLocation,
} from "@/lib/admin/create-clinic-organization-location";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

type LocationBody = {
  locale?: unknown;
  name?: unknown;
  placeId?: unknown;
  addressLine2?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  description?: unknown;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function normalizeText(
  value: unknown,
  maximumLength: number
) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function optionalText(
  value: unknown,
  maximumLength: number
) {
  const text = normalizeText(value, maximumLength);
  return text || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot adăuga direct locații organizațiilor."
  );

  if (adminOnly) {
    return adminOnly;
  }

  const {
    organizationId,
  } = await context.params;

  if (!isUuid(organizationId)) {
    return json(
      {
        code: "clinic_organization_location_invalid_organization",
        error: "Organizația nu este validă.",
      },
      400
    );
  }

  let body: LocationBody;

  try {
    body = (await request.json()) as LocationBody;
  } catch {
    return json(
      {
        code: "clinic_organization_location_invalid_json",
        error: "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const locale =
    body.locale === "en"
      ? "en"
      : body.locale === "de"
        ? "de"
        : "ro";

  const name = normalizeText(body.name, 200);
  const placeId = normalizeText(body.placeId, 500);

  if (name.length < 2) {
    return json(
      {
        code: "clinic_organization_location_name_required",
        error: "Introdu numele locației.",
      },
      400
    );
  }

  if (!placeId) {
    return json(
      {
        code: "clinic_organization_location_address_required",
        error: "Selectează adresa locației din lista Google.",
      },
      400
    );
  }

  const admin = createAdminClient();

  const {
    data: organization,
    error: organizationError,
  } = await admin
    .from("clinic_organizations")
    .select("id, name, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    console.error(
      "Admin organisation lookup before location creation failed:",
      organizationError
    );

    return json(
      {
        code: "clinic_organization_location_organization_lookup_failed",
        error: "Organizația nu a putut fi verificată.",
      },
      500
    );
  }

  if (!organization) {
    return json(
      {
        code: "clinic_organization_location_organization_not_found",
        error: "Organizația nu a fost găsită.",
      },
      404
    );
  }

  if (organization.status !== "active") {
    return json(
      {
        code: "clinic_organization_location_organization_not_active",
        error:
          "Locațiile pot fi adăugate direct numai organizațiilor active.",
      },
      409
    );
  }

  try {
    const location =
      await createAdminClinicOrganizationLocation({
        organizationId: organization.id,
        actorProfileId: authorization.profileId,
        locale,
        input: {
          name,
          placeId,
          addressLine2: optionalText(body.addressLine2, 300),
          phone: optionalText(body.phone, 50),
          email: optionalText(body.email, 320),
          website: optionalText(body.website, 500),
          description: optionalText(body.description, 3000),
        },
      });

    return json(
      {
        success: true,
        code: "clinic_organization_location_created",
        message:
          "Locația a fost adăugată și activată pentru organizație.",
        location,
      },
      201
    );
  } catch (error) {
    console.error(
      "Admin Clinic Organisation direct location creation failed:",
      error
    );

    return json(
      {
        code: "clinic_organization_location_create_failed",
        error:
          error instanceof Error
            ? error.message
            : "Locația nu a putut fi adăugată.",
      },
      409
    );
  }
}
