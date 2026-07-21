import { NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_DIRECTORY_CODES } from "@/lib/api/platform-operator-directory-codes";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { createLocationSlug } from "@/lib/locations/create-location-slug";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type CityQueryRow = {
  clinics?: Array<{ id: string }> | null;
  [key: string]: unknown;
};

type CityRequestBody = {
  cityId?: unknown;
  slug?: unknown;
  nameRo?: unknown;
  nameEn?: unknown;
  countryCode?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  isActive?: unknown;
};

function normalizeString(value: unknown, maximumLength = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function normalizeCountryCode(value: unknown) {
  const countryCode = normalizeString(value, 2).toUpperCase();
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : "";
}

function normalizeCoordinate(
  value: unknown,
  minimum: number,
  maximum: number
): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsedValue = typeof value === "number" ? value : Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new Error(
      `Coordonata trebuie să fie între ${minimum} și ${maximum}.`
    );
  }

  return Number(parsedValue.toFixed(7));
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function failure(code: string, error: string, status: number) {
  return json({ code, error }, status);
}

function success(
  code: string,
  message: string,
  extra?: Record<string, unknown>,
  status = 200
) {
  return json({ code, message, ...extra }, status);
}

export async function GET(): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const admin = createAdminClient();
  const { data: cities, error } = await admin
    .from("cities")
    .select(`
      id,
      slug,
      country_code,
      latitude,
      longitude,
      is_active,
      created_at,
      updated_at,
      city_translations (
        id,
        locale,
        name
      ),
      clinics (
        id
      )
    `)
    .order("slug", { ascending: true });

  if (error) {
    console.error("Admin cities query failed:", error);
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.citiesLoadFailed,
      "Orașele nu au putut fi încărcate.",
      500
    );
  }

  const result = ((cities ?? []) as CityQueryRow[]).map((city) => ({
    ...city,
    clinic_count: city.clinics?.length ?? 0,
  }));

  return success(
    PLATFORM_OPERATOR_DIRECTORY_CODES.citiesLoaded,
    "Orașele au fost încărcate.",
    {
      cities: result,
      operatorRole: authorization.role,
      capabilities: {
        canCreateCities: authorization.role === "admin",
        canUpdateCities: true,
        canDeleteCities: false,
      },
    }
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const adminOnlyResponse = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot adăuga orașe."
  );
  if (adminOnlyResponse) return adminOnlyResponse;

  let body: CityRequestBody;

  try {
    body = (await request.json()) as CityRequestBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const nameRo = normalizeString(body.nameRo, 200);
  const nameEn = normalizeString(body.nameEn, 200);
  const providedSlug = normalizeString(body.slug, 200);
  const slug = createLocationSlug(providedSlug || nameRo);
  const countryCode = normalizeCountryCode(body.countryCode);

  let latitude: number | null;
  let longitude: number | null;

  try {
    latitude = normalizeCoordinate(body.latitude, -90, 90);
    longitude = normalizeCoordinate(body.longitude, -180, 180);
  } catch (coordinateError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityCoordinatesInvalid,
      coordinateError instanceof Error
        ? coordinateError.message
        : "Coordonatele nu sunt valide.",
      400
    );
  }

  if (nameRo.length < 2) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityNameRoRequired,
      "Introdu numele orașului în limba română.",
      400
    );
  }

  if (nameEn.length < 2) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityNameEnRequired,
      "Introdu numele orașului în limba engleză.",
      400
    );
  }

  if (!slug) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.citySlugInvalid,
      "Nu a putut fi generat un slug valid.",
      400
    );
  }

  if (!countryCode) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityCountryCodeInvalid,
      "Codul țării trebuie să conțină exact două litere.",
      400
    );
  }

  const admin = createAdminClient();
  const { data: existingSlug, error: existingSlugError } = await admin
    .from("cities")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlugError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.citySlugCheckFailed,
      "Slug-ul nu a putut fi verificat.",
      500
    );
  }

  if (existingSlug) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.citySlugDuplicate,
      "Există deja un oraș cu acest slug.",
      409
    );
  }

  const { data: duplicateTranslation, error: duplicateTranslationError } =
    await admin
      .from("city_translations")
      .select(`
        city_id,
        cities!inner (
          country_code
        )
      `)
      .eq("locale", "ro")
      .ilike("name", nameRo)
      .eq("cities.country_code", countryCode)
      .maybeSingle();

  if (duplicateTranslationError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityNameCheckFailed,
      "Numele orașului nu a putut fi verificat.",
      500
    );
  }

  if (duplicateTranslation) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityNameDuplicate,
      "Există deja un oraș cu acest nume în țara selectată.",
      409
    );
  }

  const { data: city, error: cityError } = await admin
    .from("cities")
    .insert({
      slug,
      country_code: countryCode,
      latitude,
      longitude,
      is_active: true,
    })
    .select(
      "id, slug, country_code, latitude, longitude, is_active, created_at, updated_at"
    )
    .single();

  if (cityError || !city) {
    console.error("City creation failed:", cityError);
    const duplicate = cityError?.code === "23505";

    return failure(
      duplicate
        ? PLATFORM_OPERATOR_DIRECTORY_CODES.citySlugDuplicate
        : PLATFORM_OPERATOR_DIRECTORY_CODES.cityCreateFailed,
      duplicate
        ? "Există deja un oraș cu acest slug."
        : "Orașul nu a putut fi creat.",
      duplicate ? 409 : 500
    );
  }

  const { error: translationsError } = await admin
    .from("city_translations")
    .insert([
      { city_id: city.id, locale: "ro", name: nameRo },
      { city_id: city.id, locale: "en", name: nameEn },
    ]);

  if (translationsError) {
    console.error("City translations creation failed:", translationsError);
    await admin.from("cities").delete().eq("id", city.id);

    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityTranslationCreateFailed,
      "Traducerile orașului nu au putut fi salvate.",
      500
    );
  }

  return success(
    PLATFORM_OPERATOR_DIRECTORY_CODES.cityCreated,
    "Orașul a fost adăugat.",
    { city },
    201
  );
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  let body: CityRequestBody;

  try {
    body = (await request.json()) as CityRequestBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const cityId = normalizeString(body.cityId, 100);

  if (!cityId) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityIdRequired,
      "Orașul lipsește.",
      400
    );
  }

  const admin = createAdminClient();
  const { data: existingCity, error: existingCityError } = await admin
    .from("cities")
    .select("id, slug, country_code, latitude, longitude, is_active")
    .eq("id", cityId)
    .maybeSingle();

  if (existingCityError || !existingCity) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityNotFound,
      "Orașul nu a fost găsit.",
      404
    );
  }

  const requestedActive =
    typeof body.isActive === "boolean"
      ? body.isActive
      : existingCity.is_active;

  if (!requestedActive && existingCity.is_active) {
    const { count: clinicCount, error: clinicCountError } = await admin
      .from("clinics")
      .select("*", { count: "exact", head: true })
      .eq("city_id", cityId);

    if (clinicCountError) {
      return failure(
        PLATFORM_OPERATOR_DIRECTORY_CODES.cityUsageCheckFailed,
        "Utilizarea orașului nu a putut fi verificată.",
        500
      );
    }

    if ((clinicCount ?? 0) > 0) {
      return failure(
        PLATFORM_OPERATOR_DIRECTORY_CODES.cityInUse,
        "Orașul este asociat unor clinici și nu poate fi dezactivat.",
        409
      );
    }
  }

  const nameRo = normalizeString(body.nameRo, 200);
  const nameEn = normalizeString(body.nameEn, 200);
  const requestedSlug = normalizeString(body.slug, 200);
  const slug = requestedSlug
    ? createLocationSlug(requestedSlug)
    : existingCity.slug;
  const countryCode = normalizeCountryCode(
    body.countryCode ?? existingCity.country_code
  );

  let latitude: number | null;
  let longitude: number | null;

  try {
    latitude = normalizeCoordinate(body.latitude, -90, 90);
    longitude = normalizeCoordinate(body.longitude, -180, 180);
  } catch (coordinateError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityCoordinatesInvalid,
      coordinateError instanceof Error
        ? coordinateError.message
        : "Coordonatele nu sunt valide.",
      400
    );
  }

  if (nameRo.length < 2) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityNameRoRequired,
      "Introdu numele orașului în limba română.",
      400
    );
  }

  if (nameEn.length < 2) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityNameEnRequired,
      "Introdu numele orașului în limba engleză.",
      400
    );
  }

  if (!slug) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.citySlugInvalid,
      "Slug-ul orașului nu este valid.",
      400
    );
  }

  if (!countryCode) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityCountryCodeInvalid,
      "Codul țării trebuie să conțină exact două litere.",
      400
    );
  }

  const { data: duplicateSlug, error: duplicateSlugError } = await admin
    .from("cities")
    .select("id")
    .eq("slug", slug)
    .neq("id", cityId)
    .maybeSingle();

  if (duplicateSlugError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.citySlugCheckFailed,
      "Slug-ul nu a putut fi verificat.",
      500
    );
  }

  if (duplicateSlug) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.citySlugDuplicate,
      "Există deja un oraș cu acest slug.",
      409
    );
  }

  const { data: duplicateTranslation, error: duplicateTranslationError } =
    await admin
      .from("city_translations")
      .select(`
        city_id,
        cities!inner (
          country_code
        )
      `)
      .eq("locale", "ro")
      .ilike("name", nameRo)
      .eq("cities.country_code", countryCode)
      .neq("city_id", cityId)
      .maybeSingle();

  if (duplicateTranslationError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityNameCheckFailed,
      "Numele orașului nu a putut fi verificat.",
      500
    );
  }

  if (duplicateTranslation) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityNameDuplicate,
      "Există deja un alt oraș cu acest nume în țara selectată.",
      409
    );
  }

  const { error: cityUpdateError } = await admin
    .from("cities")
    .update({
      slug,
      country_code: countryCode,
      latitude,
      longitude,
      is_active: requestedActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cityId);

  if (cityUpdateError) {
    console.error("City update failed:", cityUpdateError);
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityUpdateFailed,
      "Orașul nu a putut fi actualizat.",
      500
    );
  }

  const { error: translationsError } = await admin
    .from("city_translations")
    .upsert(
      [
        { city_id: cityId, locale: "ro", name: nameRo },
        { city_id: cityId, locale: "en", name: nameEn },
      ],
      { onConflict: "city_id,locale" }
    );

  if (translationsError) {
    console.error("City translations update failed:", translationsError);
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.cityTranslationUpdateFailed,
      "Traducerile orașului nu au putut fi actualizate.",
      500
    );
  }

  return success(
    requestedActive
      ? PLATFORM_OPERATOR_DIRECTORY_CODES.cityUpdated
      : PLATFORM_OPERATOR_DIRECTORY_CODES.cityDeactivated,
    requestedActive
      ? "Orașul a fost actualizat."
      : "Orașul a fost dezactivat."
  );
}
