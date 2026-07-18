import {
  redirect,
} from "next/navigation";

import AppointmentCalendar, {
  type DoctorCalendarAppointment,
} from "@/components/doctor/appointment-calendar";
import {
  createClient,
} from "@/lib/supabase/server";

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  slug: string;
  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type CalendarAppointmentRow = {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;

  requested_date: string | null;
  requested_time: string | null;

  scheduled_date: string | null;
  scheduled_time: string | null;

  reschedule_reason: string | null;
  status: string;
  source: string;
  notes: string | null;

  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

function getFirstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    !relation
  ) {
    return null;
  }

  if (
    Array.isArray(
      relation
    )
  ) {
    return (
      relation[0] ??
      null
    );
  }

  return relation;
}

function formatNameFromSlug(
  slug: string
) {
  return slug
    .split("-")
    .map(
      (
        part
      ) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getClinicName(
  clinic: ClinicRelation | null
) {
  if (
    !clinic
  ) {
    return "Clinică indisponibilă";
  }

  const romanianTranslation =
    clinic.clinic_translations?.find(
      (
        translation
      ) =>
        translation.locale ===
        "ro"
    );

  const fallbackTranslation =
    clinic.clinic_translations?.[0];

  return (
    romanianTranslation?.name ??
    fallbackTranslation?.name ??
    formatNameFromSlug(
      clinic.slug
    )
  );
}

function isAppointmentStatus(
  status: string
): status is DoctorCalendarAppointment["status"] {
  return [
    "pending",
    "confirmed",
    "rescheduled",
    "completed",
    "cancelled",
    "no_show",
  ].includes(
    status
  );
}

export default async function DoctorCalendarPage() {
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
    redirect(
      "/login"
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } = await supabase
    .from(
      "profiles"
    )
    .select(
      "role, account_status, first_name, last_name"
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
      "Doctor calendar profile query failed:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !==
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
  } = await supabase
    .from(
      "doctors"
    )
    .select(
      "id, slug, status"
    )
    .eq(
      "profile_id",
      user.id
    )
    .maybeSingle();

  if (
    doctorError
  ) {
    console.error(
      "Doctor calendar ownership query failed:",
      doctorError
    );
  }

  if (
    !doctor
  ) {
    return (
      <main className="px-[13px] py-[34px] sm:px-[21px] sm:py-[55px]">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[21px] border border-amber-200 bg-amber-50 p-[21px] text-amber-900">
            <h1 className="text-xl font-bold">
              Profil de medic indisponibil
            </h1>

            <p className="mt-[8px] text-sm leading-6">
              Contul tău este activ, dar nu este asociat unui profil de medic. Contactează suportul RomDoc.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const {
    data,
    error:
      appointmentsError,
  } = await supabase
    .from(
      "appointments"
    )
    .select(`
      id,
      patient_name,
      patient_email,
      patient_phone,
      requested_date,
      requested_time,
      scheduled_date,
      scheduled_time,
      reschedule_reason,
      status,
      source,
      notes,
      clinics (
        slug,
        clinic_translations (
          locale,
          name
        )
      )
    `)
    .eq(
      "doctor_id",
      doctor.id
    )
    .order(
      "scheduled_date",
      {
        ascending:
          true,
        nullsFirst:
          false,
      }
    )
    .order(
      "scheduled_time",
      {
        ascending:
          true,
        nullsFirst:
          false,
      }
    )
    .order(
      "requested_date",
      {
        ascending:
          true,
        nullsFirst:
          false,
      }
    );

  if (
    appointmentsError
  ) {
    console.error(
      "Doctor calendar appointments query failed:",
      appointmentsError
    );
  }

  const rows =
    (
      data as unknown as
        | CalendarAppointmentRow[]
        | null
    ) ??
    [];

  const appointments:
    DoctorCalendarAppointment[] =
      rows
        .map(
          (
            row
          ):
            | DoctorCalendarAppointment
            | null => {
            if (
              !row.requested_date ||
              !isAppointmentStatus(
                row.status
              )
            ) {
              return null;
            }

            const calendarDate =
              row.scheduled_date ??
              row.requested_date;

            const calendarTime =
              row.scheduled_time ??
              row.requested_time;

            const clinic =
              getFirstRelation(
                row.clinics
              );

            return {
              id:
                row.id,
              patientName:
                row.patient_name,
              patientEmail:
                row.patient_email,
              patientPhone:
                row.patient_phone,

              clinicName:
                getClinicName(
                  clinic
                ),

              requestedDate:
                row.requested_date,
              requestedTime:
                row.requested_time,

              scheduledDate:
                row.scheduled_date,
              scheduledTime:
                row.scheduled_time,

              calendarDate,
              calendarTime,

              rescheduleReason:
                row.reschedule_reason,

              status:
                row.status,
              source:
                row.source,
              notes:
                row.notes,
            };
          }
        )
        .filter(
          (
            appointment
          ): appointment is DoctorCalendarAppointment =>
            appointment !==
            null
        );

  const displayName =
    profile.first_name ||
    profile.last_name
      ? [
          profile.first_name,
          profile.last_name,
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          )
      : formatNameFromSlug(
          doctor.slug
        );

  return (
    <main className="px-[13px] py-[34px] sm:px-[21px] sm:py-[55px]">
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-[#036661]">
            Panou medic
          </p>

          <h1 className="mt-[8px] text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Calendar și agendă
          </h1>

          <p className="mt-[13px] text-sm leading-6 text-gray-600 sm:text-base">
            {displayName}, folosește agenda pentru o listă simplă pe telefon sau alege vizualizarea pe zi, săptămână ori lună pe desktop.
          </p>
        </header>

        {doctor.status !==
          "active" && (
          <div className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm text-amber-900">
            Profilul medicului are momentan starea{" "}
            <strong>
              {
                doctor.status
              }
            </strong>
            .
          </div>
        )}

        <section className="mt-[34px]">
          {appointmentsError ? (
            <div
              role="alert"
              className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-red-900"
            >
              <h2 className="text-lg font-bold">
                Calendarul nu a putut fi încărcat
              </h2>

              <p className="mt-[8px] text-sm leading-6">
                Reîncarcă pagina. Dacă problema persistă, programările pot fi administrate în continuare din pagina „Programări”.
              </p>

              <div className="mt-[13px] flex flex-wrap gap-[8px]">
                <a
                  href="/doctor-dashboard/calendar"
                  className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] bg-red-700 px-[13px] py-[8px] text-sm font-semibold text-white hover:bg-red-800"
                >
                  Reîncarcă
                </a>

                <a
                  href="/doctor-dashboard/appointments"
                  className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] border border-red-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-red-800"
                >
                  Deschide programările
                </a>
              </div>
            </div>
          ) : (
            <AppointmentCalendar
              appointments={
                appointments
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}
