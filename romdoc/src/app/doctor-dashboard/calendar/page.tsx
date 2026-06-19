import { redirect } from "next/navigation";
import AppointmentCalendar, {
  type DoctorCalendarAppointment,
} from "@/components/doctor/appointment-calendar";
import { createClient } from "@/lib/supabase/server";

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  slug: string;
  clinic_translations: ClinicTranslation[] | null;
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
  status: string;
  source: string;
  notes: string | null;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

function getFirstRelation<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatNameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part: string) => {
      return (
        part.charAt(0).toUpperCase() +
        part.slice(1)
      );
    })
    .join(" ");
}

function getClinicName(
  clinic: ClinicRelation | null
) {
  if (!clinic) {
    return "Clinică indisponibilă";
  }

  const romanianTranslation =
    clinic.clinic_translations?.find(
      (translation: ClinicTranslation) =>
        translation.locale === "ro"
    );

  const fallbackTranslation =
    clinic.clinic_translations?.[0];

  return (
    romanianTranslation?.name ??
    fallbackTranslation?.name ??
    formatNameFromSlug(clinic.slug)
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
  ].includes(status);
}

export default async function DoctorCalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Doctor calendar profile query failed:",
      profileError
    );
  }

  if (!profile || profile.role !== "doctor") {
    redirect("/");
  }

  const {
    data: doctor,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select("id, slug, status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError) {
    console.error(
      "Doctor calendar ownership query failed:",
      doctorError
    );
  }

  if (!doctor) {
    return (
      <main className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
            Contul tău nu este asociat unui profil de medic.
          </div>
        </div>
      </main>
    );
  }

  const {
    data,
    error: appointmentsError,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_name,
      patient_email,
      patient_phone,
      requested_date,
      requested_time,
      scheduled_date,
      scheduled_time,
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
    .eq("doctor_id", doctor.id)
    .order("scheduled_date", {
      ascending: true,
    })
    .order("scheduled_time", {
      ascending: true,
    });

  if (appointmentsError) {
    console.error(
      "Doctor calendar appointments query failed:",
      appointmentsError
    );
  }

  const rows =
    (data as unknown as
      | CalendarAppointmentRow[]
      | null) ?? [];

  const appointments: DoctorCalendarAppointment[] =
    rows
      .map(
        (
          row: CalendarAppointmentRow
        ): DoctorCalendarAppointment | null => {
          const date =
            row.scheduled_date ??
            row.requested_date;

          const time =
            row.scheduled_time ??
            row.requested_time;

          if (
            !date ||
            !isAppointmentStatus(row.status)
          ) {
            return null;
          }

          const clinic = getFirstRelation(
            row.clinics
          );

          return {
            id: row.id,
            patientName: row.patient_name,
            patientEmail: row.patient_email,
            patientPhone: row.patient_phone,
            clinicName: getClinicName(clinic),
            date,
            time,
            status: row.status,
            source: row.source,
            notes: row.notes,
          };
        }
      )
      .filter(
        (
          appointment:
            | DoctorCalendarAppointment
            | null
        ): appointment is DoctorCalendarAppointment =>
          appointment !== null
      );

  const displayName =
    profile.first_name || profile.last_name
      ? [
          profile.first_name,
          profile.last_name,
        ]
          .filter(Boolean)
          .join(" ")
      : formatNameFromSlug(doctor.slug);

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-medium text-gray-500">
            Panou medic
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Calendar programări
          </h1>

          <p className="mt-3 text-gray-600">
            {displayName}, poți vizualiza programările
            tale pe zi, săptămână, lună sau an.
          </p>
        </header>

        {doctor.status !== "active" && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Profilul medicului are momentan starea{" "}
            <strong>{doctor.status}</strong>.
          </div>
        )}

        <section className="mt-10">
          {appointmentsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800">
              Calendarul nu a putut fi încărcat.
            </div>
          ) : (
            <AppointmentCalendar
              appointments={appointments}
            />
          )}
        </section>
      </div>
    </main>
  );
}