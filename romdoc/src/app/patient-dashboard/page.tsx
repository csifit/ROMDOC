import Link from "next/link";
import { redirect } from "next/navigation";
import PatientAppointmentLifecycle from "@/components/patient/patient-appointment-lifecycle";
import PatientFolderShortcut from "@/components/patient/patient-folder-shortcut";
import PatientReminderPreferencesShortcut from "@/components/patient/patient-reminder-preferences-shortcut";
import PatientReviewForm from "@/components/reviews/patient-review-form";
import RatingStars from "@/components/reviews/rating-stars";
import { createClient } from "@/lib/supabase/server";

type DoctorTranslation = {
  locale: string;
  title: string | null;
};

type SpecialtyTranslation = {
  locale: string;
  name: string;
};

type SpecialtyRelation = {
  id: string;
  slug: string;
  specialty_translations:
    | SpecialtyTranslation[]
    | null;
};

type DoctorSpecialtyRelation = {
  specialties:
    | SpecialtyRelation
    | SpecialtyRelation[]
    | null;
};

type DoctorRelation = {
  id: string;
  slug: string;
  doctor_translations:
    | DoctorTranslation[]
    | null;
  doctor_specialties:
    | DoctorSpecialtyRelation[]
    | null;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  id: string;
  slug: string;
  formatted_address:
    | string
    | null;
  street_address:
    | string
    | null;
  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type ReviewRelation = {
  id: string;
  rating: number;
  review_text: string | null;
  status: string;
  created_at: string;
};

type Appointment = {
  id: string;
  doctor_id: string;
  clinic_id: string;
  patient_name: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  medical_notes: string | null;
  created_at: string;
  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
  reviews: ReviewRelation[] | null;
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

function formatDoctorName(
  slug: string
) {
  return slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getDoctorName(
  doctor: DoctorRelation | null
) {
  if (!doctor) {
    return "Medic indisponibil";
  }

  return formatDoctorName(
    doctor.slug
  );
}

function getDoctorTitle(
  doctor: DoctorRelation | null
) {
  return (
    doctor?.doctor_translations?.find(
      (translation) =>
        translation.locale === "ro"
    )?.title ??
    doctor?.doctor_translations?.[0]
      ?.title ??
    null
  );
}

function getSpecialtyName(
  doctor: DoctorRelation | null
) {
  const doctorSpecialty =
    doctor?.doctor_specialties?.[0];

  const specialty =
    getFirstRelation(
      doctorSpecialty?.specialties
    );

  return (
    specialty?.specialty_translations?.find(
      (translation) =>
        translation.locale === "ro"
    )?.name ??
    specialty?.specialty_translations?.[0]
      ?.name ??
    "Specialitate indisponibilă"
  );
}

function getClinicName(
  clinic: ClinicRelation | null
) {
  return (
    clinic?.clinic_translations?.find(
      (translation) =>
        translation.locale === "ro"
    )?.name ??
    clinic?.clinic_translations?.[0]
      ?.name ??
    "Clinică indisponibilă"
  );
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

function formatCreatedAt(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}

function formatTime(
  value: string | null
) {
  return value
    ? value.slice(0, 5)
    : "—";
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "confirmed":
      return "Confirmată";

    case "rescheduled":
      return "Reprogramată";

    case "no_show":
      return "Neprezentare";

    case "completed":
      return "Finalizată";

    case "cancelled":
      return "Anulată";

    default:
      return "În așteptare";
  }
}

function getStatusClasses(
  status: string
) {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800";

    case "rescheduled":
      return "bg-blue-100 text-blue-800";

    case "completed":
      return "bg-gray-200 text-gray-800";

    case "no_show":
      return "bg-orange-100 text-orange-900";
    
    case "cancelled":
      return "bg-red-100 text-red-800";

    default:
      return "bg-amber-100 text-amber-900";
  }
}

function getReviewStatusLabel(
  status: string
) {
  switch (status) {
    case "published":
      return "Publicată";

    case "hidden":
      return "Ascunsă de administrator";

    case "removed":
      return "Eliminată";

    default:
      return "În verificare";
  }
}

function getReviewStatusClasses(
  status: string
) {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800";

    case "hidden":
      return "bg-amber-100 text-amber-900";

    case "removed":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-200 text-gray-700";
  }
}

export default async function PatientDashboardPage() {
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
    redirect(
      "/login?next=/patient-dashboard"
    );
  }

  if (!user.email_confirmed_at) {
    redirect("/check-email");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/dashboard");
  }

  if (
    profile.role !== "patient"
  ) {
    redirect("/dashboard");
  }

  const {
    data,
    error,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      doctor_id,
      clinic_id,
      patient_name,
      requested_date,
      requested_time,
      scheduled_date,
      scheduled_time,
      status,
      notes,
      medical_notes,
      created_at,
      doctors (
        id,
        slug,
        doctor_translations (
          locale,
          title
        ),
        doctor_specialties (
          specialties (
            id,
            slug,
            specialty_translations (
              locale,
              name
            )
          )
        )
      ),
      clinics (
        id,
        slug,
        formatted_address,
        street_address,
        clinic_translations (
          locale,
          name
        )
      ),
      reviews (
        id,
        rating,
        review_text,
        status,
        created_at
      )
    `)
    .eq(
      "patient_profile_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      "Patient appointments query failed:",
      error
    );
  }

  const appointments =
    (data as unknown as
      | Appointment[]
      | null) ?? [];

  const patientName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-[#036661]">
            Cont pacient
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Programările mele
          </h1>

          <p className="mt-3 text-sm text-gray-600">
            {patientName
              ? `Bun venit, ${patientName}.`
              : "Bun venit în contul tău RomDoc."}
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Vezi istoricul programărilor, notele medicale disponibile
            și publică o recenzie după finalizarea consultației.
          </p>
        </header>

        <PatientFolderShortcut />

        <PatientReminderPreferencesShortcut />

        <section className="mt-8">
          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                Nu ai încă programări
              </h2>

              <p className="mt-3 text-sm text-gray-600">
                Caută un medic și trimite prima solicitare de programare.
              </p>

              <Link
                href="/medici"
                className="romdoc-button romdoc-button-primary mt-5"
              >
                Caută medici
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {appointments.map(
                (appointment) => {
                  const doctor =
                    getFirstRelation(
                      appointment.doctors
                    );

                  const clinic =
                    getFirstRelation(
                      appointment.clinics
                    );

                  const existingReview =
                    appointment.reviews?.[0] ??
                    null;

                  const doctorName =
                    getDoctorName(
                      doctor
                    );

                  const doctorTitle =
                    getDoctorTitle(
                      doctor
                    );

                  const appointmentDate =
                    appointment.scheduled_date ??
                    appointment.requested_date;

                  const appointmentTime =
                    appointment.scheduled_time ??
                    appointment.requested_time;

                  return (
                    <article
                      key={
                        appointment.id
                      }
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#036661]">
                            {getSpecialtyName(
                              doctor
                            )}
                          </p>

                          <h2 className="mt-1 text-xl font-bold text-gray-900">
                            {doctorName}
                          </h2>

                          {doctorTitle && (
                            <p className="mt-1 text-sm text-gray-600">
                              {
                                doctorTitle
                              }
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            appointment.status
                          )}`}
                        >
                          {getStatusLabel(
                            appointment.status
                          )}
                        </span>
                      </div>

                      <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Clinică
                          </dt>

                          <dd className="mt-1 text-sm font-medium text-gray-900">
                            {getClinicName(
                              clinic
                            )}
                          </dd>

                          {(clinic?.formatted_address ||
                            clinic?.street_address) && (
                            <dd className="mt-1 text-xs leading-5 text-gray-500">
                              {clinic.formatted_address ??
                                clinic.street_address}
                            </dd>
                          )}
                        </div>

                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Data
                          </dt>

                          <dd className="mt-1 text-sm text-gray-900">
                            {formatDate(
                              appointmentDate
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Ora
                          </dt>

                          <dd className="mt-1 text-sm text-gray-900">
                            {formatTime(
                              appointmentTime
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Solicitare creată
                          </dt>

                          <dd className="mt-1 text-sm text-gray-900">
                            {formatCreatedAt(
                              appointment.created_at
                            )}
                          </dd>
                        </div>
                      </dl>

                      {appointment.notes && (
                        <div className="mt-6 rounded-xl bg-gray-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Mesajul trimis
                          </p>

                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                            {
                              appointment.notes
                            }
                          </p>
                        </div>
                      )}

                      {appointment.medical_notes && (
                        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                            Note medicale
                          </p>

                          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-blue-950">
                            {
                              appointment.medical_notes
                            }
                          </p>
                        </div>
                      )}

                      <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-5">
                        {doctor && (
                          <Link
                            href={`/doctor/${doctor.slug}`}
                            className="romdoc-button romdoc-button-primary romdoc-button-sm"
                          >
                            Vezi profilul medicului
                          </Link>
                        )}

                        {doctor && (
                          <Link
                            href={`/doctor/${doctor.slug}`}
                            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                          >
                            Programează din nou
                          </Link>
                        )}
                      </div>

                      <PatientAppointmentLifecycle
                       appointmentId={appointment.id}
                       status={appointment.status}
                       appointmentDate={appointmentDate}
                       appointmentTime={appointmentTime}
                      />

                      {appointment.status ===
                        "completed" &&
                        !existingReview && (
                          <div className="mt-6 border-t border-gray-200 pt-6">
                            <PatientReviewForm
                              appointmentId={
                                appointment.id
                              }
                              doctorName={
                                doctorName
                              }
                            />
                          </div>
                        )}

                      {existingReview && (
                        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                Recenzia ta
                              </p>

                              <div className="mt-2 flex items-center gap-3">
                                <RatingStars
                                  rating={
                                    existingReview.rating
                                  }
                                  size="small"
                                />

                                <span className="text-sm font-semibold text-gray-700">
                                  {
                                    existingReview.rating
                                  }
                                  /5
                                </span>
                              </div>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getReviewStatusClasses(
                                existingReview.status
                              )}`}
                            >
                              {getReviewStatusLabel(
                                existingReview.status
                              )}
                            </span>
                          </div>

                          {existingReview.review_text && (
                            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-700">
                              {
                                existingReview.review_text
                              }
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}