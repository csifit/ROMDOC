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

export const runtime = "nodejs";

type StaffInvitationBody = {
  email?: unknown;
  clinicId?: unknown;
};

type StaffUpdateBody = {
  assignmentId?: unknown;
  action?: unknown;
};

function normalizeEmail(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const email =
    value.trim().toLowerCase();

  if (
    !email ||
    !email.includes("@") ||
    email.startsWith("@") ||
    email.endsWith("@")
  ) {
    return null;
  }

  return email;
}

async function requireDoctor() {
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
      identity: null,

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
    profile?.role !== "doctor"
  ) {
    return {
      identity: null,

      response:
        NextResponse.json(
          {
            error:
              "Doar medicii activi pot administra personalul.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  const {
    data: doctor,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (
    doctorError ||
    !doctor
  ) {
    return {
      identity: null,

      response:
        NextResponse.json(
          {
            error:
              "Profilul de medic nu a fost găsit.",
          },
          {
            status: 404,
          }
        ),
    };
  }

  return {
    identity: {
      profileId: user.id,
      doctorId: doctor.id,
    },

    response: null,
  };
}

export async function GET() {
  const authorization =
    await requireDoctor();

  if (
    authorization.response ||
    !authorization.identity
  ) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const {
    doctorId,
  } = authorization.identity;

  const [
    assignmentsResult,
    clinicsResult,
  ] = await Promise.all([
    admin
      .from("doctor_staff")
      .select(`
        id,
        invited_email,
        status,
        invited_at,
        accepted_at,
        clinic_id,
        staff_profile_id,
        clinics (
          id,
          slug,
          formatted_address,
          clinic_translations (
            locale,
            name
          )
        ),
        profiles:staff_profile_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq("doctor_id", doctorId)
      .neq("status", "revoked")
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),

    admin
      .from("doctor_clinics")
      .select(`
        clinic_id,
        clinics!inner (
          id,
          slug,
          status,
          formatted_address,
          clinic_translations (
            locale,
            name
          )
        )
      `)
      .eq("doctor_id", doctorId)
      .eq(
        "clinics.status",
        "approved"
      ),
  ]);

  if (assignmentsResult.error) {
    console.error(
      "Doctor staff lookup failed:",
      assignmentsResult.error
    );

    return NextResponse.json(
      {
        error:
          "Personalul nu a putut fi încărcat.",
      },
      {
        status: 500,
      }
    );
  }

  if (clinicsResult.error) {
    console.error(
      "Doctor staff clinic lookup failed:",
      clinicsResult.error
    );

    return NextResponse.json(
      {
        error:
          "Clinicile medicului nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const clinics =
    (clinicsResult.data ?? [])
      .map((row) =>
        Array.isArray(row.clinics)
          ? row.clinics[0]
          : row.clinics
      )
      .filter(Boolean);

  return NextResponse.json({
    assignments:
      assignmentsResult.data ?? [],

    clinics,
  });
}

export async function POST(
  request: NextRequest
) {
  const authorization =
    await requireDoctor();

  if (
    authorization.response ||
    !authorization.identity
  ) {
    return authorization.response;
  }

  let body: StaffInvitationBody;

  try {
    body =
      (await request.json()) as
        StaffInvitationBody;
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

  const email =
    normalizeEmail(body.email);

  const clinicId =
    typeof body.clinicId ===
      "string"
      ? body.clinicId.trim()
      : "";

  if (!email) {
    return NextResponse.json(
      {
        error:
          "Introdu o adresă de e-mail validă.",
      },
      {
        status: 400,
      }
    );
  }

  if (!clinicId) {
    return NextResponse.json(
      {
        error:
          "Selectează clinica.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    doctorId,
    profileId,
  } = authorization.identity;

  const admin =
    createAdminClient();

  const {
    data: clinicLink,
    error: clinicLinkError,
  } = await admin
    .from("doctor_clinics")
    .select(`
      clinic_id,
      clinics!inner (
        id,
        status
      )
    `)
    .eq("doctor_id", doctorId)
    .eq("clinic_id", clinicId)
    .eq(
      "clinics.status",
      "approved"
    )
    .maybeSingle();

  if (
    clinicLinkError ||
    !clinicLink
  ) {
    return NextResponse.json(
      {
        error:
          "Poți adăuga personal numai la o clinică aprobată asociată profilului tău.",
      },
      {
        status: 403,
      }
    );
  }

  const {
    data: existingAssignment,
    error:
      existingAssignmentError,
  } = await admin
    .from("doctor_staff")
    .select(`
      id,
      status,
      staff_profile_id
    `)
    .eq("doctor_id", doctorId)
    .eq("clinic_id", clinicId)
    .eq("invited_email", email)
    .maybeSingle();

  if (existingAssignmentError) {
    console.error(
      "Existing staff assignment lookup failed:",
      existingAssignmentError
    );

    return NextResponse.json(
      {
        error:
          "Invitația existentă nu a putut fi verificată.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    existingAssignment &&
    [
      "invited",
      "active",
    ].includes(
      existingAssignment.status
    )
  ) {
    return NextResponse.json(
      {
        error:
          existingAssignment.status ===
          "active"
            ? "Această persoană este deja membru activ al personalului."
            : "O invitație este deja în așteptare pentru această persoană.",
      },
      {
        status: 409,
      }
    );
  }

  const siteUrl =
    (
      process.env
        .NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000"
    ).replace(/\/$/, "");

  const {
    data: invitation,
    error: invitationError,
  } =
    await admin.auth.admin
      .inviteUserByEmail(
        email,
        {
          redirectTo:
            `${siteUrl}/auth/confirm?next=/staff-dashboard`,

          data: {
            registration_type:
              "staff",

            invited_doctor_id:
              doctorId,

            invited_clinic_id:
              clinicId,
          },
        }
      );

  if (
    invitationError ||
    !invitation.user
  ) {
    console.error(
      "Staff invitation failed:",
      invitationError
    );

    return NextResponse.json(
      {
        error:
          invitationError?.message ??
          "Invitația nu a putut fi trimisă.",
      },
      {
        status: 500,
      }
    );
  }

  const invitedUserId =
    invitation.user.id;

  const {
    data: existingProfile,
  } = await admin
    .from("profiles")
    .select(`
      id,
      role
    `)
    .eq("id", invitedUserId)
    .maybeSingle();

  if (
    existingProfile &&
    [
      "admin",
      "doctor",
    ].includes(
      existingProfile.role
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Această adresă aparține deja unui cont care nu poate fi transformat în personal.",
      },
      {
        status: 409,
      }
    );
  }

  if (!existingProfile) {
    const {
      error: profileInsertError,
    } = await admin
      .from("profiles")
      .insert({
        id:
          invitedUserId,

        role:
          "staff",
      });

    if (profileInsertError) {
      console.error(
        "Staff profile creation failed:",
        profileInsertError
      );

      return NextResponse.json(
        {
          error:
            "Profilul personalului nu a putut fi creat.",
        },
        {
          status: 500,
        }
      );
    }
  } else {
    const {
      error: profileUpdateError,
    } = await admin
      .from("profiles")
      .update({
        role:
          "staff",
      })
      .eq("id", invitedUserId);

    if (profileUpdateError) {
      return NextResponse.json(
        {
          error:
            "Rolul personalului nu a putut fi actualizat.",
        },
        {
          status: 500,
        }
      );
    }
  }

  const assignmentPayload = {
    doctor_id:
      doctorId,

    clinic_id:
      clinicId,

    staff_profile_id:
      invitedUserId,

    invited_email:
      email,

    invited_by_profile_id:
      profileId,

    status:
      "invited",

    invited_at:
      new Date().toISOString(),

    accepted_at:
      null,

    suspended_at:
      null,

    revoked_at:
      null,
  };

  const {
    error: assignmentError,
  } = existingAssignment
    ? await admin
        .from("doctor_staff")
        .update(
          assignmentPayload
        )
        .eq(
          "id",
          existingAssignment.id
        )
    : await admin
        .from("doctor_staff")
        .insert(
          assignmentPayload
        );

  if (assignmentError) {
    console.error(
      "Staff assignment persistence failed:",
      assignmentError
    );

    return NextResponse.json(
      {
        error:
          "Invitația a fost trimisă, dar atribuirea nu a putut fi salvată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      message:
        "Invitația a fost trimisă prin e-mail.",
    },
    {
      status: 201,
    }
  );
}

export async function PATCH(
  request: NextRequest
) {
  const authorization =
    await requireDoctor();

  if (
    authorization.response ||
    !authorization.identity
  ) {
    return authorization.response;
  }

  let body: StaffUpdateBody;

  try {
    body =
      (await request.json()) as
        StaffUpdateBody;
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

  const assignmentId =
    typeof body.assignmentId ===
      "string"
      ? body.assignmentId.trim()
      : "";

  const action =
    typeof body.action ===
      "string"
      ? body.action.trim()
      : "";

  if (!assignmentId) {
    return NextResponse.json(
      {
        error:
          "Atribuirea personalului lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    ![
      "activate",
      "suspend",
      "revoke",
    ].includes(action)
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

  const {
    doctorId,
  } = authorization.identity;

  const admin =
    createAdminClient();

  const {
    data: assignment,
    error: assignmentLookupError,
  } = await admin
    .from("doctor_staff")
    .select(`
      id,
      status,
      staff_profile_id,
      accepted_at
    `)
    .eq("id", assignmentId)
    .eq("doctor_id", doctorId)
    .maybeSingle();

  if (
    assignmentLookupError ||
    !assignment
  ) {
    return NextResponse.json(
      {
        error:
          "Membrul personalului nu a fost găsit.",
      },
      {
        status: 404,
      }
    );
  }

  const now =
    new Date().toISOString();

  const updatePayload =
    action === "activate"
      ? {
          status:
            "active",

          accepted_at:
            assignment.accepted_at ??
            now,

          suspended_at:
            null,

          revoked_at:
            null,
        }
      : action === "suspend"
        ? {
            status:
              "suspended",

            suspended_at:
              now,
          }
        : {
            status:
              "revoked",

            revoked_at:
              now,
          };

  const {
    error: updateError,
  } = await admin
    .from("doctor_staff")
    .update(updatePayload)
    .eq("id", assignment.id)
    .eq("doctor_id", doctorId);

  if (updateError) {
    return NextResponse.json(
      {
        error:
          "Statutul personalului nu a putut fi actualizat.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message:
      action === "activate"
        ? "Accesul personalului a fost activat."
        : action === "suspend"
          ? "Accesul personalului a fost suspendat."
          : "Accesul personalului a fost revocat.",
  });
}