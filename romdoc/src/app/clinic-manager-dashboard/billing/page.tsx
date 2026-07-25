import { getTranslations } from "next-intl/server";

import ClinicManagerMonthSelector from "@/components/clinic-manager/clinic-manager-month-selector";
import {
  type AppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

type BillingPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

type OrganizationMember = {
  organization_id: string;
};

type OrganizationSummary = {
  monthStart: string;
  monthEndExclusive: string;
  organization: {
    id: string;
    name: string;
    status: string;
    contact_email: string | null;
    contact_phone: string | null;
  } | null;
  billingProfile: {
    company_name: string;
    tax_id: string;
    trade_register_number: string | null;
    billing_address: string;
    billing_city: string;
    billing_county: string;
    billing_country: string;
    billing_email: string;
    is_vat_payer: boolean;
    vat_number: string | null;
    updated_at: string;
  } | null;
  locations: Array<{
    id: string;
    name: string;
    formattedAddress: string | null;
  }>;
  prices: {
    clinicDoctorMonthlyPriceRon: number;
    smsUnitPriceRon: number;
    vatRate: number;
  };
  totals: {
    activeDoctorCount: number;
    subscriptionSubtotalRon: number;
    confirmationSmsCount: number;
    reminder24hSmsCount: number;
    totalSmsCount: number;
    smsSubtotalRon: number;
    subtotalBeforeVatRon: number;
    estimatedVatRon: number;
    estimatedTotalRon: number;
  };
  doctors: Array<{
    relationshipId: string;
    doctorId: string | null;
    profileId: string | null;
    clinicId: string | null;
    doctorName: string;
    email: string | null;
    invitationStatus: string;
    coverageStatus: string;
    acceptedAt: string | null;
    coverageStartedAt: string | null;
    clinicName: string | null;
    clinicAddress: string | null;
    subscriptionBillable: boolean;
    subscriptionCostRon: number;
    confirmationSmsCount: number;
    reminder24hSmsCount: number;
    totalSmsCount: number;
    smsCostRon: number;
    estimatedDoctorSubtotalRon: number;
  }>;
};

type DoctorTranslation = {
  doctor_id: string;
  locale: string;
  title: string | null;
};

type ClinicTranslation = {
  clinic_id: string;
  locale: string;
  name: string | null;
};

type BillingCurrency = "EUR" | "RON";

const INTL_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

const CURRENCY_LABEL: Record<AppLocale, string> = {
  ro: "Monedă",
  en: "Currency",
  de: "Währung",
};

function normalizeMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const month = Number(value.slice(5, 7));
    if (month >= 1 && month <= 12) return value;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return `${parts.find((part) => part.type === "year")?.value}-${
    parts.find((part) => part.type === "month")?.value
  }`;
}

function formatCurrency(
  value: number,
  locale: AppLocale,
  currency: BillingCurrency
) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatPercent(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatMonth(value: string, locale: AppLocale) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  }).format(date);
}

function statusClasses(status: string) {
  switch (status) {
    case "active":
    case "accepted":
      return "border-green-200 bg-green-50 text-green-800";
    case "pending":
    case "none":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "paused":
    case "suspended":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "declined":
    case "expired":
    case "cancelled":
    case "ended":
    case "rejected":
      return "border-red-200 bg-red-50 text-red-800";
    case "archived":
      return "border-gray-300 bg-gray-100 text-gray-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-[13px] text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-[8px] text-sm leading-6 text-gray-600">{helper}</p>
    </div>
  );
}

function CostLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-[13px] ${
        strong ? "border-t border-gray-200 pt-[13px]" : ""
      }`}
    >
      <dt className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>
        {label}
      </dt>
      <dd
        className={`shrink-0 text-right ${
          strong ? "font-bold text-gray-900" : "font-semibold text-gray-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
        status
      )}`}
    >
      {label}
    </span>
  );
}

export default async function ClinicManagerBillingPage({
  searchParams,
}: BillingPageProps) {
  const parameters = await searchParams;
  const selectedMonth = normalizeMonth(parameters.month);
  const currentMonth = normalizeMonth();
  const locale = await getStoredAppLocale();
  const t = await getTranslations({
    locale,
    namespace: "ClinicOrganisationDashboard.billing",
  });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: memberships, error: membershipsError }, billingSettingsResult] =
    await Promise.all([
      user
        ? supabase
            .from("clinic_organization_members")
            .select("organization_id")
            .eq("profile_id", user.id)
            .eq("status", "active")
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("clinic_billing_settings")
        .select("billing_currency")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  const billingCurrency: BillingCurrency =
    billingSettingsResult.data?.billing_currency === "RON" ? "RON" : "EUR";
  const activeMemberships = (memberships ?? []) as OrganizationMember[];

  const summaryResults = await Promise.all(
    activeMemberships.map(async (membership) => {
      const { data, error } = await supabase.rpc(
        "get_clinic_manager_monthly_coverage_summary",
        {
          target_organization_id: membership.organization_id,
          target_month: `${selectedMonth}-01`,
        }
      );

      if (error) {
        console.error("Clinic coverage summary failed:", error);
        return { summary: null, failed: true };
      }

      return {
        summary: data ? (data as OrganizationSummary) : null,
        failed: !data,
      };
    })
  );

  const summaries = summaryResults
    .map((result) => result.summary)
    .filter((summary): summary is OrganizationSummary => Boolean(summary));
  const hasSummaryError =
    Boolean(membershipsError) || summaryResults.some((result) => result.failed);

  const doctorIds = Array.from(
    new Set(
      summaries.flatMap((summary) =>
        summary.doctors
          .map((doctor) => doctor.doctorId)
          .filter((doctorId): doctorId is string => Boolean(doctorId))
      )
    )
  );
  const clinicIds = Array.from(
    new Set(
      summaries.flatMap((summary) => [
        ...summary.locations.map((location) => location.id),
        ...summary.doctors
          .map((doctor) => doctor.clinicId)
          .filter((clinicId): clinicId is string => Boolean(clinicId)),
      ])
    )
  );

  const [doctorTranslationsResult, clinicTranslationsResult] = await Promise.all([
    doctorIds.length > 0
      ? supabase
          .from("doctor_translations")
          .select("doctor_id, locale, title")
          .in("doctor_id", doctorIds)
      : Promise.resolve({ data: [], error: null }),
    clinicIds.length > 0
      ? supabase
          .from("clinic_translations")
          .select("clinic_id, locale, name")
          .in("clinic_id", clinicIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (doctorTranslationsResult.error) {
    console.error(
      "Billing Doctor translations query failed:",
      doctorTranslationsResult.error
    );
  }
  if (clinicTranslationsResult.error) {
    console.error(
      "Billing clinic translations query failed:",
      clinicTranslationsResult.error
    );
  }

  const doctorTranslationsById = new Map<string, DoctorTranslation[]>();
  for (const translation of (doctorTranslationsResult.data ?? []) as DoctorTranslation[]) {
    const rows = doctorTranslationsById.get(translation.doctor_id) ?? [];
    rows.push(translation);
    doctorTranslationsById.set(translation.doctor_id, rows);
  }

  const clinicTranslationsById = new Map<string, ClinicTranslation[]>();
  for (const translation of (clinicTranslationsResult.data ?? []) as ClinicTranslation[]) {
    const rows = clinicTranslationsById.get(translation.clinic_id) ?? [];
    rows.push(translation);
    clinicTranslationsById.set(translation.clinic_id, rows);
  }

  function localizedDoctorName(
    doctor: OrganizationSummary["doctors"][number]
  ) {
    if (doctor.doctorId) {
      const translated = selectTranslation(
        doctorTranslationsById.get(doctor.doctorId),
        locale
      )?.title;
      if (translated) return translated;
    }

    return doctor.doctorName || doctor.email || t("fallbackDoctor");
  }

  function localizedClinicName(
    clinicId: string | null,
    fallback: string | null
  ) {
    if (clinicId) {
      const translated = selectTranslation(
        clinicTranslationsById.get(clinicId),
        locale
      )?.name;
      if (translated) return translated;
    }
    return fallback || t("fallbackLocation");
  }

  function organizationStatusLabel(status: string) {
    const normalized = ["active", "suspended", "rejected", "archived"].includes(
      status
    )
      ? status
      : "pending";
    return t(`statuses.organization.${normalized}`);
  }

  function invitationStatusLabel(status: string) {
    const normalized = [
      "pending",
      "accepted",
      "declined",
      "expired",
      "cancelled",
    ].includes(status)
      ? status
      : "pending";
    return t(`statuses.invitation.${normalized}`);
  }

  function coverageStatusLabel(status: string) {
    const normalized = [
      "active",
      "paused",
      "cancelled",
      "ended",
      "none",
    ].includes(status)
      ? status
      : "pending";
    return t(`statuses.coverage.${normalized}`);
  }

  const totals = summaries.reduce(
    (accumulator, summary) => ({
      doctors:
        accumulator.doctors + Number(summary.totals.activeDoctorCount),
      subscriptions:
        accumulator.subscriptions +
        Number(summary.totals.subscriptionSubtotalRon),
      sms: accumulator.sms + Number(summary.totals.totalSmsCount),
      total: accumulator.total + Number(summary.totals.estimatedTotalRon),
    }),
    { doctors: 0, subscriptions: 0, sms: 0, total: 0 }
  );

  const noMemberships = !membershipsError && activeMemberships.length === 0;
  const allSummariesUnavailable =
    activeMemberships.length > 0 && summaries.length === 0 && hasSummaryError;

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">{t("eyebrow")}</p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {t("title")}
        </h1>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {t("description")}
        </p>
        <p className="mt-[13px] max-w-4xl rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm font-medium leading-6 text-amber-950">
          {t("auditNotice")}
        </p>
      </header>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="grid gap-[21px] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {selectedMonth === currentMonth ? t("currentMonth") : t("period")}
            </p>
            <p className="mt-[5px] text-lg font-bold capitalize text-gray-900">
              {formatMonth(selectedMonth, locale)}
            </p>
            <p className="mt-[5px] text-sm text-gray-500">
              {CURRENCY_LABEL[locale]}: {billingCurrency}
            </p>
          </div>

          <ClinicManagerMonthSelector
            value={selectedMonth}
            locale={locale}
            basePath="/clinic-manager-dashboard/billing"
            maxMonth={currentMonth}
          />
        </div>
      </section>

      {hasSummaryError && summaries.length > 0 && (
        <section
          role="alert"
          className="rounded-[21px] border border-amber-200 bg-amber-50 p-[21px] text-sm leading-6 text-amber-950 shadow-sm"
        >
          <h2 className="font-semibold">{t("partialDataTitle")}</h2>
          <p className="mt-[8px]">{t("partialDataDescription")}</p>
        </section>
      )}

      {!noMemberships && !allSummariesUnavailable && (
        <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={t("summary.coveredDoctors")}
            value={totals.doctors}
            helper={t("summary.coveredDoctorsHelper")}
          />
          <SummaryCard
            label={t("summary.subscriptions")}
            value={formatCurrency(totals.subscriptions, locale, billingCurrency)}
            helper={t("summary.subscriptionsHelper")}
          />
          <SummaryCard
            label={t("summary.sentSms")}
            value={totals.sms}
            helper={t("summary.sentSmsHelper")}
          />
          <SummaryCard
            label={t("summary.estimatedTotal")}
            value={formatCurrency(totals.total, locale, billingCurrency)}
            helper={t("summary.estimatedTotalHelper")}
          />
        </div>
      )}

      {noMemberships ? (
        <section className="rounded-[21px] border border-dashed border-gray-300 bg-white p-[21px] shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("noOrganizations")}
          </h2>
          <p className="mt-[8px] text-sm leading-6 text-gray-600">
            {t("noOrganizationsHelper")}
          </p>
        </section>
      ) : allSummariesUnavailable ? (
        <section
          role="alert"
          className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-sm leading-6 text-red-800 shadow-sm"
        >
          <h2 className="font-semibold">{t("unavailableTitle")}</h2>
          <p className="mt-[8px]">{t("unavailableDescription")}</p>
        </section>
      ) : (
        <div className="space-y-[21px]">
          {summaries.map((summary) => {
            const organization = summary.organization;
            if (!organization) return null;
            const billing = summary.billingProfile;
            const localizedLocations = summary.locations.map((location) => ({
              ...location,
              localizedName: localizedClinicName(location.id, location.name),
            }));

            return (
              <details
                key={organization.id}
                className="group rounded-[21px] border border-gray-200 bg-white shadow-sm"
              >
                <summary className="romdoc-focus-ring cursor-pointer list-none rounded-[21px] p-[21px]">
                  <div className="flex flex-wrap items-start justify-between gap-[13px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-[8px]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#9A4F35]">
                          {t("organizationSummary")}
                        </p>
                        <StatusBadge
                          status={organization.status}
                          label={organizationStatusLabel(organization.status)}
                        />
                      </div>
                      <h2 className="mt-[8px] text-xl font-bold text-gray-900">
                        {organization.name}
                      </h2>
                      <p className="mt-[8px] text-sm text-gray-600">
                        {t("coveredDoctorsCount", {
                          count: Number(summary.totals.activeDoctorCount),
                        })}
                        {" · "}
                        {formatCurrency(
                          Number(summary.totals.estimatedTotalRon),
                          locale,
                          billingCurrency
                        )}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500 transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </div>
                </summary>

                <div className="space-y-[21px] border-t border-gray-200 p-[21px]">
                  <div className="flex flex-wrap items-start justify-between gap-[21px]">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {organization.name}
                      </h3>
                      <p className="mt-[8px] text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t("organizationContact")}
                      </p>
                      <p className="mt-[5px] text-sm leading-6 text-gray-600">
                        {organization.contact_email ?? t("emailUnavailable")}
                        {" · "}
                        {organization.contact_phone ?? t("phoneUnavailable")}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-[#036661]/10 px-[13px] py-[5px] text-xs font-semibold text-[#036661]">
                        {t("notInvoice")}
                      </span>
                      <p className="mt-[8px] text-sm text-gray-500">
                        {CURRENCY_LABEL[locale]}: {billingCurrency}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("approvedLocations")}
                    </p>
                    {localizedLocations.length > 0 ? (
                      <div className="mt-[8px] flex flex-wrap gap-[8px]">
                        {localizedLocations.map((location) => (
                          <span
                            key={location.id}
                            title={location.formattedAddress ?? undefined}
                            className="rounded-full border border-gray-200 bg-[#F0EEE9] px-[13px] py-[5px] text-sm text-gray-700"
                          >
                            {location.localizedName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-[8px] text-sm text-gray-600">
                        {t("noLocations")}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-[21px] lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
                    <section className="rounded-[21px] border border-gray-200 p-[21px]">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {t("billingDetails")}
                      </h3>
                      {billing ? (
                        <dl className="mt-[21px] grid gap-[13px] text-sm sm:grid-cols-2">
                          {[
                            [t("company"), billing.company_name],
                            [t("taxId"), billing.tax_id],
                            [t("tradeRegister"), billing.trade_register_number ?? "—"],
                            [t("billingEmail"), billing.billing_email],
                            [
                              t("vatStatus"),
                              billing.is_vat_payer
                                ? t("vatPayer")
                                : t("notVatPayer"),
                            ],
                            [t("vatNumber"), billing.vat_number ?? "—"],
                            [
                              t("billingAddress"),
                              [
                                billing.billing_address,
                                billing.billing_city,
                                billing.billing_county,
                                billing.billing_country,
                              ]
                                .filter(Boolean)
                                .join(", "),
                            ],
                            [t("updatedAt"), formatDate(billing.updated_at, locale)],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {label}
                              </dt>
                              <dd className="mt-[5px] break-words text-gray-900">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-[13px] text-sm leading-6 text-gray-600">
                          {t("billingUnavailable")}
                        </p>
                      )}
                    </section>

                    <aside className="rounded-[21px] border border-gray-200 p-[21px]">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {t("costBreakdown")}
                      </h3>
                      <dl className="mt-[21px] space-y-[13px] text-sm">
                        <CostLine
                          label={t("doctorSubscriptions")}
                          value={formatCurrency(
                            Number(summary.totals.subscriptionSubtotalRon),
                            locale,
                            billingCurrency
                          )}
                        />
                        <CostLine
                          label={`${t("confirmationSms")} (${summary.totals.confirmationSmsCount})`}
                          value={formatCurrency(
                            Number(summary.totals.confirmationSmsCount) *
                              Number(summary.prices.smsUnitPriceRon),
                            locale,
                            billingCurrency
                          )}
                        />
                        <CostLine
                          label={`${t("reminderSms")} (${summary.totals.reminder24hSmsCount})`}
                          value={formatCurrency(
                            Number(summary.totals.reminder24hSmsCount) *
                              Number(summary.prices.smsUnitPriceRon),
                            locale,
                            billingCurrency
                          )}
                        />
                        <CostLine
                          label={t("smsSubtotal")}
                          value={formatCurrency(
                            Number(summary.totals.smsSubtotalRon),
                            locale,
                            billingCurrency
                          )}
                        />
                        <CostLine
                          label={t("subtotalBeforeVat")}
                          value={formatCurrency(
                            Number(summary.totals.subtotalBeforeVatRon),
                            locale,
                            billingCurrency
                          )}
                        />
                        <CostLine
                          label={t("estimatedVat")}
                          value={formatCurrency(
                            Number(summary.totals.estimatedVatRon),
                            locale,
                            billingCurrency
                          )}
                        />
                        <CostLine
                          label={t("totalWithVat")}
                          value={formatCurrency(
                            Number(summary.totals.estimatedTotalRon),
                            locale,
                            billingCurrency
                          )}
                          strong
                        />
                      </dl>

                      <div className="mt-[21px] rounded-[13px] bg-gray-50 p-[13px] text-xs leading-5 text-gray-600">
                        <p className="font-semibold text-gray-800">
                          {t("unitPrices")}
                        </p>
                        <p className="mt-[5px]">
                          {t("doctorUnitPrice")}: {" "}
                          {formatCurrency(
                            Number(summary.prices.clinicDoctorMonthlyPriceRon),
                            locale,
                            billingCurrency
                          )}
                        </p>
                        <p>
                          {t("smsUnitPrice")}: {" "}
                          {formatCurrency(
                            Number(summary.prices.smsUnitPriceRon),
                            locale,
                            billingCurrency
                          )}
                        </p>
                        <p>
                          {t("vatRate")}: {" "}
                          {formatPercent(Number(summary.prices.vatRate), locale)}
                        </p>
                        <p className="mt-[5px] text-gray-500">
                          {CURRENCY_LABEL[locale]}: {billingCurrency}
                        </p>
                      </div>
                    </aside>
                  </div>

                  <details className="group rounded-[21px] border border-gray-200">
                    <summary className="romdoc-focus-ring cursor-pointer list-none rounded-[21px] p-[21px]">
                      <div className="flex flex-wrap items-center justify-between gap-[13px]">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {t("doctorsTitle")}
                          </h3>
                          <p className="mt-[5px] text-sm leading-6 text-gray-600">
                            {t("doctorsHelper")}
                          </p>
                        </div>
                        <div className="flex items-center gap-[8px]">
                          <span className="rounded-full bg-[#F0EEE9] px-[13px] py-[5px] text-sm font-semibold text-gray-700">
                            {t("doctorCount", { count: summary.doctors.length })}
                          </span>
                          <span
                            aria-hidden="true"
                            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500 transition group-open:rotate-45"
                          >
                            +
                          </span>
                        </div>
                      </div>
                    </summary>

                    <div className="border-t border-gray-200 p-[21px]">
                      {summary.doctors.length === 0 ? (
                        <p className="text-sm text-gray-600">{t("noDoctors")}</p>
                      ) : (
                        <div className="space-y-[13px]">
                          {summary.doctors.map((doctor) => {
                            const doctorName = localizedDoctorName(doctor);
                            const clinicName =
                              doctor.clinicId || doctor.clinicName
                                ? localizedClinicName(
                                    doctor.clinicId,
                                    doctor.clinicName
                                  )
                                : t("locationUnavailable");

                            return (
                              <details
                                key={doctor.relationshipId}
                                className="group rounded-[13px] border border-gray-200 bg-gray-50"
                              >
                                <summary className="romdoc-focus-ring cursor-pointer list-none rounded-[13px] p-[13px]">
                                  <div className="grid items-center gap-[13px] md:grid-cols-[minmax(0,1.5fr)_minmax(7rem,0.7fr)_minmax(7rem,0.6fr)_minmax(8rem,0.8fr)_auto]">
                                    <div className="min-w-0">
                                      <p className="truncate font-semibold text-gray-900">
                                        {doctorName}
                                      </p>
                                      <p className="mt-[5px] truncate text-xs text-gray-500">
                                        {doctor.email ?? t("emailUnavailable")}
                                      </p>
                                    </div>
                                    <StatusBadge
                                      status={doctor.coverageStatus}
                                      label={coverageStatusLabel(
                                        doctor.coverageStatus
                                      )}
                                    />
                                    <p className="text-sm text-gray-700">
                                      {doctor.totalSmsCount} SMS
                                    </p>
                                    <p className="text-sm font-bold text-gray-900">
                                      {formatCurrency(
                                        Number(
                                          doctor.estimatedDoctorSubtotalRon
                                        ),
                                        locale,
                                        billingCurrency
                                      )}
                                    </p>
                                    <span
                                      aria-hidden="true"
                                      className="justify-self-end text-lg text-gray-500 transition group-open:rotate-45"
                                    >
                                      +
                                    </span>
                                  </div>
                                </summary>

                                <div className="border-t border-gray-200 bg-white p-[13px]">
                                  <dl className="grid gap-[13px] text-sm sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {t("accountEmail")}
                                      </dt>
                                      <dd className="mt-[5px] break-all text-gray-900">
                                        {doctor.email ?? "—"}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {t("invitation")}
                                      </dt>
                                      <dd className="mt-[5px]">
                                        <StatusBadge
                                          status={doctor.invitationStatus}
                                          label={invitationStatusLabel(
                                            doctor.invitationStatus
                                          )}
                                        />
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {t("coverageStart")}
                                      </dt>
                                      <dd className="mt-[5px] text-gray-900">
                                        {formatDate(
                                          doctor.coverageStartedAt ??
                                            doctor.acceptedAt,
                                          locale
                                        )}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {t("subscription")}
                                      </dt>
                                      <dd className="mt-[5px] font-bold text-gray-900">
                                        {formatCurrency(
                                          Number(doctor.subscriptionCostRon),
                                          locale,
                                          billingCurrency
                                        )}
                                      </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {t("assignedLocation")}
                                      </dt>
                                      <dd className="mt-[5px] text-gray-900">
                                        {clinicName}
                                      </dd>
                                      {doctor.clinicAddress && (
                                        <p className="mt-[5px] text-xs leading-5 text-gray-500">
                                          {doctor.clinicAddress}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {t("totalSms")}
                                      </dt>
                                      <dd className="mt-[5px] text-gray-900">
                                        {doctor.totalSmsCount}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {t("doctorSubtotal")}
                                      </dt>
                                      <dd className="mt-[5px] font-bold text-gray-900">
                                        {formatCurrency(
                                          Number(
                                            doctor.estimatedDoctorSubtotalRon
                                          ),
                                          locale,
                                          billingCurrency
                                        )}
                                      </dd>
                                    </div>
                                  </dl>

                                  <div className="mt-[13px] grid gap-[13px] sm:grid-cols-3">
                                    <SummaryCard
                                      label={t("confirmationSms")}
                                      value={doctor.confirmationSmsCount}
                                      helper={formatCurrency(
                                        Number(doctor.confirmationSmsCount) *
                                          Number(
                                            summary.prices.smsUnitPriceRon
                                          ),
                                        locale,
                                        billingCurrency
                                      )}
                                    />
                                    <SummaryCard
                                      label={t("reminderSms")}
                                      value={doctor.reminder24hSmsCount}
                                      helper={formatCurrency(
                                        Number(doctor.reminder24hSmsCount) *
                                          Number(
                                            summary.prices.smsUnitPriceRon
                                          ),
                                        locale,
                                        billingCurrency
                                      )}
                                    />
                                    <SummaryCard
                                      label={t("smsSubtotal")}
                                      value={formatCurrency(
                                        Number(doctor.smsCostRon),
                                        locale,
                                        billingCurrency
                                      )}
                                      helper={`${doctor.totalSmsCount} SMS`}
                                    />
                                  </div>
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
