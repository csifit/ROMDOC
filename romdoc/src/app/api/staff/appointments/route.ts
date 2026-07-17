import {
  randomUUID,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  sendAppointmentSms,
} from "@/lib/appointments/send-appointment-sms";
import {
  sendAppointmentStatusEmail,
} from "@/lib/appointments/send-appointment-status-email";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type AppointmentSource =
  | "phone"
  | "walk_in"
  | "email"
  | "other";

type StaffAssignment = {
  id: string;
  doctor_id: string;
  clinic_id: string;
};

type StaffAuthorization = {
  userId: string;
  assignments:
    StaffAssignment[];
};

type StaffCreateAppointmentBody = {
  doctorId?: unknown;
  clinicId?: unknown;
  patientName?: unknown;
  patientEmail?: unknown;
  patientPhone?: unknown;
  scheduledDate?: unknown;
  scheduledTime?: unknown;
  source?: unknown;
  notes?: unknown;
};

type Translation = {
  locale: string;
  name?: string;
  title?: string;
};

type ProfileRelation = {
  first_name: string | null;
  last_name: string | null;
};

type DoctorRelation = {
  id: string;
  slug: string;
  status: string;
  profile:
    | ProfileRelation
    | ProfileRelation[]
    | null;
  doctor_translations:
    | Translation[]
    | null;
};

type ClinicRelation = {
  id: string;
  slug: string;
  status: string;
  clinic_translations:
    | Translation[]
    | null;
};

type AppointmentRow =
  Record<
    string,
    unknown
  > & {
    id: string;
    requested_date:
      string;
    requested_time:
      string | null;
    scheduled_date:
      string | null;
    scheduled_time:
      string | null;
  };

const allowedSources:
  AppointmentSource[] = [
    "phone",
    "walk_in",
    "email",
    "other",
  ];

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

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function isValidDateString(
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

function isTodayOrFuture(
  value: string
) {
  if (
    !isValidDateString(
      value
    )
  ) {
    return false;
  }

  const selectedDate =
    new Date(
      `${value}T12:00:00`
    );

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return (
    selectedDate >= today
  );
}

function normalizeTime(
  value: string
) {
  if (
    !/^\d{2}:\d{2}(:\d{2})?$/.test(
      value
    )
  ) {
    return null;
  }

  const [
    hours,
    minutes,
    seconds = "00",
  ] =
    value.split(":");

  const hoursNumber =
    Number(hours);

  const minutesNumber =
    Number(minutes);

  const secondsNumber =
    Number(seconds);

  if (
    hoursNumber < 0 ||
    hoursNumber > 23 ||
    minutesNumber < 0 ||
    minutesNumber > 59 ||
    secondsNumber < 0 ||
    secondsNumber > 59
  ) {
    return null;
  }

  return `${hours}:${minutes}:${seconds}`;
}

function getFirstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(
    relation
  )
    ? relation[0] ??
        null
    : relation;
}

function formatNameFromSlug(
  slug: string
) {
  return slug
    .split("-")
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getDoctorName(
  doctor:
    DoctorRelation
) {
  const profile =
    getFirstRelation(
      doctor.profile
    );

  const profileName = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const baseName =
    profileName ||
    formatNameFromSlug(
      doctor.slug
    );

  const title =
    doctor
      .doctor_translations
      ?.find(
        (
          translation
        ) =>
          translation.locale ===
          "ro"
      )?.title ??
    doctor
      .doctor_translations
      ?.[0]?.title ??
    null;

  return title
    ? `${baseName} — ${title}`
    : baseName;
}

function getClinicName(
  clinic:
    ClinicRelation
) {
  return (
    clinic
      .clinic_translations
      ?.find(
        (
          translation
        ) =>
          translation.locale ===
          "ro"
      )?.name ??
    clinic
      .clinic_translations
      ?.[0]?.name ??
    formatNameFromSlug(
      clinic.slug
    )
  );
}

function creationErrorResponse(
  error: {
    code?: string | null;
    message?: string | null;
  }
) {
  const normalized =
    (
      error.message ??
      ""
    ).toLowerCase();

  if (
    error.code ===
      "23P01" ||
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
          "Intervalul selectat este deja ocupat. Alege o altă dată sau oră.",
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

  return NextResponse.json(
    {
      error:
        "Programarea nu a putut fi creată.",
    },
    {
      status: 500,
    }
  );
}

async function requireStaff():
  Promise<
    | {
        authorization:
          StaffAuthorization;
        response: null;
      }
    | {
        authorization:
          null;
        response:
          NextResponse;
      }
  > {
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
      authorization:
        null,
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
    profile?.role !==
      "staff" ||
    profile.account_status !==
      "active"
  ) {
    return {
      authorization:
        null,
      response:
        NextResponse.json(
          {
            error:
              "Doar personalul activ poate administra programările.",
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
    data:
      assignments,
    error:
      assignmentError,
  } = await admin
    .from(
      "doctor_staff"
    )
    .select(
      "id, doctor_id, clinic_id"
    )
    .eq(
      "staff_profile_id",
      user.id
    )
    .eq(
      "status",
      "active"
    );

  if (
    assignmentError
  ) {
    return {
      authorization:
        null,
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
    authorization: {
      userId:
        user.id,
      assignments:
        (
          assignments ??
          []
        ) as
          StaffAssignment[],
    },
    response: null,
  };
}

export async function GET() {
  const result =
    await requireStaff();

  if (
    result.response ||
    !result.authorization
  ) {
    return (
      result.response ??
      NextResponse.json(
        {
          error:
            "Autorizarea personalului nu a putut fi verificată.",
        },
        {
          status: 500,
        }
      )
    );
  }

  const {
    assignments,
  } =
    result.authorization;

  if (
    assignments.length ===
    0
  ) {
    return NextResponse.json({
      appointments: [],
      assignments: [],
      doctorOptions: [],
    });
  }

  const doctorIds =
    Array.from(
      new Set(
        assignments.map(
          (
            assignment
          ) =>
            assignment
              .doctor_id
        )
      )
    );

  const admin =
    createAdminClient();

  const [
    appointmentResults,
    doctorsResult,
    clinicLinksResult,
  ] =
    await Promise.all([
      Promise.all(
        doctorIds.map(
          (
            doctorId
          ) =>
            admin
              .from(
                "appointments"
              )
              .select(`
                id,
                doctor_id,
                clinic_id,
                patient_profile_id,
                patient_name,
                patient_email,
                patient_phone,
                requested_date,
                requested_time,
                scheduled_date,
                scheduled_time,
                duration_minutes,
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
                doctorId
              )
        )
      ),

      admin
        .from(
          "doctors"
        )
        .select(`
          id,
          slug,
          status,
          profile:profiles!doctors_profile_id_fkey (
            first_name,
            last_name
          ),
          doctor_translations (
            locale,
            title
          )
        `)
        .in(
          "id",
          doctorIds
        ),

      admin
        .from(
          "doctor_clinics"
        )
        .select(`
          doctor_id,
          clinic_id,
          clinics!inner (
            id,
            slug,
            status,
            clinic_translations (
              locale,
              name
            )
          )
        `)
        .in(
          "doctor_id",
          doctorIds
        )
        .eq(
          "clinics.status",
          "approved"
        ),
    ]);

  const failedAppointmentResult =
    appointmentResults.find(
      (
        appointmentResult
      ) =>
        appointmentResult.error
    );

  if (
    failedAppointmentResult
      ?.error
  ) {
    console.error(
      "Staff appointment query failed:",
      failedAppointmentResult
        .error
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

  if (
    doctorsResult.error
  ) {
    console.error(
      "Staff doctor-option query failed:",
      doctorsResult.error
    );

    return NextResponse.json(
      {
        error:
          "Medicii disponibili nu au putut fi încărcați.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    clinicLinksResult.error
  ) {
    console.error(
      "Staff clinic-option query failed:",
      clinicLinksResult
        .error
    );

    return NextResponse.json(
      {
        error:
          "Clinicile disponibile nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const uniqueAppointments =
    new Map<
      string,
      AppointmentRow
    >();

  for (
    const appointmentResult
    of appointmentResults
  ) {
    for (
      const appointment
      of appointmentResult
        .data ??
      []
    ) {
      uniqueAppointments.set(
        appointment.id,
        appointment as unknown as
          AppointmentRow
      );
    }
  }

  const appointments =
    Array.from(
      uniqueAppointments
        .values()
    ).sort(
      (
        firstAppointment,
        secondAppointment
      ) => {
        const firstDate =
          firstAppointment
            .scheduled_date ??
          firstAppointment
            .requested_date;

        const secondDate =
          secondAppointment
            .scheduled_date ??
          secondAppointment
            .requested_date;

        const firstTime =
          firstAppointment
            .scheduled_time ??
          firstAppointment
            .requested_time ??
          "";

        const secondTime =
          secondAppointment
            .scheduled_time ??
          secondAppointment
            .requested_time ??
          "";

        return `${secondDate}T${secondTime}`
          .localeCompare(
            `${firstDate}T${firstTime}`
          );
      }
    );

  const clinicsByDoctor =
    new Map<
      string,
      Array<{
        id: string;
        name: string;
      }>
    >();

  for (
    const clinicLink
    of clinicLinksResult
      .data ??
    []
  ) {
    const clinic =
      getFirstRelation(
        clinicLink.clinics
      ) as
        ClinicRelation | null;

    if (!clinic) {
      continue;
    }

    const existingClinics =
      clinicsByDoctor.get(
        clinicLink
          .doctor_id
      ) ??
      [];

    if (
      !existingClinics.some(
        (
          option
        ) =>
          option.id ===
          clinic.id
      )
    ) {
      existingClinics.push({
        id:
          clinic.id,
        name:
          getClinicName(
            clinic
          ),
      });
    }

    clinicsByDoctor.set(
      clinicLink
        .doctor_id,
      existingClinics
    );
  }

  const doctorOptions =
    (
      doctorsResult
        .data ??
      []
    )
      .map(
        (
          doctorRow
        ) => {
          const doctor =
            doctorRow as unknown as
              DoctorRelation;

          return {
            id:
              doctor.id,
            name:
              getDoctorName(
                doctor
              ),
            status:
              doctor.status,
            clinics:
              (
                clinicsByDoctor.get(
                  doctor.id
                ) ??
                []
              ).sort(
                (
                  firstClinic,
                  secondClinic
                ) =>
                  firstClinic
                    .name
                    .localeCompare(
                      secondClinic
                        .name,
                      "ro"
                    )
              ),
          };
        }
      )
      .filter(
        (
          doctor
        ) =>
          ![
            "suspended",
            "rejected",
          ].includes(
            doctor.status
          ) &&
          doctor.clinics
            .length >
            0
      )
      .map(
        ({
          id,
          name,
          clinics,
        }) => ({
          id,
          name,
          clinics,
        })
      )
      .sort(
        (
          firstDoctor,
          secondDoctor
        ) =>
          firstDoctor
            .name
            .localeCompare(
              secondDoctor
                .name,
              "ro"
            )
      );

  return NextResponse.json({
    appointments,
    assignments,
    doctorOptions,
  });
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireStaff();

  if (
    result.response ||
    !result.authorization
  ) {
    return (
      result.response ??
      NextResponse.json(
        {
          error:
            "Autorizarea personalului nu a putut fi verificată.",
        },
        {
          status: 500,
        }
      )
    );
  }

  let body:
    StaffCreateAppointmentBody;

  try {
    body =
      (await request.json()) as
        StaffCreateAppointmentBody;
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

  const doctorId =
    normalizeString(
      body.doctorId
    );

  const clinicId =
    normalizeString(
      body.clinicId
    );

  const patientName =
    normalizeString(
      body.patientName
    );

  const patientEmail =
    normalizeString(
      body.patientEmail
    ).toLowerCase();

  const patientPhone =
    normalizeString(
      body.patientPhone
    );

  const scheduledDate =
    normalizeString(
      body.scheduledDate
    );

  const rawScheduledTime =
    normalizeString(
      body.scheduledTime
    );

  const source =
    normalizeString(
      body.source
    ) as
      AppointmentSource;

  const notes =
    normalizeString(
      body.notes
    ) ||
    null;

  if (
    !isUuid(
      doctorId
    ) ||
    !isUuid(
      clinicId
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Medicul sau clinica nu este validă.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    patientName.length <
    2
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu un nume valid.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isValidEmail(
      patientEmail
    )
  ) {
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

  if (
    patientPhone.length <
    7
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu un număr de telefon valid.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isTodayOrFuture(
      scheduledDate
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Selectează o dată validă, începând de astăzi.",
      },
      {
        status: 400,
      }
    );
  }

  const scheduledTime =
    normalizeTime(
      rawScheduledTime
    );

  if (!scheduledTime) {
    return NextResponse.json(
      {
        error:
          "Ora programării nu este validă.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !allowedSources.includes(
      source
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Sursa programării nu este validă.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    notes &&
    notes.length >
      5000
  ) {
    return NextResponse.json(
      {
        error:
          "Observațiile sunt prea lungi.",
      },
      {
        status: 400,
      }
    );
  }

  const authorizedDoctorIds =
    new Set(
      result.authorization
        .assignments
        .map(
          (
            assignment
          ) =>
            assignment
              .doctor_id
        )
    );

  if (
    !authorizedDoctorIds.has(
      doctorId
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Nu ai permisiunea de a crea programări pentru acest medic.",
      },
      {
        status: 403,
      }
    );
  }

  const admin =
    createAdminClient();

  const [
    doctorResult,
    clinicLinkResult,
  ] =
    await Promise.all([
      admin
        .from(
          "doctors"
        )
        .select(`
          id,
          slug,
          status,
          profile:profiles!doctors_profile_id_fkey (
            first_name,
            last_name
          ),
          doctor_translations (
            locale,
            title
          )
        `)
        .eq(
          "id",
          doctorId
        )
        .maybeSingle(),

      admin
        .from(
          "doctor_clinics"
        )
        .select(`
          doctor_id,
          clinic_id,
          clinics!inner (
            id,
            slug,
            status,
            clinic_translations (
              locale,
              name
            )
          )
        `)
        .eq(
          "doctor_id",
          doctorId
        )
        .eq(
          "clinic_id",
          clinicId
        )
        .eq(
          "clinics.status",
          "approved"
        )
        .maybeSingle(),
    ]);

  if (
    doctorResult.error ||
    !doctorResult.data
  ) {
    return NextResponse.json(
      {
        error:
          "Profilul medicului nu a putut fi verificat.",
      },
      {
        status: 404,
      }
    );
  }

  const doctor =
    doctorResult
      .data as unknown as
      DoctorRelation;

  if (
    [
      "suspended",
      "rejected",
    ].includes(
      doctor.status
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Profilul medicului nu poate primi programări în acest moment.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    clinicLinkResult
      .error ||
    !clinicLinkResult
      .data
  ) {
    return NextResponse.json(
      {
        error:
          "Clinica selectată nu este o clinică aprobată asociată medicului.",
      },
      {
        status: 403,
      }
    );
  }

  const clinic =
    getFirstRelation(
      clinicLinkResult
        .data
        .clinics
    ) as
      ClinicRelation | null;

  if (!clinic) {
    return NextResponse.json(
      {
        error:
          "Datele clinicii selectate nu sunt disponibile.",
      },
      {
        status: 500,
      }
    );
  }

  const appointmentId =
    randomUUID();

  const createdAt =
    new Date()
      .toISOString();

  const appointment = {
    id:
      appointmentId,
    doctor_id:
      doctorId,
    clinic_id:
      clinicId,
    created_by_profile_id:
      result.authorization
        .userId,
    source,
    patient_name:
      patientName,
    patient_email:
      patientEmail,
    patient_phone:
      patientPhone,
    requested_date:
      scheduledDate,
    requested_time:
      scheduledTime,
    scheduled_date:
      scheduledDate,
    scheduled_time:
      scheduledTime,
    reschedule_reason:
      null,
    notes,
    status:
      "confirmed" as const,
    created_at:
      createdAt,
  };

  const {
    error:
      appointmentError,
  } = await admin
    .from(
      "appointments"
    )
    .insert(
      appointment
    );

  if (
    appointmentError
  ) {
    console.error(
      "Staff-created appointment insert failed:",
      appointmentError
    );

    return creationErrorResponse(
      appointmentError
    );
  }

  const doctorName =
    getDoctorName(
      doctor
    );

  const clinicName =
    getClinicName(
      clinic
    );

  const [
    emailResult,
    smsResult,
  ] =
    await Promise.all([
      sendAppointmentStatusEmail({
        appointmentId,
        status:
          "confirmed",
        patientName,
        patientEmail,
        doctorName,
        clinicName,
        scheduledDate,
        scheduledTime,
        rescheduleReason:
          null,
      }),
      sendAppointmentSms({
        appointmentId,
        event:
          "confirmed",
        triggeredByProfileId:
          result.authorization
            .userId,
      }),
    ]);

  if (
    !emailResult.sent
  ) {
    console.error(
      `Staff-created appointment ${appointmentId} was saved, but its confirmation email was not sent.`
    );
  }

  if (
    !smsResult.sent &&
    !smsResult.skipped
  ) {
    console.error(
      `Staff-created appointment ${appointmentId} was saved, but its confirmation SMS was not sent.`
    );
  }

  return NextResponse.json(
    {
      success: true,
      appointment,
      emailSent:
        emailResult.sent,
      smsSent:
        smsResult.sent,
      smsSkipped:
        smsResult.skipped,
    },
    {
      status: 201,
    }
  );
}
