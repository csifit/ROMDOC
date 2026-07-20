"use server";

import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";

import {
  getAppointmentStatusLabel,
} from "@/lib/appointments/appointment-status";
import {
  getAllowedClinicIdsForDoctor,
} from "@/lib/doctors/clinic-subaccount-scope";
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

type Props = {
  doctor: {
    id: string;

    status:
      | string
      | null;

    account_type:
      | string
      | null;

    clinic_organization_id:
      | string
      | null;
  };

  profileCompletionPercent:
    number;
};

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

type AppointmentRow = {
  id: string;
  patient_name: string;
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

  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

const DATE_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro:
      "ro-RO",
    en:
      "en-GB",
    de:
      "de-DE",
  };

function firstRelation<T>(
  relation:
    | T
    | T[]
    | null
) {
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

function todayInRomania() {
  return new Intl
    .DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Bucharest",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    )
    .format(
      new Date()
    );
}

function effectiveDate(
  appointment:
    AppointmentRow
) {
  return (
    appointment
      .scheduled_date ??
    appointment
      .requested_date
  );
}

function effectiveTime(
  appointment:
    AppointmentRow
) {
  return (
    appointment
      .scheduled_time ??
    appointment
      .requested_time
  );
}

function statusClasses(
  status:
    string
) {
  if (
    status ===
    "pending"
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (
    status ===
    "confirmed"
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-blue-100 text-blue-800";
}

function CounterCard({
  label,
  value,
  helper,
  href,
  attention = false,
}: {
  label: string;

  value:
    | number
    | string;

  helper: string;
  href: string;
  attention?: boolean;
}) {
  return (
    <Link
      href={
        href
      }
      className={`romdoc-focus-ring block rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        attention
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-gray-500">
        {helper}
      </p>
    </Link>
  );
}

export default async function DoctorDashboardOperationalOverview({
  doctor,
  profileCompletionPercent,
}: Props) {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "DoctorConfiguration.overview",
    });

  const supabase =
    await createClient();

  let allowedClinicIds:
    | string[]
    | null =
    null;

  try {
    allowedClinicIds =
      await getAllowedClinicIdsForDoctor(
        supabase,
        doctor
      );
  } catch (
    scopeError
  ) {
    console.error(
      "Doctor dashboard clinic scope failed:",
      scopeError
    );

    allowedClinicIds =
      doctor.account_type ===
      "clinic_sub_account"
        ? []
        : null;
  }

  let query =
    supabase
      .from(
        "appointments"
      )
      .select(`
        id,
        patient_name,
        requested_date,
        requested_time,
        scheduled_date,
        scheduled_time,
        status,
        created_at,
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
      .in(
        "status",
        [
          "pending",
          "confirmed",
          "rescheduled",
        ]
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        100
      );

  if (
    allowedClinicIds
  ) {
    query =
      allowedClinicIds
        .length > 0
        ? query.in(
            "clinic_id",
            allowedClinicIds
          )
        : query.eq(
            "clinic_id",
            "00000000-0000-0000-0000-000000000000"
          );
  }

  const {
    data,
    error,
  } =
    await query;

  if (
    error
  ) {
    console.error(
      "Doctor dashboard operational appointments failed:",
      error
    );
  }

  const appointments =
    (
      data ??
      []
    ) as unknown as
      AppointmentRow[];

  const today =
    todayInRomania();

  const pending =
    appointments
      .filter(
        (
          item
        ) =>
          item.status ===
          "pending"
      )
      .slice(
        0,
        5
      );

  const todayAppointments =
    appointments
      .filter(
        (
          item
        ) =>
          effectiveDate(
            item
          ) ===
            today &&
          item.status !==
            "pending"
      )
      .sort(
        (
          first,
          second
        ) =>
          (
            effectiveTime(
              first
            ) ??
            "99:99"
          ).localeCompare(
            effectiveTime(
              second
            ) ??
              "99:99"
          )
      )
      .slice(
        0,
        6
      );

  const upcomingConfirmed =
    appointments.filter(
      (
        item
      ) =>
        item.status ===
          "confirmed" &&
        effectiveDate(
          item
        ) >
          today
    ).length;

  function appointmentItem(
    appointment:
      AppointmentRow,
    showDate:
      boolean
  ) {
    const clinic =
      firstRelation(
        appointment.clinics
      );

    const clinicName =
      selectTranslation(
        clinic
          ?.clinic_translations,
        locale
      )?.name ??
      t(
        "clinicUnavailable"
      );

    const date =
      new Intl
        .DateTimeFormat(
          DATE_LOCALE[
            locale
          ],
          {
            weekday:
              "short",

            day:
              "2-digit",

            month:
              "short",

            timeZone:
              "UTC",
          }
        )
        .format(
          new Date(
            `${effectiveDate(
              appointment
            )}T12:00:00Z`
          )
        );

    const time =
      effectiveTime(
        appointment
      )?.slice(
        0,
        5
      ) ??
      t(
        "timeUnconfirmed"
      );

    const status =
      appointment.status ===
      "pending"
        ? t(
            "newRequestStatus"
          )
        : getAppointmentStatusLabel(
            appointment.status,
            locale
          );

    return (
      <article
        key={
          appointment.id
        }
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-gray-900">
              {
                appointment
                  .patient_name
              }
            </p>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                appointment.status
              )}`}
            >
              {status}
            </span>
          </div>

          <p className="mt-1 truncate text-sm text-gray-600">
            {clinicName}
          </p>
        </div>

        <div className="shrink-0 sm:text-right">
          {showDate && (
            <p className="text-xs font-medium text-gray-500">
              {date}
            </p>
          )}

          <p className="mt-1 text-sm font-bold text-gray-900">
            {time}
          </p>
        </div>
      </article>
    );
  }

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#036661]">
            {t(
              "eyebrow"
            )}
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            {t(
              "title"
            )}
          </h2>
        </div>

        <Link
          href="/doctor-dashboard/appointments"
          className="romdoc-button romdoc-button-secondary romdoc-button-sm"
        >
          {t(
            "allAppointments"
          )}
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t(
            "loadError"
          )}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CounterCard
          label={t(
            "newRequests"
          )}
          value={
            appointments.filter(
              (
                item
              ) =>
                item.status ===
                "pending"
            ).length
          }
          helper={t(
            "awaitingConfirmation"
          )}
          href="/doctor-dashboard/appointments"
          attention={
            pending.length >
            0
          }
        />

        <CounterCard
          label={t(
            "today"
          )}
          value={
            todayAppointments
              .length
          }
          helper={t(
            "confirmedOrRescheduled"
          )}
          href="/doctor-dashboard/calendar"
        />

        <CounterCard
          label={t(
            "confirmed"
          )}
          value={
            upcomingConfirmed
          }
          helper={t(
            "futureAppointments"
          )}
          href="/doctor-dashboard/calendar"
        />

        <CounterCard
          label={t(
            "profile"
          )}
          value={`${profileCompletionPercent}%`}
          helper={t(
            "completion"
          )}
          href="/doctor-dashboard/profile"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {t(
                  "needsAttention"
                )}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {t(
                  "newestRequests"
                )}
              </p>
            </div>

            {pending.length >
              0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                {t(
                  "newCount",
                  {
                    count:
                      pending.length,
                  }
                )}
              </span>
            )}
          </div>

          {pending.length >
          0 ? (
            <div className="mt-4 space-y-3">
              {pending.map(
                (
                  appointment
                ) =>
                  appointmentItem(
                    appointment,
                    true
                  )
              )}

              <Link
                href="/doctor-dashboard/appointments"
                className="romdoc-button romdoc-button-primary romdoc-button-full mt-4"
              >
                {t(
                  "manageRequests"
                )}
              </Link>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">
                {t(
                  "noNew"
                )}
              </p>

              <p className="mt-1 text-sm text-emerald-800">
                {t(
                  "allProcessed"
                )}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {t(
                  "todaySchedule"
                )}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {t(
                  "chronological"
                )}
              </p>
            </div>

            <Link
              href="/doctor-dashboard/calendar"
              className="text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              {t(
                "calendar"
              )}
            </Link>
          </div>

          {todayAppointments
            .length > 0 ? (
            <div className="mt-4 space-y-3">
              {todayAppointments.map(
                (
                  appointment
                ) =>
                  appointmentItem(
                    appointment,
                    false
                  )
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="font-semibold text-gray-900">
                {t(
                  "noToday"
                )}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {t(
                  "checkNextDays"
                )}
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="mr-1 text-sm font-bold text-gray-900">
            {t(
              "quickActions"
            )}
          </p>

          <Link
            href="/doctor-dashboard/appointments"
            className="romdoc-button romdoc-button-primary romdoc-button-sm"
          >
            {t(
              "addAppointment"
            )}
          </Link>

          <Link
            href="/doctor-dashboard/calendar"
            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
          >
            {t(
              "openCalendar"
            )}
          </Link>

          <Link
            href="/doctor-dashboard/availability"
            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
          >
            {t(
              "availability"
            )}
          </Link>

          <Link
            href="/doctor-dashboard/profile"
            className="romdoc-button romdoc-button-muted romdoc-button-sm"
          >
            {t(
              "editProfile"
            )}
          </Link>
        </div>
      </section>
    </section>
  );
}
