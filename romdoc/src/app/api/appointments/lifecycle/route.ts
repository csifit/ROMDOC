import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  sendAppointmentStatusEmail,
} from "@/lib/appointments/send-appointment-status-email";

export const runtime = "nodejs";

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

type Translation = {
  locale: string;
  name?: string;
  title?: string;
};

type DoctorRelation = {
  slug: string;
  doctor_translations:
    | Translation[]
    | null;
};

type ClinicRelation = {
  slug: string;
  clinic_translations:
    | Translation[]
    | null;
};

type AppointmentForNotification = {
  id: string;
  patient_name: string;
  patient_email: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  requested_date: string | null;
  requested_time: string | null;
  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

const actionToStatus: Record<
  LifecycleAction,
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show"
> = {
  confirm: "confirmed",
  reschedule: "rescheduled",
  cancel: "cancelled",
  complete: "completed",
  no_show: "no_show",
};

function normalizeString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return !Number.isNaN(
    new Date(`${value}T12:00:00`).getTime()
  );
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function getFirstRelation<T>(
  relation: T | T[] | null
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getTranslationValue(
  translations:
    | Translation[]
    | null,
  field: "name" | "title"
) {
  return (
    translations?.find(
      (translation) =>
        translation.locale === "ro"
    )?.[field] ??
    translations?.[0]?.[field] ??
    null
  );
}

function formatNameFromSlug(slug: string) {
  return slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function transitionErrorResponse(
  message: string,
  code?: string
) {
  const normalized = message.toLowerCase();

  if (
    code === "P0002" ||
    normalized.includes("appointment_not_found")
  ) {
    return NextResponse.json(
      { error: "Programarea nu a fost găsită." },
      { status: 404 }
    );
  }

  if (
    code === "42501" ||
    normalized.includes("not_permitted") ||
    normalized.includes("active_profile_required")
  ) {
    return NextResponse.json(
      {
        error:
          "Nu ai permisiunea de a modifica această programare.",
      },
      { status: 403 }
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
      { status: 409 }
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
      { status: 409 }
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
      { status: 409 }
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
      { status: 409 }
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
      { status: 409 }
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
      { status: 409 }
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
      { status: 400 }
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
      { status: 400 }
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
      { status: 409 }
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
      { status: 409 }
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
      { status: 400 }
    );
  }

  if (
    code === "22001" ||
    normalized.includes("reason_too_long")
  ) {
    return NextResponse.json(
      {
        error:
          "Motivul sau nota poate avea cel mult 2.000 de caractere.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error:
        "Programarea nu a putut fi actualizată.",
    },
    { status: 500 }
  );
}

function successMessage(action: LifecycleAction) {
  switch (action) {
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
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Trebuie să fii autentificat." },
      { status: 401 }
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    !["doctor", "staff", "admin"].includes(
      profile.role
    ) ||
    profile.account_status !== "active"
  ) {
    return NextResponse.json(
      {
        error:
          "Nu ai un rol activ care poate administra programări.",
      },
      { status: 403 }
    );
  }

  let body: LifecycleRequestBody;

  try {
    body =
      (await request.json()) as
        LifecycleRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const appointmentId =
    normalizeString(body.appointmentId);

  const action =
    normalizeString(
      body.action
    ) as LifecycleAction;

  const scheduledDate =
    normalizeString(body.scheduledDate);

  const scheduledTime =
    normalizeString(body.scheduledTime);

  const reason =
    normalizeString(body.reason);

  if (!isUuid(appointmentId)) {
    return NextResponse.json(
      {
        error:
          "Identificatorul programării nu este valid.",
      },
      { status: 400 }
    );
  }

  if (
    ![
      "confirm",
      "reschedule",
      "cancel",
      "complete",
      "no_show",
    ].includes(action)
  ) {
    return NextResponse.json(
      { error: "Acțiunea solicitată nu este validă." },
      { status: 400 }
    );
  }

  if (
    (action === "confirm" ||
      action === "reschedule") &&
    (
      !isValidDate(scheduledDate) ||
      !isValidTime(scheduledTime)
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Selectează data și ora programării.",
      },
      { status: 400 }
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
      { status: 400 }
    );
  }

  if (
    reason.length > 2000
  ) {
    return NextResponse.json(
      {
        error:
          "Motivul sau nota poate avea cel mult 2.000 de caractere.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const {
    data: appointmentData,
    error: appointmentError,
  } = await admin
    .from("appointments")
    .select(`
      id,
      patient_name,
      patient_email,
      scheduled_date,
      scheduled_time,
      requested_date,
      requested_time,
      doctors (
        slug,
        doctor_translations (
          locale,
          title
        )
      ),
      clinics (
        slug,
        clinic_translations (
          locale,
          name
        )
      )
    `)
    .eq("id", appointmentId)
    .maybeSingle();

  if (
    appointmentError ||
    !appointmentData
  ) {
    return NextResponse.json(
      {
        error:
          "Programarea nu a fost găsită.",
      },
      { status: 404 }
    );
  }

  const {
    data: transitionData,
    error: transitionError,
  } = await supabase.rpc(
    "transition_own_appointment",
    {
      target_appointment_id:
        appointmentId,
      target_status:
        actionToStatus[action],
      target_scheduled_date:
        action === "confirm" ||
        action === "reschedule"
          ? scheduledDate
          : null,
      target_scheduled_time:
        action === "confirm" ||
        action === "reschedule"
          ? scheduledTime
          : null,
      transition_reason:
        reason || null,
    }
  );

  if (transitionError) {
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
    Array.isArray(transitionData)
      ? transitionData[0] ?? null
      : transitionData;

  let emailSent: boolean | null = null;

  if (
    action === "confirm" ||
    action === "reschedule" ||
    action === "cancel"
  ) {
    const appointment =
      appointmentData as unknown as
        AppointmentForNotification;

    const doctor =
      getFirstRelation(
        appointment.doctors
      );

    const clinic =
      getFirstRelation(
        appointment.clinics
      );

    const doctorName =
      doctor
        ? formatNameFromSlug(
            doctor.slug
          )
        : "Medic";

    const clinicName =
      getTranslationValue(
        clinic?.clinic_translations ??
          null,
        "name"
      ) ??
      (clinic
        ? formatNameFromSlug(
            clinic.slug
          )
        : "Clinică");

    const emailResult =
      await sendAppointmentStatusEmail({
        status:
          action === "confirm"
            ? "confirmed"
            : action === "reschedule"
              ? "rescheduled"
              : "cancelled",
        patientName:
          appointment.patient_name,
        patientEmail:
          appointment.patient_email,
        doctorName,
        clinicName,
        scheduledDate:
          transition?.scheduled_date ??
          appointment.scheduled_date ??
          appointment.requested_date,
        scheduledTime:
          transition?.scheduled_time ??
          appointment.scheduled_time ??
          appointment.requested_time,
        rescheduleReason:
          action === "reschedule"
            ? reason || null
            : null,
      });

    emailSent = emailResult.sent;

    if (!emailResult.sent) {
      console.error(
        `Appointment ${appointmentId} transitioned successfully, but the patient email was not sent.`
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: successMessage(action),
    appointment: transition,
    emailSent,
  });
}
