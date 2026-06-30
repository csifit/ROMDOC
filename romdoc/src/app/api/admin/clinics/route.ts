import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";

export const runtime =
  "nodejs";

type ClinicActionBody = {
  clinicId?: unknown;
  action?: unknown;
  rejectionReason?: unknown;
  blockReason?: unknown;
};

type ProposerDetails = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  doctor_id: string | null;
  doctor_slug: string | null;
};

function normalizeString(
  value: unknown,
  maximumLength = 1000
) {
  return typeof value === "string"
    ? value
        .trim()
        .slice(
          0,
          maximumLength
        )
    : "";
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

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
    "blocked",
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
      blocked_at,
      blocked_by_profile_id,
      blocked_reason,
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

    operatorRole:
      authorization.role,

    capabilities: {
      canManageClinics:
        true,

      canDeleteClinics:
        authorization.role ===
        "admin",

      canBlockClinics:
        authorization.role ===
        "admin",
    },
  });
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const operatorProfileId =
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
      body.clinicId,
      100
    );

  const action =
    normalizeString(
      body.action,
      50
    );

  const rejectionReason =
    normalizeString(
      body.rejectionReason
    );

  const blockReason =
    normalizeString(
      body.blockReason
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
    action !== "reject" &&
    action !== "block" &&
    action !== "unblock"
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

  if (
    action === "block" &&
    blockReason.length < 3
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu motivul blocării.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    action === "block" ||
    action === "unblock"
  ) {
    const capabilityResponse =
      requireAdministratorCapability(
        authorization.role,
        "Numai administratorii pot bloca sau reactiva clinici."
      );

    if (capabilityResponse) {
      return capabilityResponse;
    }
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

  const now =
    new Date().toISOString();

  if (action === "block") {
    if (
      clinic.status !==
      "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Numai clinicile aprobate pot fi blocate.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: blockedClinic,
      error: blockError,
    } = await admin
      .from("clinics")
      .update({
        status:
          "blocked",

        blocked_at:
          now,

        blocked_by_profile_id:
          operatorProfileId,

        blocked_reason:
          blockReason,
      })
      .eq(
        "id",
        clinic.id
      )
      .eq(
        "status",
        "approved"
      )
      .select("id")
      .maybeSingle();

    if (
      blockError ||
      !blockedClinic
    ) {
      console.error(
        "Clinic blocking failed:",
        blockError
      );

      return NextResponse.json(
        {
          error:
            "Clinica nu a putut fi blocată. Este posibil ca statutul ei să fi fost modificat între timp.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      message:
        "Clinica a fost blocată și nu mai apare în zonele publice RomDoc.",
    });
  }

  if (action === "unblock") {
    if (
      clinic.status !==
      "blocked"
    ) {
      return NextResponse.json(
        {
          error:
            "Numai clinicile blocate pot fi reactivate.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: unblockedClinic,
      error: unblockError,
    } = await admin
      .from("clinics")
      .update({
        status:
          "approved",

        blocked_at:
          null,

        blocked_by_profile_id:
          null,

        blocked_reason:
          null,
      })
      .eq(
        "id",
        clinic.id
      )
      .eq(
        "status",
        "blocked"
      )
      .select("id")
      .maybeSingle();

    if (
      unblockError ||
      !unblockedClinic
    ) {
      console.error(
        "Clinic unblocking failed:",
        unblockError
      );

      return NextResponse.json(
        {
          error:
            "Clinica nu a putut fi reactivată. Este posibil ca statutul ei să fi fost modificat între timp.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      message:
        "Clinica a fost reactivată și este din nou aprobată.",
    });
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

        blocked_at:
          null,

        blocked_by_profile_id:
          null,

        blocked_reason:
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
        operatorProfileId,

      approved_at:
        now,

      rejected_at:
        null,

      rejection_reason:
        null,

      blocked_at:
        null,

      blocked_by_profile_id:
        null,

      blocked_reason:
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
