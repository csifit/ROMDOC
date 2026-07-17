import Link from "next/link";

import SaveDoctorButton from "@/components/patient/save-doctor-button";
import {
  createClient,
} from "@/lib/supabase/server";

type SavedDoctorRow = {
  doctor_id: string;
  created_at: string;
};

type DoctorTranslation = {
  locale: string;
  title: string | null;
};

type SpecialtyTranslation = {
  locale: string;
  name: string;
};

type SpecialtyRelation = {
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

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type DoctorClinicRelation = {
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type DoctorRecord = {
  id: string;
  slug: string;
  photo_url: string | null;
  years_experience: number | null;
  consultation_price:
    | number
    | string
    | null;
  verification_status:
    | string
    | null;
  doctor_translations:
    | DoctorTranslation[]
    | null;
  doctor_specialties:
    | DoctorSpecialtyRelation[]
    | null;
  doctor_clinics:
    | DoctorClinicRelation[]
    | null;
};

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

function formatDoctorName(
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

function getDoctorTitle(
  doctor: DoctorRecord
) {
  return (
    doctor
      .doctor_translations
      ?.find(
        (translation) =>
          translation.locale ===
          "ro"
      )?.title ??
    doctor
      .doctor_translations?.[0]
      ?.title ??
    "Medic"
  );
}

function getSpecialtyName(
  doctor: DoctorRecord
) {
  const specialty =
    getFirstRelation(
      doctor
        .doctor_specialties?.[0]
        ?.specialties
    );

  return (
    specialty
      ?.specialty_translations
      ?.find(
        (translation) =>
          translation.locale ===
          "ro"
      )?.name ??
    specialty
      ?.specialty_translations?.[0]
      ?.name ??
    "Specialitate indisponibilă"
  );
}

function getClinicName(
  doctor: DoctorRecord
) {
  const clinic =
    getFirstRelation(
      doctor
        .doctor_clinics?.[0]
        ?.clinics
    );

  return (
    clinic
      ?.clinic_translations
      ?.find(
        (translation) =>
          translation.locale ===
          "ro"
      )?.name ??
    clinic
      ?.clinic_translations?.[0]
      ?.name ??
    null
  );
}

function normalizePrice(
  value:
    | number
    | string
    | null
) {
  if (
    value === null
  ) {
    return null;
  }

  const parsed =
    typeof value ===
    "number"
      ? value
      : Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function formatPrice(
  value: number
) {
  return new Intl.NumberFormat(
    "ro-RO",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatSavedDate(
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
    new Date(value)
  );
}


function DoctorPhoto({
  photoUrl,
  doctorName,
}: {
  photoUrl: string | null;
  doctorName: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`Fotografie de profil pentru ${doctorName}`}
        className="h-16 w-16 shrink-0 rounded-2xl border border-gray-200 bg-[#F0EEE9] object-cover"
      />
    );
  }

  return (
    <div
      aria-label={`Fără fotografie de profil pentru ${doctorName}`}
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-[#F0EEE9] text-xl font-bold text-[#036661]"
    >
      {doctorName.charAt(0).toUpperCase()}
    </div>
  );
}


function PatientVerifiedDoctorBadge() {
  return (
    <span
      title="RomDoc a verificat informațiile profesionale și documentele transmise de acest medic."
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-4 w-4 fill-none"
      >
        <path
          d="m7.5 12.5 3 3 6-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 2.75 14.3 4l2.6-.1 1.25 2.3 2.25 1.3-.1 2.6 1.25 2.3-1.25 2.3.1 2.6-2.25 1.3-1.25 2.3-2.6-.1L12 22.05l-2.3-1.25-2.6.1-1.25-2.3-2.25-1.3.1-2.6-1.25-2.3 1.25-2.3-.1-2.6 2.25-1.3 1.25-2.3 2.6.1L12 2.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      <span>Medic verificat</span>
    </span>
  );
}

export default async function PatientSavedDoctorsPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data:
      savedRowsData,
    error:
      savedRowsError,
  } =
    await supabase
      .from(
        "patient_saved_doctors"
      )
      .select(
        "doctor_id, created_at"
      )
      .eq(
        "patient_profile_id",
        user.id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (
    savedRowsError
  ) {
    console.error(
      "Patient saved doctors lookup failed:",
      savedRowsError
    );
  }

  const savedRows =
    (
      savedRowsData ??
      []
    ) as SavedDoctorRow[];

  const doctorIds =
    savedRows.map(
      (row) =>
        row.doctor_id
    );

  let doctors:
    DoctorRecord[] = [];
  let doctorsError:
    unknown = null;

  if (
    doctorIds.length >
    0
  ) {
    const result =
      await supabase
        .from("doctors")
        .select(`
          id,
          slug,
          photo_url,
          years_experience,
          consultation_price,
          verification_status,
          doctor_translations (
            locale,
            title
          ),
          doctor_specialties (
            specialties (
              specialty_translations (
                locale,
                name
              )
            )
          ),
          doctor_clinics (
            clinics (
              clinic_translations (
                locale,
                name
              )
            )
          )
        `)
        .in(
          "id",
          doctorIds
        )
        .eq(
          "status",
          "active"
        );

    doctorsError =
      result.error;

    doctors =
      (
        result.data ??
        []
      ) as unknown as
        DoctorRecord[];
  }

  if (
    doctorsError
  ) {
    console.error(
      "Patient saved doctor details lookup failed:",
      doctorsError
    );
  }

  const doctorById =
    new Map(
      doctors.map(
        (doctor) => [
          doctor.id,
          doctor,
        ]
      )
    );

  const savedDoctors =
    savedRows.flatMap(
      (savedRow) => {
        const doctor =
          doctorById.get(
            savedRow.doctor_id
          );

        return doctor
          ? [
              {
                doctor,
                savedAt:
                  savedRow.created_at,
              },
            ]
          : [];
      }
    );

  const hasError =
    Boolean(
      savedRowsError ||
        doctorsError
    );

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
            Cont pacient
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Medicii mei salvați
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Păstrează aici medicii pe care dorești să îi găsești rapid și revino oricând la profilul sau programările lor.
          </p>
        </header>

        {hasError ? (
          <section className="mt-8 rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Lista nu a putut fi încărcată
            </h2>

            <p className="mt-3 text-sm leading-6 text-red-700">
              Reîncarcă pagina. Dacă problema continuă, verifică mesajul din consola serverului.
            </p>
          </section>
        ) : savedDoctors.length ===
          0 ? (
          <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#036661]/10 text-[#036661]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-7 w-7 fill-none"
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              Nu ai salvat încă niciun medic
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
              Folosește simbolul inimă de pe profilurile și cardurile medicilor pentru a-i adăuga în această listă.
            </p>

            <Link
              href="/medici"
              className="romdoc-button romdoc-button-primary mt-6"
            >
              Caută medici
            </Link>
          </section>
        ) : (
          <section
            className="mt-8"
            aria-labelledby="saved-doctors-list-title"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  id="saved-doctors-list-title"
                  className="text-2xl font-bold tracking-tight text-gray-900"
                >
                  Lista salvată
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  {savedDoctors.length}{" "}
                  {savedDoctors.length ===
                  1
                    ? "medic salvat"
                    : "medici salvați"}
                </p>
              </div>

              <Link
                href="/medici"
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                Caută alți medici
              </Link>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {savedDoctors.map(
                ({
                  doctor,
                  savedAt,
                }) => {
                  const doctorName =
                    formatDoctorName(
                      doctor.slug
                    );
                  const clinicName =
                    getClinicName(
                      doctor
                    );
                  const price =
                    normalizePrice(
                      doctor.consultation_price
                    );
                  const isVerified =
                    doctor.verification_status ===
                    "verified";

                  return (
                    <article
                      key={
                        doctor.id
                      }
                      className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                    >
                      <div className="flex items-start gap-4">
                        <DoctorPhoto
                          photoUrl={
                            doctor.photo_url
                          }
                          doctorName={
                            doctorName
                          }
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#036661]">
                                {getSpecialtyName(
                                  doctor
                                )}
                              </p>

                              <h3 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
                                <Link
                                  href={`/doctor/${doctor.slug}`}
                                  className="romdoc-focus-ring rounded-sm transition hover:text-[#036661]"
                                >
                                  {
                                    doctorName
                                  }
                                </Link>
                              </h3>

                              <p className="mt-1 text-sm text-gray-600">
                                {getDoctorTitle(
                                  doctor
                                )}
                              </p>
                            </div>

                            <SaveDoctorButton
                              doctorId={
                                doctor.id
                              }
                              doctorName={
                                doctorName
                              }
                              initialIsSaved
                              compact
                              className="shrink-0"
                            />
                          </div>

                          {isVerified && (
                            <div className="mt-3">
                              <PatientVerifiedDoctorBadge />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 space-y-2 text-sm text-gray-600">
                        {clinicName && (
                          <p>
                            <span className="font-medium text-gray-800">
                              Clinica:
                            </span>{" "}
                            {
                              clinicName
                            }
                          </p>
                        )}

                        {doctor.years_experience !==
                          null && (
                          <p>
                            <span className="font-medium text-gray-800">
                              Experiență:
                            </span>{" "}
                            {
                              doctor.years_experience
                            }{" "}
                            ani
                          </p>
                        )}

                        {price !==
                          null && (
                          <p>
                            <span className="font-medium text-gray-800">
                              Tarif:
                            </span>{" "}
                            de la{" "}
                            {formatPrice(
                              price
                            )}{" "}
                            RON
                          </p>
                        )}

                        <p className="text-xs text-gray-500">
                          Salvat la{" "}
                          {formatSavedDate(
                            savedAt
                          )}
                        </p>
                      </div>

                      <div className="mt-auto grid gap-3 pt-6 sm:grid-cols-2">
                        <Link
                          href={`/doctor/${doctor.slug}`}
                          className="romdoc-button romdoc-button-secondary romdoc-button-full"
                        >
                          Vezi profilul
                        </Link>

                        <Link
                          href={`/doctor/${doctor.slug}#programare`}
                          className="romdoc-button romdoc-button-primary romdoc-button-full"
                        >
                          Programează-te
                        </Link>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
