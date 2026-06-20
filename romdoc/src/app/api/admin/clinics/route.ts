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

type ClinicActionBody = {
  clinicId?: unknown;
  action?: unknown;
  rejectionReason?: unknown;
};

type AdminAuthorizationResult =
  | {
      profileId: string;
      response: null;
    }
  | {
      profileId: null;
      response: NextResponse;
    };

type ProposerDetails = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  doctor_id: string | null;
  doctor_slug: string | null;
};

async function requireAdmin(): Promise<AdminAuthorizationResult> {
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
    profile?.role !== "admin"
  ) {
    return {
      profileId: null,

      response:
        NextResponse.json(
          {
            error:
              "Nu ai permisiunea de a administra clinicile.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    profileId: user.id,
    response: null,
  };
}

function normalizeString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireAdmin();

  if (authorization.response) {
    return authorization.response;
  }

  const requestedStatus =
    request.nextUrl.searchParams.get(
      "status"
    );

  const allowedStatuses = [
    "pending",
    "approved",
    "rejected",
  ];

  const status =
    requestedStatus &&
    allowedStatuses.includes(
      requestedStatus
    )
      ? requestedStatus
      : null;

  const admin =
    createAdminClient();

  let query = admin
    .from("clinics")
    .select(`
      id,
      slug,
      city_id,
      email,
      phone,
      website,
      street_address,
      formatted_address,
      address_line_1,
      address_line_2,
      postal_code,
      county_name,
      country_code,
      latitude,
      longitude,
      google_place_id,
      google_maps_uri,
      address_verified_at,
      status,
      proposed_by_profile_id,
      approved_by_profile_id,
      approved_at,
      rejected_at,
      rejection_reason,
      created_at,
      updated_at,
      clinic_translations (
        locale,
        name,
        description
      ),
      cities (
        id,
        slug,
        city_translations (
          locale,
          name
        )
      )
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (status) {
    query =
      query.eq(
        "status",
        status
      );
  }

  const {
    data: clinics,
    error: clinicsError,
  } = await query;

  if (clinicsError) {
    console.error(
      "Admin clinics query failed:",
      clinicsError
    );

    return NextResponse.json(
      {
        error:
          "Clinicile nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const proposerProfileIds =
    Array.from(
      new Set(
        (clinics ?? [])
          .map(
            (clinic) =>
              clinic.proposed_by_profile_id
          )
          .filter(
            (
              profileId
            ): profileId is string =>
              Boolean(profileId)
          )
      )
    );

  const proposerMap =
    new Map<
      string,
      ProposerDetails
    >();

  if (
    proposerProfileIds.length >
    0
  ) {
    const [
      profilesResult,
      doctorsResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name
        `)
        .in(
          "id",
          proposerProfileIds
        ),

      admin
        .from("doctors")
        .select(`
          id,
          profile_id,
          slug
        `)
        .in(
          "profile_id",
          proposerProfileIds
        ),
    ]);

    if (
      profilesResult.error
    ) {
      console.error(
        "Clinic proposer profiles query failed:",
        profilesResult.error
      );
    }

    if (
      doctorsResult.error
    ) {
      console.error(
        "Clinic proposer doctors query failed:",
        doctorsResult.error
      );
    }

    const doctorByProfile =
      new Map(
        (
          doctorsResult.data ??
          []
        ).map(
          (doctor) => [
            doctor.profile_id,
            doctor,
          ]
        )
      );

    for (
      const profile of
        profilesResult.data ??
        []
    ) {
      const doctor =
        doctorByProfile.get(
          profile.id
        );

      proposerMap.set(
        profile.id,
        {
          id:
            profile.id,

          first_name:
            profile.first_name,

          last_name:
            profile.last_name,

          doctor_id:
            doctor?.id ??
            null,

          doctor_slug:
            doctor?.slug ??
            null,
        }
      );
    }
  }

  const enrichedClinics =
    (clinics ?? []).map(
      (clinic) => ({
        ...clinic,

        proposer:
          clinic.proposed_by_profile_id
            ? proposerMap.get(
                clinic.proposed_by_profile_id
              ) ?? null
            : null,
      })
    );

  return NextResponse.json({
    clinics:
      enrichedClinics,
  });
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireAdmin();

  if (authorization.response) {
    return authorization.response;
  }

  const adminProfileId =
    authorization.profileId;

  let body: ClinicActionBody;

  try {
    body =
      (await request.json()) as
        ClinicActionBody;
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

  const clinicId =
    normalizeString(
      body.clinicId
    );

  const action =
    normalizeString(
      body.action
    );

  const rejectionReason =
    normalizeString(
      body.rejectionReason
    );

  if (!clinicId) {
    return NextResponse.json(
      {
        error:
          "Clinica lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    action !== "approve" &&
    action !== "reject"
  ) {
    return NextResponse.json(
      {
        error:
          "Acțiunea solicitată nu este validă.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    action === "reject" &&
    rejectionReason.length < 3
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu motivul respingerii.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: clinic,
    error: clinicError,
  } = await admin
    .from("clinics")
    .select(`
      id,
      status,
      proposed_by_profile_id
    `)
    .eq("id", clinicId)
    .maybeSingle();

  if (
    clinicError ||
    !clinic
  ) {
    return NextResponse.json(
      {
        error:
          "Clinica nu a fost găsită.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    clinic.status !==
    "pending"
  ) {
    return NextResponse.json(
      {
        error:
          "Numai clinicile aflate în așteptare pot fi moderate.",
      },
      {
        status: 409,
      }
    );
  }

  const now =
    new Date().toISOString();

  if (action === "reject") {
    const {
      data: rejectedClinic,
      error: rejectError,
    } = await admin
      .from("clinics")
      .update({
        status:
          "rejected",

        rejected_at:
          now,

        rejection_reason:
          rejectionReason,

        approved_at:
          null,

        approved_by_profile_id:
          null,
      })
      .eq("id", clinic.id)
      .eq(
        "status",
        "pending"
      )
      .select("id")
      .maybeSingle();

    if (
      rejectError ||
      !rejectedClinic
    ) {
      console.error(
        "Clinic rejection failed:",
        rejectError
      );

      return NextResponse.json(
        {
          error:
            "Clinica nu a putut fi respinsă. Este posibil ca statutul ei să fi fost modificat între timp.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      message:
        "Clinica a fost respinsă.",
    });
  }

  if (
    !clinic.proposed_by_profile_id
  ) {
    return NextResponse.json(
      {
        error:
          "Clinica nu are un medic propunător asociat.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: doctor,
    error: doctorError,
  } = await admin
    .from("doctors")
    .select("id")
    .eq(
      "profile_id",
      clinic.proposed_by_profile_id
    )
    .maybeSingle();

  if (
    doctorError ||
    !doctor
  ) {
    return NextResponse.json(
      {
        error:
          "Profilul medicului care a propus clinica nu a fost găsit.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: approvedClinic,
    error: approveError,
  } = await admin
    .from("clinics")
    .update({
      status:
        "approved",

      approved_by_profile_id:
        adminProfileId,

      approved_at:
        now,

      rejected_at:
        null,

      rejection_reason:
        null,
    })
    .eq("id", clinic.id)
    .eq(
      "status",
      "pending"
    )
    .select("id")
    .maybeSingle();

  if (
    approveError ||
    !approvedClinic
  ) {
    console.error(
      "Clinic approval failed:",
      approveError
    );

    return NextResponse.json(
      {
        error:
          "Clinica nu a putut fi aprobată. Este posibil ca statutul ei să fi fost modificat între timp.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    error: associationError,
  } = await admin
    .from("doctor_clinics")
    .upsert(
      {
        doctor_id:
          doctor.id,

        clinic_id:
          clinic.id,
      },
      {
        onConflict:
          "doctor_id,clinic_id",
      }
    );

  if (associationError) {
    console.error(
      "Approved clinic association failed:",
      associationError
    );

    const {
      error: rollbackError,
    } = await admin
      .from("clinics")
      .update({
        status:
          "pending",

        approved_by_profile_id:
          null,

        approved_at:
          null,
      })
      .eq("id", clinic.id)
      .eq(
        "status",
        "approved"
      );

    if (rollbackError) {
      console.error(
        "Clinic approval rollback failed:",
        rollbackError
      );
    }

    return NextResponse.json(
      {
        error:
          "Clinica nu a putut fi asociată medicului. Aprobarea a fost anulată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message:
      "Clinica a fost aprobată și asociată medicului.",
  });
}