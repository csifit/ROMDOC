import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GooglePlaceLocation = {
  latitude?: number;
  longitude?: number;
};

type GooglePlaceDetailsResponse = {
  id?: string;
  displayName?: {
    text?: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  websiteUri?: string;
  location?: GooglePlaceLocation;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
    languageCode?: string;
  }>;
  types?: string[];
};

type GooglePlaceDetailsRequestBody = {
  placeId?: unknown;
};

const GOOGLE_PLACES_DETAILS_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "googleMapsUri",
  "websiteUri",
  "location",
  "addressComponents",
  "types",
].join(",");

function getGooglePlacesApiKey() {
  return (
    process.env.GOOGLE_PLACES_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.GOOGLE_MAPS_API_KEY ??
    ""
  ).trim();
}

function normalizePlaceId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const placeId = value.trim();

  if (!placeId) {
    return null;
  }

  return placeId;
}

export async function POST(request: Request) {
  try {
    const apiKey = getGooglePlacesApiKey();

    if (!apiKey) {
      console.error("Google Places details error: missing Google Places API key.");

      return NextResponse.json(
        { error: "Adresa nu a putut fi verificată." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as GooglePlaceDetailsRequestBody;
    const placeId = normalizePlaceId(body.placeId);

    if (!placeId) {
      return NextResponse.json(
        { error: "Selectează o adresă validă." },
        { status: 400 },
      );
    }

    const googleResponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": GOOGLE_PLACES_DETAILS_FIELDS,
          "Accept-Language": "ro",
        },
        cache: "no-store",
      },
    );

    if (!googleResponse.ok) {
      const providerError = await googleResponse.text();

      console.error("Google Places details provider error:", {
        status: googleResponse.status,
        body: providerError,
      });

      return NextResponse.json(
        { error: "Adresa nu a putut fi verificată." },
        { status: 502 },
      );
    }

    const place = (await googleResponse.json()) as GooglePlaceDetailsResponse;

    return NextResponse.json({
      place,
      placeId: place.id ?? placeId,
      name: place.displayName?.text ?? null,
      formattedAddress: place.formattedAddress ?? null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      googleMapsUri: place.googleMapsUri ?? null,
      websiteUri: place.websiteUri ?? null,
      nationalPhoneNumber: place.nationalPhoneNumber ?? null,
      internationalPhoneNumber: place.internationalPhoneNumber ?? null,
      addressComponents: place.addressComponents ?? [],
      types: place.types ?? [],
    });
  } catch (error) {
    console.error("Google Places details error:", error);

    return NextResponse.json(
      { error: "Adresa nu a putut fi verificată." },
      { status: 500 },
    );
  }
}
