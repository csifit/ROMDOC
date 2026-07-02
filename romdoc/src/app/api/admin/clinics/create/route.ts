import { NextRequest, NextResponse } from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { getGooglePlaceDetails } from "@/lib/google-maps/get-place-details";
import { createLocationSlug } from "@/lib/locations/create-location-slug";
import { matchOrCreateCity } from "@/lib/locations/match-or-create-city";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CreateAdminClinicBody = {
  name?: unknown;
  placeId?: unknown;
  addressLine2?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  description?: unknown;
};

function normalizeOptionalString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maximumLength) : null;
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeOptionalString(value, 320);
  if (!normalized) return null;
  const email = normalized.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Adresa de e-mail a clinicii nu este validă.");
  }
  return email;
}

function normalizeWebsite(value: unknown) {
  const normalized = normalizeOptionalString(value, 500);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error("Adresa website-ului clinicii nu este validă.");
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

    if (error) throw new Error(`Clinic slug lookup failed: ${error.message}`);
    if (!data) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const administratorError = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot crea direct clinici."
  );
  if (administratorError) return administratorError;

  let body: CreateAdminClinicBody;
  try {
    body = (await request.json()) as CreateAdminClinicBody;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const clinicName = normalizeOptionalString(body.name, 200);
  if (!clinicName || clinicName.length < 2) {
    return NextResponse.json({ error: "Introdu numele clinicii." }, { status: 400 });
  }

  const placeId = normalizeOptionalString(body.placeId, 500);
  if (!placeId) {
    return NextResponse.json(
      { error: "Selectează adresa clinicii din lista Google." },
      { status: 400 }
    );
  }

  try {
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
      .select(`
        id,
        slug,
        status,
        clinic_translations (
          locale,
          name
        )
      `)
      .eq("google_place_id", googleAddress.placeId)
      .maybeSingle();

    if (existingClinicError) {
      throw new Error(`Existing clinic lookup failed: ${existingClinicError.message}`);
    }

    if (existingClinic) {
      const translations = Array.isArray(existingClinic.clinic_translations)
        ? existingClinic.clinic_translations
        : [];
      const existingName =
        translations.find((translation) => translation.locale === "ro")?.name ??
        translations[0]?.name ??
        existingClinic.slug;

      return NextResponse.json(
        {
          error: `Locația Google este deja înregistrată ca „${existingName}” cu statusul „${existingClinic.status}”.`,
          existingClinicId: existingClinic.id,
          existingStatus: existingClinic.status,
        },
        { status: 409 }
      );
    }

    const clinicSlug = await createUniqueClinicSlug(clinicName, city.slug);
    const now = new Date().toISOString();

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
        address_verified_at: now,
        status: "approved",
        proposed_by_profile_id: null,
        approved_by_profile_id: authorization.profileId,
        approved_at: now,
        rejected_at: null,
        rejection_reason: null,
        blocked_at: null,
        blocked_by_profile_id: null,
        blocked_reason: null,
      })
      .select("id, slug, status")
      .single();

    if (clinicInsertError || !clinic) {
      throw new Error(
        `Admin clinic creation failed: ${clinicInsertError?.message ?? "No clinic returned"}`
      );
    }

    const { error: translationError } = await admin
      .from("clinic_translations")
      .upsert(
        [
          { clinic_id: clinic.id, locale: "ro", name: clinicName, description },
          { clinic_id: clinic.id, locale: "en", name: clinicName, description },
        ],
        { onConflict: "clinic_id,locale" }
      );

    if (translationError) {
      const { error: cleanupError } = await admin
        .from("clinics")
        .delete()
        .eq("id", clinic.id);
      if (cleanupError) {
        console.error("Clinic cleanup after translation failure failed:", cleanupError);
      }
      throw new Error(`Clinic translations creation failed: ${translationError.message}`);
    }

    return NextResponse.json(
      {
        message: "Clinica a fost creată și aprobată.",
        clinic: {
          id: clinic.id,
          slug: clinic.slug,
          status: clinic.status,
          name: clinicName,
          formattedAddress: googleAddress.formattedAddress,
          cityId: city.id,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Admin clinic creation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Clinica nu a putut fi creată.",
      },
      { status: 500 }
    );
  }
}
