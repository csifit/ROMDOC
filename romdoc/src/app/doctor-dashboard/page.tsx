import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import DoctorDashboardOperationalOverview from "@/components/doctor/doctor-dashboard-operational-overview";
import DoctorSmsUsageOverview from "@/components/doctor/doctor-sms-usage-overview";
import DoctorOnboardingChecklist from "@/components/doctor/doctor-onboarding-checklist";
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
  status: string;
  invoice_status: string | null;
  unit_cost_minor: number | null;
  currency: string | null;
};

type BillingSettingsRow = {
  sms_unit_price_ron: number | string | null;
  vat_rate: number | string | null;
  billing_currency: string | null;
};

type DoctorSmsBillingSettings = {
  smsUnitCostMinor: number;
  vatRateBasisPoints: number;
  currency: string;
};

type SmsBillingPeriodRow = {
  id: string;
  period_start: string;
  period_end: string;
  sms_count: number;
  net_amount_minor: number;
  vat_amount_minor: number;
  gross_amount_minor: number;
  currency: string;
  payment_status: string;
  saga_invoice_status: string;
};

type DoctorAccountRow = {
  id: string;
  status: string | null;
  account_type: string | null;
  clinic_organization_id: string | null;
};

const VAT_RATE_BASIS_POINTS = 2100;

const INTL_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
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

function getCurrentMonthBounds() {
  const current = getBucharestYearMonth();
  const monthStart = new Date(
    Date.UTC(current.year, current.month - 1, 1)
  );
  const nextMonthStart = new Date(
    Date.UTC(current.year, current.month, 1)
  );

  return {
    monthStartDate: monthStart.toISOString().slice(0, 10),
    monthStartIso: monthStart.toISOString(),
    nextMonthStartIso: nextMonthStart.toISOString(),
  };
}

function getPreviousMonthDateBounds() {
  const current = getBucharestYearMonth();
  const periodStart = new Date(
    Date.UTC(current.year, current.month - 2, 1)
  );
  const periodEnd = new Date(
    Date.UTC(current.year, current.month - 1, 1)
  );

  return {
    periodStartDate: periodStart.toISOString().slice(0, 10),
    periodEndDate: periodEnd.toISOString().slice(0, 10),
  };
}

function normalizeCurrency(value: string | null | undefined) {
  return value === "RON" ? "RON" : "EUR";
}

function formatMoney(
  minorAmount: number,
  locale: AppLocale,
  currency = "EUR"
) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minorAmount / 100);
}

function formatPeriod(
  periodStart: string,
  locale: AppLocale
) {
  const startDate = new Date(`${periodStart}T12:00:00Z`);

  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(startDate);
}

async function getDoctorSmsBillingSettings(): Promise<DoctorSmsBillingSettings> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_billing_settings")
    .select("sms_unit_price_ron, vat_rate, billing_currency")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Doctor SMS billing settings query failed:", error);
  }

  const row = data as BillingSettingsRow | null;
  const unitPrice =
    row?.sms_unit_price_ron === null ||
    row?.sms_unit_price_ron === undefined
      ? Number.NaN
      : Number(row.sms_unit_price_ron);
  const vatRate =
    row?.vat_rate === null || row?.vat_rate === undefined
      ? Number.NaN
      : Number(row.vat_rate);

  return {
    smsUnitCostMinor:
      Number.isFinite(unitPrice) && unitPrice >= 0
        ? Math.round(unitPrice * 100)
        : 30,
    vatRateBasisPoints:
      Number.isFinite(vatRate) && vatRate >= 0
        ? Math.round(vatRate * 10000)
        : VAT_RATE_BASIS_POINTS,
    currency: normalizeCurrency(row?.billing_currency),
  };
}

async function getPreviousSmsBill({
  doctorId,
  profileId,
}: {
  doctorId: string;
  profileId: string;
}) {
  const admin = createAdminClient();
  const { periodStartDate, periodEndDate } =
    getPreviousMonthDateBounds();
  const { data, error } = await admin
    .from("doctor_sms_billing_periods")
    .select(`
      id,
      period_start,
      period_end,
      sms_count,
      net_amount_minor,
      vat_amount_minor,
      gross_amount_minor,
      currency,
      payment_status,
      saga_invoice_status
    `)
    .eq("doctor_id", doctorId)
    .eq("profile_id", profileId)
    .eq("period_start", periodStartDate)
    .eq("period_end", periodEndDate)
    .maybeSingle();

  if (error) {
    console.error("Previous SMS bill query failed:", error);
    return null;
  }

  return data as SmsBillingPeriodRow | null;
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

  let smsUsage = {
    sent: 0,
    invoiced: 0,
    uninvoiced: 0,
    estimatedNetMinor: 0,
    uninvoicedValueMinor: 0,
    currency: "EUR",
  };

  let previousSmsBill: SmsBillingPeriodRow | null = null;

  let smsBillingSettings: DoctorSmsBillingSettings = {
    smsUnitCostMinor: 30,
    vatRateBasisPoints: VAT_RATE_BASIS_POINTS,
    currency: "EUR",
  };

  if (!isClinicInvited) {
    const admin = createAdminClient();
    const {
      monthStartIso,
      nextMonthStartIso,
    } = getCurrentMonthBounds();

    smsBillingSettings = await getDoctorSmsBillingSettings();

    const [smsLogsResult, previousBill] = await Promise.all([
      admin
        .from("sms_delivery_logs")
        .select("status, invoice_status, unit_cost_minor, currency")
        .eq("doctor_id", completion.doctorId)
        .gte("created_at", monthStartIso)
        .lt("created_at", nextMonthStartIso),
      getPreviousSmsBill({
        doctorId: completion.doctorId,
        profileId: user.id,
      }),
    ]);

    if (smsLogsResult.error) {
      console.error(
        "Doctor dashboard SMS usage query failed:",
        smsLogsResult.error
      );
    }

    const smsLogs =
      (smsLogsResult.data ?? []) as SmsUsageLogRow[];

    smsUsage = smsLogs.reduce(
      (currentUsage, log) => {
        const invoiceStatus =
          log.invoice_status ?? "not_billable";
        const unitCostMinor =
          log.unit_cost_minor ?? smsBillingSettings.smsUnitCostMinor;

        if (log.status === "sent") {
          currentUsage.sent += 1;
          currentUsage.estimatedNetMinor += unitCostMinor;
        }

        if (invoiceStatus === "invoiced") {
          currentUsage.invoiced += 1;
        }

        if (invoiceStatus === "uninvoiced") {
          currentUsage.uninvoiced += 1;
          currentUsage.uninvoicedValueMinor += unitCostMinor;
        }

        if (log.currency) {
          currentUsage.currency = normalizeCurrency(log.currency);
        }

        return currentUsage;
      },
      {
        sent: 0,
        invoiced: 0,
        uninvoiced: 0,
        estimatedNetMinor: 0,
        uninvoicedValueMinor: 0,
        currency: smsBillingSettings.currency,
      }
    );

    previousSmsBill = previousBill;
  }

  const currentMonth = getCurrentMonthBounds();
  const previousMonth = getPreviousMonthDateBounds();
  const previousCurrency = normalizeCurrency(
    previousSmsBill?.currency ?? smsBillingSettings.currency
  );

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
          <>
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

            <DoctorSmsUsageOverview
              locale={locale}
              eyebrow={t("smsEyebrow")}
              title={t("smsUsageTitle")}
              description={t("smsUsageDescription")}
              current={{
                label: formatPeriod(
                  currentMonth.monthStartDate,
                  locale
                ),
                currency: smsUsage.currency,
                sent: smsUsage.sent,
                invoiced: smsUsage.invoiced,
                uninvoiced: smsUsage.uninvoiced,
                estimatedNetFormatted: formatMoney(
                  smsUsage.estimatedNetMinor,
                  locale,
                  smsUsage.currency
                ),
                uninvoicedNetFormatted: formatMoney(
                  smsUsage.uninvoicedValueMinor,
                  locale,
                  smsUsage.currency
                ),
              }}
              previous={{
                label: formatPeriod(
                  previousMonth.periodStartDate,
                  locale
                ),
                currency: previousCurrency,
                hasActivity: Boolean(previousSmsBill),
                smsCount: previousSmsBill?.sms_count ?? 0,
                netFormatted: formatMoney(
                  previousSmsBill?.net_amount_minor ?? 0,
                  locale,
                  previousCurrency
                ),
                vatFormatted: formatMoney(
                  previousSmsBill?.vat_amount_minor ?? 0,
                  locale,
                  previousCurrency
                ),
                grossFormatted: formatMoney(
                  previousSmsBill?.gross_amount_minor ?? 0,
                  locale,
                  previousCurrency
                ),
                paymentStatus:
                  previousSmsBill?.payment_status ?? "not_applicable",
                invoiceStatus:
                  previousSmsBill?.saga_invoice_status ?? "not_applicable",
              }}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
