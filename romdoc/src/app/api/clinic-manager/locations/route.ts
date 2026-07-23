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
  getGooglePlaceDetails,
} from "@/lib/google-maps/get-place-details";
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
  createLocationSlug,
} from "@/lib/locations/create-location-slug";
import {
  matchOrCreateCity,
} from "@/lib/locations/match-or-create-city";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type LocationRequestBody = {
  organizationId?:
    unknown;
  name?: unknown;
  placeId?: unknown;
  addressLine2?:
    unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  description?:
    unknown;
  locale?: unknown;
};

function normalizeOptionalString(
  value: unknown,
  maximumLength: number
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized.slice(
        0,
        maximumLength
      )
    : null;
}

function normalizeRequiredString(
  value: unknown,
  maximumLength: number
) {
  return (
    normalizeOptionalString(
      value,
      maximumLength
    ) ??
    ""
  );
}

function normalizeEmail(
  value: unknown
) {
  const normalized =
    normalizeOptionalString(
      value,
      320
    );

  if (!normalized) {
    return {
      value:
        null as
          string | null,
      valid: true,
    };
  }

  const email =
    normalized
      .toLowerCase();

  return {
    value:
      email,
    valid:
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      ),
  };
}

function normalizeWebsite(
  value: unknown
) {
  const normalized =
    normalizeOptionalString(
      value,
      500
    );

  if (!normalized) {
    return {
      value:
        null as
          string | null,
      valid: true,
    };
  }

  try {
    const url =
      new URL(
        normalized
      );

    if (
      ![
        "http:",
        "https:",
      ].includes(
        url.protocol
      )
    ) {
      return {
        value: null,
        valid: false,
      };
    }

    return {
      value:
        url.toString(),
      valid: true,
    };
  } catch {
    return {
      value: null,
      valid: false,
    };
  }
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

async function createUniqueClinicSlug(
  clinicName: string,
  citySlug: string
) {
  const admin =
    createAdminClient();

  const baseSlug =
    createLocationSlug(
      `${clinicName}-${citySlug}`
    ) ||
    "clinica";

  let candidate =
    baseSlug;

  let suffix =
    2;

  while (true) {
    const {
      data,
      error,
    } =
      await admin
        .from(
          "clinics"
        )
        .select(
          "id"
        )
        .eq(
          "slug",
          candidate
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    candidate =
      `${baseSlug}-${suffix}`;

    suffix += 1;
  }
}

export async function POST(
  request:
    NextRequest
): Promise<Response> {
  let body:
    LocationRequestBody;

  try {
    body =
      (await request
        .json()) as
        LocationRequestBody;
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

  const organizationId =
    normalizeRequiredString(
      body.organizationId,
      100
    );

  const clinicName =
    normalizeRequiredString(
      body.name,
      200
    );

  const placeId =
    normalizeRequiredString(
      body.placeId,
      500
    );

  if (!organizationId) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationRequired,
      400
    );
  }

  if (
    clinicName.length <
      2
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .locationNameRequired,
      400
    );
  }

  if (!placeId) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .locationAddressRequired,
      400
    );
  }

  const normalizedEmail =
    normalizeEmail(
      body.email
    );

  if (
    !normalizedEmail.valid
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .locationEmailInvalid,
      400
    );
  }

  const normalizedWebsite =
    normalizeWebsite(
      body.website
    );

  if (
    !normalizedWebsite.valid
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .locationWebsiteInvalid,
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
        organizationId
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
        organizationId
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

  let googleAddress;

  try {
    googleAddress =
      await getGooglePlaceDetails(
        placeId
      );
  } catch (
    addressError
  ) {
    console.error(
      "Clinic location address verification failed:",
      addressError
    );

    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .locationAddressVerificationFailed,
      502
    );
  }

  let city;

  try {
    city =
      await matchOrCreateCity(
        admin,
        {
          cityName:
            googleAddress.cityName,
          countryCode:
            googleAddress.countryCode,
          latitude:
            googleAddress.latitude,
          longitude:
            googleAddress.longitude,
        }
      );
  } catch (
    cityError
  ) {
    console.error(
      "Clinic location city resolution failed:",
      cityError
    );

    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .locationCityResolutionFailed,
      500
    );
  }

  const {
    data:
      existingClinic,
    error:
      existingClinicError,
  } =
    await admin
      .from(
        "clinics"
      )
      .select(
        "id, slug, status"
      )
      .eq(
        "google_place_id",
        googleAddress.placeId
      )
      .maybeSingle();

  if (
    existingClinicError
  ) {
    console.error(
      "Existing clinic lookup failed:",
      existingClinicError
    );

    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .clinicLookupFailed,
      500
    );
  }

  const phone =
    normalizeOptionalString(
      body.phone,
      50
    );

  const description =
    normalizeOptionalString(
      body.description,
      3000
    );

  const addressLine2 =
    normalizeOptionalString(
      body.addressLine2,
      300
    );

  let clinicId:
    string;

  let clinicStatus:
    string;

  let linkedExisting =
    false;

  if (
    existingClinic
  ) {
    clinicId =
      existingClinic.id;

    clinicStatus =
      existingClinic.status;

    linkedExisting =
      true;
  } else {
    let clinicSlug:
      string;

    try {
      clinicSlug =
        await createUniqueClinicSlug(
          clinicName,
          city.slug
        );
    } catch (
      slugError
    ) {
      console.error(
        "Clinic slug generation failed:",
        slugError
      );

      return apiError(
        locale,
        CLINIC_ORGANIZATION_API_CODES
          .locationCreateFailed,
        500
      );
    }

    const {
      data:
        clinic,
      error:
        clinicInsertError,
    } =
      await admin
        .from(
          "clinics"
        )
        .insert({
          slug:
            clinicSlug,
          city_id:
            city.id,
          email:
            normalizedEmail
              .value,
          phone,
          website:
            normalizedWebsite
              .value,
          street_address:
            googleAddress
              .addressLine1,
          formatted_address:
            googleAddress
              .formattedAddress,
          address_line_1:
            googleAddress
              .addressLine1,
          address_line_2:
            addressLine2,
          postal_code:
            googleAddress
              .postalCode,
          county_name:
            googleAddress
              .countyName,
          country_code:
            googleAddress
              .countryCode,
          latitude:
            googleAddress
              .latitude,
          longitude:
            googleAddress
              .longitude,
          google_place_id:
            googleAddress
              .placeId,
          google_maps_uri:
            googleAddress
              .googleMapsUri,
          address_verified_at:
            new Date()
              .toISOString(),
          status:
            "pending",
          proposed_by_profile_id:
            user.id,
        })
        .select(
          "id, slug, status"
        )
        .single();

    if (
      clinicInsertError ||
      !clinic
    ) {
      console.error(
        "Clinic location insert failed:",
        clinicInsertError
      );

      return apiError(
        locale,
        CLINIC_ORGANIZATION_API_CODES
          .locationCreateFailed,
        500
      );
    }

    clinicId =
      clinic.id;

    clinicStatus =
      clinic.status;

    const translations =
      [
        "ro",
        "en",
        "de",
      ].map(
        (
          translationLocale
        ) => ({
          clinic_id:
            clinic.id,
          locale:
            translationLocale,
          name:
            clinicName,
          description,
        })
      );

    const {
      error:
        translationInsertError,
    } =
      await admin
        .from(
          "clinic_translations"
        )
        .upsert(
          translations,
          {
            onConflict:
              "clinic_id,locale",
          }
        );

    if (
      translationInsertError
    ) {
      console.error(
        "Clinic location translation insert failed:",
        translationInsertError
      );

      await admin
        .from(
          "clinics"
        )
        .delete()
        .eq(
          "id",
          clinic.id
        );

      return apiError(
        locale,
        CLINIC_ORGANIZATION_API_CODES
          .locationTranslationFailed,
        500
      );
    }
  }

  const {
    data:
      existingLink,
    error:
      existingLinkError,
  } =
    await admin
      .from(
        "clinic_organization_clinics"
      )
      .select(
        "id, status"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "clinic_id",
        clinicId
      )
      .maybeSingle();

  if (
    existingLinkError
  ) {
    console.error(
      "Organization-location link lookup failed:",
      existingLinkError
    );

    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationLocationLookupFailed,
      500
    );
  }

  if (
    existingLink
  ) {
    if (
      existingLink.status ===
        "active"
    ) {
      const code =
        CLINIC_ORGANIZATION_API_CODES
          .organizationLocationAlreadyActive;

      return stableApiSuccess(
        code,
        {
          message:
            getClinicOrganizationApiMessage(
              locale,
              code
            ),
          clinicId,
          clinicStatus,
          organizationClinicStatus:
            existingLink.status,
          linkedExisting,
        }
      );
    }

    if (
      existingLink.status ===
        "pending"
    ) {
      const code =
        CLINIC_ORGANIZATION_API_CODES
          .organizationLocationAlreadyPending;

      return stableApiSuccess(
        code,
        {
          message:
            getClinicOrganizationApiMessage(
              locale,
              code
            ),
          clinicId,
          clinicStatus,
          organizationClinicStatus:
            existingLink.status,
          linkedExisting,
        }
      );
    }

    const {
      data:
        reopenedLink,
      error:
        reopenError,
    } =
      await admin
        .from(
          "clinic_organization_clinics"
        )
        .update({
          status:
            "pending",
        })
        .eq(
          "id",
          existingLink.id
        )
        .select(
          "status"
        )
        .maybeSingle();

    if (
      reopenError ||
      !reopenedLink
    ) {
      console.error(
        "Organization-location link reopening failed:",
        reopenError
      );

      return apiError(
        locale,
        CLINIC_ORGANIZATION_API_CODES
          .organizationLocationCreateFailed,
        500
      );
    }

    const code =
      CLINIC_ORGANIZATION_API_CODES
        .organizationLocationSubmitted;

    return stableApiSuccess(
      code,
      {
        message:
          getClinicOrganizationApiMessage(
            locale,
            code
          ),
        clinicId,
        clinicStatus,
        organizationClinicStatus:
          reopenedLink.status,
        linkedExisting,
      },
      201
    );
  }

  const {
    data:
      link,
    error:
      linkError,
  } =
    await admin
      .from(
        "clinic_organization_clinics"
      )
      .insert({
        organization_id:
          organizationId,
        clinic_id:
          clinicId,
        status:
          "pending",
      })
      .select(
        "id, status"
      )
      .single();

  if (
    linkError ||
    !link
  ) {
    console.error(
      "Organization-location link creation failed:",
      linkError
    );

    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationLocationCreateFailed,
      500
    );
  }

  const code =
    CLINIC_ORGANIZATION_API_CODES
      .organizationLocationSubmitted;

  return stableApiSuccess(
    code,
    {
      message:
        getClinicOrganizationApiMessage(
          locale,
          code
        ),
      clinicId,
      clinicStatus,
      organizationClinicStatus:
        link.status,
      linkedExisting,
    },
    201
  );
}
