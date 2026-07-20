import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  createLocationSlug,
} from "@/lib/locations/create-location-slug";

type MatchOrCreateCityInput = {
  cityName: string;
  latitude?: number | null;
  longitude?: number | null;
  countryCode?: string;
};

type CityRecord = {
  id: string;
  slug: string;
};

type CityLookupRecord =
  CityRecord & {
    country_code:
      | string
      | null;

    latitude:
      | number
      | string
      | null;

    longitude:
      | number
      | string
      | null;
  };

type CityTranslationMatch = {
  city_id: string;
  name: string;

  cities:
    | CityLookupRecord
    | CityLookupRecord[]
    | null;
};

const SAME_CITY_DISTANCE_KM =
  100;

const MAX_SLUG_ATTEMPTS =
  100;

function normalizeCountryCode(
  value?: string
) {
  const countryCode =
    (
      value ??
      "RO"
    )
      .trim()
      .toUpperCase();

  if (
    !/^[A-Z]{2}$/.test(
      countryCode
    )
  ) {
    throw new Error(
      "A valid two-letter country code is required."
    );
  }

  return countryCode;
}

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toFiniteNumber(
  value:
    | number
    | string
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function degreesToRadians(
  value: number
) {
  return (
    value *
    (Math.PI / 180)
  );
}

function distanceKilometres(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number
) {
  const earthRadiusKm =
    6371;

  const latitudeDifference =
    degreesToRadians(
      secondLatitude -
        firstLatitude
    );

  const longitudeDifference =
    degreesToRadians(
      secondLongitude -
        firstLongitude
    );

  const firstLatitudeRadians =
    degreesToRadians(
      firstLatitude
    );

  const secondLatitudeRadians =
    degreesToRadians(
      secondLatitude
    );

  const a =
    Math.sin(
      latitudeDifference / 2
    ) ** 2 +
    Math.cos(
      firstLatitudeRadians
    ) *
      Math.cos(
        secondLatitudeRadians
      ) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

function coordinatesMatch(
  city:
    CityLookupRecord,
  input:
    MatchOrCreateCityInput
) {
  const inputLatitude =
    toFiniteNumber(
      input.latitude
    );

  const inputLongitude =
    toFiniteNumber(
      input.longitude
    );

  const cityLatitude =
    toFiniteNumber(
      city.latitude
    );

  const cityLongitude =
    toFiniteNumber(
      city.longitude
    );

  if (
    inputLatitude === null ||
    inputLongitude === null ||
    cityLatitude === null ||
    cityLongitude === null
  ) {
    return true;
  }

  return (
    distanceKilometres(
      inputLatitude,
      inputLongitude,
      cityLatitude,
      cityLongitude
    ) <=
    SAME_CITY_DISTANCE_KM
  );
}

function isMatchingCity(
  city:
    CityLookupRecord,
  countryCode: string,
  input:
    MatchOrCreateCityInput
) {
  return (
    city.country_code
      ?.trim()
      .toUpperCase() ===
      countryCode &&
    coordinatesMatch(
      city,
      input
    )
  );
}

function buildPreferredSlug(
  baseSlug: string,
  countryCode: string
) {
  if (
    countryCode === "RO"
  ) {
    return baseSlug;
  }

  return `${baseSlug}-${countryCode.toLowerCase()}`;
}

async function findCityBySlug(
  admin: SupabaseClient,
  slug: string
): Promise<
  CityLookupRecord | null
> {
  const {
    data,
    error,
  } = await admin
    .from("cities")
    .select(`
      id,
      slug,
      country_code,
      latitude,
      longitude
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(
      `City lookup failed: ${error.message}`
    );
  }

  return (
    data as
      | CityLookupRecord
      | null
  );
}

async function findCityByTranslation(
  admin: SupabaseClient,
  cityName: string,
  countryCode: string,
  input:
    MatchOrCreateCityInput
): Promise<CityRecord | null> {
  const {
    data,
    error,
  } = await admin
    .from("city_translations")
    .select(`
      city_id,
      name,
      cities!inner (
        id,
        slug,
        country_code,
        latitude,
        longitude
      )
    `)
    .ilike(
      "name",
      cityName
    )
    .limit(50);

  if (error) {
    console.error(
      "City translation lookup failed:",
      error
    );

    return null;
  }

  const matches =
    (data as unknown as
      | CityTranslationMatch[]
      | null) ??
    [];

  for (
    const translation of matches
  ) {
    const city =
      getSingleRelation(
        translation.cities
      );

    if (
      city &&
      isMatchingCity(
        city,
        countryCode,
        input
      )
    ) {
      return {
        id: city.id,
        slug: city.slug,
      };
    }
  }

  return null;
}

async function createTranslations(
  admin: SupabaseClient,
  cityId: string,
  cityName: string
) {
  const translations = [
    "ro",
    "en",
    "de",
  ].map((locale) => ({
    city_id: cityId,
    locale,
    name: cityName,
  }));

  const {
    error,
  } = await admin
    .from("city_translations")
    .upsert(
      translations,
      {
        onConflict:
          "city_id,locale",
      }
    );

  if (error) {
    throw new Error(
      `City translations creation failed: ${error.message}`
    );
  }
}

export async function matchOrCreateCity(
  admin: SupabaseClient,
  input: MatchOrCreateCityInput
): Promise<CityRecord> {
  const cityName =
    input.cityName.trim();

  if (!cityName) {
    throw new Error(
      "City name is required."
    );
  }

  const countryCode =
    normalizeCountryCode(
      input.countryCode
    );

  const baseSlug =
    createLocationSlug(
      cityName
    );

  if (!baseSlug) {
    throw new Error(
      "A valid city slug could not be generated."
    );
  }

  /*
   * First match by translated city name and country.
   * The coordinate guard prevents distant same-name cities in
   * the same country from being merged accidentally.
   */
  const translationMatch =
    await findCityByTranslation(
      admin,
      cityName,
      countryCode,
      input
    );

  if (translationMatch) {
    return translationMatch;
  }

  const preferredSlug =
    buildPreferredSlug(
      baseSlug,
      countryCode
    );

  /*
   * Preserve compatibility with any non-Romanian cities that may
   * already exist under the old, unsuffixed slug.
   */
  const initialSlugs =
    countryCode === "RO"
      ? [preferredSlug]
      : [
          preferredSlug,
          baseSlug,
        ];

  for (
    const slug of initialSlugs
  ) {
    const existing =
      await findCityBySlug(
        admin,
        slug
      );

    if (
      existing &&
      isMatchingCity(
        existing,
        countryCode,
        input
      )
    ) {
      return {
        id: existing.id,
        slug: existing.slug,
      };
    }
  }

  for (
    let attempt = 1;
    attempt <=
      MAX_SLUG_ATTEMPTS;
    attempt += 1
  ) {
    const candidateSlug =
      attempt === 1
        ? preferredSlug
        : `${preferredSlug}-${attempt}`;

    const existing =
      await findCityBySlug(
        admin,
        candidateSlug
      );

    if (existing) {
      if (
        isMatchingCity(
          existing,
          countryCode,
          input
        )
      ) {
        return {
          id: existing.id,
          slug: existing.slug,
        };
      }

      continue;
    }

    const {
      data: insertedCity,
      error: insertError,
    } = await admin
      .from("cities")
      .insert({
        slug:
          candidateSlug,

        country_code:
          countryCode,

        latitude:
          input.latitude ??
          null,

        longitude:
          input.longitude ??
          null,
      })
      .select(`
        id,
        slug
      `)
      .single();

    if (
      !insertError &&
      insertedCity
    ) {
      const city =
        insertedCity as
          CityRecord;

      await createTranslations(
        admin,
        city.id,
        cityName
      );

      return city;
    }

    if (
      insertError?.code ===
      "23505"
    ) {
      const concurrentCity =
        await findCityBySlug(
          admin,
          candidateSlug
        );

      if (
        concurrentCity &&
        isMatchingCity(
          concurrentCity,
          countryCode,
          input
        )
      ) {
        return {
          id:
            concurrentCity.id,

          slug:
            concurrentCity.slug,
        };
      }

      continue;
    }

    throw new Error(
      `City creation failed: ${
        insertError?.message ??
        "No city returned"
      }`
    );
  }

  throw new Error(
    "A unique city slug could not be generated."
  );
}
