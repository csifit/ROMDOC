import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type PatientAuthorizationResult =
  | {
      profileId: string;
      firstName: string | null;
      lastName: string | null;
      response: null;
    }
  | {
      profileId: null;
      firstName: null;
      lastName: null;
      response: NextResponse;
    };

type CreateReviewBody = {
  appointmentId?: unknown;
  rating?: unknown;
  reviewText?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

async function requirePatient(): Promise<PatientAuthorizationResult> {
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
    return {
      profileId: null,
      firstName: null,
      lastName: null,

      response:
        NextResponse.json(
          {
            error:
              "Trebuie să fii autentificat.",
          },
          {
            status: 401,
          }
        ),
    };
  }

  if (!user.email_confirmed_at) {
    return {
      profileId: null,
      firstName: null,
      lastName: null,

      response:
        NextResponse.json(
          {
            error:
              "Adresa de e-mail trebuie verificată înainte de a publica o recenzie.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "patient"
  ) {
    return {
      profileId: null,
      firstName: null,
      lastName: null,

      response:
        NextResponse.json(
          {
            error:
              "Numai pacienții pot publica recenzii.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    profileId: user.id,
    firstName:
      profile.first_name,
    lastName:
      profile.last_name,
    response: null,
  };
}

export async function GET(): Promise<Response> {
  const authorization =
    await requirePatient();

  if (authorization.response) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const {
    data: appointments,
    error: appointmentsError,
  } = await admin
    .from("appointments")
    .select(`
      id,
      doctor_id,
      clinic_id,
      scheduled_date,
      status,
      doctors (
        id,
        slug,
        doctor_translations (
          locale,
          title
        )
      ),
      clinics (
        id,
        slug,
        clinic_translations (
          locale,
          name
        )
      ),
      reviews (
        id,
        rating,
        review_text,
        status,
        created_at
      )
    `)
    .eq(
      "patient_profile_id",
      authorization.profileId
    )
    .eq(
      "status",
      "completed"
    )
    .order(
      "scheduled_date",
      {
        ascending: false,
      }
    );

  if (appointmentsError) {
    console.error(
      "Patient review appointments query failed:",
      appointmentsError
    );

    return NextResponse.json(
      {
        error:
          "Programările eligibile pentru recenzie nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    appointments:
      appointments ?? [],
  });
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePatient();

  if (authorization.response) {
    return authorization.response;
  }

  let body: CreateReviewBody;

  try {
    body =
      (await request.json()) as
        CreateReviewBody;
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

  const appointmentId =
    normalizeString(
      body.appointmentId,
      100
    );

  const parsedRating =
    typeof body.rating ===
    "number"
      ? body.rating
      : Number(body.rating);

  const reviewText =
    normalizeString(
      body.reviewText,
      3000
    );

  if (!appointmentId) {
    return NextResponse.json(
      {
        error:
          "Programarea lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !Number.isInteger(
      parsedRating
    ) ||
    parsedRating < 1 ||
    parsedRating > 5
  ) {
    return NextResponse.json(
      {
        error:
          "Alege un calificativ între 1 și 5.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    reviewText.length < 10
  ) {
    return NextResponse.json(
      {
        error:
          "Recenzia trebuie să conțină cel puțin 10 caractere.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: appointment,
    error: appointmentError,
  } = await admin
    .from("appointments")
    .select(`
      id,
      doctor_id,
      patient_profile_id,
      patient_name,
      status
    `)
    .eq("id", appointmentId)
    .maybeSingle();

  if (
    appointmentError ||
    !appointment
  ) {
    return NextResponse.json(
      {
        error:
          "Programarea nu a fost găsită.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    appointment.patient_profile_id !==
    authorization.profileId
  ) {
    return NextResponse.json(
      {
        error:
          "Nu poți publica o recenzie pentru această programare.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    appointment.status !==
    "completed"
  ) {
    return NextResponse.json(
      {
        error:
          "Recenziile pot fi publicate numai după finalizarea programării.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: existingReview,
    error: existingReviewError,
  } = await admin
    .from("reviews")
    .select("id")
    .eq(
      "appointment_id",
      appointment.id
    )
    .maybeSingle();

  if (existingReviewError) {
    return NextResponse.json(
      {
        error:
          "Recenzia existentă nu a putut fi verificată.",
      },
      {
        status: 500,
      }
    );
  }

  if (existingReview) {
    return NextResponse.json(
      {
        error:
          "Ai publicat deja o recenzie pentru această programare.",
      },
      {
        status: 409,
      }
    );
  }

  const patientName =
    [
      authorization.firstName,
      authorization.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    appointment.patient_name ||
    "Pacient RomDoc";

  const {
    data: review,
    error: reviewError,
  } = await admin
    .from("reviews")
    .insert({
      doctor_id:
        appointment.doctor_id,

      patient_profile_id:
        authorization.profileId,

      appointment_id:
        appointment.id,

      patient_name:
        patientName,

      rating:
        parsedRating,

      review_text:
        reviewText,

      status:
        "published",

      approved:
        true,
    })
    .select(`
      id,
      rating,
      review_text,
      status,
      created_at
    `)
    .single();

  if (
    reviewError ||
    !review
  ) {
    console.error(
      "Patient review creation failed:",
      reviewError
    );

    return NextResponse.json(
      {
        error:
          reviewError?.code ===
          "23505"
            ? "Ai publicat deja o recenzie pentru această programare."
            : "Recenzia nu a putut fi publicată.",
      },
      {
        status:
          reviewError?.code ===
          "23505"
            ? 409
            : 500,
      }
    );
  }

  return NextResponse.json(
    {
      message:
        "Recenzia a fost publicată.",

      review,
    },
    {
      status: 201,
    }
  );
}