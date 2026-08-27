import {
  redirect,
} from "next/navigation";

import DoctorPatientsTable, {
  type DoctorPatientDatabaseRow,
  type DoctorPatientHistoryItem,
} from "@/components/doctor/doctor-patients-table";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

type DoctorPatientRow = {
  id: string;
  patient_profile_id:
    | string
    | null;
  display_name: string;
  email:
    | string
    | null;
  phone:
    | string
    | null;
  source: string;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  patient_profile_id:
    | string
    | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  requested_date: string;
  requested_time:
    | string
    | null;
  scheduled_date:
    | string
    | null;
  scheduled_time:
    | string
    | null;
  status: string;
  created_at: string;
};

function normalizeName(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

function normalizeEmail(
  value:
    | string
    | null
    | undefined
) {
  return (
    value ??
    ""
  )
    .trim()
    .toLowerCase();
}

function normalizePhone(
  value:
    | string
    | null
    | undefined
) {
  return (
    value ??
    ""
  ).replace(
    /\D/g,
    ""
  );
}

function appointmentTimestamp(
  appointment:
    AppointmentRow
) {
  const date =
    appointment
      .scheduled_date ??
    appointment
      .requested_date;

  const time =
    appointment
      .scheduled_time ??
    appointment
      .requested_time ??
    "00:00:00";

  return new Date(
    `${date}T${time.slice(0, 8)}`
  ).getTime();
}

function appointmentMatchesPatient(
  appointment:
    AppointmentRow,
  patient:
    DoctorPatientRow
) {
  if (
    patient.patient_profile_id &&
    appointment.patient_profile_id ===
      patient.patient_profile_id
  ) {
    return true;
  }

  if (
    normalizeName(
      appointment.patient_name
    ) !==
    normalizeName(
      patient.display_name
    )
  ) {
    return false;
  }

  const patientEmail =
    normalizeEmail(
      patient.email
    );

  const appointmentEmail =
    normalizeEmail(
      appointment.patient_email
    );

  const patientPhone =
    normalizePhone(
      patient.phone
    );

  const appointmentPhone =
    normalizePhone(
      appointment.patient_phone
    );

  return (
    Boolean(
      patientEmail &&
      appointmentEmail &&
      patientEmail ===
        appointmentEmail
    ) ||
    Boolean(
      patientPhone &&
      appointmentPhone &&
      patientPhone ===
        appointmentPhone
    )
  );
}

async function loadAllDoctorPatients(
  supabase:
    Awaited<
      ReturnType<
        typeof createClient
      >
    >,
  doctorId: string
) {
  const rows:
    DoctorPatientRow[] = [];

  const batchSize = 1000;
  let from = 0;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "doctor_patients"
        )
        .select(
          "id, patient_profile_id, display_name, email, phone, source, created_at"
        )
        .eq(
          "doctor_id",
          doctorId
        )
        .order(
          "display_name",
          {
            ascending: true,
          }
        )
        .range(
          from,
          from +
            batchSize -
            1
        );

    if (error) {
      throw error;
    }

    const batch =
      (
        data as
          DoctorPatientRow[] |
          null
      ) ??
      [];

    rows.push(
      ...batch
    );

    if (
      batch.length <
      batchSize
    ) {
      break;
    }

    from +=
      batchSize;
  }

  return rows;
}

async function loadAllDoctorAppointments(
  supabase:
    Awaited<
      ReturnType<
        typeof createClient
      >
    >,
  doctorId: string
) {
  const rows:
    AppointmentRow[] = [];

  const batchSize = 1000;
  let from = 0;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "appointments"
        )
        .select(
          "id, patient_profile_id, patient_name, patient_email, patient_phone, requested_date, requested_time, scheduled_date, scheduled_time, status, created_at"
        )
        .eq(
          "doctor_id",
          doctorId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .range(
          from,
          from +
            batchSize -
            1
        );

    if (error) {
      throw error;
    }

    const batch =
      (
        data as
          AppointmentRow[] |
          null
      ) ??
      [];

    rows.push(
      ...batch
    );

    if (
      batch.length <
      batchSize
    ) {
      break;
    }

    from +=
      batchSize;
  }

  return rows;
}

export default async function
DoctorPatientsPage() {
  const locale =
    await getStoredAppLocale();

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      `/login?locale=${locale}&next=/doctor-dashboard/patients`
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
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
      "doctor" ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data:
      doctor,
    error:
      doctorError,
  } =
    await supabase
      .from(
        "doctors"
      )
      .select(
        "id, account_type"
      )
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

  if (
    doctorError ||
    !doctor
  ) {
    redirect(
      "/doctor-dashboard"
    );
  }

  let patientRows:
    DoctorPatientRow[] = [];

  let appointmentRows:
    AppointmentRow[] = [];

  let loadError = false;

  try {
    [
      patientRows,
      appointmentRows,
    ] =
      await Promise.all([
        loadAllDoctorPatients(
          supabase,
          doctor.id
        ),
        loadAllDoctorAppointments(
          supabase,
          doctor.id
        ),
      ]);
  } catch (error) {
    console.error(
      "Doctor patient database load failed:",
      error
    );

    loadError = true;
  }

  const now =
    Date.now();

  const patients:
    DoctorPatientDatabaseRow[] =
    patientRows.map(
      (
        patient
      ) => {
        const matching =
          appointmentRows
            .filter(
              (
                appointment
              ) =>
                appointmentMatchesPatient(
                  appointment,
                  patient
                )
            )
            .sort(
              (
                first,
                second
              ) =>
                appointmentTimestamp(
                  second
                ) -
                appointmentTimestamp(
                  first
                )
            );

        const history:
          DoctorPatientHistoryItem[] =
          matching.map(
            (
              appointment
            ) => ({
              id:
                appointment.id,
              date:
                appointment
                  .scheduled_date ??
                appointment
                  .requested_date,
              time:
                appointment
                  .scheduled_time ??
                appointment
                  .requested_time,
              status:
                appointment.status,
            })
          );

        const past =
          matching.find(
            (
              appointment
            ) =>
              appointmentTimestamp(
                appointment
              ) <= now
          ) ??
          null;

        const next =
          [...matching]
            .filter(
              (
                appointment
              ) =>
                [
                  "pending",
                  "confirmed",
                  "rescheduled",
                ].includes(
                  appointment.status
                ) &&
                appointmentTimestamp(
                  appointment
                ) >=
                  now
            )
            .sort(
              (
                first,
                second
              ) =>
                appointmentTimestamp(
                  first
                ) -
                appointmentTimestamp(
                  second
                )
            )[0] ??
          null;

        const medicalAppointment =
          patient.patient_profile_id
            ? matching.find(
                (
                  appointment
                ) =>
                  appointment.patient_profile_id ===
                    patient.patient_profile_id &&
                  [
                    "confirmed",
                    "rescheduled",
                    "completed",
                  ].includes(
                    appointment.status
                  )
              ) ??
              null
            : null;

        const messageAppointment =
          patient.patient_profile_id
            ? matching.find(
                (
                  appointment
                ) =>
                  appointment.patient_profile_id ===
                    patient.patient_profile_id &&
                  [
                    "pending",
                    "confirmed",
                    "rescheduled",
                    "completed",
                  ].includes(
                    appointment.status
                  )
              ) ??
              null
            : null;

        return {
          id:
            patient.id,
          displayName:
            patient
              .display_name,
          email:
            patient.email,
          phone:
            patient.phone,
          patientProfileId:
            patient
              .patient_profile_id,
          source:
            patient.source,
          createdAt:
            patient
              .created_at,
          lastAppointment:
            past
              ? {
                  date:
                    past.scheduled_date ??
                    past.requested_date,
                  time:
                    past.scheduled_time ??
                    past.requested_time,
                }
              : null,
          nextAppointment:
            next
              ? {
                  date:
                    next.scheduled_date ??
                    next.requested_date,
                  time:
                    next.scheduled_time ??
                    next.requested_time,
                }
              : null,
          medicalAppointmentId:
            medicalAppointment
              ?.id ??
            null,
          messageAppointmentId:
            messageAppointment
              ?.id ??
            null,
          history,
        };
      }
    );

  return (
    <main className="min-h-screen">
      <DoctorPatientsTable
        patients={
          patients
        }
        loadError={
          loadError
        }
      />
    </main>
  );
}
