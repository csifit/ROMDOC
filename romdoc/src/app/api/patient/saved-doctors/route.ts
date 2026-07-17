import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createClient>
>;

type SavedDoctorRequestBody = {
  doctorId?: unknown;
};

type PatientAuthorization =
  | {
      ok: true;
      supabase: SupabaseServerClient;
      userId: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

type DoctorIdResult =
  | {
      ok: true;
      doctorId: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function normalizeString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function requireActivePatient():
  Promise<PatientAuthorization> {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      ok: false,
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

  if (
    !user.email_confirmed_at
  ) {
    return {
      ok: false,
      response:
        NextResponse.json(
          {
            error:
              "Confirmă adresa de e-mail înainte de a salva medici.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  const {
    data:
      profile,
    error:
      profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, account_status"
    )
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    profileError
  ) {
    console.error(
      "Saved doctors patient profile lookup failed:",
      profileError
    );

    return {
      ok: false,
      response:
        NextResponse.json(
          {
            error:
              "Profilul pacientului nu a putut fi verificat.",
          },
          {
            status: 500,
          }
        ),
    };
  }

  if (
    !profile ||
    profile.role !==
      "patient" ||
    profile.account_status !==
      "active"
  ) {
    return {
      ok: false,
      response:
        NextResponse.json(
          {
            error:
              "Doar pacienții cu un cont activ pot salva medici.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    ok: true,
    supabase,
    userId:
      user.id,
  };
}

async function readDoctorId(
  request: NextRequest
): Promise<DoctorIdResult> {
  let body:
    SavedDoctorRequestBody;

  try {
    body =
      (await request.json()) as
        SavedDoctorRequestBody;
  } catch {
    return {
      ok: false,
      response:
        NextResponse.json(
          {
            error:
              "Cererea nu conține date JSON valide.",
          },
          {
            status: 400,
          }
        ),
    };
  }

  const doctorId =
    normalizeString(
      body.doctorId
    );

  if (
    !isUuid(
      doctorId
    )
  ) {
    return {
      ok: false,
      response:
        NextResponse.json(
          {
            error:
              "Identificatorul medicului nu este valid.",
          },
          {
            status: 400,
          }
        ),
    };
  }

  return {
    ok: true,
    doctorId,
  };
}

async function getSavedCount(
  supabase:
    SupabaseServerClient,
  doctorId: string
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_doctor_saved_count",
    {
      target_doctor_id:
        doctorId,
    }
  );

  if (
    error
  ) {
    console.error(
      "Saved doctor aggregate count failed:",
      error
    );

    return null;
  }

  if (
    typeof data ===
      "number"
  ) {
    return data;
  }

  if (
    typeof data ===
      "string"
  ) {
    const parsed =
      Number(data);

    return Number.isFinite(
      parsed
    )
      ? parsed
      : null;
  }

  return null;
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActivePatient();

  if (
    !authorization.ok
  ) {
    return authorization.response;
  }

  const {
    supabase,
    userId,
  } = authorization;

  const doctorId =
    request.nextUrl
      .searchParams
      .get("doctorId")
      ?.trim() ??
    "";

  if (
    doctorId &&
    !isUuid(
      doctorId
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Identificatorul medicului nu este valid.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    doctorId
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "patient_saved_doctors"
        )
        .select(
          "doctor_id"
        )
        .eq(
          "patient_profile_id",
          userId
        )
        .eq(
          "doctor_id",
          doctorId
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "Saved doctor status lookup failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Starea medicului salvat nu a putut fi verificată.",
        },
        {
          status: 500,
        }
      );
    }

    const savedCount =
      await getSavedCount(
        supabase,
        doctorId
      );

    return NextResponse.json(
      {
        doctorId,
        isSaved:
          Boolean(data),
        savedCount,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "patient_saved_doctors"
      )
      .select(
        "doctor_id, created_at"
      )
      .eq(
        "patient_profile_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (
    error
  ) {
    console.error(
      "Saved doctors list lookup failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Lista medicilor salvați nu a putut fi încărcată.",
      },
      {
        status: 500,
      }
    );
  }

  const savedDoctors =
    (
      data ??
      []
    ).map(
      (
        row
      ) => ({
        doctorId:
          row.doctor_id,
        savedAt:
          row.created_at,
      })
    );

  return NextResponse.json(
    {
      savedDoctors,
      savedDoctorIds:
        savedDoctors.map(
          (
            savedDoctor
          ) =>
            savedDoctor.doctorId
        ),
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActivePatient();

  if (
    !authorization.ok
  ) {
    return authorization.response;
  }

  const parsed =
    await readDoctorId(
      request
    );

  if (
    !parsed.ok
  ) {
    return parsed.response;
  }

  const {
    supabase,
    userId,
  } = authorization;

  const doctorId =
    parsed.doctorId;

  const {
    data:
      doctor,
    error:
      doctorError,
  } =
    await supabase
      .from("doctors")
      .select(
        "id, status"
      )
      .eq(
        "id",
        doctorId
      )
      .maybeSingle();

  if (
    doctorError
  ) {
    console.error(
      "Saved doctor public eligibility lookup failed:",
      doctorError
    );

    return NextResponse.json(
      {
        error:
          "Medicul nu a putut fi verificat.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    !doctor ||
    doctor.status !==
      "active"
  ) {
    return NextResponse.json(
      {
        error:
          "Acest medic nu poate fi salvat în acest moment.",
      },
      {
        status: 404,
      }
    );
  }

  const {
    error:
      insertError,
  } =
    await supabase
      .from(
        "patient_saved_doctors"
      )
      .insert({
        patient_profile_id:
          userId,
        doctor_id:
          doctorId,
      });

  if (
    insertError &&
    insertError.code !==
      "23505"
  ) {
    console.error(
      "Save doctor insert failed:",
      insertError
    );

    return NextResponse.json(
      {
        error:
          "Medicul nu a putut fi salvat.",
      },
      {
        status: 500,
      }
    );
  }

  const savedCount =
    await getSavedCount(
      supabase,
      doctorId
    );

  return NextResponse.json(
    {
      success: true,
      doctorId,
      isSaved: true,
      alreadySaved:
        insertError?.code ===
        "23505",
      savedCount,
      message:
        "Medicul a fost salvat.",
    },
    {
      status:
        insertError?.code ===
        "23505"
          ? 200
          : 201,
    }
  );
}

export async function DELETE(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActivePatient();

  if (
    !authorization.ok
  ) {
    return authorization.response;
  }

  const parsed =
    await readDoctorId(
      request
    );

  if (
    !parsed.ok
  ) {
    return parsed.response;
  }

  const {
    supabase,
    userId,
  } = authorization;

  const doctorId =
    parsed.doctorId;

  const {
    error:
      deleteError,
  } =
    await supabase
      .from(
        "patient_saved_doctors"
      )
      .delete()
      .eq(
        "patient_profile_id",
        userId
      )
      .eq(
        "doctor_id",
        doctorId
      );

  if (
    deleteError
  ) {
    console.error(
      "Remove saved doctor failed:",
      deleteError
    );

    return NextResponse.json(
      {
        error:
          "Medicul nu a putut fi eliminat din lista salvată.",
      },
      {
        status: 500,
      }
    );
  }

  const savedCount =
    await getSavedCount(
      supabase,
      doctorId
    );

  return NextResponse.json({
    success: true,
    doctorId,
    isSaved: false,
    savedCount,
    message:
      "Medicul a fost eliminat din lista salvată.",
  });
}
