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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
) {
  let body: RequestBody;

  try {
    body =
      (await request.json()) as
        RequestBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    typeof body.placeId !==
      "string" ||
    !body.placeId.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Selectează o adresă validă.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const address =
      await getGooglePlaceDetails(
        body.placeId,
      );

    return NextResponse.json({
      address,
    });
  } catch (error) {
    console.error(
      "Google Place Details route failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Locația nu a putut fi verificată.",
      },
      {
        status: 502,
      },
    );
  }
}
