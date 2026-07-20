import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  getAppointmentStatusLabel,
} from "@/lib/appointments/appointment-status";
import {
  type AppLocale,
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type DoctorRelation = {
  slug: string;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
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

type AppointmentRecord = {
  id: string;

  patient_profile_id:
    | string
    | null;

  patient_email: string;
  patient_name: string;
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

  duration_minutes:
    | number
    | null;

  status: string;

  notes:
    | string
    | null;

  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;

  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type PageProps = {
  params: Promise<{
    appointmentId: string;
  }>;

  searchParams: Promise<{
    emailSent?: string;
    locale?: string;
  }>;
};

const INTL_LOCALE:
  Record<
    AppLocale,
    string
  > = {
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

  return Array.isArray(
    value
  )
    ? value[0] ??
        null
    : value;
}

function doctorName(
  slug: string
) {
  return decodeURIComponent(
    slug
  )
    .split("-")
    .filter(Boolean)
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
  clinic:
    | ClinicRelation
    | null,
  locale:
    AppLocale,
  fallback:
    string
) {
  const translation =
    selectTranslation(
      clinic
        ?.clinic_translations,
      locale
    );

  return (
    translation
      ?.name
      ?.trim() ||
    fallback
  );
}

function formatDate(
  value: string,
  locale:
    AppLocale
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  return new Intl
    .DateTimeFormat(
      INTL_LOCALE[
        locale
      ],
      {
        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",

        timeZone:
          "UTC",
      }
    )
    .format(
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      )
    );
}

function formatTime(
  value:
    | string
    | null
) {
  return value
    ? value.slice(
        0,
        5
      )
    : "—";
}

function statusClasses(
  status: string
) {
  switch (
    status
  ) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "rescheduled":
      return "border-blue-200 bg-blue-50 text-blue-800";

    case "completed":
      return "border-gray-200 bg-gray-100 text-gray-800";

    case "cancelled":
      return "border-red-200 bg-red-50 text-red-800";

    case "no_show":
      return "border-orange-200 bg-orange-50 text-orange-900";

    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function getDoctorProfileHref(
  locale:
    AppLocale,
  slug: string
) {
  const encodedSlug =
    encodeURIComponent(
      slug
    );

  if (
    locale === "de"
  ) {
    return `/de/arzt/${encodedSlug}`;
  }

  return `/${locale}/doctor/${encodedSlug}`;
}

function getReturnPath({
  appointmentId,
  locale,
  emailSent,
}: {
  appointmentId: string;
  locale: AppLocale;
  emailSent:
    | string
    | undefined;
}) {
  const parameters =
    new URLSearchParams({
      locale,
    });

  if (
    emailSent
  ) {
    parameters.set(
      "emailSent",
      emailSent
    );
  }

  return `/appointments/${encodeURIComponent(
    appointmentId
  )}/request-received?${parameters.toString()}`;
}

function googleCalendarUrl({
  title,
  details,
  clinic,
  address,
  date,
  time,
  duration,
}: {
  title: string;
  details: string;
  clinic: string;

  address:
    | string
    | null;

  date: string;
  time: string;
  duration: number;
}) {
  const [
    year,
    month,
    day,
  ] =
    date
      .split("-")
      .map(Number);

  const [
    hour,
    minute,
  ] =
    time
      .slice(
        0,
        5
      )
      .split(":")
      .map(Number);

  const start =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute
      )
    );

  const end =
    new Date(
      start.getTime() +
        duration *
          60 *
          1000
    );

  const compact =
    (
      value:
        Date
    ) =>
      value
        .toISOString()
        .slice(
          0,
          19
        )
        .replaceAll(
          "-",
          ""
        )
        .replaceAll(
          ":",
          ""
        );

  const query =
    new URLSearchParams({
      action:
        "TEMPLATE",

      text:
        title,

      dates:
        `${compact(
          start
        )}/${compact(
          end
        )}`,

      details,

      location:
        [
          clinic,
          address,
        ]
          .filter(
            Boolean
          )
          .join(
            ", "
          ),

      ctz:
        "Europe/Bucharest",
    });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export default async function AppointmentRequestReceivedPage({
  params,
  searchParams,
}: PageProps) {
  const {
    appointmentId,
  } =
    await params;

  const query =
    await searchParams;

  const locale =
    normalizeAppLocale(
      query.locale
    );

  const t =
    await getTranslations({
      locale,
      namespace:
        "AppointmentRequestReceived",
    });

  const returnPath =
    getReturnPath({
      appointmentId,
      locale,
      emailSent:
        query.emailSent,
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
    await supabase
      .auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        next:
          returnPath,
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
          returnPath,
      });

    if (
      user.email
    ) {
      parameters.set(
        "email",
        user.email
      );
    }

    redirect(
      `/check-email?${parameters.toString()}`
    );
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "appointments"
      )
      .select(`
        id,
        patient_profile_id,
        patient_email,
        patient_name,
        patient_phone,
        requested_date,
        requested_time,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        status,
        notes,
        doctors (
          slug
        ),
        clinics (
          formatted_address,
          street_address,
          clinic_translations (
            locale,
            name
          )
        )
      `)
      .eq(
        "id",
        appointmentId
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Appointment request-received lookup failed:",
      error
    );

    notFound();
  }

  if (!data) {
    notFound();
  }

  const appointment =
    data as unknown as
      AppointmentRecord;

  const authenticatedEmail =
    user.email
      ?.trim()
      .toLowerCase() ??
    "";

  const ownsAppointment =
    appointment
      .patient_profile_id ===
      user.id ||
    (
      Boolean(
        authenticatedEmail
      ) &&
      appointment
        .patient_email
        .trim()
        .toLowerCase() ===
        authenticatedEmail
    );

  if (
    !ownsAppointment
  ) {
    notFound();
  }

  const doctor =
    first(
      appointment.doctors
    );

  const clinic =
    first(
      appointment.clinics
    );

  const displayDoctorName =
    doctor
      ? doctorName(
          doctor.slug
        )
      : t(
          "unavailableDoctor"
        );

  const displayClinicName =
    getClinicName(
      clinic,
      locale,
      t(
        "unavailableClinic"
      )
    );

  const clinicAddress =
    clinic
      ?.formatted_address ||
    clinic
      ?.street_address ||
    null;

  const isConfirmed =
    [
      "confirmed",
      "rescheduled",
    ].includes(
      appointment.status
    );

  const displayDate =
    isConfirmed
      ? appointment
          .scheduled_date ||
        appointment
          .requested_date
      : appointment
          .requested_date;

  const displayTime =
    isConfirmed
      ? appointment
          .scheduled_time ||
        appointment
          .requested_time
      : appointment
          .requested_time;

  const duration =
    Number(
      appointment
        .duration_minutes ??
      30
    );

  const googleUrl =
    isConfirmed &&
    displayTime
      ? googleCalendarUrl({
          title:
            t(
              "calendarTitle",
              {
                doctor:
                  displayDoctorName,
              }
            ),

          details:
            t(
              "calendarDetails"
            ),

          clinic:
            displayClinicName,

          address:
            clinicAddress,

          date:
            displayDate,

          time:
            displayTime,

          duration,
        })
      : null;

  const emailWasSent =
    query.emailSent !==
    "0";

  const doctorHref =
    doctor
      ? getDoctorProfileHref(
          locale,
          doctor.slug
        )
      : null;

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-amber-50 px-6 py-8 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-3xl font-bold text-white">
              ✓
            </div>

            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-amber-800">
              {t(
                "registeredEyebrow"
              )}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              {t(
                "title"
              )}
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-700">
              {t(
                "description"
              )}
            </p>
          </div>

          <div className="space-y-6 px-6 py-7 sm:px-10">
            <div
              className={[
                "rounded-xl border px-4 py-3 text-sm font-semibold",
                statusClasses(
                  appointment.status
                ),
              ].join(
                " "
              )}
            >
              {t(
                "currentStatus",
                {
                  status:
                    getAppointmentStatusLabel(
                      appointment.status,
                      locale
                    ),
                }
              )}
            </div>

            {!isConfirmed && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                {t(
                  "pendingNotice"
                )}
              </div>
            )}

            <dl className="divide-y divide-gray-200 rounded-xl border border-gray-200">
              <div className="grid gap-1 p-4 sm:grid-cols-[150px_1fr]">
                <dt className="text-sm text-gray-500">
                  {t(
                    "doctor"
                  )}
                </dt>

                <dd className="font-semibold text-gray-900">
                  {
                    displayDoctorName
                  }
                </dd>
              </div>

              <div className="grid gap-1 p-4 sm:grid-cols-[150px_1fr]">
                <dt className="text-sm text-gray-500">
                  {t(
                    "clinic"
                  )}
                </dt>

                <dd>
                  <p className="font-semibold text-gray-900">
                    {
                      displayClinicName
                    }
                  </p>

                  {clinicAddress && (
                    <p className="mt-1 text-sm text-gray-600">
                      {
                        clinicAddress
                      }
                    </p>
                  )}
                </dd>
              </div>

              <div className="grid gap-1 p-4 sm:grid-cols-[150px_1fr]">
                <dt className="text-sm text-gray-500">
                  {isConfirmed
                    ? t(
                        "scheduledDate"
                      )
                    : t(
                        "requestedDate"
                      )}
                </dt>

                <dd className="font-semibold text-gray-900">
                  {formatDate(
                    displayDate,
                    locale
                  )}
                </dd>
              </div>

              <div className="grid gap-1 p-4 sm:grid-cols-[150px_1fr]">
                <dt className="text-sm text-gray-500">
                  {isConfirmed
                    ? t(
                        "scheduledTime"
                      )
                    : t(
                        "requestedTime"
                      )}
                </dt>

                <dd className="font-semibold text-gray-900">
                  {formatTime(
                    displayTime
                  )}

                  {displayTime &&
                    ` · ${t(
                      "minutes",
                      {
                        count:
                          duration,
                      }
                    )}`}
                </dd>
              </div>

              <div className="grid gap-1 p-4 sm:grid-cols-[150px_1fr]">
                <dt className="text-sm text-gray-500">
                  {t(
                    "patient"
                  )}
                </dt>

                <dd>
                  <p className="font-semibold text-gray-900">
                    {
                      appointment
                        .patient_name
                    }
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {
                      appointment
                        .patient_phone
                    }
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {
                      appointment
                        .patient_email
                    }
                  </p>
                </dd>
              </div>

              {appointment
                .notes && (
                <div className="grid gap-1 p-4 sm:grid-cols-[150px_1fr]">
                  <dt className="text-sm text-gray-500">
                    {t(
                      "message"
                    )}
                  </dt>

                  <dd className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {
                      appointment
                        .notes
                    }
                  </dd>
                </div>
              )}
            </dl>

            <div
              className={
                emailWasSent
                  ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                  : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              }
            >
              {emailWasSent
                ? t(
                    "emailSent",
                    {
                      email:
                        appointment
                          .patient_email,
                    }
                  )
                : t(
                    "emailFailed"
                  )}
            </div>

            {isConfirmed &&
              displayTime && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <h2 className="text-lg font-bold text-gray-900">
                    {t(
                      "confirmedTitle"
                    )}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {t(
                      "confirmedDescription"
                    )}
                  </p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <a
                      href={`/api/appointments/${appointment.id}/calendar`}
                      className="romdoc-button romdoc-button-primary"
                    >
                      {t(
                        "downloadCalendar"
                      )}
                    </a>

                    {googleUrl && (
                      <a
                        href={
                          googleUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="romdoc-button romdoc-button-secondary"
                      >
                        {t(
                          "addGoogleCalendar"
                        )}
                      </a>
                    )}
                  </div>
                </section>
              )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/patient-dashboard"
                className="romdoc-button romdoc-button-primary"
              >
                {t(
                  "viewAppointments"
                )}
              </Link>

              {doctorHref && (
                <Link
                  href={
                    doctorHref
                  }
                  className="romdoc-button romdoc-button-secondary"
                >
                  {t(
                    "backDoctor"
                  )}
                </Link>
              )}
            </div>

            <p className="text-center text-xs text-gray-500">
              {t(
                "reference",
                {
                  id:
                    appointment.id,
                }
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
