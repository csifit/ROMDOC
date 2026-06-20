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
    (
      input.countryCode ??
      "RO"
    )
      .trim()
      .toUpperCase();

  const slug =
    createLocationSlug(cityName);

  if (!slug) {
    throw new Error(
      "A valid city slug could not be generated."
    );
  }

  const {
    data: existingCity,
    error: cityLookupError,
  } = await admin
    .from("cities")
    .select("id, slug")
    .eq("slug", slug)
    .eq(
      "country_code",
      countryCode
    )
    .maybeSingle();

  if (cityLookupError) {
    throw new Error(
      `City lookup failed: ${cityLookupError.message}`
    );
  }

  if (existingCity) {
    return existingCity;
  }

  const {
    data: translatedCity,
    error:
      translationLookupError,
  } = await admin
    .from("city_translations")
    .select(`
      city_id,
      cities!inner (
        id,
        slug,
        country_code
      )
    `)
    .eq("locale", "ro")
    .ilike("name", cityName)
    .maybeSingle();

  if (
    translationLookupError
  ) {
    console.error(
      "City translation lookup failed:",
      translationLookupError
    );
  }

  if (
    translatedCity &&
    Array.isArray(
      translatedCity.cities
    )
  ) {
    const translatedRecord =
      translatedCity.cities[0];

    if (
      translatedRecord &&
      translatedRecord
        .country_code ===
        countryCode
    ) {
      return {
        id:
          translatedRecord.id,

        slug:
          translatedRecord.slug,
      };
    }
  }

  const {
    data: insertedCity,
    error: cityInsertError,
  } = await admin
    .from("cities")
    .upsert(
      {
        slug,
        country_code:
          countryCode,

        latitude:
          input.latitude ??
          null,

        longitude:
          input.longitude ??
          null,
      },
      {
        onConflict:
          "slug",
      }
    )
    .select("id, slug")
    .single();

  if (
    cityInsertError ||
    !insertedCity
  ) {
    throw new Error(
      `City creation failed: ${
        cityInsertError?.message ??
        "No city returned"
      }`
    );
  }

  const {
    error:
      romanianTranslationError,
  } = await admin
    .from("city_translations")
    .upsert(
      {
        city_id:
          insertedCity.id,

        locale:
          "ro",

        name:
          cityName,
      },
      {
        onConflict:
          "city_id,locale",
      }
    );

  if (
    romanianTranslationError
  ) {
    throw new Error(
      `Romanian city translation creation failed: ${romanianTranslationError.message}`
    );
  }

  const {
    error:
      englishTranslationError,
  } = await admin
    .from("city_translations")
    .upsert(
      {
        city_id:
          insertedCity.id,

        locale:
          "en",

        name:
          cityName,
      },
      {
        onConflict:
          "city_id,locale",
      }
    );

  if (
    englishTranslationError
  ) {
    throw new Error(
      `English city translation creation failed: ${englishTranslationError.message}`
    );
  }

  return insertedCity;
}