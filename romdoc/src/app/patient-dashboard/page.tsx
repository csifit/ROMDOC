import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import DashboardNotifications, {
  type DashboardNotificationContent,
  type DashboardNotificationsCopy,
} from "@/components/notifications/dashboard-notifications";
import PatientAppointmentLifecycle from "@/components/patient/patient-appointment-lifecycle";
import PatientFolderShortcut from "@/components/patient/patient-folder-shortcut";
import PatientReminderPreferencesShortcut from "@/components/patient/patient-reminder-preferences-shortcut";
import PatientReviewForm from "@/components/reviews/patient-review-form";
import RatingStars from "@/components/reviews/rating-stars";
import TelehealthLaunchButton from "@/components/telehealth/telehealth-launch-button";
import {
  getAppointmentStatusLabel,
} from "@/lib/appointments/appointment-status";
import {
  type AppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";
import {
  isJoinableTelehealthPaymentStatus,
} from "@/lib/telehealth/constants";

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
    SpecialtyTranslation[] | null;
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
  public_name: string | null;
  doctor_translations:
    DoctorTranslation[] | null;
  doctor_specialties:
    DoctorSpecialtyRelation[] | null;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  id: string;
  slug: string;
  formatted_address: string | null;
  street_address: string | null;
  clinic_translations:
    ClinicTranslation[] | null;
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
  patient_email: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  consultation_mode: string;
  telehealth_public_reference: string | null;
  telehealth_payments:
    | { status: string }
    | Array<{ status: string }>
    | null;
  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
  reviews:
    ReviewRelation[] | null;
};

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

function first<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function doctorName(
  doctor: DoctorRelation | null,
  fallback: string
) {
  if (!doctor) {
    return fallback;
  }

  return (
    doctor.public_name?.trim() ||
    doctor.slug
      .split("-")
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0).toUpperCase() +
          part.slice(1)
      )
      .join(" ") ||
    fallback
  );
}

function doctorTitle(
  doctor: DoctorRelation | null,
  locale: AppLocale
) {
  return (
    selectTranslation(
      doctor?.doctor_translations,
      locale
    )?.title ??
    null
  );
}

function specialtyName(
  doctor: DoctorRelation | null,
  locale: AppLocale,
  fallback: string
) {
  const relation =
    doctor
      ?.doctor_specialties
      ?.[0];

  const specialty =
    first(
      relation?.specialties
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

function clinicName(
  clinic: ClinicRelation | null,
  locale: AppLocale,
  fallback: string
) {
  return (
    selectTranslation(
      clinic?.clinic_translations,
      locale
    )?.name ??
    fallback
  );
}

function formatDate(
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
    new Date(
      `${value}T12:00:00`
    )
  );
}

function formatCreatedAt(
  value: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
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

function statusClasses(
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

function reviewStatusClasses(
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

function doctorHref(
  locale: AppLocale,
  slug: string
) {
  const safeSlug =
    encodeURIComponent(slug);

  return locale === "de"
    ? `/de/arzt/${safeSlug}`
    : `/${locale}/doctor/${safeSlug}`;
}

function directoryHref(
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

export default async function PatientDashboardPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientDashboard.page",
    });

  const notificationT =
    await getTranslations({
      locale,
      namespace:
        "PatientDashboard.notifications",
    });

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
    const parameters =
      new URLSearchParams({
        locale,
        next:
          "/patient-dashboard",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  if (
    !user
      .email_confirmed_at
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        type:
          "patient",
        next:
          "/patient-dashboard",
      });

    if (user.email) {
      parameters.set(
        "email",
        user.email
      );
    }

    redirect(
      `/check-email?${parameters.toString()}`
    );
  }

  if (!user.email) {
    redirect(
      "/dashboard"
    );
  }

  const patientEmail =
    user.email
      .trim()
      .toLowerCase();

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
      .select(`
        role,
        first_name,
        last_name
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "patient"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const appointmentSelect = `
    id,
    doctor_id,
    clinic_id,
    patient_name,
    patient_email,
    requested_date,
    requested_time,
    scheduled_date,
    scheduled_time,
    status,
    notes,
    created_at,
    consultation_mode,
    telehealth_public_reference,
    telehealth_payments (
      status
    ),
    doctors (
      id,
      slug,
      public_name,
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
  `;

  let appointmentsError:
    unknown = null;

  let appointments:
    Appointment[] = [];

  try {
    const admin =
      createAdminClient();

    const [
      byProfile,
      byEmail,
    ] =
      await Promise.all([
        admin
          .from(
            "appointments"
          )
          .select(
            appointmentSelect
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
          ),

        admin
          .from(
            "appointments"
          )
          .select(
            appointmentSelect
          )
          .ilike(
            "patient_email",
            patientEmail
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),
      ]);

    appointmentsError =
      byProfile.error ??
      byEmail.error ??
      null;

    if (
      appointmentsError
    ) {
      console.error(
        "Patient appointments query failed:",
        appointmentsError
      );
    }

    const byId =
      new Map<
        string,
        Appointment
      >();

    const profileItems =
      (
        byProfile.data as unknown as
          | Appointment[]
          | null
      ) ??
      [];

    const emailItems =
      (
        byEmail.data as unknown as
          | Appointment[]
          | null
      ) ??
      [];

    for (
      const appointment of
        [
          ...profileItems,
          ...emailItems,
        ]
    ) {
      byId.set(
        appointment.id,
        appointment
      );
    }

    appointments =
      Array.from(
        byId.values()
      ).sort(
        (
          left,
          right
        ) =>
          Date.parse(
            right.created_at
          ) -
          Date.parse(
            left.created_at
          )
      );
  } catch (error) {
    appointmentsError =
      error;

    console.error(
      "Patient appointments server lookup failed:",
      error
    );
  }

  const patientName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const notificationCopy:
    DashboardNotificationsCopy = {
      eyebrow:
        notificationT(
          "eyebrow"
        ),
      title:
        notificationT(
          "title"
        ),
      unreadSingular:
        notificationT(
          "unreadSingular"
        ),
      unreadPlural:
        notificationT(
          "unreadPlural"
        ),
      markAll:
        notificationT(
          "markAll"
        ),
      loading:
        notificationT(
          "loading"
        ),
      loadFailed:
        notificationT(
          "loadFailed"
        ),
      empty:
        notificationT(
          "empty"
        ),
      markRead:
        notificationT(
          "markRead"
        ),
    };

  const notificationContent:
    Record<
      string,
      DashboardNotificationContent
    > = {
      confirmed: {
        title:
          notificationT(
            "content.confirmedTitle"
          ),
        body:
          notificationT(
            "content.confirmedBody"
          ),
      },
      rescheduled: {
        title:
          notificationT(
            "content.rescheduledTitle"
          ),
        body:
          notificationT(
            "content.rescheduledBody"
          ),
      },
      cancelled: {
        title:
          notificationT(
            "content.cancelledTitle"
          ),
        body:
          notificationT(
            "content.cancelledBody"
          ),
      },
      completed: {
        title:
          notificationT(
            "content.completedTitle"
          ),
        body:
          notificationT(
            "content.completedBody"
          ),
      },
      no_show: {
        title:
          notificationT(
            "content.noShowTitle"
          ),
        body:
          notificationT(
            "content.noShowBody"
          ),
      },
    };

  const publicDirectoryHref =
    directoryHref(locale);

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-[#036661]">
            {t("eyebrow")}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {t("title")}
          </h1>

          <p className="mt-3 text-sm text-gray-600">
            {patientName
              ? t(
                  "welcomeName",
                  {
                    name:
                      patientName,
                  }
                )
              : t(
                  "welcomeDefault"
                )}
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            {t("description")}
          </p>
        </header>

        <section className="mt-[21px]">
          <DashboardNotifications
            locale={locale}
            copy={
              notificationCopy
            }
            notificationContent={
              notificationContent
            }
          />
        </section>

        <PatientFolderShortcut
          locale={locale}
        />

        <PatientReminderPreferencesShortcut
          locale={locale}
        />

        <section className="mt-8">
          {appointmentsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
              <h2 className="text-xl font-bold">
                {t(
                  "loadErrorTitle"
                )}
              </h2>

              <p className="mt-3 text-sm leading-6">
                {t(
                  "loadErrorDescription"
                )}
              </p>
            </div>
          ) : appointments.length ===
            0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                {t("emptyTitle")}
              </h2>

              <p className="mt-3 text-sm text-gray-600">
                {t(
                  "emptyDescription"
                )}
              </p>

              <Link
                href={
                  publicDirectoryHref
                }
                className="romdoc-button romdoc-button-primary mt-5"
              >
                {t(
                  "searchDoctors"
                )}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map(
                (appointment) => {
                  const doctor =
                    first(
                      appointment.doctors
                    );

                  const clinic =
                    first(
                      appointment.clinics
                    );

                  const review =
                    appointment
                      .reviews
                      ?.[0] ??
                    null;

                  const name =
                    doctorName(
                      doctor,
                      t(
                        "unavailableDoctor"
                      )
                    );

                  const title =
                    doctorTitle(
                      doctor,
                      locale
                    );

                  const specialty =
                    specialtyName(
                      doctor,
                      locale,
                      t(
                        "unavailableSpecialty"
                      )
                    );

                  const clinicLabel =
                    clinicName(
                      clinic,
                      locale,
                      t(
                        "unavailableClinic"
                      )
                    );

                  const date =
                    appointment
                      .scheduled_date ??
                    appointment
                      .requested_date;

                  const time =
                    appointment
                      .scheduled_time ??
                    appointment
                      .requested_time;

                  const profileHref =
                    doctor
                      ? doctorHref(
                          locale,
                          doctor.slug
                        )
                      : null;

                  const reviewStatus =
                    review
                      ? review.status ===
                        "published"
                        ? t(
                            "reviewPublished"
                          )
                        : review.status ===
                            "hidden"
                          ? t(
                              "reviewHidden"
                            )
                          : review.status ===
                              "removed"
                            ? t(
                                "reviewRemoved"
                              )
                            : t(
                                "reviewPending"
                              )
                      : null;

                  return (
                    <details
                      key={
                        appointment.id
                      }
                      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#036661] sm:grid-cols-[minmax(180px,1.1fr)_minmax(150px,1fr)_120px_140px_24px] sm:items-center [&::-webkit-details-marker]:hidden">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#036661]">
                            {specialty}
                          </p>

                          <p className="mt-1 font-semibold text-gray-900">
                            {name}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:hidden">
                            {t("clinic")}
                          </p>

                          <p className="truncate text-sm text-gray-800">
                            {
                              clinicLabel
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:hidden">
                            {t("date")}
                          </p>

                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(
                              date,
                              locale
                            )}
                          </p>

                          <p className="text-xs text-gray-500">
                            {formatTime(
                              time
                            )}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                            appointment.status
                          )}`}
                        >
                          {getAppointmentStatusLabel(
                            appointment.status,
                            locale
                          )}
                        </span>

                        <span
                          aria-hidden="true"
                          className="hidden justify-self-end text-xl leading-none text-gray-400 transition-transform group-open:rotate-180 sm:block"
                        >
                          ˅
                        </span>
                      </summary>

                      <div className="border-t border-gray-200 p-6 sm:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[#036661]">
                              {specialty}
                            </p>

                            <h2 className="mt-1 text-xl font-bold text-gray-900">
                              {name}
                            </h2>

                            {title && (
                              <p className="mt-1 text-sm text-gray-600">
                                {title}
                              </p>
                            )}
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              appointment.status
                            )}`}
                          >
                            {getAppointmentStatusLabel(
                              appointment.status,
                              locale
                            )}
                          </span>
                        </div>

                        <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t("clinic")}
                            </dt>

                            <dd className="mt-1 text-sm font-medium text-gray-900">
                              {
                                clinicLabel
                              }
                            </dd>

                            {(clinic
                              ?.formatted_address ||
                              clinic
                                ?.street_address) && (
                              <dd className="mt-1 text-xs leading-5 text-gray-500">
                                {clinic
                                  .formatted_address ??
                                  clinic
                                    .street_address}
                              </dd>
                            )}
                          </div>

                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t("date")}
                            </dt>

                            <dd className="mt-1 text-sm text-gray-900">
                              {formatDate(
                                date,
                                locale
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t("time")}
                            </dt>

                            <dd className="mt-1 text-sm text-gray-900">
                              {formatTime(
                                time
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t("created")}
                            </dt>

                            <dd className="mt-1 text-sm text-gray-900">
                              {formatCreatedAt(
                                appointment
                                  .created_at,
                                locale
                              )}
                            </dd>
                          </div>
                        </dl>

                        {appointment.notes && (
                          <div className="mt-6 rounded-xl bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t(
                                "sentMessage"
                              )}
                            </p>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                              {
                                appointment.notes
                              }
                            </p>
                          </div>
                        )}

                        <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-5">
                          {isJoinableTelehealthPaymentStatus(first(appointment.telehealth_payments)?.status) && appointment.consultation_mode === "video" && appointment.telehealth_public_reference && ["confirmed", "rescheduled", "completed"].includes(appointment.status) && (
                            <TelehealthLaunchButton
                              reference={appointment.telehealth_public_reference}
                              locale={locale}
                            />
                          )}
                          <Link
                            href={`/appointments/${appointment.id}/request-received?locale=${locale}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                          >
                            {t(
                              "appointmentDetails"
                            )}
                          </Link>

                          {profileHref && (
                            <Link
                              href={
                                profileHref
                              }
                              className="romdoc-button romdoc-button-primary romdoc-button-sm"
                            >
                              {t(
                                "viewDoctorProfile"
                              )}
                            </Link>
                          )}

                          {profileHref && (
                            <Link
                              href={`${profileHref}#programare`}
                              className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                            >
                              {t(
                                "bookAgain"
                              )}
                            </Link>
                          )}

                          <Link
                            href={`/appointments/${appointment.id}/messages?locale=${locale}`}
                            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                          >
                            {t(
                              "messagesFiles"
                            )}
                          </Link>
                        </div>

                        <PatientAppointmentLifecycle
                          appointmentId={
                            appointment.id
                          }
                          status={
                            appointment.status
                          }
                          appointmentDate={
                            date
                          }
                          appointmentTime={
                            time
                          }
                        />

                        {appointment.status ===
                          "completed" &&
                          !review && (
                            <div className="mt-6 border-t border-gray-200 pt-6">
                              <PatientReviewForm
                                appointmentId={
                                  appointment.id
                                }
                                doctorName={
                                  name
                                }
                              />
                            </div>
                          )}

                        {review &&
                          reviewStatus && (
                          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {t(
                                    "yourReview"
                                  )}
                                </p>

                                <div className="mt-2 flex items-center gap-3">
                                  <RatingStars
                                    rating={
                                      review.rating
                                    }
                                    size="small"
                                    label={t(
                                      "ratingSummary",
                                      {
                                        rating:
                                          review.rating,
                                        maximum:
                                          5,
                                      }
                                    )}
                                  />

                                  <span className="text-sm font-semibold text-gray-700">
                                    {
                                      review.rating
                                    }
                                    /5
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${reviewStatusClasses(
                                  review.status
                                )}`}
                              >
                                {
                                  reviewStatus
                                }
                              </span>
                            </div>

                            {review
                              .review_text && (
                              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-700">
                                {
                                  review.review_text
                                }
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
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
