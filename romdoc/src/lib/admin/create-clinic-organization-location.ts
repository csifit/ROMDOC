import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getGooglePlaceDetails,
} from "@/lib/google-maps/get-place-details";
import {
  createLocationSlug,
} from "@/lib/locations/create-location-slug";
import {
  matchOrCreateCity,
} from "@/lib/locations/match-or-create-city";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type AdminClinicOrganizationLocationInput = {
  name: string;
  placeId: string;
  addressLine2: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
};

export type AdminClinicOrganizationLocationResult = {
  clinicId: string;
  clinicSlug: string;
  clinicStatus: string;
  organizationClinicStatus: string;
  linkedExisting: boolean;
  formattedAddress: string;
};

function normalizeOptionalString(
  value: string | null,
  maximumLength: number
) {
  const normalized =
    value
      ?.trim()
      .slice(
        0,
        maximumLength
      ) ?? "";

  return normalized ||
    null;
}

function normalizeEmail(
  value: string | null
) {
  const normalized =
    normalizeOptionalString(
      value,
      320
    );

  if (
    !normalized
  ) {
    return null;
  }

  const email =
    normalized
      .toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new Error(
      "Adresa de e-mail a locației nu este validă."
    );
  }

  return email;
}

function normalizeWebsite(
  value: string | null
) {
  const normalized =
    normalizeOptionalString(
      value,
      500
    );

  if (
    !normalized
  ) {
    return null;
  }

  const candidate =
    /^https?:\/\//i.test(
      normalized
    )
      ? normalized
      : `https://${normalized}`;

  try {
    const url =
      new URL(
        candidate
      );

    if (
      ![
        "http:",
        "https:",
      ].includes(
        url.protocol
      )
    ) {
      throw new Error();
    }

    return url
      .toString();
  } catch {
    throw new Error(
      "Adresa website-ului locației nu este validă."
    );
  }
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

  while (
    true
  ) {
    const {
      data,
      error,
    } = await admin
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

    if (
      error
    ) {
      throw error;
    }

    if (
      !data
    ) {
      return candidate;
    }

    candidate =
      `${baseSlug}-${suffix}`;

    suffix += 1;
  }
}

export async function createAdminClinicOrganizationLocation({
  organizationId,
  actorProfileId,
  locale,
  input,
}: {
  organizationId: string;
  actorProfileId: string;
  locale: AppLocale;
  input: AdminClinicOrganizationLocationInput;
}): Promise<AdminClinicOrganizationLocationResult> {
  const clinicName =
    input.name
      .trim()
      .slice(
        0,
        200
      );

  const placeId =
    input.placeId
      .trim()
      .slice(
        0,
        500
      );

  if (
    clinicName.length <
    2
  ) {
    throw new Error(
      "Numele locației este obligatoriu."
    );
  }

  if (
    !placeId
  ) {
    throw new Error(
      "Selectează adresa locației din lista Google."
    );
  }

  const phone =
    normalizeOptionalString(
      input.phone,
      50
    );

  const email =
    normalizeEmail(
      input.email
    );

  const website =
    normalizeWebsite(
      input.website
    );

  const description =
    normalizeOptionalString(
      input.description,
      3000
    );

  const addressLine2 =
    normalizeOptionalString(
      input.addressLine2,
      300
    );

  const googleAddress =
    await getGooglePlaceDetails(
      placeId,
      locale
    );

  const admin =
    createAdminClient();

  const city =
    await matchOrCreateCity(
      admin,
      {
        cityName:
          googleAddress
            .cityName,
        countryCode:
          googleAddress
            .countryCode,
        latitude:
          googleAddress
            .latitude,
        longitude:
          googleAddress
            .longitude,
      }
    );

  const {
    data:
      existingClinic,
    error:
      existingClinicError,
  } = await admin
    .from(
      "clinics"
    )
    .select(
      "id, slug, status"
    )
    .eq(
      "google_place_id",
      googleAddress
        .placeId
    )
    .maybeSingle();

  if (
    existingClinicError
  ) {
    throw new Error(
      `Locația existentă nu a putut fi verificată: ${existingClinicError.message}`
    );
  }

  const now =
    new Date()
      .toISOString();

  let clinicId:
    string;

  let clinicSlug:
    string;

  let clinicStatus:
    string;

  let linkedExisting =
    false;

  if (
    existingClinic
  ) {
    if (
      existingClinic
        .status ===
      "rejected"
    ) {
      throw new Error(
        "Această locație Google există în RomDoc, dar a fost respinsă anterior. Revizuiește mai întâi locația din Admin → Clinici."
      );
    }

    if (
      existingClinic
        .status ===
      "blocked"
    ) {
      throw new Error(
        "Această locație Google este blocată în RomDoc și nu poate fi asociată organizației până când Administratorul nu o reactivează."
      );
    }

    clinicId =
      existingClinic.id;

    clinicSlug =
      existingClinic.slug;

    clinicStatus =
      existingClinic.status;

    linkedExisting =
      true;

    if (
      existingClinic
        .status ===
      "pending"
    ) {
      const {
        data:
          approvedClinic,
        error:
          approvalError,
      } = await admin
        .from(
          "clinics"
        )
        .update({
          status:
            "approved",
          approved_by_profile_id:
            actorProfileId,
          approved_at:
            now,
          rejected_at:
            null,
          rejection_reason:
            null,
        })
        .eq(
          "id",
          existingClinic.id
        )
        .select(
          "id, slug, status"
        )
        .single();

      if (
        approvalError ||
        !approvedClinic
      ) {
        throw new Error(
          "Locația existentă nu a putut fi aprobată."
        );
      }

      clinicStatus =
        approvedClinic.status;
    }
  } else {
    clinicSlug =
      await createUniqueClinicSlug(
        clinicName,
        city.slug
      );

    const {
      data:
        clinic,
      error:
        clinicInsertError,
    } = await admin
      .from(
        "clinics"
      )
      .insert({
        slug:
          clinicSlug,
        city_id:
          city.id,
        email,
        phone,
        website,
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
          now,
        status:
          "approved",
        proposed_by_profile_id:
          null,
        approved_by_profile_id:
          actorProfileId,
        approved_at:
          now,
        rejected_at:
          null,
        rejection_reason:
          null,
        blocked_at:
          null,
        blocked_by_profile_id:
          null,
        blocked_reason:
          null,
      })
      .select(
        "id, slug, status"
      )
      .single();

    if (
      clinicInsertError ||
      !clinic
    ) {
      throw new Error(
        clinicInsertError
          ?.message ??
          "Locația nu a putut fi creată."
      );
    }

    clinicId =
      clinic.id;

    clinicSlug =
      clinic.slug;

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
        translationError,
    } = await admin
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
      translationError
    ) {
      const {
        error:
          cleanupError,
      } = await admin
        .from(
          "clinics"
        )
        .delete()
        .eq(
          "id",
          clinic.id
        );

      if (
        cleanupError
      ) {
        console.error(
          "Clinic cleanup after Admin onboarding translation failure failed:",
          cleanupError
        );
      }

      throw new Error(
        "Traducerile locației nu au putut fi create."
      );
    }
  }

  const {
    data:
      existingLink,
    error:
      linkLookupError,
  } = await admin
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
    linkLookupError
  ) {
    throw new Error(
      "Legătura organizație-locație nu a putut fi verificată."
    );
  }

  if (
    existingLink
  ) {
    const {
      data:
        activeLink,
      error:
        updateLinkError,
    } = await admin
      .from(
        "clinic_organization_clinics"
      )
      .update({
        status:
          "active",
        approved_by_profile_id:
          actorProfileId,
        approved_at:
          now,
      })
      .eq(
        "id",
        existingLink.id
      )
      .select(
        "status"
      )
      .single();

    if (
      updateLinkError ||
      !activeLink
    ) {
      throw new Error(
        "Locația nu a putut fi activată pentru organizație."
      );
    }

    return {
      clinicId,
      clinicSlug,
      clinicStatus,
      organizationClinicStatus:
        activeLink.status,
      linkedExisting,
      formattedAddress:
        googleAddress
          .formattedAddress,
    };
  }

  const {
    data:
      link,
    error:
      linkError,
  } = await admin
    .from(
      "clinic_organization_clinics"
    )
    .insert({
      organization_id:
        organizationId,
      clinic_id:
        clinicId,
      status:
        "active",
      approved_by_profile_id:
        actorProfileId,
      approved_at:
        now,
    })
    .select(
      "status"
    )
    .single();

  if (
    linkError ||
    !link
  ) {
    throw new Error(
      "Locația nu a putut fi asociată organizației."
    );
  }

  return {
    clinicId,
    clinicSlug,
    clinicStatus,
    organizationClinicStatus:
      link.status,
    linkedExisting,
    formattedAddress:
      googleAddress
        .formattedAddress,
  };
}
