"use client";

import {
  useMemo,
  useState,
} from "react";

import CreateClinicInvoiceFromEstimateLink from "@/components/invoices/create-clinic-invoice-from-estimate-link";
import type { PlatformBillingCurrency } from "@/lib/billing/platform-invoicing";
import type { AppLocale } from "@/lib/i18n/app-locale";

export type ClinicBillingDoctorRow = {
  relationshipId: string;
  doctorId: string | null;
  doctorName: string;
  email: string | null;
  coverageStatus: string;
  clinicName: string | null;
  subscriptionCostRon: number;
  confirmationSmsCount: number;
  reminder24hSmsCount: number;
  totalSmsCount: number;
  smsCostRon: number;
  estimatedDoctorTotalRon: number;
};

export type ClinicBillingOrganizationRow = {
  organization: {
    id: string;
    name: string;
    status: string;
    contactEmail: string | null;
    contactPhone: string | null;
  };
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
  } | null;
  approvedLocationCount: number;
  activeDoctorCount: number;
  confirmationSmsCount: number;
  reminder24hSmsCount: number;
  totalSmsCount: number;
  subscriptionSubtotalRon: number;
  smsSubtotalRon: number;
  subtotalBeforeVatRon: number;
  estimatedVatRon: number;
  estimatedTotalRon: number;
  doctors: ClinicBillingDoctorRow[];
};

export type ClinicBillingMonthSummary = {
  monthStart: string;
  monthEndExclusive: string;
  prices: {
    clinicDoctorMonthlyPriceRon: number;
    smsUnitPriceRon: number;
    vatRate: number;
  };
  totals: {
    organizationCount: number;
    approvedLocationCount: number;
    activeDoctorCount: number;
    confirmationSmsCount: number;
    reminder24hSmsCount: number;
    totalSmsCount: number;
    subscriptionSubtotalRon: number;
    smsSubtotalRon: number;
    subtotalBeforeVatRon: number;
    estimatedVatRon: number;
    estimatedTotalRon: number;
  };
  organizations: ClinicBillingOrganizationRow[];
};

type Props = {
  locale: AppLocale;
  currency: PlatformBillingCurrency;
  selectedSummary: ClinicBillingMonthSummary;
  previousSummary: ClinicBillingMonthSummary;
};

type Copy = {
  summary: string;
  description: string;
  currency: string;
  selectedMonth: string;
  previousMonth: string;
  organizations: string;
  locations: string;
  doctors: string;
  sms: string;
  subscriptionSubtotal: string;
  subtotal: string;
  vat: string;
  total: string;
  priceOverview: string;
  doctorPrice: string;
  vatRate: string;
  organizationSearch: string;
  searchPlaceholder: string;
  noResults: string;
  billingDetails: string;
  missingBilling: string;
  contact: string;
  taxId: string;
  billingEmail: string;
  address: string;
  selectedPeriod: string;
  previousPeriod: string;
  doctorBreakdown: string;
  doctor: string;
  clinic: string;
  subscription: string;
  estimatedTotal: string;
  confirmations: string;
  reminders: string;
  createInvoice: string;
  operationalNotice: string;
  includedSmsNotice: string;
  noDoctors: string;
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    summary: "Sumar consolidat",
    description:
      "Estimare operațională pentru luna selectată, comparată cu luna precedentă.",
    currency: "Monedă",
    selectedMonth: "Luna selectată",
    previousMonth: "Luna precedentă",
    organizations: "Organizații",
    locations: "Locații aprobate",
    doctors: "Medici acoperiți",
    sms: "SMS trimise",
    subscriptionSubtotal: "Abonamente / pachete",
    subtotal: "Subtotal înainte de TVA",
    vat: "TVA estimat",
    total: "Total estimat",
    priceOverview: "Tarife utilizate",
    doctorPrice: "Abonament / pachet medic",
    vatRate: "Cotă TVA",
    organizationSearch: "Caută organizație",
    searchPlaceholder: "Organizație, societate, CUI sau e-mail...",
    noResults: "Nu există organizații care corespund căutării.",
    billingDetails: "Date de facturare",
    missingBilling: "Datele de facturare nu sunt completate.",
    contact: "Contact",
    taxId: "CUI / CIF",
    billingEmail: "E-mail facturare",
    address: "Adresă",
    selectedPeriod: "Perioada selectată",
    previousPeriod: "Perioada precedentă",
    doctorBreakdown: "Detalii pe medic / cont",
    doctor: "Medic / cont",
    clinic: "Locație",
    subscription: "Abonament / pachet",
    estimatedTotal: "Total estimat",
    confirmations: "Confirmări",
    reminders: "Reminder 24h",
    createInvoice: "Deschide factura",
    operationalNotice:
      "Valorile monetare sunt calculate numai din abonamente/pachete. Factura contabilă este creată și urmărită separat în SAGA.",
    includedSmsNotice:
      "SMS-urile sunt incluse în abonament/pachet și sunt afișate doar ca utilizare operațională.",
    noDoctors: "Nu există medici cu acoperire activă în această perioadă.",
  },
  en: {
    summary: "Consolidated summary",
    description:
      "Operational estimate for the selected month, compared with the previous month.",
    currency: "Currency",
    selectedMonth: "Selected month",
    previousMonth: "Previous month",
    organizations: "Organizations",
    locations: "Approved locations",
    doctors: "Covered Doctors",
    sms: "SMS sent",
    subscriptionSubtotal: "Subscriptions / packages",
    subtotal: "Subtotal before VAT",
    vat: "Estimated VAT",
    total: "Estimated total",
    priceOverview: "Prices used",
    doctorPrice: "Doctor subscription / package",
    vatRate: "VAT rate",
    organizationSearch: "Search organizations",
    searchPlaceholder: "Organization, company, tax ID or email...",
    noResults: "No organizations match the search.",
    billingDetails: "Billing details",
    missingBilling: "Billing details have not been completed.",
    contact: "Contact",
    taxId: "Tax ID",
    billingEmail: "Billing email",
    address: "Address",
    selectedPeriod: "Selected period",
    previousPeriod: "Previous period",
    doctorBreakdown: "Doctor / account details",
    doctor: "Doctor / account",
    clinic: "Location",
    subscription: "Subscription / package",
    estimatedTotal: "Estimated total",
    confirmations: "Confirmations",
    reminders: "24h reminders",
    createInvoice: "Open invoice",
    operationalNotice:
      "Monetary values are calculated only from subscriptions/packages. The accounting invoice is created and tracked separately in SAGA.",
    includedSmsNotice:
      "SMS is included in the subscription/package and is shown only as operational usage.",
    noDoctors: "There are no Doctors with active coverage in this period.",
  },
  de: {
    summary: "Konsolidierte Übersicht",
    description:
      "Operative Schätzung für den ausgewählten Monat im Vergleich zum Vormonat.",
    currency: "Währung",
    selectedMonth: "Ausgewählter Monat",
    previousMonth: "Vormonat",
    organizations: "Organisationen",
    locations: "Genehmigte Standorte",
    doctors: "Abgedeckte Ärzte",
    sms: "Gesendete SMS",
    subscriptionSubtotal: "Abonnements / Pakete",
    subtotal: "Zwischensumme vor MwSt.",
    vat: "Geschätzte MwSt.",
    total: "Geschätzter Gesamtbetrag",
    priceOverview: "Verwendete Preise",
    doctorPrice: "Arztabonnement / Paket",
    vatRate: "MwSt.-Satz",
    organizationSearch: "Organisationen suchen",
    searchPlaceholder: "Organisation, Unternehmen, Steuer-ID oder E-Mail...",
    noResults: "Keine Organisationen entsprechen der Suche.",
    billingDetails: "Rechnungsdaten",
    missingBilling: "Die Rechnungsdaten sind nicht vollständig.",
    contact: "Kontakt",
    taxId: "Steuer-ID",
    billingEmail: "Rechnungs-E-Mail",
    address: "Adresse",
    selectedPeriod: "Ausgewählter Zeitraum",
    previousPeriod: "Vorheriger Zeitraum",
    doctorBreakdown: "Arzt-/Kontodetails",
    doctor: "Arzt / Konto",
    clinic: "Standort",
    subscription: "Abonnement / Paket",
    estimatedTotal: "Geschätzter Gesamtbetrag",
    confirmations: "Bestätigungen",
    reminders: "24h-Erinnerungen",
    createInvoice: "Rechnung öffnen",
    operationalNotice:
      "Geldbeträge werden nur aus Abonnements/Paketen berechnet. Die Buchhaltungsrechnung wird separat in SAGA erstellt und verfolgt.",
    includedSmsNotice:
      "SMS sind im Abonnement/Paket enthalten und werden nur als operative Nutzung angezeigt.",
    noDoctors: "In diesem Zeitraum gibt es keine Ärzte mit aktiver Abdeckung.",
  },
};

const LOCALE_TAG: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function packageAmounts(
  subscriptionSubtotal: number,
  vatRate: number
) {
  const subtotal = roundMoney(Number(subscriptionSubtotal ?? 0));
  const vat = roundMoney(subtotal * Number(vatRate ?? 0));

  return {
    subtotal,
    vat,
    total: roundMoney(subtotal + vat),
  };
}

function formatCurrency(
  value: number,
  locale: AppLocale,
  currency: PlatformBillingCurrency
) {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatMonth(value: string, locale: AppLocale) {
  const [year, month] = value.slice(0, 7).split("-").map(Number);

  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

function formatPercent(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[13px] border border-gray-200 bg-white p-[13px]">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-[8px] text-lg font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function organizationAddress(
  profile: ClinicBillingOrganizationRow["billingProfile"]
) {
  if (!profile) return "";

  return [
    profile.billing_address,
    profile.billing_city,
    profile.billing_county,
    profile.billing_country,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function AdminClinicBillingOverview({
  locale,
  currency,
  selectedSummary,
  previousSummary,
}: Props) {
  const copy = COPY[locale];
  const [search, setSearch] = useState("");

  const previousByOrganization = useMemo(
    () =>
      new Map(
        previousSummary.organizations.map((row) => [
          row.organization.id,
          row,
        ])
      ),
    [previousSummary.organizations]
  );

  const filteredOrganizations = useMemo(() => {
    const needle = normalizeSearch(search);
    if (!needle) return selectedSummary.organizations;

    return selectedSummary.organizations.filter((row) => {
      const billing = row.billingProfile;

      return normalizeSearch(
        `${row.organization.name} ${row.organization.contactEmail ?? ""} ${
          billing?.company_name ?? ""
        } ${billing?.tax_id ?? ""} ${billing?.billing_email ?? ""}`
      ).includes(needle);
    });
  }, [search, selectedSummary.organizations]);

  const selectedLabel = formatMonth(selectedSummary.monthStart, locale);
  const previousLabel = formatMonth(previousSummary.monthStart, locale);

  const selectedTotals = packageAmounts(
    selectedSummary.totals.subscriptionSubtotalRon,
    selectedSummary.prices.vatRate
  );
  const previousTotals = packageAmounts(
    previousSummary.totals.subscriptionSubtotalRon,
    previousSummary.prices.vatRate
  );

  return (
    <section className="space-y-[21px] rounded-[21px] border border-[#036661]/20 bg-[#F8FBFA] p-[21px] shadow-sm sm:p-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          {copy.summary}
        </p>
        <h2 className="mt-[8px] text-2xl font-bold capitalize text-gray-900">
          {selectedLabel}
        </h2>
        <p className="mt-[8px] max-w-4xl text-sm leading-6 text-gray-600">
          {copy.description}
        </p>
        <p className="mt-[8px] text-sm text-gray-500">
          {copy.currency}: {currency}
        </p>
      </header>

      <div className="grid gap-[13px] md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label={copy.organizations}
          value={selectedSummary.totals.organizationCount}
        />
        <SummaryMetric
          label={copy.locations}
          value={selectedSummary.totals.approvedLocationCount}
        />
        <SummaryMetric
          label={copy.doctors}
          value={selectedSummary.totals.activeDoctorCount}
        />
        <SummaryMetric
          label={copy.sms}
          value={selectedSummary.totals.totalSmsCount}
        />
      </div>

      <p className="rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-sm leading-6 text-blue-950">
        {copy.includedSmsNotice}
      </p>

      <div className="grid gap-[13px] xl:grid-cols-2">
        {[
          [
            copy.selectedMonth,
            selectedLabel,
            selectedSummary,
            selectedTotals,
          ],
          [
            copy.previousMonth,
            previousLabel,
            previousSummary,
            previousTotals,
          ],
        ].map(([eyebrow, monthLabel, summary, amounts]) => {
          const typedSummary = summary as ClinicBillingMonthSummary;
          const typedAmounts = amounts as ReturnType<typeof packageAmounts>;

          return (
            <article
              key={String(eyebrow)}
              className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {eyebrow as string}
              </p>
              <h3 className="mt-[5px] text-lg font-bold capitalize text-gray-900">
                {monthLabel as string}
              </h3>

              <dl className="mt-[13px] space-y-[8px] text-sm">
                {[
                  [
                    copy.subscriptionSubtotal,
                    formatCurrency(
                      typedSummary.totals.subscriptionSubtotalRon,
                      locale,
                      currency
                    ),
                  ],
                  [
                    copy.subtotal,
                    formatCurrency(typedAmounts.subtotal, locale, currency),
                  ],
                  [
                    copy.vat,
                    formatCurrency(typedAmounts.vat, locale, currency),
                  ],
                  [
                    copy.total,
                    formatCurrency(typedAmounts.total, locale, currency),
                  ],
                ].map(([label, value], index) => (
                  <div
                    key={String(label)}
                    className={`flex items-center justify-between gap-[13px] ${
                      index === 3
                        ? "border-t border-gray-200 pt-[13px] font-bold"
                        : ""
                    }`}
                  >
                    <dt className="text-gray-600">{label}</dt>
                    <dd className="text-right text-gray-950">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">
          {copy.priceOverview}
        </h3>
        <p className="mt-[5px] text-sm text-gray-500">
          {copy.currency}: {currency}
        </p>

        <div className="mt-[13px] grid gap-[13px] sm:grid-cols-2">
          <SummaryMetric
            label={copy.doctorPrice}
            value={formatCurrency(
              selectedSummary.prices.clinicDoctorMonthlyPriceRon,
              locale,
              currency
            )}
          />
          <SummaryMetric
            label={copy.vatRate}
            value={formatPercent(selectedSummary.prices.vatRate, locale)}
          />
        </div>
      </section>

      <section>
        <label className="block max-w-xl">
          <span className="text-sm font-semibold text-gray-700">
            {copy.organizationSearch}
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
          />
        </label>

        {filteredOrganizations.length === 0 ? (
          <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
            {copy.noResults}
          </div>
        ) : (
          <div className="mt-[21px] space-y-[13px]">
            {filteredOrganizations.map((row) => {
              const previous = previousByOrganization.get(row.organization.id);
              const billing = row.billingProfile;
              const organizationAmounts = packageAmounts(
                row.subscriptionSubtotalRon,
                selectedSummary.prices.vatRate
              );
              const previousOrganizationAmounts = previous
                ? packageAmounts(
                    previous.subscriptionSubtotalRon,
                    previousSummary.prices.vatRate
                  )
                : { subtotal: 0, vat: 0, total: 0 };

              return (
                <details
                  key={row.organization.id}
                  className="group overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm"
                >
                  <summary className="romdoc-focus-ring flex cursor-pointer list-none flex-col gap-[13px] p-[21px] marker:content-none md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {row.organization.name}
                      </h3>
                      <p className="mt-[5px] text-sm text-gray-500">
                        {row.organization.contactEmail ?? "—"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4 md:min-w-[600px]">
                      <SummaryMetric
                        label={copy.locations}
                        value={row.approvedLocationCount}
                      />
                      <SummaryMetric
                        label={copy.doctors}
                        value={row.activeDoctorCount}
                      />
                      <SummaryMetric
                        label={copy.sms}
                        value={row.totalSmsCount}
                      />
                      <SummaryMetric
                        label={copy.total}
                        value={formatCurrency(
                          organizationAmounts.total,
                          locale,
                          currency
                        )}
                      />
                    </div>
                  </summary>

                  <div className="border-t border-gray-200 bg-gray-50/60 p-[21px]">
                    <p className="text-sm text-gray-500">
                      {copy.currency}: {currency}
                    </p>

                    <div className="mt-[13px] grid gap-[21px] xl:grid-cols-2">
                      <aside
                        className={`rounded-[13px] border p-[13px] ${
                          billing
                            ? "border-[#036661]/20 bg-[#036661]/5"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <h4 className="font-bold text-gray-900">
                          {copy.billingDetails}
                        </h4>

                        {billing ? (
                          <dl className="mt-[8px] space-y-[5px] text-sm leading-6 text-gray-700">
                            <div>
                              <dt className="sr-only">
                                {copy.billingDetails}
                              </dt>
                              <dd className="font-semibold text-gray-950">
                                {billing.company_name}
                              </dd>
                            </div>

                            <div className="flex gap-[5px]">
                              <dt className="font-medium">{copy.taxId}:</dt>
                              <dd>{billing.tax_id}</dd>
                            </div>

                            <div className="flex gap-[5px]">
                              <dt className="font-medium">
                                {copy.billingEmail}:
                              </dt>
                              <dd>{billing.billing_email}</dd>
                            </div>

                            <div className="flex gap-[5px]">
                              <dt className="font-medium">
                                {copy.address}:
                              </dt>
                              <dd>{organizationAddress(billing)}</dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="mt-[8px] text-sm text-amber-900">
                            {copy.missingBilling}
                          </p>
                        )}
                      </aside>

                      <dl className="rounded-[13px] border border-gray-200 bg-white p-[13px] text-sm">
                        {[
                          [
                            copy.selectedPeriod,
                            formatCurrency(
                              organizationAmounts.total,
                              locale,
                              currency
                            ),
                          ],
                          [
                            copy.previousPeriod,
                            formatCurrency(
                              previousOrganizationAmounts.total,
                              locale,
                              currency
                            ),
                          ],
                          [
                            copy.contact,
                            [
                              row.organization.contactEmail,
                              row.organization.contactPhone,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—",
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            className="flex items-start justify-between gap-[13px] border-b border-gray-100 py-[8px] last:border-0"
                          >
                            <dt className="text-gray-600">{label}</dt>
                            <dd className="text-right font-semibold text-gray-950">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="mt-[21px]">
                      <h4 className="font-bold text-gray-900">
                        {copy.doctorBreakdown}
                      </h4>

                      {row.doctors.length === 0 ? (
                        <p className="mt-[8px] text-sm text-gray-600">
                          {copy.noDoctors}
                        </p>
                      ) : (
                        <div className="mt-[13px] overflow-x-auto rounded-[13px] border border-gray-200 bg-white">
                          <table className="min-w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                              <tr>
                                <th className="px-[13px] py-[10px]">
                                  {copy.doctor}
                                </th>
                                <th className="px-[13px] py-[10px]">
                                  {copy.clinic}
                                </th>
                                <th className="px-[13px] py-[10px]">
                                  {copy.subscription}
                                </th>
                                <th className="px-[13px] py-[10px]">
                                  {copy.sms}
                                </th>
                                <th className="px-[13px] py-[10px]">
                                  {copy.estimatedTotal}
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                              {row.doctors.map((doctor) => {
                                const doctorAmounts = packageAmounts(
                                  doctor.subscriptionCostRon,
                                  selectedSummary.prices.vatRate
                                );

                                return (
                                  <tr key={doctor.relationshipId}>
                                    <td className="px-[13px] py-[10px]">
                                      <p className="font-semibold text-gray-950">
                                        {doctor.doctorName}
                                      </p>
                                      <p className="mt-[3px] text-xs text-gray-500">
                                        {doctor.email ?? "—"}
                                      </p>
                                    </td>

                                    <td className="px-[13px] py-[10px] text-gray-700">
                                      {doctor.clinicName ?? "—"}
                                    </td>

                                    <td className="px-[13px] py-[10px] font-medium">
                                      {formatCurrency(
                                        doctor.subscriptionCostRon,
                                        locale,
                                        currency
                                      )}
                                    </td>

                                    <td className="px-[13px] py-[10px] text-gray-700">
                                      {doctor.totalSmsCount}
                                      <p className="mt-[3px] text-xs text-gray-500">
                                        {copy.confirmations}:{" "}
                                        {doctor.confirmationSmsCount} ·{" "}
                                        {copy.reminders}:{" "}
                                        {doctor.reminder24hSmsCount}
                                      </p>
                                    </td>

                                    <td className="px-[13px] py-[10px] font-bold text-[#036661]">
                                      {formatCurrency(
                                        doctorAmounts.total,
                                        locale,
                                        currency
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {previous &&
                    previousOrganizationAmounts.total > 0 ? (
                      <div className="mt-[21px]">
                        <CreateClinicInvoiceFromEstimateLink
                          href="/admin/invoices"
                          organizationId={row.organization.id}
                          billingPeriodStart={previousSummary.monthStart}
                          billingPeriodEnd={new Date(
                            new Date(
                              previousSummary.monthEndExclusive
                            ).getTime() -
                              24 * 60 * 60 * 1000
                          )
                            .toISOString()
                            .slice(0, 10)}
                          estimatedAmountRon={
                            previousOrganizationAmounts.total
                          }
                          label={copy.createInvoice}
                          className="romdoc-focus-ring inline-flex rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49]"
                        />
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm leading-6 text-amber-900">
        {copy.operationalNotice}
      </div>
    </section>
  );
}
