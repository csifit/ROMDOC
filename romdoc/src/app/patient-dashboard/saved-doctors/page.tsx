import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import SaveDoctorButton from "@/components/patient/save-doctor-button";
import {
  type AppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
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

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
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

  return Array.isArray(
    relation
  )
    ? relation[0] ??
        null
    : relation;
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
  doctor: DoctorRecord,
  locale: AppLocale,
  fallback: string
) {
  return (
    selectTranslation(
      doctor.doctor_translations,
      locale
    )?.title ??
    fallback
  );
}

function getSpecialtyName(
  doctor: DoctorRecord,
  locale: AppLocale,
  fallback: string
) {
  const specialty =
    getFirstRelation(
      doctor
        .doctor_specialties?.[0]
        ?.specialties
    );

  return (
    selectTranslation(
      specialty
        ?.specialty_translations,
      locale
    )?.name ??
    fallback
  );
}

function getClinicName(
  doctor: DoctorRecord,
  locale: AppLocale
) {
  const clinic =
    getFirstRelation(
      doctor
        .doctor_clinics?.[0]
        ?.clinics
    );

  return (
    selectTranslation(
      clinic
        ?.clinic_translations,
      locale
    )?.name ??
    null
  );
}

function normalizePrice(
  value:
    | number
    | string
    | null
) {
  if (value === null) {
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
  value: number,
  locale: AppLocale
) {
  return new Intl.NumberFormat(
    INTL_LOCALE[locale],
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatSavedDate(
  value: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}

function getDirectoryHref(
  locale: AppLocale
) {
  if (locale === "de") {
    return "/de/aerzte";
  }

  if (locale === "en") {
    return "/en/doctors";
  }

  return "/ro/medici";
}

function getDoctorHref(
  locale: AppLocale,
  slug: string
) {
  const safeSlug =
    encodeURIComponent(slug);

  return locale === "de"
    ? `/de/arzt/${safeSlug}`
    : `/${locale}/doctor/${safeSlug}`;
}

function DoctorPhoto({
  photoUrl,
  doctorName,
  alt,
  noPhotoAria,
}: {
  photoUrl: string | null;
  doctorName: string;
  alt: string;
  noPhotoAria: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={alt}
        className="h-[55px] w-[55px] shrink-0 rounded-[13px] border border-gray-200 bg-[#F0EEE9] object-cover"
      />
    );
  }

  return (
    <div
      aria-label={
        noPhotoAria
      }
      className="flex h-[55px] w-[55px] shrink-0 items-center justify-center rounded-[13px] border border-gray-200 bg-[#F0EEE9] text-xl font-bold text-[#036661]"
    >
      {doctorName
        .charAt(0)
        .toUpperCase()}
    </div>
  );
}

function PatientVerifiedDoctorBadge({
  title,
  label,
}: {
  title: string;
  label: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-[5px] rounded-full border border-emerald-200 bg-emerald-50 px-[13px] py-[5px] text-xs font-semibold text-emerald-800"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[21px] w-[21px] fill-none"
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

      <span>
        {label}
      </span>
    </span>
  );
}

export default async function PatientSavedDoctorsPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientPages.savedDoctors",
    });

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  if (!user) {
    const parameters =
      new URLSearchParams({
        locale,
        next:
          "/patient-dashboard/saved-doctors",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
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

  if (savedRowsError) {
    console.error(
      "Patient saved doctors lookup failed:",
      savedRowsError
    );
  }

  const savedRows =
    (
      savedRowsData ?? []
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
    doctorIds.length > 0
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
        result.data ?? []
      ) as unknown as
        DoctorRecord[];
  }

  if (doctorsError) {
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

  const directoryHref =
    getDirectoryHref(
      locale
    );

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[21px] sm:px-[21px] sm:py-[34px]">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
            {t(
              "eyebrow"
            )}
          </p>

          <h1 className="mt-[8px] text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t(
              "title"
            )}
          </h1>

          <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
            {t(
              "description"
            )}
          </p>
        </header>

        {hasError ? (
          <section className="mt-[34px] rounded-[21px] border border-red-200 bg-white p-[34px] shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              {t(
                "loadErrorTitle"
              )}
            </h2>

            <p className="mt-[13px] text-sm leading-6 text-red-700">
              {t(
                "loadErrorDescription"
              )}
            </p>
          </section>
        ) : savedDoctors.length === 0 ? (
          <section className="mt-[34px] rounded-[21px] border border-gray-200 bg-white p-[34px] text-center shadow-sm sm:p-[55px]">
            <div className="mx-auto flex h-[55px] w-[55px] items-center justify-center rounded-full bg-[#036661]/10 text-[#036661]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-[34px] w-[34px] fill-none"
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

            <h2 className="mt-[21px] text-2xl font-bold text-gray-900">
              {t(
                "emptyTitle"
              )}
            </h2>

            <p className="mx-auto mt-[13px] max-w-xl text-sm leading-6 text-gray-600">
              {t(
                "emptyDescription"
              )}
            </p>

            <Link
              href={directoryHref}
              className="romdoc-button romdoc-button-primary mt-[21px]"
            >
              {t(
                "searchDoctors"
              )}
            </Link>
          </section>
        ) : (
          <section
            className="mt-[34px]"
            aria-labelledby="saved-doctors-list-title"
          >
            <div className="flex flex-wrap items-end justify-between gap-[13px]">
              <div>
                <h2
                  id="saved-doctors-list-title"
                  className="text-2xl font-bold tracking-tight text-gray-900"
                >
                  {t(
                    "listTitle"
                  )}
                </h2>

                <p className="mt-[8px] text-sm text-gray-600">
                  {savedDoctors.length === 1
                    ? t(
                        "savedCountSingular",
                        {
                          count:
                            savedDoctors.length,
                        }
                      )
                    : t(
                        "savedCountPlural",
                        {
                          count:
                            savedDoctors.length,
                        }
                      )}
                </p>
              </div>

              <Link
                href={directoryHref}
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                {t(
                  "searchOther"
                )}
              </Link>
            </div>

            <div className="mt-[21px] grid gap-[21px] md:grid-cols-2 xl:grid-cols-3">
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
                      doctor,
                      locale
                    );

                  const price =
                    normalizePrice(
                      doctor.consultation_price
                    );

                  const isVerified =
                    doctor.verification_status ===
                    "verified";

                  const profileHref =
                    getDoctorHref(
                      locale,
                      doctor.slug
                    );

                  return (
                    <article
                      key={doctor.id}
                      className="flex h-full flex-col rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm"
                    >
                      <div className="flex items-start gap-[13px]">
                        <DoctorPhoto
                          photoUrl={
                            doctor.photo_url
                          }
                          doctorName={
                            doctorName
                          }
                          alt={t(
                            "photoAlt",
                            {
                              doctor:
                                doctorName,
                            }
                          )}
                          noPhotoAria={t(
                            "noPhotoAria",
                            {
                              doctor:
                                doctorName,
                            }
                          )}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-[13px]">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#036661]">
                                {getSpecialtyName(
                                  doctor,
                                  locale,
                                  t(
                                    "unavailableSpecialty"
                                  )
                                )}
                              </p>

                              <h3 className="mt-[5px] text-xl font-bold tracking-tight text-gray-900">
                                <Link
                                  href={profileHref}
                                  className="romdoc-focus-ring rounded-[5px] transition hover:text-[#036661]"
                                >
                                  {doctorName}
                                </Link>
                              </h3>

                              <p className="mt-[5px] text-sm text-gray-600">
                                {getDoctorTitle(
                                  doctor,
                                  locale,
                                  t(
                                    "unavailableDoctor"
                                  )
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
                            <div className="mt-[13px]">
                              <PatientVerifiedDoctorBadge
                                title={t(
                                  "verifiedTitle"
                                )}
                                label={t(
                                  "verifiedLabel"
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-[21px] space-y-[8px] text-sm text-gray-600">
                        {clinicName && (
                          <p>
                            <span className="font-medium text-gray-800">
                              {t(
                                "clinic"
                              )}:
                            </span>{" "}
                            {clinicName}
                          </p>
                        )}

                        {doctor.years_experience !==
                          null && (
                          <p>
                            <span className="font-medium text-gray-800">
                              {t(
                                "experience"
                              )}:
                            </span>{" "}
                            {
                              doctor.years_experience
                            }{" "}
                            {doctor.years_experience === 1
                              ? t(
                                  "yearSingular"
                                )
                              : t(
                                  "yearPlural"
                                )}
                          </p>
                        )}

                        {price !== null && (
                          <p>
                            <span className="font-medium text-gray-800">
                              {t(
                                "price"
                              )}:
                            </span>{" "}
                            {t(
                              "from"
                            )}{" "}
                            {formatPrice(
                              price,
                              locale
                            )}{" "}
                            RON
                          </p>
                        )}

                        <p className="text-xs text-gray-500">
                          {t(
                            "savedAt",
                            {
                              date:
                                formatSavedDate(
                                  savedAt,
                                  locale
                                ),
                            }
                          )}
                        </p>
                      </div>

                      <div className="mt-auto grid gap-[13px] pt-[21px] sm:grid-cols-2">
                        <Link
                          href={profileHref}
                          className="romdoc-button romdoc-button-secondary romdoc-button-full"
                        >
                          {t(
                            "viewProfile"
                          )}
                        </Link>

                        <Link
                          href={`${profileHref}#programare`}
                          className="romdoc-button romdoc-button-primary romdoc-button-full"
                        >
                          {t(
                            "book"
                          )}
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
