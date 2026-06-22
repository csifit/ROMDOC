import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  getGooglePlaceDetails,
} from "@/lib/google-maps/get-place-details";

type RequestBody = {
  placeId?: unknown;
};

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const MAX_PLACE_ID_LENGTH =
  512;

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
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
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
        },
      }
    );
  } catch (error) {
    console.error(
      "Google Place Details route failed:",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Adresa nu a putut fi verificată.",
      500
    );
  }
}
