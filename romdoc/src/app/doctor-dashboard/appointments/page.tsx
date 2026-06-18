import { redirect } from "next/navigation";
import AppointmentActions from "@/components/admin/appointment-actions";
import { createClient } from "@/lib/supabase/server";

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  slug: string;
  clinic_translations: ClinicTranslation[] | null;
};

type Appointment = {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  reschedule_reason: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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

function formatDoctorName(slug: string) {
  return slug
    .split("-")
    .map((part: string) => {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatCreatedAt(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "Confirmată";

    case "rescheduled":
      return "Reprogramată";

    case "cancelled":
      return "Anulată";

    case "completed":
      return "Finalizată";

    default:
      return "În așteptare";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800";

    case "rescheduled":
      return "bg-blue-100 text-blue-800";

    case "cancelled":
      return "bg-red-100 text-red-800";

    case "completed":
      return "bg-gray-200 text-gray-800";

    default:
      return "bg-amber-100 text-amber-800";
  }
}

export default async function DoctorAppointmentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Doctor dashboard profile query failed:",
      profileError
    );
  }

  if (!profile || profile.role !== "doctor") {
    redirect("/");
  }

  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, slug, status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError) {
    console.error(
      "Doctor dashboard ownership query failed:",
      doctorError
    );
  }

  const displayName =
    profile.first_name || profile.last_name
      ? [profile.first_name, profile.last_name]
          .filter(Boolean)
          .join(" ")
      : doctor
        ? formatDoctorName(doctor.slug)
        : "Medic";

  if (!doctor) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <header>
            <p className="text-sm font-medium text-gray-500">
              Panou medic
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              Programările mele
            </h1>
          </header>

          <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <h2 className="text-xl font-semibold text-amber-900">
              Contul nu este asociat unui profil de medic
            </h2>

            <p className="mt-3 leading-7 text-amber-800">
              Contul tău are rolul de medic, dar nu este încă asociat
              unui profil din directorul RomDoc.
            </p>

            <p className="mt-3 leading-7 text-amber-800">
              Un administrator trebuie să completeze câmpul{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5">
                doctors.profile_id
              </code>{" "}
              cu ID-ul profilului tău.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const { data, error: appointmentsError } = await supabase
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
      reschedule_reason,
      notes,
      status,
      created_at,
      updated_at,
      clinics (
        slug,
        clinic_translations (
          locale,
          name
        )
      )
    `)
    .eq("doctor_id", doctor.id)
    .order("created_at", {
      ascending: false,
    });

  if (appointmentsError) {
    console.error(
      "Doctor appointments query failed:",
      appointmentsError
    );
  }

  const appointments =
    (data as unknown as Appointment[] | null) ?? [];

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-medium text-gray-500">
            Panou medic
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Programările mele
          </h1>

          <p className="mt-3 text-gray-600">
            Bun venit, {displayName}. Aici poți confirma, reprograma,
            finaliza sau anula programările pacienților tăi.
          </p>
        </header>

        {doctor.status !== "active" && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Profilul tău de medic are momentan starea{" "}
            <strong>{doctor.status}</strong>. Poți vedea programările
            existente, dar activarea publică a profilului este gestionată
            separat de administrator.
          </div>
        )}

        <section className="mt-10">
          {appointmentsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
              Programările nu au putut fi încărcate. Verifică politicile
              Supabase și încearcă din nou.
            </div>
          ) : appointments.length > 0 ? (
            <div className="space-y-5">
              {appointments.map((appointment: Appointment) => {
                const clinic = getFirstRelation(
                  appointment.clinics
                );

                const clinicTranslation =
                  clinic?.clinic_translations?.find(
                    (translation: ClinicTranslation) =>
                      translation.locale === "ro"
                  );

                return (
                  <article
                    key={appointment.id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {appointment.patient_name}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          Cerere trimisă la{" "}
                          {formatCreatedAt(
                            appointment.created_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClasses(
                          appointment.status
                        )}`}
                      >
                        {getStatusLabel(
                          appointment.status
                        )}
                      </span>
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Clinica
                        </p>

                        <p className="mt-1 text-gray-900">
                          {clinicTranslation?.name ??
                            "Clinică indisponibilă"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Data solicitată
                        </p>

                        <p className="mt-1 text-gray-900">
                          {formatDate(
                            appointment.requested_date
                          )}

                          {appointment.requested_time
                            ? `, ${appointment.requested_time.slice(
                                0,
                                5
                              )}`
                            : ""}
                        </p>
                      </div>

                      {appointment.scheduled_date && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Data confirmată
                          </p>

                          <p className="mt-1 font-medium text-gray-900">
                            {formatDate(
                              appointment.scheduled_date
                            )}

                            {appointment.scheduled_time
                              ? `, ${appointment.scheduled_time.slice(
                                  0,
                                  5
                                )}`
                              : ""}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Telefon
                        </p>

                        <a
                          href={`tel:${appointment.patient_phone.replace(
                            /\s+/g,
                            ""
                          )}`}
                          className="mt-1 block text-gray-900 underline-offset-4 hover:underline"
                        >
                          {appointment.patient_phone}
                        </a>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          E-mail
                        </p>

                        <a
                          href={`mailto:${appointment.patient_email}`}
                          className="mt-1 block break-all text-gray-900 underline-offset-4 hover:underline"
                        >
                          {appointment.patient_email}
                        </a>
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="mt-6 rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Mesaj pacient
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-gray-700">
                          {appointment.notes}
                        </p>
                      </div>
                    )}

                    {appointment.reschedule_reason && (
                      <div className="mt-4 rounded-xl bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Motivul reprogramării
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-blue-900">
                          {appointment.reschedule_reason}
                        </p>
                      </div>
                    )}

                    <AppointmentActions
                      appointmentId={appointment.id}
                      currentStatus={appointment.status}
                      requestedDate={
                        appointment.requested_date
                      }
                      requestedTime={
                        appointment.requested_time
                      }
                      scheduledDate={
                        appointment.scheduled_date
                      }
                      scheduledTime={
                        appointment.scheduled_time
                      }
                      currentReason={
                        appointment.reschedule_reason
                      }
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">
              Nu există încă cereri de programare pentru profilul tău.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}