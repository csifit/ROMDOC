import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import type {
  GoogleClinicAddress,
} from "@/lib/locations/google-address";

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type GooglePlaceResponse = {
  id?: string;

  displayName?: {
    text?: string;
    languageCode?: string;
  };

  formattedAddress?: string;

  addressComponents?:
    GoogleAddressComponent[];

  location?: {
    latitude?: number;
    longitude?: number;
  };

  googleMapsUri?: string;
};

type GoogleApiErrorResponse = {
  error?: {
    code?: number;
    message?: string;
    status?: string;

    details?: Array<{
      "@type"?: string;
      reason?: string;
      domain?: string;

      metadata?: Record<
        string,
        string
      >;
    }>;
  };
};

function getComponent(
  components:
    | GoogleAddressComponent[]
    | undefined,
  type: string
) {
  return components?.find(
    (component) =>
      component.types?.includes(
        type
      )
  );
}

function getCityName(
  components:
    | GoogleAddressComponent[]
    | undefined
) {
  const preferredTypes = [
    "locality",
    "postal_town",
    "administrative_area_level_2",
    "sublocality_level_1",
    "administrative_area_level_1",
  ];

  for (
    const type of preferredTypes
  ) {
    const component =
      getComponent(
        components,
        type
      );

    const value =
      component?.longText?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function buildAddressLine1(
  components:
    | GoogleAddressComponent[]
    | undefined
) {
  const route =
    getComponent(
      components,
      "route"
    )?.longText?.trim();

  const streetNumber =
    getComponent(
      components,
      "street_number"
    )?.longText?.trim();

  if (
    route &&
    streetNumber
  ) {
    return `${route} ${streetNumber}`;
  }

  return (
    route ??
    streetNumber ??
    ""
  );
}

function getGoogleErrorMessage(
  errorResponse:
    | GoogleApiErrorResponse
    | null,
  responseStatus: number
) {
  const googleMessage =
    errorResponse?.error?.message
      ?.trim();

  if (googleMessage) {
    return googleMessage;
  }

  switch (responseStatus) {
    case 400:
      return "Google a respins cererea deoarece datele trimise nu sunt valide.";

    case 401:
      return "Cheia Google Maps nu a fost acceptată.";

    case 403:
      return "Cheia Google Maps nu are permisiunea de a utiliza Places API (New).";

    case 404:
      return "Adresa selectată nu mai este disponibilă în Google Places.";

    case 429:
      return "Limita de solicitări Google Places a fost depășită.";

    default:
      return "Google nu a putut verifica adresa selectată.";
  }
}

async function parseGoogleError(
  response: Response
): Promise<{
  parsed:
    | GoogleApiErrorResponse
    | null;
  rawText: string;
}> {
  const rawText =
    await response.text();

  if (!rawText) {
    return {
      parsed: null,
      rawText: "",
    };
  }

  try {
    return {
      parsed:
        JSON.parse(
          rawText
        ) as GoogleApiErrorResponse,
      rawText,
    };
  } catch {
    return {
      parsed: null,
      rawText,
    };
  }
}

export async function getGooglePlaceDetails(
  placeId: string,
  locale: AppLocale = "ro"
): Promise<GoogleClinicAddress> {
  const apiKey =
    process.env
      .GOOGLE_MAPS_SERVER_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "GOOGLE_MAPS_SERVER_KEY nu este configurată în mediul serverului."
    );
  }

  const normalizedPlaceId =
    placeId.trim();

  if (!normalizedPlaceId) {
    throw new Error(
      "Google Place ID este obligatoriu."
    );
  }

  const endpoint =
    new URL(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(
        normalizedPlaceId
      )}`
    );

  /*
   * Format the returned address in the active RomDoc language.
   * Do not set regionCode: the selected country must come from
   * the Google Place itself, not from a Romania preference.
   */
  endpoint.searchParams.set(
    "languageCode",
    locale
  );

  let response: Response;

  try {
    response =
      await fetch(endpoint, {
        method: "GET",

        headers: {
          Accept:
            "application/json",

          "X-Goog-Api-Key":
            apiKey,

          "X-Goog-FieldMask": [
            "id",
            "displayName",
            "formattedAddress",
            "addressComponents",
            "location",
            "googleMapsUri",
          ].join(","),
        },

        cache: "no-store",
      });
  } catch (networkError) {
    console.error(
      "Google Place Details network request failed:",
      networkError
    );

    throw new Error(
      "Serverul RomDoc nu s-a putut conecta la Google Places."
    );
  }

  if (!response.ok) {
    const {
      parsed,
      rawText,
    } =
      await parseGoogleError(
        response
      );

    const googleMessage =
      getGoogleErrorMessage(
        parsed,
        response.status
      );

    console.error(
      "Google Place Details failed:",
      {
        httpStatus:
          response.status,

        httpStatusText:
          response.statusText,

        googleStatus:
          parsed?.error?.status ??
          null,

        googleCode:
          parsed?.error?.code ??
          null,

        googleMessage:
          parsed?.error?.message ??
          null,

        googleDetails:
          parsed?.error?.details ??
          null,

        rawResponse:
          rawText,
      }
    );

    if (
      process.env.NODE_ENV ===
      "development"
    ) {
      throw new Error(
        `Google Places (${response.status}): ${googleMessage}`
      );
    }

    throw new Error(
      "Google nu a putut verifica adresa selectată."
    );
  }

  let place:
    GooglePlaceResponse;

  try {
    place =
      (await response.json()) as
        GooglePlaceResponse;
  } catch (parseError) {
    console.error(
      "Google Place Details returned invalid JSON:",
      parseError
    );

    throw new Error(
      "Google Places a returnat un răspuns invalid."
    );
  }

  const components =
    place.addressComponents;

  const country =
    getComponent(
      components,
      "country"
    );

  const countryCode =
    country?.shortText
      ?.trim()
      .toUpperCase();

  if (
    !countryCode ||
    !/^[A-Z]{2}$/.test(
      countryCode
    )
  ) {
    throw new Error(
      "Adresa selectată nu conține un cod de țară valid."
    );
  }

  const cityName =
    getCityName(components);

  if (!cityName) {
    console.error(
      "Google address has no recognizable city:",
      {
        placeId:
          normalizedPlaceId,

        formattedAddress:
          place.formattedAddress,

        addressComponents:
          components,
      }
    );

    throw new Error(
      "Orașul nu a putut fi identificat din adresa selectată."
    );
  }

  const latitude =
    place.location?.latitude;

  const longitude =
    place.location?.longitude;

  if (
    typeof latitude !==
      "number" ||
    typeof longitude !==
      "number"
  ) {
    throw new Error(
      "Adresa selectată nu conține coordonate valide."
    );
  }

  const formattedAddress =
    place.formattedAddress?.trim();

  if (!formattedAddress) {
    throw new Error(
      "Adresa selectată este incompletă."
    );
  }

  const county =
    getComponent(
      components,
      "administrative_area_level_1"
    ) ??
    getComponent(
      components,
      "administrative_area_level_2"
    );

  const postalCode =
    getComponent(
      components,
      "postal_code"
    )?.longText?.trim() ??
    null;

  return {
    placeId:
      place.id ??
      normalizedPlaceId,

    displayName:
      place.displayName
        ?.text
        ?.trim() ??
      null,

    formattedAddress,

    addressLine1:
      buildAddressLine1(
        components
      ) ||
      formattedAddress,

    cityName:
      cityName.trim(),

    countyName:
      county?.longText
        ?.trim() ??
      null,

    postalCode,

    countryCode,

    latitude,

    longitude,

    googleMapsUri:
      place.googleMapsUri
        ?.trim() ??
      null,
  };
}
