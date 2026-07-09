import { NextRequest, NextResponse } from "next/server";

import { getGooglePlaceDetails } from "@/lib/google-maps/get-place-details";
import { createLocationSlug } from "@/lib/locations/create-location-slug";
import { matchOrCreateCity } from "@/lib/locations/match-or-create-city";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type LocationRequestBody = {
  organizationId?: unknown;
  name?: unknown;
  placeId?: unknown;
  addressLine2?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  description?: unknown;
};

type ClinicManagerIdentity = {
  profileId: string;
};

function normalizeOptionalString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maximumLength);
}

function normalizeRequiredString(value: unknown, maximumLength: number) {
  const normalized = normalizeOptionalString(value, maximumLength);

  if (!normalized) {
    return "";
  }

  return normalized;
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeOptionalString(value, 320);

  if (!normalized) {
    return null;
  }

  const email = normalized.toLowerCase();

  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    throw new Error("Adresa de e-mail a locației nu este validă.");
  }

  return email;
}

function normalizeWebsite(value: unknown) {
  const normalized = normalizeOptionalString(value, 500);

  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error("Adresa website-ului locației nu este validă.");
  }
}

async function requireClinicManager(): Promise<
  | {
      identity: ClinicManagerIdentity;
      error: null;
    }
  | {
      identity: null;
      error: NextResponse;
    }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      identity: null,
      error: NextResponse.json(
        {
          error: "Trebuie să fii autentificat.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      identity: null,
      error: NextResponse.json(
        {
          error: "Contul nu a putut fi verificat.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (profile.role !== "clinic_manager") {
    return {
      identity: null,
      error: NextResponse.json(
        {
          error: "Doar Clinic Manager poate administra locațiile organizației.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (profile.account_status === "blocked") {
    return {
      identity: null,
      error: NextResponse.json(
        {
          error: "Contul este blocat.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    identity: {
      profileId: user.id,
    },
    error: null,
  };
}

async function assertActiveOrganizationMembership(
  organizationId: string,
  profileId: string
) {
  const admin = createAdminClient();

  const { data: membership, error: membershipError } = await admin
    .from("clinic_organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("Nu ai acces la această organizație clinică.");
  }

  const { data: organization, error: organizationError } = await admin
    .from("clinic_organizations")
    .select("id, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    throw new Error("Organizația clinicii nu a fost găsită.");
  }

  if (organization.status !== "active") {
    throw new Error("Organizația trebuie să fie activă înainte de a solicita locații.");
  }
}

async function createUniqueClinicSlug(clinicName: string, citySlug: string) {
  const admin = createAdminClient();
  const baseSlug = createLocationSlug(`${clinicName}-${citySlug}`) || "clinica";

  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await admin
      .from("clinics")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Clinic slug lookup failed: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const authorization = await requireClinicManager();

  if (authorization.error) {
    return authorization.error;
  }

  let body: LocationRequestBody;

  try {
    body = (await request.json()) as LocationRequestBody;
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

  const organizationId = normalizeRequiredString(body.organizationId, 100);
  const clinicName = normalizeRequiredString(body.name, 200);
  const placeId = normalizeRequiredString(body.placeId, 500);

  if (!organizationId) {
    return NextResponse.json(
      {
        error: "Selectează organizația clinicii.",
      },
      {
        status: 400,
      }
    );
  }

  if (clinicName.length < 2) {
    return NextResponse.json(
      {
        error: "Introdu numele locației.",
      },
      {
        status: 400,
      }
    );
  }

  if (!placeId) {
    return NextResponse.json(
      {
        error: "Selectează adresa locației din lista Google.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    await assertActiveOrganizationMembership(
      organizationId,
      authorization.identity.profileId
    );

    const phone = normalizeOptionalString(body.phone, 50);
    const email = normalizeEmail(body.email);
    const website = normalizeWebsite(body.website);
    const description = normalizeOptionalString(body.description, 3000);
    const addressLine2 = normalizeOptionalString(body.addressLine2, 300);

    const googleAddress = await getGooglePlaceDetails(placeId);
    const admin = createAdminClient();

    const city = await matchOrCreateCity(admin, {
      cityName: googleAddress.cityName,
      countryCode: googleAddress.countryCode,
      latitude: googleAddress.latitude,
      longitude: googleAddress.longitude,
    });

    const { data: existingClinic, error: existingClinicError } = await admin
      .from("clinics")
      .select("id, slug, status")
      .eq("google_place_id", googleAddress.placeId)
      .maybeSingle();

    if (existingClinicError) {
      throw new Error(`Existing clinic lookup failed: ${existingClinicError.message}`);
    }

    let clinicId: string;
    let linkedExisting = false;
    let clinicStatus = "pending";

    if (existingClinic) {
      clinicId = existingClinic.id;
      linkedExisting = true;
      clinicStatus = existingClinic.status;
    } else {
      const clinicSlug = await createUniqueClinicSlug(clinicName, city.slug);

      const { data: clinic, error: clinicInsertError } = await admin
        .from("clinics")
        .insert({
          slug: clinicSlug,
          city_id: city.id,
          email,
          phone,
          website,
          street_address: googleAddress.addressLine1,
          formatted_address: googleAddress.formattedAddress,
          address_line_1: googleAddress.addressLine1,
          address_line_2: addressLine2,
          postal_code: googleAddress.postalCode,
          county_name: googleAddress.countyName,
          country_code: googleAddress.countryCode,
          latitude: googleAddress.latitude,
          longitude: googleAddress.longitude,
          google_place_id: googleAddress.placeId,
          google_maps_uri: googleAddress.googleMapsUri,
          address_verified_at: new Date().toISOString(),
          status: "pending",
          proposed_by_profile_id: authorization.identity.profileId,
        })
        .select("id, slug, status")
        .single();

      if (clinicInsertError || !clinic) {
        throw new Error(
          `Location request creation failed: ${
            clinicInsertError?.message ?? "No clinic returned"
          }`
        );
      }

      clinicId = clinic.id;
      clinicStatus = clinic.status;

      const translations = [
        {
          clinic_id: clinic.id,
          locale: "ro",
          name: clinicName,
          description,
        },
        {
          clinic_id: clinic.id,
          locale: "en",
          name: clinicName,
          description,
        },
      ];

      const { error: translationInsertError } = await admin
        .from("clinic_translations")
        .upsert(translations, {
          onConflict: "clinic_id,locale",
        });

      if (translationInsertError) {
        await admin.from("clinics").delete().eq("id", clinic.id);

        throw new Error(
          `Location translation creation failed: ${translationInsertError.message}`
        );
      }
    }

    const { data: existingLink, error: existingLinkError } = await admin
      .from("clinic_organization_clinics")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (existingLinkError) {
      throw new Error(`Organization-location link lookup failed: ${existingLinkError.message}`);
    }

    if (existingLink) {
      return NextResponse.json({
        message:
          existingLink.status === "active"
            ? "Locația este deja activă pentru organizația clinicii."
            : "Locația a fost deja solicitată și așteaptă aprobarea RomDoc.",
        clinicId,
        clinicStatus,
        organizationClinicStatus: existingLink.status,
        linkedExisting,
      });
    }

    const { data: link, error: linkError } = await admin
      .from("clinic_organization_clinics")
      .insert({
        organization_id: organizationId,
        clinic_id: clinicId,
        status: "pending",
      })
      .select("id, status")
      .single();

    if (linkError || !link) {
      throw new Error(
        `Organization-location link creation failed: ${
          linkError?.message ?? "No link returned"
        }`
      );
    }

    return NextResponse.json(
      {
        message:
          linkedExisting
            ? "Locația există deja în RomDoc și a fost trimisă pentru asocierea cu organizația clinicii."
            : "Locația a fost trimisă spre verificare și asociere cu organizația clinicii.",
        clinicId,
        clinicStatus,
        organizationClinicStatus: link.status,
        linkedExisting,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Clinic manager location request failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Locația nu a putut fi trimisă.",
      },
      {
        status: 500,
      }
    );
  }
}
