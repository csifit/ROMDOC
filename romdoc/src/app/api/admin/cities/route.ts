import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createLocationSlug,
} from "@/lib/locations/create-location-slug";

export const runtime = "nodejs";

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

function normalizeString(
  value: unknown,
  maximumLength = 500
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function normalizeCountryCode(
  value: unknown
): string {
  const countryCode =
    normalizeString(
      value,
      2
    ).toUpperCase();

  if (
    !/^[A-Z]{2}$/.test(
      countryCode
    )
  ) {
    return "";
  }

  return countryCode;
}

function normalizeCoordinate(
  value: unknown,
  minimum: number,
  maximum: number
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(
      parsedValue
    ) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new Error(
      `Coordonata trebuie să fie între ${minimum} și ${maximum}.`
    );
  }

  return Number(
    parsedValue.toFixed(7)
  );
}

export async function GET(): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const {
    data: cities,
    error,
  } = await admin
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
    .order(
      "slug",
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      "Admin cities query failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Orașele nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const result =
    (cities ?? []).map(
      (city) => ({
        ...city,

        clinic_count:
          city.clinics
            ?.length ?? 0,
      })
    );

  return NextResponse.json({
    cities: result,
    operatorRole:
      authorization.role,
    capabilities: {
      canCreateCities:
        authorization.role ===
        "admin",
      canUpdateCities:
        true,
      canDeleteCities:
        false,
    },
  });
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnlyResponse =
    requireAdministratorCapability(
      authorization.role,
      "Doar administratorii pot adăuga orașe."
    );

  if (adminOnlyResponse) {
    return adminOnlyResponse;
  }

  let body: CityRequestBody;

  try {
    body =
      (await request.json()) as
        CityRequestBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      }
    );
  }

  const nameRo =
    normalizeString(
      body.nameRo,
      200
    );

  const nameEn =
    normalizeString(
      body.nameEn,
      200
    );

  const providedSlug =
    normalizeString(
      body.slug,
      200
    );

  const slug =
    createLocationSlug(
      providedSlug ||
        nameRo
    );

  const countryCode =
    normalizeCountryCode(
      body.countryCode
    );

  let latitude:
    | number
    | null;

  let longitude:
    | number
    | null;

  try {
    latitude =
      normalizeCoordinate(
        body.latitude,
        -90,
        90
      );

    longitude =
      normalizeCoordinate(
        body.longitude,
        -180,
        180
      );
  } catch (coordinateError) {
    return NextResponse.json(
      {
        error:
          coordinateError instanceof
            Error
            ? coordinateError.message
            : "Coordonatele nu sunt valide.",
      },
      {
        status: 400,
      }
    );
  }

  if (nameRo.length < 2) {
    return NextResponse.json(
      {
        error:
          "Introdu numele orașului în limba română.",
      },
      {
        status: 400,
      }
    );
  }

  if (nameEn.length < 2) {
    return NextResponse.json(
      {
        error:
          "Introdu numele orașului în limba engleză.",
      },
      {
        status: 400,
      }
    );
  }

  if (!slug) {
    return NextResponse.json(
      {
        error:
          "Nu a putut fi generat un slug valid.",
      },
      {
        status: 400,
      }
    );
  }

  if (!countryCode) {
    return NextResponse.json(
      {
        error:
          "Codul țării trebuie să conțină exact două litere.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: existingSlug,
    error: existingSlugError,
  } = await admin
    .from("cities")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlugError) {
    return NextResponse.json(
      {
        error:
          "Slug-ul nu a putut fi verificat.",
      },
      {
        status: 500,
      }
    );
  }

  if (existingSlug) {
    return NextResponse.json(
      {
        error:
          "Există deja un oraș cu acest slug.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: duplicateTranslation,
    error:
      duplicateTranslationError,
  } = await admin
    .from("city_translations")
    .select(`
      city_id,
      cities!inner (
        country_code
      )
    `)
    .eq("locale", "ro")
    .ilike("name", nameRo)
    .eq(
      "cities.country_code",
      countryCode
    )
    .maybeSingle();

  if (duplicateTranslationError) {
    return NextResponse.json(
      {
        error:
          "Numele orașului nu a putut fi verificat.",
      },
      {
        status: 500,
      }
    );
  }

  if (duplicateTranslation) {
    return NextResponse.json(
      {
        error:
          "Există deja un oraș cu acest nume în țara selectată.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: city,
    error: cityError,
  } = await admin
    .from("cities")
    .insert({
      slug,
      country_code:
        countryCode,
      latitude,
      longitude,
      is_active: true,
    })
    .select(`
      id,
      slug,
      country_code,
      latitude,
      longitude,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (
    cityError ||
    !city
  ) {
    console.error(
      "City creation failed:",
      cityError
    );

    return NextResponse.json(
      {
        error:
          cityError?.code ===
          "23505"
            ? "Există deja un oraș cu acest slug."
            : "Orașul nu a putut fi creat.",
      },
      {
        status:
          cityError?.code ===
          "23505"
            ? 409
            : 500,
      }
    );
  }

  const translations = [
    {
      city_id:
        city.id,

      locale: "ro",
      name: nameRo,
    },
    {
      city_id:
        city.id,

      locale: "en",
      name: nameEn,
    },
  ];

  const {
    error: translationsError,
  } = await admin
    .from("city_translations")
    .insert(translations);

  if (translationsError) {
    console.error(
      "City translations creation failed:",
      translationsError
    );

    await admin
      .from("cities")
      .delete()
      .eq("id", city.id);

    return NextResponse.json(
      {
        error:
          "Traducerile orașului nu au putut fi salvate.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      message:
        "Orașul a fost adăugat.",

      city,
    },
    {
      status: 201,
    }
  );
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  let body: CityRequestBody;

  try {
    body =
      (await request.json()) as
        CityRequestBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      }
    );
  }

  const cityId =
    normalizeString(
      body.cityId,
      100
    );

  if (!cityId) {
    return NextResponse.json(
      {
        error:
          "Orașul lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: existingCity,
    error: existingCityError,
  } = await admin
    .from("cities")
    .select(`
      id,
      slug,
      country_code,
      latitude,
      longitude,
      is_active
    `)
    .eq("id", cityId)
    .maybeSingle();

  if (
    existingCityError ||
    !existingCity
  ) {
    return NextResponse.json(
      {
        error:
          "Orașul nu a fost găsit.",
      },
      {
        status: 404,
      }
    );
  }

  const requestedActive =
    typeof body.isActive ===
      "boolean"
      ? body.isActive
      : existingCity.is_active;

  if (
    requestedActive === false &&
    existingCity.is_active ===
      true
  ) {
    const {
      count: clinicCount,
      error: clinicCountError,
    } = await admin
      .from("clinics")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "city_id",
        cityId
      );

    if (clinicCountError) {
      return NextResponse.json(
        {
          error:
            "Utilizarea orașului nu a putut fi verificată.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      (clinicCount ?? 0) >
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Orașul este asociat unor clinici și nu poate fi dezactivat.",
        },
        {
          status: 409,
        }
      );
    }
  }

  const nameRo =
    normalizeString(
      body.nameRo,
      200
    );

  const nameEn =
    normalizeString(
      body.nameEn,
      200
    );

  const requestedSlug =
    normalizeString(
      body.slug,
      200
    );

  const slug =
    requestedSlug
      ? createLocationSlug(
          requestedSlug
        )
      : existingCity.slug;

  const countryCode =
    normalizeCountryCode(
      body.countryCode ??
        existingCity.country_code
    );

  let latitude:
    | number
    | null;

  let longitude:
    | number
    | null;

  try {
    latitude =
      normalizeCoordinate(
        body.latitude,
        -90,
        90
      );

    longitude =
      normalizeCoordinate(
        body.longitude,
        -180,
        180
      );
  } catch (coordinateError) {
    return NextResponse.json(
      {
        error:
          coordinateError instanceof
            Error
            ? coordinateError.message
            : "Coordonatele nu sunt valide.",
      },
      {
        status: 400,
      }
    );
  }

  if (nameRo.length < 2) {
    return NextResponse.json(
      {
        error:
          "Introdu numele orașului în limba română.",
      },
      {
        status: 400,
      }
    );
  }

  if (nameEn.length < 2) {
    return NextResponse.json(
      {
        error:
          "Introdu numele orașului în limba engleză.",
      },
      {
        status: 400,
      }
    );
  }

  if (!slug) {
    return NextResponse.json(
      {
        error:
          "Slug-ul orașului nu este valid.",
      },
      {
        status: 400,
      }
    );
  }

  if (!countryCode) {
    return NextResponse.json(
      {
        error:
          "Codul țării trebuie să conțină exact două litere.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: duplicateSlug,
    error: duplicateSlugError,
  } = await admin
    .from("cities")
    .select("id")
    .eq("slug", slug)
    .neq("id", cityId)
    .maybeSingle();

  if (duplicateSlugError) {
    return NextResponse.json(
      {
        error:
          "Slug-ul nu a putut fi verificat.",
      },
      {
        status: 500,
      }
    );
  }

  if (duplicateSlug) {
    return NextResponse.json(
      {
        error:
          "Există deja un oraș cu acest slug.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: duplicateTranslation,
    error:
      duplicateTranslationError,
  } = await admin
    .from("city_translations")
    .select(`
      city_id,
      cities!inner (
        country_code
      )
    `)
    .eq("locale", "ro")
    .ilike("name", nameRo)
    .eq(
      "cities.country_code",
      countryCode
    )
    .neq(
      "city_id",
      cityId
    )
    .maybeSingle();

  if (duplicateTranslationError) {
    return NextResponse.json(
      {
        error:
          "Numele orașului nu a putut fi verificat.",
      },
      {
        status: 500,
      }
    );
  }

  if (duplicateTranslation) {
    return NextResponse.json(
      {
        error:
          "Există deja un alt oraș cu acest nume în țara selectată.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    error: cityUpdateError,
  } = await admin
    .from("cities")
    .update({
      slug,
      country_code:
        countryCode,
      latitude,
      longitude,
      is_active:
        requestedActive,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", cityId);

  if (cityUpdateError) {
    console.error(
      "City update failed:",
      cityUpdateError
    );

    return NextResponse.json(
      {
        error:
          "Orașul nu a putut fi actualizat.",
      },
      {
        status: 500,
      }
    );
  }

  const translations = [
    {
      city_id:
        cityId,

      locale: "ro",
      name: nameRo,
    },
    {
      city_id:
        cityId,

      locale: "en",
      name: nameEn,
    },
  ];

  const {
    error: translationsError,
  } = await admin
    .from("city_translations")
    .upsert(
      translations,
      {
        onConflict:
          "city_id,locale",
      }
    );

  if (translationsError) {
    console.error(
      "City translations update failed:",
      translationsError
    );

    return NextResponse.json(
      {
        error:
          "Traducerile orașului nu au putut fi actualizate.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message:
      requestedActive
        ? "Orașul a fost actualizat."
        : "Orașul a fost dezactivat.",
  });
}