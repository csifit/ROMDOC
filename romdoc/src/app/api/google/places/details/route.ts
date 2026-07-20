import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getGooglePlaceDetails,
} from "@/lib/google-maps/get-place-details";
import {
  getRequestAppLocale,
} from "@/lib/i18n/request-app-locale";

type RequestBody = {
  placeId?: unknown;
  locale?: unknown;
};

const copy = {
  ro: {
    invalidJson:
      "Cererea nu conține date JSON valide.",

    invalidPlace:
      "Selectează o adresă validă.",

    verificationFailed:
      "Locația nu a putut fi verificată.",
  },

  en: {
    invalidJson:
      "The request does not contain valid JSON data.",

    invalidPlace:
      "Select a valid address.",

    verificationFailed:
      "The location could not be verified.",
  },

  de: {
    invalidJson:
      "Die Anfrage enthält keine gültigen JSON-Daten.",

    invalidPlace:
      "Wählen Sie eine gültige Adresse aus.",

    verificationFailed:
      "Der Standort konnte nicht überprüft werden.",
  },
} as const;

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function POST(
  request: NextRequest
) {
  let locale =
    getRequestAppLocale(
      request
    );

  let body:
    RequestBody;

  try {
    body =
      (await request.json()) as
        RequestBody;
  } catch {
    return NextResponse.json(
      {
        error:
          copy[locale]
            .invalidJson,
      },
      {
        status: 400,
      }
    );
  }

  locale =
    getRequestAppLocale(
      request,
      body.locale
    );

  if (
    typeof body.placeId !==
      "string" ||
    !body.placeId.trim()
  ) {
    return NextResponse.json(
      {
        error:
          copy[locale]
            .invalidPlace,
      },
      {
        status: 400,
      }
    );
  }

  try {
    const address =
      await getGooglePlaceDetails(
        body.placeId,
        locale
      );

    return NextResponse.json({
      address,
    });
  } catch (
    error
  ) {
    console.error(
      "Google Place Details route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          copy[locale]
            .verificationFailed,
      },
      {
        status: 502,
      }
    );
  }
}
