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

type AssignmentBody = {
  relationshipId?: unknown;
  clinicId?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength = 100
) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

async function requireClinicManager() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      profileId: null,
      response: NextResponse.json(
        {
          error: "Trebuie să fii autentificat.",
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
    .select(
      `
        role,
        account_status
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "clinic_manager" ||
    profile.account_status !== "active"
  ) {
    return {
      profileId: null,
      response: NextResponse.json(
        {
          error: "Doar Clinic Managerii activi pot atribui medici locațiilor.",
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

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization = await requireClinicManager();

  if (authorization.response) {
    return authorization.response;
  }

  let body: AssignmentBody;

  try {
    body = (await request.json()) as AssignmentBody;
  } catch {
    return NextResponse.json(
      {
        error: "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      }
    );
  }

  const relationshipId = normalizeString(
    body.relationshipId,
    100
  );

  const clinicId = normalizeString(
    body.clinicId,
    100
  );

  if (!relationshipId) {
    return NextResponse.json(
      {
        error: "Relația medic-clinică lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  if (!clinicId) {
    return NextResponse.json(
      {
        error: "Alege o locație aprobată.",
      },
      {
        status: 400,
      }
    );
  }

  const admin = createAdminClient();

  const {
    data: relationship,
    error: relationshipError,
  } = await admin
    .from("clinic_doctor_relationships")
    .select(
      `
        id,
        organization_id,
        clinic_id,
        doctor_id,
        payment_responsibility,
        invitation_status,
        coverage_status
      `
    )
    .eq("id", relationshipId)
    .maybeSingle();

  if (
    relationshipError ||
    !relationship
  ) {
    return NextResponse.json(
      {
        error: "Medicul invitat nu a fost găsit.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    relationship.payment_responsibility !== "clinic_paid"
  ) {
    return NextResponse.json(
      {
        error:
          "Doar medicii plătiți de clinică pot fi atribuiți locațiilor organizației.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: membership,
    error: membershipError,
  } = await admin
    .from("clinic_organization_members")
    .select("id")
    .eq("organization_id", relationship.organization_id)
    .eq("profile_id", authorization.profileId)
    .eq("status", "active")
    .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    return NextResponse.json(
      {
        error:
          "Nu ai dreptul să administrezi această organizație de clinică.",
      },
      {
        status: 403,
      }
    );
  }

  const {
    data: approvedLocation,
    error: approvedLocationError,
  } = await admin
    .from("clinic_organization_clinics")
    .select(
      `
        id,
        organization_id,
        clinic_id,
        status,
        clinics (
          id,
          status
        )
      `
    )
    .eq("organization_id", relationship.organization_id)
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .maybeSingle();

  const clinicRelation = Array.isArray(
    approvedLocation?.clinics
  )
    ? approvedLocation?.clinics[0] ?? null
    : approvedLocation?.clinics ?? null;

  if (
    approvedLocationError ||
    !approvedLocation ||
    !clinicRelation ||
    clinicRelation.status !== "approved"
  ) {
    return NextResponse.json(
      {
        error:
          "Locația selectată nu este o locație aprobată pentru această organizație.",
      },
      {
        status: 409,
      }
    );
  }

  const now = new Date().toISOString();

  const {
    data: updatedRelationship,
    error: updateError,
  } = await admin
    .from("clinic_doctor_relationships")
    .update({
      clinic_id: clinicId,
      updated_at: now,
    })
    .eq("id", relationship.id)
    .select("id")
    .maybeSingle();

  if (
    updateError ||
    !updatedRelationship
  ) {
    return NextResponse.json(
      {
        error:
          "Locația medicului nu a putut fi actualizată.",
      },
      {
        status: 500,
      }
    );
  }

  if (relationship.doctor_id) {
    const {
      data: organizationLocations,
      error: organizationLocationsError,
    } = await admin
      .from("clinic_organization_clinics")
      .select("clinic_id")
      .eq("organization_id", relationship.organization_id);

    if (organizationLocationsError) {
      return NextResponse.json(
        {
          error:
            "Locațiile organizației nu au putut fi verificate.",
        },
        {
          status: 500,
        }
      );
    }

    const organizationClinicIds = (
      organizationLocations ?? []
    )
      .map((location) => location.clinic_id)
      .filter((id): id is string => Boolean(id));

    const otherOrganizationClinicIds =
      organizationClinicIds.filter(
        (organizationClinicId) =>
          organizationClinicId !== clinicId
      );

    if (otherOrganizationClinicIds.length > 0) {
      const {
        error: cleanupError,
      } = await admin
        .from("doctor_clinics")
        .delete()
        .eq("doctor_id", relationship.doctor_id)
        .in("clinic_id", otherOrganizationClinicIds);

      if (cleanupError) {
        return NextResponse.json(
          {
            error:
              "Asocierile vechi ale medicului nu au putut fi curățate.",
          },
          {
            status: 500,
          }
        );
      }
    }

    const {
      error: doctorClinicError,
    } = await admin
      .from("doctor_clinics")
      .upsert(
        {
          doctor_id: relationship.doctor_id,
          clinic_id: clinicId,
        },
        {
          onConflict: "doctor_id,clinic_id",
        }
      );

    if (doctorClinicError) {
      return NextResponse.json(
        {
          error:
            "Locația a fost salvată pe relația de clinică, dar nu a putut fi sincronizată pe profilul medicului.",
        },
        {
          status: 500,
        }
      );
    }
  }

  return NextResponse.json({
    message:
      relationship.doctor_id
        ? "Medicul a fost atribuit locației aprobate."
        : "Locația a fost pregătită pentru medicul invitat. Se va sincroniza cu profilul medicului după crearea contului.",
  });
}
