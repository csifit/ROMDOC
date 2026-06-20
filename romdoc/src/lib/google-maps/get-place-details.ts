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

function getComponent(
  components:
    | GoogleAddressComponent[]
    | undefined,
  type: string
) {
  return components?.find(
    (component) =>
      component.types?.includes(type)
  );
}

function getCityName(
  components:
    | GoogleAddressComponent[]
    | undefined
) {
  const preferredTypes = [
    "locality",
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

    if (component?.longText) {
      return component.longText;
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
    )?.longText;

  const streetNumber =
    getComponent(
      components,
      "street_number"
    )?.longText;

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

export async function getGooglePlaceDetails(
  placeId: string
): Promise<GoogleClinicAddress> {
  const apiKey =
    process.env
      .GOOGLE_MAPS_SERVER_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_MAPS_SERVER_KEY is not configured."
    );
  }

  const normalizedPlaceId =
    placeId.trim();

  if (!normalizedPlaceId) {
    throw new Error(
      "Google Place ID is required."
    );
  }

  const endpoint =
    new URL(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(
        normalizedPlaceId
      )}`
    );

  endpoint.searchParams.set(
    "languageCode",
    "ro"
  );

  endpoint.searchParams.set(
    "regionCode",
    "RO"
  );

  const response =
    await fetch(endpoint, {
      method: "GET",

      headers: {
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

  if (!response.ok) {
    const responseText =
      await response.text();

    console.error(
      "Google Place Details failed:",
      response.status,
      responseText
    );

    throw new Error(
      "Google could not verify the selected address."
    );
  }

  const place =
    (await response.json()) as
      GooglePlaceResponse;

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

  if (countryCode !== "RO") {
    throw new Error(
      "The selected address must be located in Romania."
    );
  }

  const cityName =
    getCityName(components);

  if (!cityName) {
    throw new Error(
      "The city could not be identified from the selected address."
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
      "The selected address does not contain valid coordinates."
    );
  }

  const formattedAddress =
    place.formattedAddress?.trim();

  if (!formattedAddress) {
    throw new Error(
      "The selected address is incomplete."
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
      place.displayName?.text?.trim() ??
      null,

    formattedAddress,

    addressLine1:
      buildAddressLine1(
        components
      ) || formattedAddress,

    cityName:
      cityName.trim(),

    countyName:
      county?.longText?.trim() ??
      null,

    postalCode,

    countryCode,

    latitude,

    longitude,

    googleMapsUri:
      place.googleMapsUri?.trim() ??
      null,
  };
}