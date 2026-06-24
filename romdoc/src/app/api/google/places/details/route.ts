import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getGooglePlaceDetails,
} from "@/lib/google-maps/get-place-details";
import {
  consumeRateLimit,
  getRequestIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

type RequestBody = {
  placeId?: unknown;
};

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const MAX_PLACE_ID_LENGTH =
  512;

const GOOGLE_PLACES_LIMIT =
  60;

const GOOGLE_PLACES_WINDOW_SECONDS =
  30 * 60;

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control":
          "private, no-store",
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const requestIp =
    getRequestIp(request);

  const rateLimit =
    await consumeRateLimit({
      namespace:
        "google-place-details",
      identifier: requestIp,
      limit:
        GOOGLE_PLACES_LIMIT,
      windowSeconds:
        GOOGLE_PLACES_WINDOW_SECONDS,
    });

  if (!rateLimit.allowed) {
    return rateLimitResponse(
      rateLimit
    );
  }

  try {
    let body: RequestBody;

    try {
      body =
        (await request.json()) as
          RequestBody;
    } catch {
      return jsonError(
        "Cererea nu conține date JSON valide.",
        400
      );
    }

    if (
      typeof body.placeId !==
        "string"
    ) {
      return jsonError(
        "Google Place ID lipsește.",
        400
      );
    }

    const placeId =
      body.placeId.trim();

    if (!placeId) {
      return jsonError(
        "Google Place ID lipsește.",
        400
      );
    }

    if (
      placeId.length >
      MAX_PLACE_ID_LENGTH
    ) {
      return jsonError(
        "Google Place ID este prea lung.",
        400
      );
    }

    const address =
      await getGooglePlaceDetails(
        placeId
      );

    return NextResponse.json(
      {
        address,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
          "X-RateLimit-Remaining":
            String(
              Math.max(
                rateLimit.remaining,
                0
              )
            ),
        },
      }
    );
  } catch (error) {
    console.error(
      "Google Place Details route failed:",
      error
    );

    return jsonError(
      "Adresa nu a putut fi verificată.",
      500
    );
  }
}
