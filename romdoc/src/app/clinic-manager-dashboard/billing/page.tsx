import Link from "next/link";
import { getLocale } from "next-intl/server";

import { type AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

type BillingPageProps = {
  searchParams: Promise<{ month?: string }>;
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

type Copy = {
  title: string;
  description: string;
  auditNotice: string;
  previousMonth: string;
  nextMonth: string;
  currentMonth: string;
  organizationSummary: string;
  coveredDoctors: string;
  subscriptions: string;
  sentSms: string;
  estimatedTotal: string;
  locations: string;
  noLocations: string;
  billingDetails: string;
  costBreakdown: string;
  doctorSubscriptions: string;
  confirmationSms: string;
  reminderSms: string;
  smsSubtotal: string;
  subtotalBeforeVat: string;
  estimatedVat: string;
  totalWithVat: string;
  doctorsTitle: string;
  doctorsHelper: string;
  subscription: string;
  accountEmail: string;
  coverageStart: string;
  assignedLocation: string;
  unitPrices: string;
  doctorUnitPrice: string;
  smsUnitPrice: string;
  noOrganizations: string;
  noOrganizationsHelper: string;
  noDoctors: string;
  notInvoice: string;
  unavailable: string;
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    title: "Costuri și acoperire",
    description:
      "Prezentare lunară a abonamentelor medicilor invitați și a SMS-urilor trimise pacienților.",
    auditNotice:
      "Această pagină este exclusiv pentru vizualizare și audit. Nu generează facturi și nu confirmă sume finale de plată.",
    previousMonth: "Luna precedentă",
    nextMonth: "Luna următoare",
    currentMonth: "Luna curentă",
    organizationSummary: "Sumar organizații",
    coveredDoctors: "Medici acoperiți",
    subscriptions: "Abonamente medici",
    sentSms: "SMS trimise",
    estimatedTotal: "Total estimat",
    locations: "Locații aprobate",
    noLocations: "Nu există locații aprobate asociate.",
    billingDetails: "Date de facturare",
    costBreakdown: "Defalcare costuri",
    doctorSubscriptions: "Abonamente medici",
    confirmationSms: "SMS confirmare",
    reminderSms: "SMS reminder 24h",
    smsSubtotal: "Subtotal SMS",
    subtotalBeforeVat: "Subtotal înainte de TVA",
    estimatedVat: "TVA estimat",
    totalWithVat: "Total estimat cu TVA",
    doctorsTitle: "Costuri pe medic",
    doctorsHelper:
      "Deschide un medic pentru a vedea abonamentul, mesajele SMS și locația asociată.",
    subscription: "Abonament",
    accountEmail: "E-mail cont",
    coverageStart: "Început acoperire",
    assignedLocation: "Locație asociată",
    unitPrices: "Tarife utilizate",
    doctorUnitPrice: "Abonament medic / lună",
    smsUnitPrice: "Preț / SMS trimis",
    noOrganizations: "Nu există organizații asociate",
    noOrganizationsHelper:
      "După asocierea contului cu o organizație de clinică, sumarul va apărea aici.",
    noDoctors: "Nu există medici invitați pentru această organizație.",
    notInvoice: "Estimare de audit — nu reprezintă factură",
    unavailable: "Indisponibil",
  },
  en: {
    title: "Costs and coverage",
    description:
      "Monthly overview of clinic-invited doctor subscriptions and SMS messages sent to patients.",
    auditNotice:
      "This page is for viewing and audit only. It does not generate invoices or confirm final payable amounts.",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    currentMonth: "Current month",
    organizationSummary: "Organization summary",
    coveredDoctors: "Covered doctors",
    subscriptions: "Doctor subscriptions",
    sentSms: "SMS sent",
    estimatedTotal: "Estimated total",
    locations: "Approved locations",
    noLocations: "No approved locations are associated.",
    billingDetails: "Billing details",
    costBreakdown: "Cost breakdown",
    doctorSubscriptions: "Doctor subscriptions",
    confirmationSms: "Confirmation SMS",
    reminderSms: "24h reminder SMS",
    smsSubtotal: "SMS subtotal",
    subtotalBeforeVat: "Subtotal before VAT",
    estimatedVat: "Estimated VAT",
    totalWithVat: "Estimated total with VAT",
    doctorsTitle: "Cost by doctor",
    doctorsHelper:
      "Open a doctor to view subscription, SMS usage and assigned location.",
    subscription: "Subscription",
    accountEmail: "Account email",
    coverageStart: "Coverage start",
    assignedLocation: "Assigned location",
    unitPrices: "Prices used",
    doctorUnitPrice: "Doctor subscription / month",
    smsUnitPrice: "Price / sent SMS",
    noOrganizations: "No associated organizations",
    noOrganizationsHelper:
      "The summary will appear after this account is linked to a clinic organization.",
    noDoctors: "No invited doctors for this organization.",
    notInvoice: "Audit estimate — not an invoice",
    unavailable: "Unavailable",
  },
  de: {
    title: "Kosten und Abdeckung",
    description:
      "Monatliche Übersicht über Abonnements eingeladener Ärzte und an Patienten gesendete SMS.",
    auditNotice:
      "Diese Seite dient ausschließlich der Übersicht und Prüfung. Sie erstellt keine Rechnungen und bestätigt keine endgültigen Zahlungsbeträge.",
    previousMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    currentMonth: "Aktueller Monat",
    organizationSummary: "Organisationsübersicht",
    coveredDoctors: "Abgedeckte Ärzte",
    subscriptions: "Arztabonnements",
    sentSms: "Gesendete SMS",
    estimatedTotal: "Geschätzter Gesamtbetrag",
    locations: "Genehmigte Standorte",
    noLocations: "Keine genehmigten Standorte zugeordnet.",
    billingDetails: "Rechnungsdaten",
    costBreakdown: "Kostenaufstellung",
    doctorSubscriptions: "Arztabonnements",
    confirmationSms: "Bestätigungs-SMS",
    reminderSms: "24-Stunden-Erinnerungs-SMS",
    smsSubtotal: "SMS-Zwischensumme",
    subtotalBeforeVat: "Zwischensumme vor MwSt.",
    estimatedVat: "Geschätzte MwSt.",
    totalWithVat: "Geschätzter Gesamtbetrag inkl. MwSt.",
    doctorsTitle: "Kosten pro Arzt",
    doctorsHelper:
      "Öffnen Sie einen Arzt, um Abonnement, SMS-Nutzung und Standort zu sehen.",
    subscription: "Abonnement",
    accountEmail: "Konto-E-Mail",
    coverageStart: "Beginn der Abdeckung",
    assignedLocation: "Zugewiesener Standort",
    unitPrices: "Verwendete Preise",
    doctorUnitPrice: "Arztabonnement / Monat",
    smsUnitPrice: "Preis / gesendete SMS",
    noOrganizations: "Keine zugeordneten Organisationen",
    noOrganizationsHelper:
      "Die Übersicht erscheint, sobald dieses Konto einer Klinikorganisation zugeordnet ist.",
    noDoctors: "Keine eingeladenen Ärzte für diese Organisation.",
    notInvoice: "Prüfschätzung — keine Rechnung",
    unavailable: "Nicht verfügbar",
  },
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

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function intlLocale(locale: AppLocale) {
  if (locale === "ro") return "ro-RO";
  if (locale === "de") return "de-DE";
  return "en-US";
}

function formatCurrency(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatMonth(value: string, locale: AppLocale) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function SummaryCard({ label, value, helper }: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{helper}</p>
    </div>
  );
}

function CostLine({ label, value, strong = false }: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "border-t border-gray-200 pt-3" : ""}`}>
      <dt className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{label}</dt>
      <dd className={strong ? "font-bold text-gray-900" : "font-semibold text-gray-900"}>{value}</dd>
    </div>
  );
}

export default async function ClinicManagerBillingPage({ searchParams }: BillingPageProps) {
  const parameters = await searchParams;
  const selectedMonth = normalizeMonth(parameters.month);
  const currentMonth = normalizeMonth();
  const previousMonth = shiftMonth(selectedMonth, -1);
  const nextMonth = shiftMonth(selectedMonth, 1);
  const locale = (await getLocale()) as AppLocale;
  const text = COPY[locale] ?? COPY.ro;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: memberships } = user
    ? await supabase
        .from("clinic_organization_members")
        .select("organization_id")
        .eq("profile_id", user.id)
        .eq("status", "active")
    : { data: [] };

  const summaries: OrganizationSummary[] = [];
  for (const membership of (memberships ?? []) as OrganizationMember[]) {
    const { data, error } = await supabase.rpc(
      "get_clinic_manager_monthly_coverage_summary",
      {
        target_organization_id: membership.organization_id,
        target_month: `${selectedMonth}-01`,
      }
    );

    if (error) {
      console.error("Clinic coverage summary failed:", error);
      continue;
    }

    if (data) summaries.push(data as OrganizationSummary);
  }

  const totals = summaries.reduce(
    (acc, summary) => ({
      doctors: acc.doctors + summary.totals.activeDoctorCount,
      subscriptions: acc.subscriptions + Number(summary.totals.subscriptionSubtotalRon),
      sms: acc.sms + summary.totals.totalSmsCount,
      total: acc.total + Number(summary.totals.estimatedTotalRon),
    }),
    { doctors: 0, subscriptions: 0, sms: 0, total: 0 }
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">Clinic Manager</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{text.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">{text.description}</p>
        <p className="mt-4 max-w-4xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-950">
          {text.auditNotice}
        </p>
      </header>

      <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <Link href={`/clinic-manager-dashboard/billing?month=${previousMonth}`} className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          ← {text.previousMonth}
        </Link>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {selectedMonth === currentMonth ? text.currentMonth : text.title}
          </p>
          <p className="mt-1 text-lg font-bold capitalize text-gray-900">{formatMonth(selectedMonth, locale)}</p>
        </div>
        {nextMonth <= currentMonth ? (
          <Link href={`/clinic-manager-dashboard/billing?month=${nextMonth}`} className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            {text.nextMonth} →
          </Link>
        ) : (
          <span className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-400">{text.nextMonth} →</span>
        )}
      </nav>

      {summaries.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{text.noOrganizations}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">{text.noOrganizationsHelper}</p>
        </section>
      ) : (
        <div className="space-y-6">
          {summaries.map((summary) => {
            const organization = summary.organization;
            if (!organization) return null;
            const billing = summary.billingProfile;

            return (
              <details
                key={organization.id}
                className="group rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <summary className="cursor-pointer list-none p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9A4F35]">
                        {text.organizationSummary}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-gray-900">
                        {organization.name}
                      </h2>
                      <p className="mt-2 text-sm text-gray-600">
                        {summary.totals.activeDoctorCount} {text.coveredDoctors.toLowerCase()} ·{" "}
                        {formatCurrency(summary.totals.estimatedTotalRon, locale)}
                      </p>
                    </div>

                    <span className="text-2xl text-gray-400 transition group-open:rotate-45">
                      +
                    </span>
                  </div>
                </summary>

                <div className="space-y-5 border-t border-gray-200 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{organization.name}</h2>
                    <p className="mt-2 text-sm text-gray-600">
                      {organization.contact_email ?? text.unavailable}
                      {organization.contact_phone ? ` · ${organization.contact_phone}` : ""}
                    </p>
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{text.locations}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {summary.locations.length > 0
                          ? summary.locations.map((location) => location.name).join(" · ")
                          : text.noLocations}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">{text.notInvoice}</span>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900">{text.billingDetails}</h3>
                    {billing ? (
                      <dl className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Company</dt><dd className="mt-1">{billing.company_name}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">CUI</dt><dd className="mt-1">{billing.tax_id}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">E-mail</dt><dd className="mt-1">{billing.billing_email}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">TVA</dt><dd className="mt-1">{billing.is_vat_payer ? "Da" : "Nu"}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Address</dt><dd className="mt-1">{[billing.billing_address, billing.billing_city, billing.billing_county, billing.billing_country].filter(Boolean).join(", ")}</dd></div>
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm text-gray-600">{text.unavailable}</p>
                    )}
                  </div>

                  <aside className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900">{text.costBreakdown}</h3>
                    <dl className="mt-5 space-y-3 text-sm">
                      <CostLine label={text.doctorSubscriptions} value={formatCurrency(summary.totals.subscriptionSubtotalRon, locale)} />
                      <CostLine label={`${text.confirmationSms} (${summary.totals.confirmationSmsCount})`} value={formatCurrency(summary.totals.confirmationSmsCount * summary.prices.smsUnitPriceRon, locale)} />
                      <CostLine label={`${text.reminderSms} (${summary.totals.reminder24hSmsCount})`} value={formatCurrency(summary.totals.reminder24hSmsCount * summary.prices.smsUnitPriceRon, locale)} />
                      <CostLine label={text.smsSubtotal} value={formatCurrency(summary.totals.smsSubtotalRon, locale)} />
                      <CostLine label={text.subtotalBeforeVat} value={formatCurrency(summary.totals.subtotalBeforeVatRon, locale)} />
                      <CostLine label={text.estimatedVat} value={formatCurrency(summary.totals.estimatedVatRon, locale)} />
                      <CostLine label={text.totalWithVat} value={formatCurrency(summary.totals.estimatedTotalRon, locale)} strong />
                    </dl>
                    <div className="mt-5 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                      <p className="font-semibold text-gray-800">{text.unitPrices}</p>
                      <p className="mt-1">{text.doctorUnitPrice}: {formatCurrency(summary.prices.clinicDoctorMonthlyPriceRon, locale)}</p>
                      <p>{text.smsUnitPrice}: {formatCurrency(summary.prices.smsUnitPriceRon, locale)}</p>
                    </div>
                  </aside>
                </div>

                <details className="group rounded-2xl border border-gray-200">
                  <summary className="cursor-pointer list-none p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{text.doctorsTitle}</h3>
                        <p className="mt-1 text-sm leading-6 text-gray-600">{text.doctorsHelper}</p>
                      </div>
                      <span className="text-2xl text-gray-400 transition group-open:rotate-45">+</span>
                    </div>
                  </summary>
                  <div className="border-t border-gray-200 p-5 sm:p-6">
                    {summary.doctors.length === 0 ? (
                      <p className="text-sm text-gray-600">{text.noDoctors}</p>
                    ) : (
                      <div className="space-y-3">
                        {summary.doctors.map((doctor) => (
                          <details key={doctor.relationshipId} className="group rounded-xl border border-gray-200 bg-gray-50">
                            <summary className="cursor-pointer list-none p-4">
                              <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(7rem,0.7fr)_minmax(7rem,0.6fr)_minmax(8rem,0.8fr)]">
                                <div>
                                  <p className="font-semibold text-gray-900">{doctor.doctorName}</p>
                                  <p className="mt-1 text-xs text-gray-500">{doctor.email ?? text.unavailable}</p>
                                </div>
                                <p className="text-sm text-gray-700">{doctor.coverageStatus}</p>
                                <p className="text-sm text-gray-700">{doctor.totalSmsCount} SMS</p>
                                <p className="text-sm font-bold text-gray-900">{formatCurrency(doctor.estimatedDoctorSubtotalRon, locale)}</p>
                              </div>
                            </summary>
                            <div className="border-t border-gray-200 bg-white p-4">
                              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                                <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{text.accountEmail}</dt><dd className="mt-1">{doctor.email ?? "—"}</dd></div>
                                <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{text.coverageStart}</dt><dd className="mt-1">{formatDate(doctor.coverageStartedAt ?? doctor.acceptedAt, locale)}</dd></div>
                                <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{text.assignedLocation}</dt><dd className="mt-1">{doctor.clinicName ?? "—"}</dd><p className="mt-1 text-xs text-gray-500">{doctor.clinicAddress}</p></div>
                                <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{text.subscription}</dt><dd className="mt-1 font-bold">{formatCurrency(doctor.subscriptionCostRon, locale)}</dd></div>
                              </dl>
                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <SummaryCard label={text.confirmationSms} value={doctor.confirmationSmsCount} helper={formatCurrency(doctor.confirmationSmsCount * summary.prices.smsUnitPriceRon, locale)} />
                                <SummaryCard label={text.reminderSms} value={doctor.reminder24hSmsCount} helper={formatCurrency(doctor.reminder24hSmsCount * summary.prices.smsUnitPriceRon, locale)} />
                                <SummaryCard label={text.smsSubtotal} value={formatCurrency(doctor.smsCostRon, locale)} helper={`${doctor.totalSmsCount} SMS`} />
                              </div>
                            </div>
                          </details>
                        ))}
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

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label={text.coveredDoctors}
          value={totals.doctors}
          helper={text.notInvoice}
        />
        <SummaryCard
          label={text.subscriptions}
          value={formatCurrency(totals.subscriptions, locale)}
          helper={text.notInvoice}
        />
        <SummaryCard
          label={text.sentSms}
          value={totals.sms}
          helper={text.notInvoice}
        />
        <SummaryCard
          label={text.estimatedTotal}
          value={formatCurrency(totals.total, locale)}
          helper={text.notInvoice}
        />
      </div>
    </div>
  );
}
