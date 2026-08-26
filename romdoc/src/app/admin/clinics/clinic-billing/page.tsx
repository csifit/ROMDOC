import Link from "next/link";
import { redirect } from "next/navigation";

import AdminClinicBillingOverview, {
  type ClinicBillingMonthSummary,
} from "@/components/admin/clinic-billing/admin-clinic-billing-overview";
import PlatformBillingSettingsForm from "@/components/billing/platform-billing-settings-form";
import ClinicManagerMonthSelector from "@/components/clinic-manager/clinic-manager-month-selector";
import AdminAccordion from "@/components/ui/admin-accordion";
import type {
  PlatformBillingCurrency,
  PlatformBillingRates,
} from "@/lib/billing/platform-invoicing";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

type BillingSettings = {
  clinic_doctor_monthly_price_ron: number | string | null;
  vat_rate: number | string | null;
  billing_currency: string | null;
  updated_at: string | null;
  updated_by_profile_id: string | null;
};

type PageSearchParams = {
  month?: string;
};

type Props = {
  searchParams?: Promise<PageSearchParams>;
};

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  pricingTitle: string;
  pricingDescription: string;
  periodTitle: string;
  periodDescription: string;
  currency: string;
  back: string;
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    eyebrow: "Administrare clinici",
    title: "Facturare consolidată a clinicilor",
    description:
      "Consultă estimările lunare, costurile pe organizație și detaliile necesare facturării Clinicilor.",
    pricingTitle: "Tarife globale",
    pricingDescription:
      "Configurează abonamentul/pachetul pentru medicii invitați, moneda și TVA. SMS-urile sunt incluse și nu au tarif separat.",
    periodTitle: "Perioada analizată",
    periodDescription:
      "Selectează luna pentru sumarul consolidat. Luna următoare nu poate fi selectată.",
    currency: "Monedă",
    back: "Înapoi la Clinici",
  },
  en: {
    eyebrow: "Clinic administration",
    title: "Consolidated clinic billing",
    description:
      "Review monthly estimates, organization costs and the details required for clinic invoicing.",
    pricingTitle: "Global pricing",
    pricingDescription:
      "Configure the invited-doctor subscription/package, currency and VAT. SMS is included and has no separate unit price.",
    periodTitle: "Reporting period",
    periodDescription:
      "Select the month for the consolidated overview. Future months cannot be selected.",
    currency: "Currency",
    back: "Back to Clinics",
  },
  de: {
    eyebrow: "Klinikverwaltung",
    title: "Konsolidierte Klinikabrechnung",
    description:
      "Prüfen Sie monatliche Schätzungen, Organisationskosten und die für die Rechnungsstellung erforderlichen Angaben.",
    pricingTitle: "Globale Preise",
    pricingDescription:
      "Konfigurieren Sie Abonnement/Paket für eingeladene Ärzte, Währung und MwSt. SMS sind enthalten und haben keinen separaten Einzelpreis.",
    periodTitle: "Berichtszeitraum",
    periodDescription:
      "Wählen Sie den Monat für die konsolidierte Übersicht. Zukünftige Monate können nicht ausgewählt werden.",
    currency: "Währung",
    back: "Zurück zu Kliniken",
  },
};

function monthKeyInBucharest(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";
  const month =
    parts.find((part) => part.type === "month")?.value ?? "";

  return `${year}-${month}`;
}

function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function normalizeRequestedMonth(
  value: string | undefined,
  currentMonth: string
) {
  if (!/^\d{4}-\d{2}$/.test(value ?? "")) return currentMonth;

  const month = Number(value?.slice(5, 7));

  if (month < 1 || month > 12) return currentMonth;

  return (value as string) > currentMonth
    ? currentMonth
    : (value as string);
}

function normalizeCurrency(value: unknown): PlatformBillingCurrency {
  return value === "RON" ? "RON" : "EUR";
}

function numberOrFallback(value: unknown, fallback: number) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : fallback;
}

function emptySummary(
  monthKey: string,
  settings: BillingSettings | null
): ClinicBillingMonthSummary {
  return {
    monthStart: `${monthKey}-01`,
    monthEndExclusive: `${shiftMonth(monthKey, 1)}-01`,
    prices: {
      clinicDoctorMonthlyPriceRon: numberOrFallback(
        settings?.clinic_doctor_monthly_price_ron,
        60
      ),
      // Compatibility field retained until the old SQL RPC is retired.
      smsUnitPriceRon: 0,
      vatRate: numberOrFallback(settings?.vat_rate, 0.21),
    },
    totals: {
      organizationCount: 0,
      approvedLocationCount: 0,
      activeDoctorCount: 0,
      confirmationSmsCount: 0,
      reminder24hSmsCount: 0,
      totalSmsCount: 0,
      subscriptionSubtotalRon: 0,
      smsSubtotalRon: 0,
      subtotalBeforeVatRon: 0,
      estimatedVatRon: 0,
      estimatedTotalRon: 0,
    },
    organizations: [],
  };
}

export default async function AdminClinicBillingPage({
  searchParams,
}: Props) {
  const locale = await getStoredAppLocale();
  const text = COPY[locale];
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/admin/clinics/clinic-billing",
    });

    redirect(`/login?${parameters.toString()}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const { data: settingsData, error: settingsError } = await supabase
    .from("clinic_billing_settings")
    .select(
      "clinic_doctor_monthly_price_ron, vat_rate, billing_currency, updated_at, updated_by_profile_id"
    )
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    console.error(
      "Admin clinic billing settings query failed:",
      settingsError
    );
  }

  const settings = (settingsData ?? null) as BillingSettings | null;
  const currentMonth = monthKeyInBucharest();
  const parameters = (await searchParams) ?? {};
  const selectedMonth = normalizeRequestedMonth(
    parameters.month,
    currentMonth
  );
  const previousMonth = shiftMonth(selectedMonth, -1);

  const [selectedResult, previousResult] = await Promise.all([
    supabase.rpc("get_admin_clinic_billing_month_summary", {
      target_month: `${selectedMonth}-01`,
    }),
    supabase.rpc("get_admin_clinic_billing_month_summary", {
      target_month: `${previousMonth}-01`,
    }),
  ]);

  if (selectedResult.error) {
    console.error(
      "Selected clinic billing summary failed:",
      selectedResult.error
    );
  }

  if (previousResult.error) {
    console.error(
      "Previous clinic billing summary failed:",
      previousResult.error
    );
  }

  const selectedSummary = selectedResult.data
    ? (selectedResult.data as ClinicBillingMonthSummary)
    : emptySummary(selectedMonth, settings);

  const previousSummary = previousResult.data
    ? (previousResult.data as ClinicBillingMonthSummary)
    : emptySummary(previousMonth, settings);

  const currency = normalizeCurrency(settings?.billing_currency);

  const rates: PlatformBillingRates = {
    subscriptionPriceRon: numberOrFallback(
      settings?.clinic_doctor_monthly_price_ron,
      60
    ),
    smsPriceRon: 0,
    vatRate: Math.min(
      1,
      numberOrFallback(settings?.vat_rate, 0.21)
    ),
    updatedAt: settings?.updated_at ?? null,
    updatedByProfileId: settings?.updated_by_profile_id ?? null,
  };

  return (
    <div className="space-y-[34px]">
      <header className="flex flex-wrap items-start justify-between gap-[21px]">
        <div>
          <p className="text-sm font-semibold text-[#9A4F35]">
            {text.eyebrow}
          </p>

          <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
            {text.title}
          </h1>

          <p className="mt-[13px] max-w-4xl text-sm leading-6 text-gray-600">
            {text.description}
          </p>

          <p className="mt-[8px] text-sm text-gray-500">
            {text.currency}: {currency}
          </p>
        </div>

        <Link
          href="/admin/clinics"
          className="romdoc-focus-ring inline-flex rounded-xl border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          ← {text.back}
        </Link>
      </header>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          {text.periodTitle}
        </h2>

        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {text.periodDescription}
        </p>

        <p className="mt-[8px] text-sm text-gray-500">
          {text.currency}: {currency}
        </p>

        <ClinicManagerMonthSelector
          value={selectedMonth}
          locale={locale}
          basePath="/admin/clinics/clinic-billing"
          maxMonth={currentMonth}
          className="mt-[13px] max-w-sm"
        />
      </section>

      <AdminAccordion
        title={text.pricingTitle}
        description={text.pricingDescription}
      >
        <PlatformBillingSettingsForm
          locale={locale}
          rates={rates}
          currency={currency}
          canEdit
        />
      </AdminAccordion>

      <AdminClinicBillingOverview
        locale={locale}
        currency={currency}
        selectedSummary={selectedSummary}
        previousSummary={previousSummary}
      />
    </div>
  );
}
