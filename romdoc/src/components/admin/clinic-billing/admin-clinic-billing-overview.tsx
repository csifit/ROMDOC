"use client";

import { useState } from "react";

import AdminAccordion from "@/components/ui/admin-accordion";
import {
  type AppLocale,
} from "@/i18n/routing";

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

type AdminClinicBillingOverviewProps = {
  locale: AppLocale;
  currentSummary: ClinicBillingMonthSummary;
  previousSummary: ClinicBillingMonthSummary;
};

type Copy = {
  generalTitle: string;
  generalDescription: string;
  currentEstimate: string;
  previousInvoiceAmount: string;
  currentMonthHelper: string;
  previousMonthHelper: string;
  organizations: string;
  organizationsDescription: string;
  organizationSearchPlaceholder: string;
  organizationSearchLabel: string;
  organizationSearchEmpty: string;
  organization: string;
  locations: string;
  activeSubscriptions: string;
  sentSms: string;
  billingDetails: string;
  company: string;
  taxId: string;
  tradeRegister: string;
  billingEmail: string;
  vatPayer: string;
  vatNumber: string;
  address: string;
  yes: string;
  no: string;
  unavailable: string;
  currentMonth: string;
  previousMonth: string;
  subscriptionSubtotal: string;
  smsSubtotal: string;
  subtotalBeforeVat: string;
  vat: string;
  total: string;
  doctorDetails: string;
  doctorDetailsDescription: string;
  account: string;
  clinic: string;
  subscription: string;
  sms: string;
  currentEstimateShort: string;
  previousAmountShort: string;
  noDoctors: string;
  currentGlobalDetails: string;
  previousGlobalDetails: string;
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    generalTitle: "Sumar general",
    generalDescription:
      "Estimarea lunii curente și suma calculată pentru serviciile lunii precedente.",
    currentEstimate: "Total estimat luna curentă",
    previousInvoiceAmount:
      "Total de facturat pentru luna precedentă",
    currentMonthHelper:
      "Estimare live folosind tarifele configurate în prezent.",
    previousMonthHelper:
      "Bază de verificare pentru facturarea manuală a lunii încheiate.",
    organizations: "Organizații de clinică",
    organizationsDescription:
      "Date de facturare, locații, abonamente active, SMS și costuri pentru fiecare organizație.",
    organizationSearchPlaceholder:
      "Caută după organizație, societate, CUI sau e-mail...",
    organizationSearchLabel: "Caută organizație",
    organizationSearchEmpty:
      "Nu există organizații care corespund căutării.",
    organization: "Organizație",
    locations: "Locații",
    activeSubscriptions: "Abonamente active",
    sentSms: "SMS trimise",
    billingDetails: "Date de facturare",
    company: "Societate",
    taxId: "CUI",
    tradeRegister: "Registrul Comerțului",
    billingEmail: "E-mail facturare",
    vatPayer: "Plătitor TVA",
    vatNumber: "Cod TVA",
    address: "Adresă",
    yes: "Da",
    no: "Nu",
    unavailable: "Indisponibil",
    currentMonth: "Luna curentă",
    previousMonth: "Luna precedentă",
    subscriptionSubtotal: "Abonamente medici",
    smsSubtotal: "SMS",
    subtotalBeforeVat: "Subtotal înainte de TVA",
    vat: "TVA estimat",
    total: "Total estimat",
    doctorDetails: "Detalii pe medic / cont",
    doctorDetailsDescription:
      "Defalcare simplă pentru verificarea manuală a abonamentelor și SMS-urilor.",
    account: "Medic / cont",
    clinic: "Locație",
    subscription: "Abonament",
    sms: "SMS",
    currentEstimateShort: "Estimare curentă",
    previousAmountShort: "Luna precedentă",
    noDoctors:
      "Nu există conturi cu acoperire activă pentru această organizație.",
    currentGlobalDetails: "Detalii luna curentă",
    previousGlobalDetails: "Detalii luna precedentă",
  },

  en: {
    generalTitle: "General summary",
    generalDescription:
      "Current-month estimate and the calculated amount for the previous month's services.",
    currentEstimate: "Estimated total for the current month",
    previousInvoiceAmount:
      "Amount to invoice for the previous month",
    currentMonthHelper:
      "Live estimate using the prices currently configured.",
    previousMonthHelper:
      "Review basis for manually invoicing the completed month.",
    organizations: "Clinic organizations",
    organizationsDescription:
      "Billing details, locations, active subscriptions, SMS and costs for each organization.",
    organizationSearchPlaceholder:
      "Search by organization, company, tax ID or email...",
    organizationSearchLabel: "Search organization",
    organizationSearchEmpty:
      "No organizations match your search.",
    organization: "Organization",
    locations: "Locations",
    activeSubscriptions: "Active subscriptions",
    sentSms: "SMS sent",
    billingDetails: "Billing details",
    company: "Company",
    taxId: "Tax ID",
    tradeRegister: "Trade Register",
    billingEmail: "Billing email",
    vatPayer: "VAT payer",
    vatNumber: "VAT number",
    address: "Address",
    yes: "Yes",
    no: "No",
    unavailable: "Unavailable",
    currentMonth: "Current month",
    previousMonth: "Previous month",
    subscriptionSubtotal: "Doctor subscriptions",
    smsSubtotal: "SMS",
    subtotalBeforeVat: "Subtotal before VAT",
    vat: "Estimated VAT",
    total: "Estimated total",
    doctorDetails: "Doctor / account details",
    doctorDetailsDescription:
      "Simple breakdown for manually checking subscriptions and SMS.",
    account: "Doctor / account",
    clinic: "Location",
    subscription: "Subscription",
    sms: "SMS",
    currentEstimateShort: "Current estimate",
    previousAmountShort: "Previous month",
    noDoctors:
      "There are no accounts with active coverage for this organization.",
    currentGlobalDetails: "Current-month details",
    previousGlobalDetails: "Previous-month details",
  },

  de: {
    generalTitle: "Allgemeine Übersicht",
    generalDescription:
      "Schätzung für den aktuellen Monat und berechneter Betrag für die Leistungen des Vormonats.",
    currentEstimate: "Geschätzter Gesamtbetrag im aktuellen Monat",
    previousInvoiceAmount:
      "Zu berechnender Betrag für den Vormonat",
    currentMonthHelper:
      "Live-Schätzung mit den aktuell konfigurierten Preisen.",
    previousMonthHelper:
      "Prüfgrundlage für die manuelle Abrechnung des abgeschlossenen Monats.",
    organizations: "Klinikorganisationen",
    organizationsDescription:
      "Rechnungsdaten, Standorte, aktive Abonnements, SMS und Kosten je Organisation.",
    organizationSearchPlaceholder:
      "Nach Organisation, Unternehmen, Steuer-ID oder E-Mail suchen...",
    organizationSearchLabel: "Organisation suchen",
    organizationSearchEmpty:
      "Keine Organisationen entsprechen der Suche.",
    organization: "Organisation",
    locations: "Standorte",
    activeSubscriptions: "Aktive Abonnements",
    sentSms: "Gesendete SMS",
    billingDetails: "Rechnungsdaten",
    company: "Unternehmen",
    taxId: "Steuer-ID",
    tradeRegister: "Handelsregister",
    billingEmail: "Rechnungs-E-Mail",
    vatPayer: "MwSt.-pflichtig",
    vatNumber: "USt-IdNr.",
    address: "Adresse",
    yes: "Ja",
    no: "Nein",
    unavailable: "Nicht verfügbar",
    currentMonth: "Aktueller Monat",
    previousMonth: "Vormonat",
    subscriptionSubtotal: "Arztabonnements",
    smsSubtotal: "SMS",
    subtotalBeforeVat: "Zwischensumme vor MwSt.",
    vat: "Geschätzte MwSt.",
    total: "Geschätzter Gesamtbetrag",
    doctorDetails: "Arzt-/Kontodetails",
    doctorDetailsDescription:
      "Einfache Aufschlüsselung zur manuellen Prüfung von Abonnements und SMS.",
    account: "Arzt / Konto",
    clinic: "Standort",
    subscription: "Abonnement",
    sms: "SMS",
    currentEstimateShort: "Aktuelle Schätzung",
    previousAmountShort: "Vormonat",
    noDoctors:
      "Für diese Organisation gibt es keine Konten mit aktiver Abdeckung.",
    currentGlobalDetails: "Details aktueller Monat",
    previousGlobalDetails: "Details Vormonat",
  },
};

function intlLocale(
  locale: AppLocale
) {
  if (locale === "ro") {
    return "ro-RO";
  }

  if (locale === "de") {
    return "de-DE";
  }

  return "en-US";
}

function formatCurrency(
  value: number,
  locale: AppLocale
) {
  return new Intl.NumberFormat(
    intlLocale(locale),
    {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 2,
    }
  ).format(Number(value ?? 0));
}

function formatMonth(
  value: string,
  locale: AppLocale
) {
  const [year, month] =
    value.split("-").map(Number);

  return new Intl.DateTimeFormat(
    intlLocale(locale),
    {
      month: "long",
      year: "numeric",
      timeZone: "Europe/Bucharest",
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        15
      )
    )
  );
}

function findPreviousOrganization(
  previousSummary: ClinicBillingMonthSummary,
  organizationId: string
) {
  return (
    previousSummary.organizations.find(
      (organization) =>
        organization.organization.id ===
        organizationId
    ) ?? null
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-bold text-gray-900">
        {value}
      </p>

      {helper ? (
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {helper}
        </p>
      ) : null}
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
      className={`flex items-center justify-between gap-4 ${
        strong
          ? "border-t border-gray-200 pt-3"
          : ""
      }`}
    >
      <dt
        className={
          strong
            ? "font-semibold text-gray-900"
            : "text-gray-600"
        }
      >
        {label}
      </dt>

      <dd
        className={
          strong
            ? "font-bold text-gray-900"
            : "font-semibold text-gray-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function PeriodBreakdown({
  title,
  organization,
  locale,
  text,
}: {
  title: string;
  organization:
    ClinicBillingOrganizationRow;
  locale: AppLocale;
  text: Copy;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5">
      <h4 className="font-semibold text-gray-900">
        {title}
      </h4>

      <dl className="mt-4 space-y-3 text-sm">
        <CostLine
          label={
            text.subscriptionSubtotal
          }
          value={formatCurrency(
            organization
              .subscriptionSubtotalRon,
            locale
          )}
        />

        <CostLine
          label={`${text.smsSubtotal} (${organization.totalSmsCount})`}
          value={formatCurrency(
            organization.smsSubtotalRon,
            locale
          )}
        />

        <CostLine
          label={
            text.subtotalBeforeVat
          }
          value={formatCurrency(
            organization
              .subtotalBeforeVatRon,
            locale
          )}
        />

        <CostLine
          label={text.vat}
          value={formatCurrency(
            organization.estimatedVatRon,
            locale
          )}
        />

        <CostLine
          label={text.total}
          value={formatCurrency(
            organization.estimatedTotalRon,
            locale
          )}
          strong
        />
      </dl>
    </div>
  );
}

export default function AdminClinicBillingOverview({
  locale,
  currentSummary,
  previousSummary,
}: AdminClinicBillingOverviewProps) {
  const text =
    COPY[locale] ?? COPY.ro;

  const [
    organizationSearch,
    setOrganizationSearch,
  ] = useState("");

  const normalizedSearch =
    organizationSearch
      .trim()
      .toLocaleLowerCase();

  const filteredOrganizations =
    normalizedSearch.length === 0
      ? currentSummary.organizations
      : currentSummary.organizations.filter(
          (organizationRow) => {
            const organization =
              organizationRow.organization;

            const billing =
              organizationRow.billingProfile;

            const searchableText = [
              organization.name,
              organization.contactEmail,
              organization.contactPhone,
              billing?.company_name,
              billing?.tax_id,
              billing?.trade_register_number,
              billing?.billing_email,
              billing?.vat_number,
              billing?.billing_city,
              billing?.billing_county,
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase();

            return searchableText.includes(
              normalizedSearch
            );
          }
        );

  return (
    <div className="space-y-6">
      <AdminAccordion
        title={text.generalTitle}
        description={
          text.generalDescription
        }
        defaultOpen
      >
        <div className="grid gap-5 md:grid-cols-2">
          <SummaryCard
            label={
              text.currentEstimate
            }
            value={formatCurrency(
              currentSummary.totals
                .estimatedTotalRon,
              locale
            )}
            helper={`${formatMonth(
              currentSummary.monthStart,
              locale
            )}. ${text.currentMonthHelper}`}
          />

          <SummaryCard
            label={
              text.previousInvoiceAmount
            }
            value={formatCurrency(
              previousSummary.totals
                .estimatedTotalRon,
              locale
            )}
            helper={`${formatMonth(
              previousSummary.monthStart,
              locale
            )}. ${text.previousMonthHelper}`}
          />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label={
              text.organization
            }
            value={
              currentSummary.totals
                .organizationCount
            }
          />

          <SummaryCard
            label={text.locations}
            value={
              currentSummary.totals
                .approvedLocationCount
            }
          />

          <SummaryCard
            label={
              text.activeSubscriptions
            }
            value={
              currentSummary.totals
                .activeDoctorCount
            }
          />

          <SummaryCard
            label={text.sentSms}
            value={
              currentSummary.totals
                .totalSmsCount
            }
          />
        </div>
      </AdminAccordion>

      <AdminAccordion
        title={text.organizations}
        description={
          text.organizationsDescription
        }
        defaultOpen
      >
        {currentSummary.organizations.length ===
        0 ? (
          <p className="text-sm text-gray-600">
            {text.unavailable}
          </p>
        ) : (
          <div className="space-y-5">
            <div>
              <label
                htmlFor="clinic-organization-search"
                className="block text-sm font-semibold text-gray-800"
              >
                {text.organizationSearchLabel}
              </label>

              <div className="relative mt-2">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400"
                >
                  ⌕
                </span>

                <input
                  id="clinic-organization-search"
                  type="search"
                  value={organizationSearch}
                  onChange={(event) =>
                    setOrganizationSearch(
                      event.target.value
                    )
                  }
                  placeholder={
                    text.organizationSearchPlaceholder
                  }
                  className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {filteredOrganizations.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                {text.organizationSearchEmpty}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrganizations.map(
                  (currentOrganization) => {
                const organization =
                  currentOrganization.organization;

                const previousOrganization =
                  findPreviousOrganization(
                    previousSummary,
                    organization.id
                  );

                return (
                  <details
                    key={organization.id}
                    className="group overflow-hidden rounded-2xl border border-gray-200"
                  >
                    <summary className="cursor-pointer list-none p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-5">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#9A4F35]">
                            {text.organization}
                          </p>

                          <h3 className="mt-2 text-xl font-bold text-gray-900">
                            {organization.name}
                          </h3>

                          <p className="mt-2 text-sm text-gray-600">
                            {
                              currentOrganization.activeDoctorCount
                            }{" "}
                            {
                              text.activeSubscriptions
                            }{" "}
                            ·{" "}
                            {
                              currentOrganization.totalSmsCount
                            }{" "}
                            SMS
                          </p>
                        </div>

                        <div className="flex items-center gap-5">
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {
                                text.currentEstimateShort
                              }
                            </p>

                            <p className="mt-1 font-bold text-gray-900">
                              {formatCurrency(
                                currentOrganization
                                  .estimatedTotalRon,
                                locale
                              )}
                            </p>

                            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {
                                text.previousAmountShort
                              }
                            </p>

                            <p className="mt-1 font-bold text-gray-900">
                              {formatCurrency(
                                previousOrganization
                                  ?.estimatedTotalRon ??
                                  0,
                                locale
                              )}
                            </p>
                          </div>

                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-xl text-gray-600 transition-transform group-open:rotate-180">
                            ⌄
                          </span>
                        </div>
                      </div>
                    </summary>

                    <div className="space-y-6 border-t border-gray-200 bg-gray-50/60 p-5 sm:p-6">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <SummaryCard
                          label={
                            text.locations
                          }
                          value={
                            currentOrganization
                              .approvedLocationCount
                          }
                        />

                        <SummaryCard
                          label={
                            text.activeSubscriptions
                          }
                          value={
                            currentOrganization
                              .activeDoctorCount
                          }
                        />

                        <SummaryCard
                          label={
                            text.sentSms
                          }
                          value={
                            currentOrganization
                              .totalSmsCount
                          }
                        />

                        <SummaryCard
                          label={
                            text.currentEstimateShort
                          }
                          value={formatCurrency(
                            currentOrganization
                              .estimatedTotalRon,
                            locale
                          )}
                        />

                        <SummaryCard
                          label={
                            text.previousAmountShort
                          }
                          value={formatCurrency(
                            previousOrganization
                              ?.estimatedTotalRon ??
                              0,
                            locale
                          )}
                        />
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2">
                        <section className="rounded-2xl border border-gray-200 bg-white p-5">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {
                              text.billingDetails
                            }
                          </h4>

                          {currentOrganization
                            .billingProfile ? (
                            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {
                                    text.company
                                  }
                                </dt>

                                <dd className="mt-1 text-gray-900">
                                  {
                                    currentOrganization
                                      .billingProfile
                                      .company_name
                                  }
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {
                                    text.taxId
                                  }
                                </dt>

                                <dd className="mt-1 text-gray-900">
                                  {
                                    currentOrganization
                                      .billingProfile
                                      .tax_id
                                  }
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {
                                    text.tradeRegister
                                  }
                                </dt>

                                <dd className="mt-1 text-gray-900">
                                  {currentOrganization
                                    .billingProfile
                                    .trade_register_number ??
                                    "—"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {
                                    text.billingEmail
                                  }
                                </dt>

                                <dd className="mt-1 text-gray-900">
                                  {
                                    currentOrganization
                                      .billingProfile
                                      .billing_email
                                  }
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {
                                    text.vatPayer
                                  }
                                </dt>

                                <dd className="mt-1 text-gray-900">
                                  {currentOrganization
                                    .billingProfile
                                    .is_vat_payer
                                    ? text.yes
                                    : text.no}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {
                                    text.vatNumber
                                  }
                                </dt>

                                <dd className="mt-1 text-gray-900">
                                  {currentOrganization
                                    .billingProfile
                                    .vat_number ??
                                    "—"}
                                </dd>
                              </div>

                              <div className="sm:col-span-2">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {
                                    text.address
                                  }
                                </dt>

                                <dd className="mt-1 text-gray-900">
                                  {[
                                    currentOrganization
                                      .billingProfile
                                      .billing_address,

                                    currentOrganization
                                      .billingProfile
                                      .billing_city,

                                    currentOrganization
                                      .billingProfile
                                      .billing_county,

                                    currentOrganization
                                      .billingProfile
                                      .billing_country,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </dd>
                              </div>
                            </dl>
                          ) : (
                            <p className="mt-3 text-sm text-gray-600">
                              {
                                text.unavailable
                              }
                            </p>
                          )}
                        </section>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <PeriodBreakdown
                            title={`${text.currentGlobalDetails} — ${formatMonth(
                              currentSummary.monthStart,
                              locale
                            )}`}
                            organization={
                              currentOrganization
                            }
                            locale={locale}
                            text={text}
                          />

                          <PeriodBreakdown
                            title={`${text.previousGlobalDetails} — ${formatMonth(
                              previousSummary.monthStart,
                              locale
                            )}`}
                            organization={
                              previousOrganization ?? {
                                ...currentOrganization,
                                activeDoctorCount:
                                  0,
                                confirmationSmsCount:
                                  0,
                                reminder24hSmsCount:
                                  0,
                                totalSmsCount: 0,
                                subscriptionSubtotalRon:
                                  0,
                                smsSubtotalRon: 0,
                                subtotalBeforeVatRon:
                                  0,
                                estimatedVatRon: 0,
                                estimatedTotalRon: 0,
                                doctors: [],
                              }
                            }
                            locale={locale}
                            text={text}
                          />
                        </div>
                      </div>

                      <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white">
                        <summary className="cursor-pointer list-none p-5">
                          <div className="flex items-center justify-between gap-5">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">
                                {
                                  text.doctorDetails
                                }
                              </h4>

                              <p className="mt-1 text-sm leading-6 text-gray-600">
                                {
                                  text.doctorDetailsDescription
                                }
                              </p>
                            </div>

                            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-xl text-gray-600 transition-transform group-open:rotate-180">
                              ⌄
                            </span>
                          </div>
                        </summary>

                        <div className="border-t border-gray-200 p-5">
                          {currentOrganization
                            .doctors.length ===
                          0 ? (
                            <p className="text-sm text-gray-600">
                              {
                                text.noDoctors
                              }
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead>
                                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="px-3 py-3">
                                      {
                                        text.account
                                      }
                                    </th>

                                    <th className="px-3 py-3">
                                      {
                                        text.clinic
                                      }
                                    </th>

                                    <th className="px-3 py-3 text-right">
                                      {
                                        text.subscription
                                      }
                                    </th>

                                    <th className="px-3 py-3 text-right">
                                      {text.sms}
                                    </th>

                                    <th className="px-3 py-3 text-right">
                                      {
                                        text.currentEstimateShort
                                      }
                                    </th>
                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                  {currentOrganization.doctors.map(
                                    (doctor) => (
                                      <tr
                                        key={
                                          doctor.relationshipId
                                        }
                                      >
                                        <td className="px-3 py-4">
                                          <p className="font-semibold text-gray-900">
                                            {
                                              doctor.doctorName
                                            }
                                          </p>

                                          <p className="mt-1 text-xs text-gray-500">
                                            {doctor.email ??
                                              "—"}
                                          </p>
                                        </td>

                                        <td className="px-3 py-4 text-gray-700">
                                          {doctor.clinicName ??
                                            "—"}
                                        </td>

                                        <td className="px-3 py-4 text-right font-semibold text-gray-900">
                                          {formatCurrency(
                                            doctor.subscriptionCostRon,
                                            locale
                                          )}
                                        </td>

                                        <td className="px-3 py-4 text-right text-gray-700">
                                          {
                                            doctor.totalSmsCount
                                          }{" "}
                                          ·{" "}
                                          {formatCurrency(
                                            doctor.smsCostRon,
                                            locale
                                          )}
                                        </td>

                                        <td className="px-3 py-4 text-right font-bold text-gray-900">
                                          {formatCurrency(
                                            doctor.estimatedDoctorTotalRon,
                                            locale
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </details>
                );
                  }
                )}
              </div>
            )}
          </div>
        )}
      </AdminAccordion>
    </div>
  );
}
