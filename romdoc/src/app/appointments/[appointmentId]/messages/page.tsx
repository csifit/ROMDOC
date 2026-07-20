import type {
  Metadata,
} from "next";
import Link from "next/link";
import {
  NextIntlClientProvider,
} from "next-intl";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import AppointmentMessages from "@/components/appointments/appointment-messages";
import {
  getAppointmentStatusLabel,
} from "@/lib/appointments/appointment-status";
import {
  getAppointmentMessageAccess,
} from "@/lib/appointments/get-appointment-message-access";
import {
  type AppLocale,
  normalizeAppLocale,
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

import roMessages from "../../../../../messages/ro.json";
import enMessages from "../../../../../messages/en.json";
import deMessages from "../../../../../messages/de.json";

type PageProps = {
  params: Promise<{
    appointmentId: string;
  }>;
  searchParams: Promise<{
    locale?: string;
  }>;
};

type AppointmentDetailsRow = {
  id: string;
  doctor_id: string;
  clinic_id: string | null;
  patient_profile_id: string | null;
  patient_name: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
};

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

async function resolveLocale(
  searchParams:
    PageProps["searchParams"]
) {
  const parameters =
    await searchParams;

  if (parameters.locale) {
    return normalizeAppLocale(
      parameters.locale
    );
  }

  return getStoredAppLocale();
}

export async function generateMetadata({
  searchParams,
}: Pick<
  PageProps,
  "searchParams"
>): Promise<Metadata> {
  const locale =
    await resolveLocale(
      searchParams
    );

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientPages.messages.page",
    });

  return {
    title:
      t(
        "metadataTitle"
      ),
    description:
      t(
        "metadataDescription"
      ),
  };
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

function formatTime(
  value: string | null
) {
  return value
    ? value.slice(
        0,
        5
      )
    : "—";
}

function getBackHref(
  role: string
) {
  if (role === "doctor") {
    return "/doctor-dashboard/inbox";
  }

  if (role === "staff") {
    return "/staff-dashboard";
  }

  return "/patient-dashboard";
}

export default async function AppointmentMessagesPage({
  params,
  searchParams,
}: PageProps) {
  const {
    appointmentId,
  } = await params;

  const locale =
    await resolveLocale(
      searchParams
    );

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientPages.messages.page",
    });

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  const accessResult =
    await getAppointmentMessageAccess({
      supabase,
      admin,
      appointmentId,
    });

  if (accessResult.error) {
    if (
      accessResult.status ===
      401
    ) {
      const parameters =
        new URLSearchParams({
          locale,
          next:
            `/appointments/${appointmentId}/messages?locale=${locale}`,
        });

      redirect(
        `/login?${parameters.toString()}`
      );
    }

    redirect(
      "/dashboard"
    );
  }

  const {
    access,
  } = accessResult;

  const {
    data: appointment,
    error:
      appointmentError,
  } = await admin
    .from("appointments")
    .select(
      "id, doctor_id, clinic_id, patient_profile_id, patient_name, requested_date, requested_time, scheduled_date, scheduled_time, status"
    )
    .eq(
      "id",
      appointmentId
    )
    .maybeSingle();

  const role =
    access?.profile?.role ??
    "patient";

  if (
    appointmentError ||
    !appointment
  ) {
    redirect(
      getBackHref(role)
    );
  }

  const typedAppointment =
    appointment as AppointmentDetailsRow;

  const appointmentDate =
    typedAppointment.scheduled_date ??
    typedAppointment.requested_date;

  const appointmentTime =
    typedAppointment.scheduled_time ??
    typedAppointment.requested_time;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={
        messagesByLocale[
          locale
        ]
      }
    >
      <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[21px] sm:px-[21px] sm:py-[34px]">
        <div className="mx-auto max-w-5xl">
          <Link
            href={
              getBackHref(
                role
              )
            }
            className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 transition hover:border-[#036661] hover:text-[#036661]"
          >
            {t(
              "back"
            )}
          </Link>

          <header className="mt-[13px] rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
            <div className="flex flex-col gap-[13px] sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#036661]">
                  {t(
                    "eyebrow"
                  )}
                </p>

                <h1 className="mt-[5px] text-3xl font-bold text-gray-900">
                  {t(
                    "title"
                  )}
                </h1>

                <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
                  {t(
                    "description"
                  )}
                </p>
              </div>

              <span className="w-fit rounded-full bg-gray-100 px-[13px] py-[5px] text-sm font-semibold text-gray-700">
                {getAppointmentStatusLabel(
                  typedAppointment.status,
                  locale
                )}
              </span>
            </div>

            <div className="mt-[21px] grid gap-[13px] text-sm text-gray-700 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t(
                    "patient"
                  )}
                </p>

                <p className="mt-[5px] font-medium text-gray-900">
                  {
                    typedAppointment.patient_name
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t(
                    "date"
                  )}
                </p>

                <p className="mt-[5px] font-medium text-gray-900">
                  {formatDate(
                    appointmentDate,
                    locale
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t(
                    "time"
                  )}
                </p>

                <p className="mt-[5px] font-medium text-gray-900">
                  {formatTime(
                    appointmentTime
                  )}
                </p>
              </div>
            </div>
          </header>

          <div className="mt-[21px]">
            <AppointmentMessages
              appointmentId={
                appointmentId
              }
            />
          </div>
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
