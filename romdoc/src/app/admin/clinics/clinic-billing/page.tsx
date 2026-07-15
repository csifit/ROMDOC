import Link from "next/link";
import {
  getLocale,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import AdminClinicBillingSettingsForm from "@/components/admin/admin-clinic-billing-settings-form";
import AdminClinicBillingOverview, {
  type ClinicBillingMonthSummary,
} from "@/components/admin/clinic-billing/admin-clinic-billing-overview";
import AdminAccordion from "@/components/ui/admin-accordion";
import {
  type AppLocale,
} from "@/i18n/routing";
import {
  createClient,
} from "@/lib/supabase/server";

type BillingSettings = {
  clinic_doctor_monthly_price_ron:
    number;
  sms_unit_price_ron: number;
  vat_rate: number;
  updated_at: string | null;
};

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  pricingTitle: string;
  pricingDescription: string;
  back: string;
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    eyebrow: "Administrare clinici",
    title: "Facturare clinici",
    description:
      "Tarife, estimări lunare și detalii de facturare pentru organizațiile de clinică.",
    pricingTitle:
      "Tarife utilizate pentru facturare",
    pricingDescription:
      "Configurează abonamentul lunar pentru medicii invitați, prețul unui SMS trimis cu succes și TVA.",
    back: "Înapoi la Clinici",
  },

  en: {
    eyebrow: "Clinic administration",
    title: "Clinic billing",
    description:
      "Prices, monthly estimates and billing details for clinic organizations.",
    pricingTitle:
      "Prices used for billing",
    pricingDescription:
      "Configure the monthly invited-doctor subscription, the price of a successfully sent SMS and VAT.",
    back: "Back to Clinics",
  },

  de: {
    eyebrow: "Klinikverwaltung",
    title: "Klinikabrechnung",
    description:
      "Preise, monatliche Schätzungen und Rechnungsdaten für Klinikorganisationen.",
    pricingTitle:
      "Für die Abrechnung verwendete Preise",
    pricingDescription:
      "Konfigurieren Sie das monatliche Abonnement für eingeladene Ärzte, den Preis einer erfolgreich gesendeten SMS und die MwSt.",
    back: "Zurück zu Kliniken",
  },
};

function monthKeyInBucharest(
  value = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Bucharest",
        year: "numeric",
        month: "2-digit",
      }
    ).formatToParts(value);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "";

  return `${year}-${month}`;
}

function shiftMonth(
  monthKey: string,
  offset: number
) {
  const [year, month] =
    monthKey.split("-").map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1 + offset,
        1
      )
    );

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function emptySummary(
  monthKey: string,
  settings:
    BillingSettings | null
): ClinicBillingMonthSummary {
  return {
    monthStart: `${monthKey}-01`,
    monthEndExclusive: `${shiftMonth(
      monthKey,
      1
    )}-01`,

    prices: {
      clinicDoctorMonthlyPriceRon:
        Number(
          settings
            ?.clinic_doctor_monthly_price_ron ??
            60
        ),

      smsUnitPriceRon:
        Number(
          settings
            ?.sms_unit_price_ron ??
            0.35
        ),

      vatRate:
        Number(
          settings?.vat_rate ??
            0.21
        ),
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

export default async function AdminClinicBillingPage() {
  const locale =
    (await getLocale()) as AppLocale;

  const text =
    COPY[locale] ?? COPY.ro;

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login?next=/admin/clinics/clinic-billing"
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, account_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin" ||
    profile.account_status !==
      "active"
  ) {
    redirect("/dashboard");
  }

  const {
    data: settingsData,
    error: settingsError,
  } = await supabase
    .from(
      "clinic_billing_settings"
    )
    .select(`
      clinic_doctor_monthly_price_ron,
      sms_unit_price_ron,
      vat_rate,
      updated_at
    `)
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    console.error(
      "Admin clinic billing settings query failed:",
      settingsError
    );
  }

  const settings =
    settingsData as
      | BillingSettings
      | null;

  const currentMonth =
    monthKeyInBucharest();

  const previousMonth =
    shiftMonth(
      currentMonth,
      -1
    );

  const [
    currentResult,
    previousResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_admin_clinic_billing_month_summary",
      {
        target_month: `${currentMonth}-01`,
      }
    ),

    supabase.rpc(
      "get_admin_clinic_billing_month_summary",
      {
        target_month: `${previousMonth}-01`,
      }
    ),
  ]);

  if (currentResult.error) {
    console.error(
      "Current clinic billing summary failed:",
      currentResult.error
    );
  }

  if (previousResult.error) {
    console.error(
      "Previous clinic billing summary failed:",
      previousResult.error
    );
  }

  const currentSummary =
    currentResult.data
      ? (currentResult.data as ClinicBillingMonthSummary)
      : emptySummary(
          currentMonth,
          settings
        );

  const previousSummary =
    previousResult.data
      ? (previousResult.data as ClinicBillingMonthSummary)
      : emptySummary(
          previousMonth,
          settings
        );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {text.eyebrow}
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {text.title}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          {text.description}
        </p>
      </header>

      <AdminAccordion
        title={text.pricingTitle}
        description={
          text.pricingDescription
        }
      >
        <AdminClinicBillingSettingsForm
          initialDoctorPriceRon={
            Number(
              settings
                ?.clinic_doctor_monthly_price_ron ??
                60
            )
          }
          initialSmsPriceRon={
            Number(
              settings
                ?.sms_unit_price_ron ??
                0.35
            )
          }
          initialVatPercent={
            Number(
              settings
                ?.vat_rate ??
                0.21
            ) * 100
          }
          updatedAt={
            settings?.updated_at ??
            null
          }
        />
      </AdminAccordion>

      <AdminClinicBillingOverview
        locale={locale}
        currentSummary={
          currentSummary
        }
        previousSummary={
          previousSummary
        }
      />

      <div>
        <Link
          href="/admin/clinics"
          className="romdoc-focus-ring inline-flex rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          ← {text.back}
        </Link>
      </div>
    </div>
  );
}
