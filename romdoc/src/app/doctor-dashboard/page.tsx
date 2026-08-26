import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import DoctorDashboardOperationalOverview from "@/components/doctor/doctor-dashboard-operational-overview";
import DoctorOnboardingChecklist from "@/components/doctor/doctor-onboarding-checklist";
import DoctorSmsUsageOverview from "@/components/doctor/doctor-sms-usage-overview";
import DashboardNotifications, {
  type DashboardNotificationContent,
  type DashboardNotificationsCopy,
} from "@/components/notifications/dashboard-notifications";
import {
  getDoctorProfileCompletion,
} from "@/lib/doctors/get-doctor-profile-completion";
import type {
  AppLocale,
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

type SmsUsageLogRow = {
  event: string;
  status: string;
  delivery_report_status: string | null;
};

type SmsUsageSummary = {
  sent: number;
  delivered: number;
  failed: number;
  skipped: number;
  confirmations: number;
  reminders: number;
};

type DoctorAccountRow = {
  id: string;
  status: string | null;
  account_type: string | null;
  clinic_organization_id: string | null;
};

function getBucharestYearMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function getMonthBounds(offset: number) {
  const current = getBucharestYearMonth();
  const start = new Date(
    Date.UTC(
      current.year,
      current.month - 1 + offset,
      1
    )
  );
  const end = new Date(
    Date.UTC(
      current.year,
      current.month + offset,
      1
    )
  );

  return {
    startDate: start.toISOString().slice(0, 10),
    startIso: start.toISOString(),
    endExclusiveIso: end.toISOString(),
  };
}

function formatPeriod(
  periodStart: string,
  locale: AppLocale
) {
  const startDate = new Date(`${periodStart}T12:00:00Z`);

  return new Intl.DateTimeFormat(
    locale === "ro"
      ? "ro-RO"
      : locale === "de"
        ? "de-DE"
        : "en-GB",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(startDate);
}

function summarizeSmsUsage(
  rows: SmsUsageLogRow[]
): SmsUsageSummary {
  return rows.reduce<SmsUsageSummary>(
    (summary, row) => {
      if (row.status === "sent") {
        summary.sent += 1;

        if (row.event === "confirmed") {
          summary.confirmations += 1;
        }

        if (row.event === "reminder_24_hours") {
          summary.reminders += 1;
        }
      }

      if (
        row.delivery_report_status === "delivered"
      ) {
        summary.delivered += 1;
      }

      if (
        row.status === "failed" ||
        row.delivery_report_status === "failed" ||
        row.delivery_report_status === "expired"
      ) {
        summary.failed += 1;
      }

      if (row.status === "skipped") {
        summary.skipped += 1;
      }

      return summary;
    },
    {
      sent: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
      confirmations: 0,
      reminders: 0,
    }
  );
}

async function getDoctorSmsUsage({
  doctorId,
  startIso,
  endExclusiveIso,
}: {
  doctorId: string;
  startIso: string;
  endExclusiveIso: string;
}) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sms_delivery_logs")
    .select(`
      event,
      status,
      delivery_report_status
    `)
    .eq("doctor_id", doctorId)
    .gte("created_at", startIso)
    .lt("created_at", endExclusiveIso);

  if (error) {
    console.error(
      "Doctor dashboard SMS usage query failed:",
      error
    );

    return {
      sent: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
      confirmations: 0,
      reminders: 0,
    };
  }

  return summarizeSmsUsage(
    (data ?? []) as SmsUsageLogRow[]
  );
}

export default async function DoctorDashboardPage() {
  const locale = await getStoredAppLocale();

  const t = await getTranslations({
    locale,
    namespace: "DoctorStaffFoundation.doctor.home",
  });

  const notificationT = await getTranslations({
    locale,
    namespace: "DoctorStaffFoundation.doctor.notifications",
  });

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/doctor-dashboard",
    });

    redirect(`/login?${parameters.toString()}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      role,
      account_status,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "doctor" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const completion = await getDoctorProfileCompletion(
    supabase,
    user.id,
    profile.first_name,
    profile.last_name
  );

  if (!completion) {
    return (
      <main className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
            {t("accountMissing")}
          </div>
        </div>
      </main>
    );
  }

  const { data: doctorAccount, error: doctorAccountError } =
    await supabase
      .from("doctors")
      .select(`
        id,
        status,
        account_type,
        clinic_organization_id
      `)
      .eq("id", completion.doctorId)
      .maybeSingle();

  if (doctorAccountError) {
    console.error(
      "Doctor dashboard account type query failed:",
      doctorAccountError
    );
  }

  const typedDoctorAccount =
    doctorAccount as DoctorAccountRow | null;

  const isClinicInvited =
    typedDoctorAccount?.account_type === "clinic_invited";

  const currentMonth = getMonthBounds(0);
  const previousMonth = getMonthBounds(-1);

  const [currentSmsUsage, previousSmsUsage] =
    await Promise.all([
      getDoctorSmsUsage({
        doctorId: completion.doctorId,
        startIso: currentMonth.startIso,
        endExclusiveIso: currentMonth.endExclusiveIso,
      }),
      getDoctorSmsUsage({
        doctorId: completion.doctorId,
        startIso: previousMonth.startIso,
        endExclusiveIso: previousMonth.endExclusiveIso,
      }),
    ]);

  const notificationCopy: DashboardNotificationsCopy = {
    eyebrow: notificationT("eyebrow"),
    title: notificationT("title"),
    unreadSingular: notificationT("unreadSingular"),
    unreadPlural: notificationT("unreadPlural"),
    markAll: notificationT("markAll"),
    loading: notificationT("loading"),
    loadFailed: notificationT("loadFailed"),
    empty: notificationT("empty"),
    markRead: notificationT("markRead"),
  };

  const notificationContent: Record<
    string,
    DashboardNotificationContent
  > = {
    confirmed: {
      title: notificationT("content.confirmedTitle"),
      body: notificationT("content.confirmedBody"),
    },
    rescheduled: {
      title: notificationT("content.rescheduledTitle"),
      body: notificationT("content.rescheduledBody"),
    },
    cancelled: {
      title: notificationT("content.cancelledTitle"),
      body: notificationT("content.cancelledBody"),
    },
    completed: {
      title: notificationT("content.completedTitle"),
      body: notificationT("content.completedBody"),
    },
    no_show: {
      title: notificationT("content.noShowTitle"),
      body: notificationT("content.noShowBody"),
    },
  };

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold text-[#036661]">
            {t("eyebrow")}
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
            {t("welcome", {
              name: profile.first_name || t("doctorFallback"),
            })}
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-gray-600">
            {t("description")}
          </p>
        </header>

        {isClinicInvited ? (
          <section className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-green-900 shadow-sm">
            <h2 className="text-xl font-bold">
              {t("clinicAccountTitle")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6">
              {t("clinicAccountDescription")}
            </p>
          </section>
        ) : null}

        {typedDoctorAccount && (
          <DoctorDashboardOperationalOverview
            doctor={typedDoctorAccount}
            profileCompletionPercent={completion.percentage}
          />
        )}

        <section className="mt-[21px]">
          <DashboardNotifications
            locale={locale}
            copy={notificationCopy}
            notificationContent={notificationContent}
          />
        </section>

        <div className="mt-8">
          <DoctorOnboardingChecklist completion={completion} />
        </div>

        {!isClinicInvited ? (
          <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {t("billingTitle")}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                  {t("billingDescription")}
                </p>
              </div>

              <Link
                href="/doctor-dashboard/billing"
                className="romdoc-focus-ring w-fit rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49]"
              >
                {t("billingOpen")}
              </Link>
            </div>
          </section>
        ) : null}

        <DoctorSmsUsageOverview
          locale={locale}
          current={{
            label: formatPeriod(
              currentMonth.startDate,
              locale
            ),
            ...currentSmsUsage,
          }}
          previous={{
            label: formatPeriod(
              previousMonth.startDate,
              locale
            ),
            ...previousSmsUsage,
          }}
        />
      </div>
    </main>
  );
}
