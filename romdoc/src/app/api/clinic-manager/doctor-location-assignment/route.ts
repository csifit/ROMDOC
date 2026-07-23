import {
  NextRequest,
} from "next/server";

import {
  CLINIC_ORGANIZATION_API_CODES,
  type ClinicOrganizationApiCode,
} from "@/lib/api/clinic-organization-api-codes";
import {
  stableApiError,
  stableApiSuccess,
} from "@/lib/api/stable-api-response";
import {
  getClinicOrganizationApiMessage,
} from "@/lib/i18n/clinic-organization-api-copy";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getRequestAppLocale,
} from "@/lib/i18n/request-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type AssignmentBody = {
  relationshipId?:
    unknown;
  clinicId?: unknown;
  locale?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength =
    100
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .slice(
          0,
          maximumLength
        )
    : "";
}

function apiError(
  locale: AppLocale,
  code:
    ClinicOrganizationApiCode,
  status: number
) {
  return stableApiError(
    code,
    getClinicOrganizationApiMessage(
      locale,
      code
    ),
    status
  );
}

export async function PATCH(
  request:
    NextRequest
): Promise<Response> {
  let body:
    AssignmentBody;

  try {
    body =
      (await request
        .json()) as
        AssignmentBody;
  } catch {
    const locale =
      getRequestAppLocale(
        request
      );

    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .invalidJson,
      400
    );
  }

  const locale =
    getRequestAppLocale(
      request,
      body.locale
    );

  const relationshipId =
    normalizeString(
      body.relationshipId
    );

  const clinicId =
    normalizeString(
      body.clinicId
    );

  if (!relationshipId) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .relationshipRequired,
      400
    );
  }

  if (!clinicId) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .clinicRequired,
      400
    );
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .authenticationRequired,
      401
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "role, account_status"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "clinic_manager"
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .clinicManagerRequired,
      403
    );
  }

  if (
    profile.account_status !==
      "active"
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .activeManagerRequired,
      403
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      relationship,
    error:
      relationshipError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .select(`
        id,
        organization_id,
        clinic_id,
        doctor_id,
        invitation_status,
        coverage_status,
        payment_responsibility
      `)
      .eq(
        "id",
        relationshipId
      )
      .maybeSingle();

  if (
    relationshipError ||
    !relationship
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .doctorRelationshipNotFound,
      relationshipError
        ? 500
        : 404
    );
  }

  const {
    data:
      membership,
    error:
      membershipError,
  } =
    await admin
      .from(
        "clinic_organization_members"
      )
      .select(
        "id"
      )
      .eq(
        "organization_id",
        relationship
          .organization_id
      )
      .eq(
        "profile_id",
        user.id
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationAccessDenied,
      403
    );
  }

  const {
    data:
      organization,
    error:
      organizationError,
  } =
    await admin
      .from(
        "clinic_organizations"
      )
      .select(
        "id, status"
      )
      .eq(
        "id",
        relationship
          .organization_id
      )
      .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationNotFound,
      404
    );
  }

  if (
    organization.status !==
      "active"
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationNotActive,
      409
    );
  }

  /*
   * Billing responsibility and coverage state are intentionally
   * not operational access gates. An active Clinic Organisation
   * may assign its invited/accepted Doctors to approved locations.
   * Billing continues to meter the resulting relationship.
   */

  const {
    data:
      approvedLocation,
    error:
      approvedLocationError,
  } =
    await admin
      .from(
        "clinic_organization_clinics"
      )
      .select(`
        id,
        organization_id,
        clinic_id,
        status,
        clinics (
          id,
          status
        )
      `)
      .eq(
        "organization_id",
        relationship
          .organization_id
      )
      .eq(
        "clinic_id",
        clinicId
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

  const clinicRelation =
    Array.isArray(
      approvedLocation
        ?.clinics
    )
      ? approvedLocation
          ?.clinics[0] ??
        null
      : approvedLocation
          ?.clinics ??
        null;

  if (
    approvedLocationError ||
    !approvedLocation ||
    !clinicRelation ||
    clinicRelation.status !==
      "approved"
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .approvedLocationRequired,
      409
    );
  }

  const now =
    new Date()
      .toISOString();

  const {
    data:
      updatedRelationship,
    error:
      updateError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .update({
        clinic_id:
          clinicId,
        updated_at:
          now,
      })
      .eq(
        "id",
        relationship.id
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    updateError ||
    !updatedRelationship
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .doctorLocationUpdateFailed,
      500
    );
  }

  if (
    relationship.doctor_id
  ) {
    const {
      data:
        organizationLocations,
      error:
        organizationLocationsError,
    } =
      await admin
        .from(
          "clinic_organization_clinics"
        )
        .select(
          "clinic_id"
        )
        .eq(
          "organization_id",
          relationship
            .organization_id
        )
        .eq(
          "status",
          "active"
        );

    if (
      organizationLocationsError
    ) {
      return apiError(
        locale,
        CLINIC_ORGANIZATION_API_CODES
          .organizationLocationsLookupFailed,
        500
      );
    }

    const otherOrganizationClinicIds =
      (
        organizationLocations ??
        []
      )
        .map(
          (
            location
          ) =>
            location
              .clinic_id
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(
              id
            ) &&
            id !==
              clinicId
        );

    if (
      otherOrganizationClinicIds
        .length > 0
    ) {
      const {
        error:
          cleanupError,
      } =
        await admin
          .from(
            "doctor_clinics"
          )
          .delete()
          .eq(
            "doctor_id",
            relationship
              .doctor_id
          )
          .in(
            "clinic_id",
            otherOrganizationClinicIds
          );

      if (cleanupError) {
        return apiError(
          locale,
          CLINIC_ORGANIZATION_API_CODES
            .doctorLocationCleanupFailed,
          500
        );
      }
    }

    const {
      error:
        doctorClinicError,
    } =
      await admin
        .from(
          "doctor_clinics"
        )
        .upsert(
          {
            doctor_id:
              relationship
                .doctor_id,
            clinic_id:
              clinicId,
          },
          {
            onConflict:
              "doctor_id,clinic_id",
          }
        );

    if (
      doctorClinicError
    ) {
      return apiError(
        locale,
        CLINIC_ORGANIZATION_API_CODES
          .doctorLocationSyncFailed,
        500
      );
    }
  }

  const code =
    relationship.doctor_id
      ? CLINIC_ORGANIZATION_API_CODES
          .doctorLocationAssigned
      : CLINIC_ORGANIZATION_API_CODES
          .doctorLocationPrepared;

  return stableApiSuccess(
    code,
    {
      message:
        getClinicOrganizationApiMessage(
          locale,
          code
        ),
      relationshipId:
        relationship.id,
      clinicId,
    }
  );
}
