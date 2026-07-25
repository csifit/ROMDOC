"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type Props = {
  initialMonth: string | null;
  initialClinicId: string | null;
  initialDoctorId: string | null;
};

type FilterOption = {
  id: string;
  name: string;
};

type Report = {
  organization: {
    id: string;
    name: string;
  };
  period: {
    month: string;
    startDate: string;
    endDate: string;
    isCurrentMonth: boolean;
  };
  selectedFilters: {
    clinicId: string | null;
    doctorId: string | null;
  };
  filterOptions: {
    clinics: FilterOption[];
    doctors: FilterOption[];
  };
  summary: {
    total: number;
    pending: number;
    confirmed: number;
    rescheduled: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
  };
  costSummary: {
    subscriptionCount: number;
    subscriptionPlan: "monthly" | "annual";
    configuredSubscriptionPriceNet: number;
    subscriptionUnitPriceNet: number;
    subscriptionNet: number;
    smsSent: number;
    smsUnitPriceNet: number;
    smsNet: number;
    totalNet: number;
    completedAppointments: number;
    costPerCompletedAppointment: number;
    currency: "RON" | "EUR";
    pricingSource: "global" | "organization";
    amountsAreNet: boolean;
  };
  timeline: Array<{
    date: string;
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  bySource: Array<{
    source: string;
    count: number;
  }>;
  byClinic: Array<{
    clinicId: string | null;
    clinicName: string | null;
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }>;
  byDoctor: Array<{
    doctorId: string;
    doctorName: string;
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }>;
  costsByDoctor: Array<{
    doctorId: string;
    doctorName: string;
    clinicNames: string[];
    subscriptionPlan: "monthly" | "annual" | null;
    subscriptionNet: number;
    smsSent: number;
    smsNet: number;
    totalNet: number;
    completedAppointments: number;
    costPerCompletedAppointment: number;
    currency: "RON" | "EUR";
  }>;
  noticeCode: string;
};

type ApiResponse = {
  success: boolean;
  code: string;
  report?: Report;
  error?: string;
};

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  month: string;
  previousMonth: string;
  nextMonth: string;
  chooseMonth: string;
  previousYear: string;
  nextYear: string;
  clinic: string;
  doctor: string;
  allClinics: string;
  allDoctors: string;
  clearFilters: string;
  exportReport: string;
  exportExcel: string;
  exportPdf: string;
  loading: string;
  loadError: string;
  noData: string;
  appointmentSummary: string;
  costSummary: string;
  totalAppointments: string;
  pending: string;
  upcoming: string;
  completed: string;
  cancelled: string;
  noShow: string;
  completionRate: string;
  subscriptionCost: string;
  smsCost: string;
  totalNetCost: string;
  costPerCompleted: string;
  coveredDoctors: string;
  sentSms: string;
  netNotice: string;
  statusBreakdown: string;
  sourceBreakdown: string;
  clinicBreakdown: string;
  doctorBreakdown: string;
  doctorCosts: string;
  dailyActivity: string;
  status: string;
  source: string;
  count: string;
  total: string;
  clinicName: string;
  doctorName: string;
  plan: string;
  monthly: string;
  annual: string;
  subscriptionNet: string;
  smsSent: string;
  smsNet: string;
  completedAppointments: string;
  date: string;
  empty: string;
  unknownClinic: string;
  statuses: Record<string, string>;
  sources: Record<string, string>;
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    eyebrow: "Manager clinică",
    title: "Rapoarte operaționale",
    description:
      "Urmărește programările, activitatea medicilor și costurile nete ale organizației pentru luna selectată.",
    month: "Lună",
    previousMonth: "Luna precedentă",
    nextMonth: "Luna următoare",
    chooseMonth: "Alege luna",
    previousYear: "Anul precedent",
    nextYear: "Anul următor",
    clinic: "Locație clinică",
    doctor: "Medic",
    allClinics: "Toate locațiile",
    allDoctors: "Toți medicii",
    clearFilters: "Șterge filtrele",
    exportReport: "Exportă raportul",
    exportExcel: "Descarcă Excel",
    exportPdf: "Descarcă PDF",
    loading: "Se încarcă raportul...",
    loadError: "Raportul nu a putut fi încărcat.",
    noData: "Nu există date pentru selecția curentă.",
    appointmentSummary: "Programări",
    costSummary: "Costuri operaționale nete",
    totalAppointments: "Total programări",
    pending: "În așteptare",
    upcoming: "Confirmate / viitoare",
    completed: "Finalizate",
    cancelled: "Anulate",
    noShow: "Neprezentări",
    completionRate: "Rată finalizare",
    subscriptionCost: "Cost abonamente",
    smsCost: "Cost SMS",
    totalNetCost: "Cost total net",
    costPerCompleted: "Cost / programare finalizată",
    coveredDoctors: "medici acoperiți",
    sentSms: "SMS trimise",
    netNotice:
      "Toate sumele afișate sunt nete. TVA va fi calculată în momentul facturării.",
    statusBreakdown: "Programări după status",
    sourceBreakdown: "Programări după sursă",
    clinicBreakdown: "Activitate pe locații",
    doctorBreakdown: "Activitate pe medici",
    doctorCosts: "Costuri pe medic",
    dailyActivity: "Activitate zilnică",
    status: "Status",
    source: "Sursă",
    count: "Număr",
    total: "Total",
    clinicName: "Locație",
    doctorName: "Medic",
    plan: "Plan",
    monthly: "Lunar",
    annual: "Anual",
    subscriptionNet: "Abonament net",
    smsSent: "SMS trimise",
    smsNet: "SMS net",
    completedAppointments: "Finalizate",
    date: "Dată",
    empty: "Nu există înregistrări pentru această secțiune.",
    unknownClinic: "Locație nespecificată",
    statuses: {
      pending: "În așteptare",
      confirmed: "Confirmate",
      rescheduled: "Reprogramate",
      completed: "Finalizate",
      cancelled: "Anulate",
      no_show: "Neprezentări",
    },
    sources: {
      online: "Online",
      phone: "Telefon",
      walk_in: "Direct la clinică",
      email: "E-mail",
      other: "Altă sursă",
    },
  },
  en: {
    eyebrow: "Clinic Manager",
    title: "Operational reports",
    description:
      "Review appointments, Doctor activity and the organisation's net operational costs for the selected month.",
    month: "Month",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    chooseMonth: "Choose month",
    previousYear: "Previous year",
    nextYear: "Next year",
    clinic: "Clinic location",
    doctor: "Doctor",
    allClinics: "All locations",
    allDoctors: "All Doctors",
    clearFilters: "Clear filters",
    exportReport: "Export report",
    exportExcel: "Download Excel",
    exportPdf: "Download PDF",
    loading: "Loading report...",
    loadError: "The report could not be loaded.",
    noData: "There is no data for the current selection.",
    appointmentSummary: "Appointments",
    costSummary: "Net operational costs",
    totalAppointments: "Total appointments",
    pending: "Pending",
    upcoming: "Confirmed / upcoming",
    completed: "Completed",
    cancelled: "Cancelled",
    noShow: "No-shows",
    completionRate: "Completion rate",
    subscriptionCost: "Subscription cost",
    smsCost: "SMS cost",
    totalNetCost: "Total net cost",
    costPerCompleted: "Cost / completed appointment",
    coveredDoctors: "covered Doctors",
    sentSms: "SMS sent",
    netNotice:
      "All amounts shown are net. VAT will be calculated during invoicing.",
    statusBreakdown: "Appointments by status",
    sourceBreakdown: "Appointments by source",
    clinicBreakdown: "Activity by location",
    doctorBreakdown: "Activity by Doctor",
    doctorCosts: "Costs by Doctor",
    dailyActivity: "Daily activity",
    status: "Status",
    source: "Source",
    count: "Count",
    total: "Total",
    clinicName: "Location",
    doctorName: "Doctor",
    plan: "Plan",
    monthly: "Monthly",
    annual: "Annual",
    subscriptionNet: "Subscription net",
    smsSent: "SMS sent",
    smsNet: "SMS net",
    completedAppointments: "Completed",
    date: "Date",
    empty: "There are no records for this section.",
    unknownClinic: "Unspecified location",
    statuses: {
      pending: "Pending",
      confirmed: "Confirmed",
      rescheduled: "Rescheduled",
      completed: "Completed",
      cancelled: "Cancelled",
      no_show: "No-shows",
    },
    sources: {
      online: "Online",
      phone: "Phone",
      walk_in: "Walk-in",
      email: "Email",
      other: "Other source",
    },
  },
  de: {
    eyebrow: "Klinikmanager",
    title: "Betriebsberichte",
    description:
      "Überblick über Termine, Arztaktivität und Nettobetriebskosten der Organisation für den ausgewählten Monat.",
    month: "Monat",
    previousMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    chooseMonth: "Monat auswählen",
    previousYear: "Vorheriges Jahr",
    nextYear: "Nächstes Jahr",
    clinic: "Klinikstandort",
    doctor: "Arzt",
    allClinics: "Alle Standorte",
    allDoctors: "Alle Ärzte",
    clearFilters: "Filter löschen",
    exportReport: "Bericht exportieren",
    exportExcel: "Excel herunterladen",
    exportPdf: "PDF herunterladen",
    loading: "Bericht wird geladen...",
    loadError: "Der Bericht konnte nicht geladen werden.",
    noData: "Für die aktuelle Auswahl sind keine Daten vorhanden.",
    appointmentSummary: "Termine",
    costSummary: "Nettobetriebskosten",
    totalAppointments: "Termine insgesamt",
    pending: "Ausstehend",
    upcoming: "Bestätigt / bevorstehend",
    completed: "Abgeschlossen",
    cancelled: "Abgesagt",
    noShow: "Nicht erschienen",
    completionRate: "Abschlussquote",
    subscriptionCost: "Abonnementkosten",
    smsCost: "SMS-Kosten",
    totalNetCost: "Nettokosten insgesamt",
    costPerCompleted: "Kosten / abgeschlossener Termin",
    coveredDoctors: "abgedeckte Ärzte",
    sentSms: "SMS gesendet",
    netNotice:
      "Alle angezeigten Beträge sind Nettobeträge. Die Mehrwertsteuer wird bei der Rechnungsstellung berechnet.",
    statusBreakdown: "Termine nach Status",
    sourceBreakdown: "Termine nach Quelle",
    clinicBreakdown: "Aktivität nach Standort",
    doctorBreakdown: "Aktivität nach Arzt",
    doctorCosts: "Kosten nach Arzt",
    dailyActivity: "Tägliche Aktivität",
    status: "Status",
    source: "Quelle",
    count: "Anzahl",
    total: "Gesamt",
    clinicName: "Standort",
    doctorName: "Arzt",
    plan: "Plan",
    monthly: "Monatlich",
    annual: "Jährlich",
    subscriptionNet: "Abonnement netto",
    smsSent: "SMS gesendet",
    smsNet: "SMS netto",
    completedAppointments: "Abgeschlossen",
    date: "Datum",
    empty: "Für diesen Abschnitt liegen keine Einträge vor.",
    unknownClinic: "Nicht angegebener Standort",
    statuses: {
      pending: "Ausstehend",
      confirmed: "Bestätigt",
      rescheduled: "Verschoben",
      completed: "Abgeschlossen",
      cancelled: "Abgesagt",
      no_show: "Nicht erschienen",
    },
    sources: {
      online: "Online",
      phone: "Telefon",
      walk_in: "Vor Ort",
      email: "E-Mail",
      other: "Andere Quelle",
    },
  },
};

const INTL_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

function previousBucharestMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const previous = new Date(Date.UTC(year, month - 2, 1));

  return `${previous.getUTCFullYear()}-${String(
    previous.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));

  return `${shifted.getUTCFullYear()}-${String(
    shifted.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function formatMonthLabel(value: string, locale: AppLocale) {
  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

function MonthSelector({
  value,
  onChange,
  locale,
  copy,
}: {
  value: string;
  onChange: (value: string) => void;
  locale: AppLocale;
  copy: Pick<
    Copy,
    | "month"
    | "previousMonth"
    | "nextMonth"
    | "chooseMonth"
    | "previousYear"
    | "nextYear"
  >;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(
    Number(value.slice(0, 4))
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleYear(Number(value.slice(0, 4)));
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat(INTL_LOCALE[locale], {
          month: "short",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, index, 15)))
      ),
    [locale]
  );

  function chooseMonth(monthIndex: number) {
    onChange(`${visibleYear}-${String(monthIndex + 1).padStart(2, "0")}`);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <span className="text-sm font-semibold text-gray-700">{copy.month}</span>

      <div className="mt-[5px] flex min-h-11 w-full overflow-hidden rounded-[10px] border border-gray-300 bg-white">
        <button
          type="button"
          onClick={() => onChange(shiftMonth(value, -1))}
          aria-label={copy.previousMonth}
          title={copy.previousMonth}
          className="romdoc-focus-ring flex w-11 shrink-0 items-center justify-center border-r border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15 18-6-6 6-6"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={copy.chooseMonth}
          className="romdoc-focus-ring flex min-w-0 flex-1 items-center justify-between gap-3 px-[13px] text-left text-sm font-semibold capitalize text-gray-900 transition hover:bg-gray-50"
        >
          <span className="truncate">{formatMonthLabel(value, locale)}</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m6 9 6 6 6-6"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => onChange(shiftMonth(value, 1))}
          aria-label={copy.nextMonth}
          title={copy.nextMonth}
          className="romdoc-focus-ring flex w-11 shrink-0 items-center justify-center border-l border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m9 18 6-6-6-6"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-label={copy.chooseMonth}
          className="absolute left-0 top-full z-30 mt-[8px] w-full min-w-[280px] rounded-[16px] border border-gray-200 bg-white p-[13px] shadow-lg"
        >
          <div className="flex items-center justify-between gap-[8px]">
            <button
              type="button"
              onClick={() => setVisibleYear((year) => year - 1)}
              aria-label={copy.previousYear}
              title={copy.previousYear}
              className="romdoc-focus-ring flex h-9 w-9 items-center justify-center rounded-[9px] text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15 18-6-6 6-6"
                />
              </svg>
            </button>

            <p className="text-sm font-bold text-gray-900">{visibleYear}</p>

            <button
              type="button"
              onClick={() => setVisibleYear((year) => year + 1)}
              aria-label={copy.nextYear}
              title={copy.nextYear}
              className="romdoc-focus-ring flex h-9 w-9 items-center justify-center rounded-[9px] text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9 18 6-6-6-6"
                />
              </svg>
            </button>
          </div>

          <div className="mt-[8px] grid grid-cols-3 gap-[5px]">
            {monthNames.map((monthName, index) => {
              const candidate = `${visibleYear}-${String(index + 1).padStart(
                2,
                "0"
              )}`;
              const selected = candidate === value;

              return (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => chooseMonth(index)}
                  aria-pressed={selected}
                  className={`romdoc-focus-ring rounded-[9px] px-[8px] py-[8px] text-sm font-semibold capitalize transition ${
                    selected
                      ? "bg-[#036661] text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(
  value: number,
  locale: AppLocale,
  currency: "RON" | "EUR"
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
  }).format(Number(value ?? 0) / 100);
}

function formatDate(value: string, locale: AppLocale) {
  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-[13px] text-3xl font-bold text-gray-900">{value}</p>
      {helper && (
        <p className="mt-[8px] text-sm leading-6 text-gray-600">{helper}</p>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-[13px]">{children}</div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-[21px] text-sm text-gray-500">{label}</p>;
}

export default function ClinicManagerReportsDashboard({
  initialMonth,
  initialClinicId,
  initialDoctorId,
}: Props) {
  const locale = normalizeAppLocale(useLocale());
  const copy = COPY[locale];
  const router = useRouter();

  const [month, setMonth] = useState(
    initialMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth)
      ? initialMonth
      : previousBucharestMonth()
  );
  const [clinicId, setClinicId] = useState(initialClinicId ?? "");
  const [doctorId, setDoctorId] = useState(initialDoctorId ?? "");
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setIsLoading(true);
      setError("");

      const parameters = new URLSearchParams({
        month,
        locale,
      });

      if (clinicId) parameters.set("clinicId", clinicId);
      if (doctorId) parameters.set("doctorId", doctorId);

      try {
        const response = await fetch(
          `/api/clinic-manager/reports?${parameters.toString()}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const result = (await response.json()) as ApiResponse;

        if (!response.ok || !result.success || !result.report) {
          throw new Error(result.error ?? copy.loadError);
        }

        if (!cancelled) setReport(result.report);
      } catch (loadError) {
        if (!cancelled) {
          setReport(null);
          setError(
            loadError instanceof Error ? loadError.message : copy.loadError
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [clinicId, copy.loadError, doctorId, locale, month]);

  useEffect(() => {
    const parameters = new URLSearchParams({ month });
    if (clinicId) parameters.set("clinicId", clinicId);
    if (doctorId) parameters.set("doctorId", doctorId);

    router.replace(
      `/clinic-manager-dashboard/reports?${parameters.toString()}`,
      { scroll: false }
    );
  }, [clinicId, doctorId, month, router]);

  const currency = report?.costSummary.currency ?? "EUR";
  const selectedClinicName = useMemo(
    () =>
      report?.filterOptions.clinics.find((clinic) => clinic.id === clinicId)
        ?.name ?? null,
    [clinicId, report]
  );
  const selectedDoctorName = useMemo(
    () =>
      report?.filterOptions.doctors.find((doctor) => doctor.id === doctorId)
        ?.name ?? null,
    [doctorId, report]
  );

  function clearFilters() {
    setClinicId("");
    setDoctorId("");
  }

  function buildExportUrl(format: "xlsx" | "pdf") {
    const parameters = new URLSearchParams({
      format,
      month,
      locale,
    });

    if (clinicId) parameters.set("clinicId", clinicId);
    if (doctorId) parameters.set("doctorId", doctorId);
    if (report?.organization.id) {
      parameters.set("organizationId", report.organization.id);
    }

    return `/api/clinic-manager/reports/export?${parameters.toString()}`;
  }

  return (
    <div className="space-y-[21px]">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-[8px] max-w-3xl text-base leading-7 text-gray-600">
          {copy.description}
        </p>
      </header>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="grid gap-[13px] md:grid-cols-3">
          <MonthSelector
            value={month}
            onChange={setMonth}
            locale={locale}
            copy={copy}
          />

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              {copy.clinic}
            </span>
            <select
              value={clinicId}
              onChange={(event) => setClinicId(event.target.value)}
              className="romdoc-focus-ring mt-[5px] min-h-11 w-full rounded-[10px] border border-gray-300 bg-white px-[13px] text-gray-900"
            >
              <option value="">{copy.allClinics}</option>
              {(report?.filterOptions.clinics ?? []).map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              {copy.doctor}
            </span>
            <select
              value={doctorId}
              onChange={(event) => setDoctorId(event.target.value)}
              className="romdoc-focus-ring mt-[5px] min-h-11 w-full rounded-[10px] border border-gray-300 bg-white px-[13px] text-gray-900"
            >
              <option value="">{copy.allDoctors}</option>
              {(report?.filterOptions.doctors ?? []).map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(clinicId || doctorId) && (
          <div className="mt-[13px] flex flex-wrap items-center gap-[8px]">
            {selectedClinicName && (
              <span className="rounded-full bg-gray-100 px-[10px] py-[5px] text-xs font-semibold text-gray-700">
                {selectedClinicName}
              </span>
            )}
            {selectedDoctorName && (
              <span className="rounded-full bg-gray-100 px-[10px] py-[5px] text-xs font-semibold text-gray-700">
                {selectedDoctorName}
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="romdoc-focus-ring rounded-[8px] border border-gray-300 bg-white px-[10px] py-[5px] text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              {copy.clearFilters}
            </button>
          </div>
        )}

        {!isLoading && !error && report && (
          <div className="mt-[13px] flex flex-wrap items-center justify-between gap-[10px] border-t border-gray-200 pt-[13px]">
            <p className="text-sm font-semibold text-gray-700">
              {copy.exportReport}
            </p>
            <div className="flex flex-wrap gap-[8px]">
              <a
                href={buildExportUrl("xlsx")}
                className="romdoc-focus-ring inline-flex min-h-10 items-center gap-[8px] rounded-[9px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 text-[#036661]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 3h7l4 4v14H7V3Z"
                  />
                  <path strokeLinecap="round" d="M14 3v5h5M9 13h6M9 17h6" />
                </svg>
                {copy.exportExcel}
              </a>
              <a
                href={buildExportUrl("pdf")}
                className="romdoc-focus-ring inline-flex min-h-10 items-center gap-[8px] rounded-[9px] bg-[#036661] px-[13px] py-[8px] text-sm font-semibold text-white transition hover:bg-[#025752]"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 3h7l4 4v14H7V3Z"
                  />
                  <path strokeLinecap="round" d="M14 3v5h5M9 16h6M12 11v5" />
                </svg>
                {copy.exportPdf}
              </a>
            </div>
          </div>
        )}
      </section>

      {isLoading && (
        <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] text-sm text-gray-600 shadow-sm">
          {copy.loading}
        </div>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-sm font-semibold text-red-800"
        >
          {error}
        </div>
      )}

      {!isLoading && !error && report && (
        <>
          <section>
            <div className="mb-[13px] flex flex-wrap items-end justify-between gap-[8px]">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {copy.appointmentSummary}
                </h2>
                <p className="mt-[5px] text-sm text-gray-500">
                  {report.organization.name} · {report.period.startDate} — {report.period.endDate}
                </p>
              </div>
            </div>

            <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={copy.totalAppointments}
                value={report.summary.total}
              />
              <StatCard label={copy.pending} value={report.summary.pending} />
              <StatCard label={copy.upcoming} value={report.summary.upcoming} />
              <StatCard
                label={copy.completed}
                value={report.summary.completed}
                helper={`${copy.completionRate}: ${formatPercent(
                  report.summary.completionRate,
                  locale
                )}`}
              />
              <StatCard
                label={copy.cancelled}
                value={report.summary.cancelled}
                helper={formatPercent(report.summary.cancellationRate, locale)}
              />
              <StatCard
                label={copy.noShow}
                value={report.summary.noShow}
                helper={formatPercent(report.summary.noShowRate, locale)}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-[13px] text-xl font-bold text-gray-900">
              {copy.costSummary}
            </h2>
            <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={copy.subscriptionCost}
                value={formatCurrency(
                  report.costSummary.subscriptionNet,
                  locale,
                  currency
                )}
                helper={`${report.costSummary.subscriptionCount} ${copy.coveredDoctors}`}
              />
              <StatCard
                label={copy.smsCost}
                value={formatCurrency(
                  report.costSummary.smsNet,
                  locale,
                  currency
                )}
                helper={`${report.costSummary.smsSent} ${copy.sentSms}`}
              />
              <StatCard
                label={copy.totalNetCost}
                value={formatCurrency(
                  report.costSummary.totalNet,
                  locale,
                  currency
                )}
              />
              <StatCard
                label={copy.costPerCompleted}
                value={formatCurrency(
                  report.costSummary.costPerCompletedAppointment,
                  locale,
                  currency
                )}
              />
            </div>
            <p className="mt-[13px] rounded-[13px] border border-blue-200 bg-blue-50 px-[13px] py-[10px] text-sm text-blue-900">
              {copy.netNotice}
            </p>
          </section>

          <div className="grid gap-[21px] xl:grid-cols-2">
            <Section title={copy.statusBreakdown}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="pb-[8px] font-semibold">{copy.status}</th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.count}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.byStatus.map((row) => (
                      <tr key={row.status}>
                        <td className="py-[10px] text-gray-700">
                          {copy.statuses[row.status] ?? row.status}
                        </td>
                        <td className="py-[10px] text-right font-semibold text-gray-900">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title={copy.sourceBreakdown}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="pb-[8px] font-semibold">{copy.source}</th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.count}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.bySource.map((row) => (
                      <tr key={row.source}>
                        <td className="py-[10px] text-gray-700">
                          {copy.sources[row.source] ?? row.source}
                        </td>
                        <td className="py-[10px] text-right font-semibold text-gray-900">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>

          <Section title={copy.doctorCosts}>
            {report.costsByDoctor.length === 0 ? (
              <EmptyState label={copy.empty} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="pb-[8px] font-semibold">{copy.doctorName}</th>
                      <th className="pb-[8px] font-semibold">{copy.clinicName}</th>
                      <th className="pb-[8px] font-semibold">{copy.plan}</th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.subscriptionNet}
                      </th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.smsSent}
                      </th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.smsNet}
                      </th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.totalNetCost}
                      </th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.completedAppointments}
                      </th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.costPerCompleted}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.costsByDoctor.map((row) => (
                      <tr key={row.doctorId}>
                        <td className="py-[10px] font-semibold text-gray-900">
                          {row.doctorName}
                        </td>
                        <td className="py-[10px] text-gray-600">
                          {row.clinicNames.length > 0
                            ? row.clinicNames.join(", ")
                            : copy.unknownClinic}
                        </td>
                        <td className="py-[10px] text-gray-600">
                          {row.subscriptionPlan === "annual"
                            ? copy.annual
                            : row.subscriptionPlan === "monthly"
                              ? copy.monthly
                              : "—"}
                        </td>
                        <td className="py-[10px] text-right text-gray-900">
                          {formatCurrency(
                            row.subscriptionNet,
                            locale,
                            row.currency
                          )}
                        </td>
                        <td className="py-[10px] text-right text-gray-900">
                          {row.smsSent}
                        </td>
                        <td className="py-[10px] text-right text-gray-900">
                          {formatCurrency(row.smsNet, locale, row.currency)}
                        </td>
                        <td className="py-[10px] text-right font-semibold text-gray-900">
                          {formatCurrency(row.totalNet, locale, row.currency)}
                        </td>
                        <td className="py-[10px] text-right text-gray-900">
                          {row.completedAppointments}
                        </td>
                        <td className="py-[10px] text-right text-gray-900">
                          {formatCurrency(
                            row.costPerCompletedAppointment,
                            locale,
                            row.currency
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <div className="grid gap-[21px] xl:grid-cols-2">
            <Section title={copy.clinicBreakdown}>
              {report.byClinic.length === 0 ? (
                <EmptyState label={copy.empty} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="pb-[8px] font-semibold">
                          {copy.clinicName}
                        </th>
                        <th className="pb-[8px] text-right font-semibold">
                          {copy.total}
                        </th>
                        <th className="pb-[8px] text-right font-semibold">
                          {copy.completed}
                        </th>
                        <th className="pb-[8px] text-right font-semibold">
                          {copy.cancelled}
                        </th>
                        <th className="pb-[8px] text-right font-semibold">
                          {copy.noShow}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.byClinic.map((row, index) => (
                        <tr key={row.clinicId ?? `unknown-${index}`}>
                          <td className="py-[10px] font-semibold text-gray-900">
                            {row.clinicName ?? copy.unknownClinic}
                          </td>
                          <td className="py-[10px] text-right">{row.total}</td>
                          <td className="py-[10px] text-right">{row.completed}</td>
                          <td className="py-[10px] text-right">{row.cancelled}</td>
                          <td className="py-[10px] text-right">{row.noShow}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title={copy.doctorBreakdown}>
              {report.byDoctor.length === 0 ? (
                <EmptyState label={copy.empty} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="pb-[8px] font-semibold">
                          {copy.doctorName}
                        </th>
                        <th className="pb-[8px] text-right font-semibold">
                          {copy.total}
                        </th>
                        <th className="pb-[8px] text-right font-semibold">
                          {copy.completed}
                        </th>
                        <th className="pb-[8px] text-right font-semibold">
                          {copy.cancelled}
                        </th>
                        <th className="pb-[8px] text-right font-semibold">
                          {copy.noShow}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.byDoctor.map((row) => (
                        <tr key={row.doctorId}>
                          <td className="py-[10px] font-semibold text-gray-900">
                            {row.doctorName}
                          </td>
                          <td className="py-[10px] text-right">{row.total}</td>
                          <td className="py-[10px] text-right">{row.completed}</td>
                          <td className="py-[10px] text-right">{row.cancelled}</td>
                          <td className="py-[10px] text-right">{row.noShow}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>

          <Section title={copy.dailyActivity}>
            {report.timeline.length === 0 ? (
              <EmptyState label={copy.noData} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="pb-[8px] font-semibold">{copy.date}</th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.total}
                      </th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.completed}
                      </th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.cancelled}
                      </th>
                      <th className="pb-[8px] text-right font-semibold">
                        {copy.noShow}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.timeline.map((row) => (
                      <tr key={row.date}>
                        <td className="py-[10px] font-semibold text-gray-900">
                          {formatDate(row.date, locale)}
                        </td>
                        <td className="py-[10px] text-right">{row.total}</td>
                        <td className="py-[10px] text-right">{row.completed}</td>
                        <td className="py-[10px] text-right">{row.cancelled}</td>
                        <td className="py-[10px] text-right">{row.noShow}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
