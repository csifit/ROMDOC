import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  notifyAppointmentLifecycle,
} from "@/lib/appointments/notify-appointment-lifecycle";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type LifecycleAction =
  | "confirm"
  | "reschedule"
  | "cancel"
  | "complete"
  | "no_show";

type LifecycleRequestBody = {
  appointmentId?: unknown;
  action?: unknown;
  scheduledDate?: unknown;
  scheduledTime?: unknown;
  reason?: unknown;
};

const actionToStatus: Record<
  LifecycleAction,
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show"
> = {
  confirm:
    "confirmed",
  reschedule:
    "rescheduled",
  cancel:
    "cancelled",
  complete:
    "completed",
  no_show:
    "no_show",
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

function isValidDate(
  value: string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  return !Number.isNaN(
    new Date(
      `${value}T12:00:00`
    ).getTime()
  );
}

function isValidTime(
  value: string
) {
  return /^\d{2}:\d{2}$/.test(
    value
  );
}

function transitionErrorResponse(
  message: string,
  code?: string
) {
  const normalized =
    message.toLowerCase();

  if (
    code === "P0002" ||
    normalized.includes(
      "appointment_not_found"
    )
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
    code === "42501" ||
    normalized.includes(
      "not_permitted"
    ) ||
    normalized.includes(
      "active_profile_required"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Nu ai permisiunea de a modifica această programare.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    code === "23P01" ||
    normalized.includes(
      "appointment_slot_conflict"
    ) ||
    normalized.includes(
      "appointments_no_doctor_overlap"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Intervalul selectat nu mai este disponibil. Alege o altă dată sau oră.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    normalized.includes(
      "appointment_outside_working_hours"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Intervalul selectat este în afara programului de lucru al medicului.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    normalized.includes(
      "appointment_overlaps_break"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Intervalul selectat se suprapune cu o pauză din program.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    normalized.includes(
      "doctor_unavailable_for_period"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Medicul este indisponibil în intervalul selectat.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    normalized.includes(
      "doctor_clinic_not_available"
    ) ||
    normalized.includes(
      "appointment_clinic_required"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Clinica nu este disponibilă pentru această programare.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    normalized.includes(
      "appointment_duration_mismatch"
    ) ||
    normalized.includes(
      "invalid_appointment_duration"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Durata programării nu corespunde intervalelor configurate de medic.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    normalized.includes(
      "appointment_date_is_in_the_past"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Nu poți selecta o dată din trecut.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    normalized.includes(
      "appointment_date_exceeds_advance_limit"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Programările pot fi stabilite cu maximum 180 de zile în avans.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    normalized.includes(
      "invalid_appointment_transition"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Această schimbare nu este permisă pentru starea actuală a programării.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    normalized.includes(
      "reschedule_requires_new_slot"
    ) ||
    normalized.includes(
      "rescheduled_appointment_requires_a_new_slot"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Pentru reprogramare trebuie să alegi o dată sau o oră diferită.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    normalized.includes(
      "requires_date_and_time"
    ) ||
    normalized.includes(
      "scheduled_date_and_time_required"
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
    code === "22001" ||
    normalized.includes(
      "reason_too_long"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Motivul sau nota poate avea cel mult 2.000 de caractere.",
      },
      {
        status: 400,
      }
    );
  }

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

function successMessage(
  action: LifecycleAction
) {
  switch (
    action
  ) {
    case "confirm":
      return "Programarea a fost confirmată.";

    case "reschedule":
      return "Programarea a fost reprogramată.";

    case "cancel":
      return "Programarea a fost anulată.";

    case "complete":
      return "Programarea a fost marcată ca finalizată.";

    case "no_show":
      return "Programarea a fost marcată ca neprezentare.";
  }
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
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
    profileError ||
    !profile ||
    ![
      "doctor",
      "staff",
      "admin",
    ].includes(
      profile.role
    ) ||
    profile.account_status !==
      "active"
  ) {
    return NextResponse.json(
      {
        error:
          "Nu ai un rol activ care poate administra programări.",
      },
      {
        status: 403,
      }
    );
  }

  let body:
    LifecycleRequestBody;

  try {
    body =
      (await request.json()) as
        LifecycleRequestBody;
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
    ) as LifecycleAction;

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

  if (
    !isUuid(
      appointmentId
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Identificatorul programării nu este valid.",
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
      "cancel",
      "complete",
      "no_show",
    ].includes(
      action
    )
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
      action ===
        "confirm" ||
      action ===
        "reschedule"
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
    action ===
      "reschedule" &&
    reason.length <
      3
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

  if (
    reason.length >
    2000
  ) {
    return NextResponse.json(
      {
        error:
          "Motivul sau nota poate avea cel mult 2.000 de caractere.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data:
      transitionData,
    error:
      transitionError,
  } = await supabase.rpc(
    "transition_own_appointment",
    {
      target_appointment_id:
        appointmentId,
      target_status:
        actionToStatus[
          action
        ],
      target_scheduled_date:
        action ===
          "confirm" ||
        action ===
          "reschedule"
          ? scheduledDate
          : null,
      target_scheduled_time:
        action ===
          "confirm" ||
        action ===
          "reschedule"
          ? scheduledTime
          : null,
      transition_reason:
        reason ||
        null,
    }
  );

  if (
    transitionError
  ) {
    console.error(
      "Unified appointment lifecycle transition failed:",
      transitionError
    );

    return transitionErrorResponse(
      transitionError.message,
      transitionError.code
    );
  }

  const transition =
    Array.isArray(
      transitionData
    )
      ? transitionData[0] ??
        null
      : transitionData;

  const notificationStatus =
    action ===
      "confirm"
      ? "confirmed"
      : action ===
          "reschedule"
        ? "rescheduled"
        : action ===
            "cancel"
          ? "cancelled"
          : action ===
              "complete"
            ? "completed"
            : "no_show";

  let notificationResult = {
    dashboardCreated:
      false,
    emailSent:
      null as boolean | null,
    smsSent:
      null as boolean | null,
    smsSkipped:
      null as boolean | null,
  };

  try {
    notificationResult =
      await notifyAppointmentLifecycle({
        appointmentId,
        status:
          notificationStatus,
        triggeredByProfileId:
          user.id,
      });
  } catch (
    notificationError
  ) {
    console.error(
      `Appointment ${appointmentId} transitioned successfully, but lifecycle notifications failed:`,
      notificationError
    );
  }

  return NextResponse.json({
    success: true,
    message:
      successMessage(
        action
      ),
    appointment:
      transition,
    dashboardCreated:
      notificationResult.dashboardCreated,
    emailSent:
      notificationResult.emailSent,
    smsSent:
      notificationResult.smsSent,
    smsSkipped:
      notificationResult.smsSkipped,
  });
}
