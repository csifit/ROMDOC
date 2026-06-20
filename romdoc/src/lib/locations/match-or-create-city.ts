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

  const baseSlug =
    createLocationSlug(cityName);

  if (!baseSlug) {
    throw new Error(
      "A valid city slug could not be generated."
    );
  }

  const {
    data: existingBySlug,
    error: slugLookupError,
  } = await admin
    .from("cities")
    .select("id, slug")
    .eq("slug", baseSlug)
    .maybeSingle();

  if (slugLookupError) {
    throw new Error(
      `City lookup failed: ${slugLookupError.message}`
    );
  }

  if (existingBySlug) {
    return existingBySlug;
  }

  const {
    data: translationMatches,
    error:
      translationLookupError,
  } = await admin
    .from("city_translations")
    .select(`
      city_id,
      name,
      cities!inner (
        id,
        slug,
        country_code
      )
    `)
    .eq("locale", "ro")
    .ilike("name", cityName)
    .limit(10);

  if (translationLookupError) {
    console.error(
      "City translation lookup failed:",
      translationLookupError
    );
  }

  for (
    const translation of
      translationMatches ?? []
  ) {
    const relatedCity =
      Array.isArray(
        translation.cities
      )
        ? translation.cities[0]
        : translation.cities;

    if (
      relatedCity &&
      relatedCity.country_code ===
        countryCode
    ) {
      return {
        id: relatedCity.id,
        slug: relatedCity.slug,
      };
    }
  }

  const {
    data: insertedCity,
    error: cityInsertError,
  } = await admin
    .from("cities")
    .insert({
      slug: baseSlug,
      country_code: countryCode,

      latitude:
        input.latitude ??
        null,

      longitude:
        input.longitude ??
        null,
    })
    .select("id, slug")
    .single();

  if (
    cityInsertError ||
    !insertedCity
  ) {
    /*
     * Another request may have created the city between
     * our lookup and insert. Try one final lookup.
     */
    if (
      cityInsertError?.code ===
      "23505"
    ) {
      const {
        data: concurrentCity,
        error:
          concurrentLookupError,
      } = await admin
        .from("cities")
        .select("id, slug")
        .eq("slug", baseSlug)
        .single();

      if (
        concurrentLookupError ||
        !concurrentCity
      ) {
        throw new Error(
          `Concurrent city lookup failed: ${
            concurrentLookupError
              ?.message ??
            "No city returned"
          }`
        );
      }

      return concurrentCity;
    }

    throw new Error(
      `City creation failed: ${
        cityInsertError?.message ??
        "No city returned"
      }`
    );
  }

  const translations = [
    {
      city_id:
        insertedCity.id,

      locale: "ro",
      name: cityName,
    },
    {
      city_id:
        insertedCity.id,

      locale: "en",
      name: cityName,
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
    throw new Error(
      `City translations creation failed: ${translationsError.message}`
    );
  }

  return insertedCity;
}