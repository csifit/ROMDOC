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

type AppointmentAction =
  | "confirm"
  | "reschedule"
  | "complete"
  | "cancel";

type UpdateAppointmentBody = {
  appointmentId?: unknown;
  action?: unknown;
  scheduledDate?: unknown;
  scheduledTime?: unknown;
  reason?: unknown;
};

type StaffAssignment = {
  id: string;
  doctor_id: string;
  clinic_id: string;
};

function normalizeString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function isValidDate(
  value: string
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  );
}

function isValidTime(
  value: string
) {
  return /^\d{2}:\d{2}$/.test(
    value
  );
}

async function requireStaff() {
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
      assignments: [],
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
    profile?.role !== "staff"
  ) {
    return {
      profileId: null,
      assignments: [],
      response:
        NextResponse.json(
          {
            error:
              "Doar personalul activ poate accesa programările.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  const admin =
    createAdminClient();

  const {
    data: assignments,
    error: assignmentError,
  } = await admin
    .from("doctor_staff")
    .select(`
      id,
      doctor_id,
      clinic_id
    `)
    .eq(
      "staff_profile_id",
      user.id
    )
    .eq("status", "active");

  if (assignmentError) {
    return {
      profileId: null,
      assignments: [],
      response:
        NextResponse.json(
          {
            error:
              "Atribuirile personalului nu au putut fi verificate.",
          },
          {
            status: 500,
          }
        ),
    };
  }

  return {
    profileId: user.id,

    assignments:
      (assignments ??
        []) as StaffAssignment[],

    response: null,
  };
}

function appointmentMatchesAssignment(
  assignments:
    StaffAssignment[],
  doctorId: string,
  clinicId: string
) {
  return assignments.some(
    (assignment) =>
      assignment.doctor_id ===
        doctorId &&
      assignment.clinic_id ===
        clinicId
  );
}

export async function GET() {
  const authorization =
    await requireStaff();

  if (authorization.response) {
    return authorization.response;
  }

  const assignments =
    authorization.assignments;

  if (assignments.length === 0) {
    return NextResponse.json({
      appointments: [],
      assignments: [],
    });
  }

  const admin =
    createAdminClient();

  const appointmentQueries =
    assignments.map(
      (assignment) =>
        admin
          .from("appointments")
          .select(`
            id,
            doctor_id,
            clinic_id,
            patient_name,
            patient_email,
            patient_phone,
            requested_date,
            requested_time,
            scheduled_date,
            scheduled_time,
            duration,
            status,
            notes,
            reschedule_reason,
            source,
            created_at,
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
              formatted_address,
              clinic_translations (
                locale,
                name
              )
            )
          `)
          .eq(
            "doctor_id",
            assignment.doctor_id
          )
          .eq(
            "clinic_id",
            assignment.clinic_id
          )
          .order(
            "requested_date",
            {
              ascending: true,
            }
          )
          .order(
            "requested_time",
            {
              ascending: true,
            }
          )
    );

  const results =
    await Promise.all(
      appointmentQueries
    );

  const failedResult =
    results.find(
      (result) =>
        result.error
    );

  if (failedResult?.error) {
    console.error(
      "Staff appointment query failed:",
      failedResult.error
    );

    return NextResponse.json(
      {
        error:
          "Programările nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const uniqueAppointments =
    new Map<string, unknown>();

  for (const result of results) {
    for (
      const appointment of
        result.data ?? []
    ) {
      uniqueAppointments.set(
        appointment.id,
        appointment
      );
    }
  }

  return NextResponse.json({
    appointments:
      Array.from(
        uniqueAppointments.values()
      ),

    assignments,
  });
}

export async function PATCH(
  request: NextRequest
) {
  const authorization =
    await requireStaff();

  if (authorization.response) {
    return authorization.response;
  }

  let body: UpdateAppointmentBody;

  try {
    body =
      (await request.json()) as
        UpdateAppointmentBody;
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
      body.appointmentId
    );

  const action =
    normalizeString(
      body.action
    ) as AppointmentAction;

  const scheduledDate =
    normalizeString(
      body.scheduledDate
    );

  const scheduledTime =
    normalizeString(
      body.scheduledTime
    );

  const reason =
    normalizeString(
      body.reason
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
    ![
      "confirm",
      "reschedule",
      "complete",
      "cancel",
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

  if (
    (
      action === "confirm" ||
      action === "reschedule"
    ) &&
    (
      !isValidDate(
        scheduledDate
      ) ||
      !isValidTime(
        scheduledTime
      )
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Selectează data și ora programării.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    action === "reschedule" &&
    reason.length < 3
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu motivul reprogramării.",
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
      clinic_id,
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

  const isAuthorized =
    appointmentMatchesAssignment(
      authorization.assignments,
      appointment.doctor_id,
      appointment.clinic_id
    );

  if (!isAuthorized) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la această programare.",
      },
      {
        status: 403,
      }
    );
  }

  const updatePayload =
    action === "confirm"
      ? {
          status:
            "confirmed",

          scheduled_date:
            scheduledDate,

          scheduled_time:
            scheduledTime,

          reschedule_reason:
            null,
        }
      : action === "reschedule"
        ? {
            status:
              "rescheduled",

            scheduled_date:
              scheduledDate,

            scheduled_time:
              scheduledTime,

            reschedule_reason:
              reason,
          }
        : action === "complete"
          ? {
              status:
                "completed",
            }
          : {
              status:
                "cancelled",
            };

  const {
    error: updateError,
  } = await admin
    .from("appointments")
    .update(updatePayload)
    .eq("id", appointment.id)
    .eq(
      "doctor_id",
      appointment.doctor_id
    )
    .eq(
      "clinic_id",
      appointment.clinic_id
    );

  if (updateError) {
    console.error(
      "Staff appointment update failed:",
      updateError
    );

    return NextResponse.json(
      {
        error:
          "Programarea nu a putut fi actualizată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message:
      action === "confirm"
        ? "Programarea a fost confirmată."
        : action ===
            "reschedule"
          ? "Programarea a fost reprogramată."
          : action ===
              "complete"
            ? "Programarea a fost marcată ca finalizată."
            : "Programarea a fost anulată.",
  });
}