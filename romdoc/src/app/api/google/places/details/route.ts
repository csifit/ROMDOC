import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  getGooglePlaceDetails,
} from "@/lib/google-maps/get-place-details";
import {
  createClient,
} from "@/lib/supabase/server";

type RequestBody = {
  placeId?: unknown;
};

export const runtime =
  "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Trebuie să fii autentificat.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return NextResponse.json(
        {
          error:
            "Profilul utilizatorului nu a putut fi verificat.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      ![
        "doctor",
        "admin",
      ].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          error:
            "Nu ai permisiunea să verifici adrese de clinică.",
        },
        {
          status: 403,
        }
      );
    }

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
        }
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
            "Google Place ID lipsește.",
        },
        {
          status: 400,
        }
      );
    }

    const address =
      await getGooglePlaceDetails(
        body.placeId
      );

    return NextResponse.json({
      address,
    });
  } catch (error) {
    console.error(
      "Google Place Details route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Adresa nu a putut fi verificată.",
      },
      {
        status: 500,
      }
    );
  }
}