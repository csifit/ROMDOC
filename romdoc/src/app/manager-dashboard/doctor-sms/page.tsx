import { redirect } from "next/navigation";

import ClinicManagerMonthSelector from "@/components/clinic-manager/clinic-manager-month-selector";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createAdminClient } from "@/lib/supabase/admin";

type ManagerDoctorSmsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

type DoctorRow = {
  id: string;
  profile_id: string;
  slug: string;
  email: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type SmsLogRow = {
  id: string;
  doctor_id: string | null;
  event: string | null;
  status: string | null;
  delivery_report_status: string | null;
  created_at: string;
};

type DoctorUsage = {
  id: string;
  name: string;
  email: string | null;
  sent: number;
  delivered: number;
  failed: number;
  skipped: number;
  confirmations: number;
  reminders: number;
};

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  period: string;
  doctors: string;
  sent: string;
  delivered: string;
  failed: string;
  skipped: string;
  confirmations: string;
  reminders: string;
  detailsTitle: string;
  detailsDescription: string;
  empty: string;
  privacyTitle: string;
  privacyDescription: string;
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    eyebrow: "Operațiuni SMS",
    title: "SMS medici independenți",
    description:
      "Raport operațional al notificărilor SMS pentru medicii independenți. SMS-urile sunt incluse în abonament/pachet și nu sunt calculate ca poziții separate de facturare.",
    period: "Perioadă",
    doctors: "Medici independenți",
    sent: "Trimise",
    delivered: "Livrate",
    failed: "Eșuate",
    skipped: "Omise",
    confirmations: "Confirmări",
    reminders: "Reamintiri 24h",
    detailsTitle: "Utilizare pe medic",
    detailsDescription:
      "Numere agregate pentru fiecare medic independent, fără date despre pacienți și fără valori de facturare SMS.",
    empty:
      "Nu există medici independenți sau activitate SMS pentru perioada selectată.",
    privacyTitle: "Date operaționale",
    privacyDescription:
      "Raportul conține doar numere agregate. Nu afișează numere de telefon, conținut SMS, diagnostice, note medicale sau date din Dosarul Medical.",
  },
  en: {
    eyebrow: "SMS operations",
    title: "Independent Doctor SMS",
    description:
      "Operational SMS notification report for independent Doctors. SMS is included in the subscription/package and is not calculated as a separate billing item.",
    period: "Period",
    doctors: "Independent Doctors",
    sent: "Sent",
    delivered: "Delivered",
    failed: "Failed",
    skipped: "Skipped",
    confirmations: "Confirmations",
    reminders: "24h reminders",
    detailsTitle: "Usage by Doctor",
    detailsDescription:
      "Aggregate figures for each independent Doctor, without patient data and without SMS billing amounts.",
    empty:
      "There are no independent Doctors or SMS activity for the selected period.",
    privacyTitle: "Operational data",
    privacyDescription:
      "This report contains aggregate counts only. It does not show phone numbers, SMS content, diagnoses, medical notes or Medical Folder data.",
  },
  de: {
    eyebrow: "SMS-Betrieb",
    title: "SMS selbstständiger Ärzte",
    description:
      "Operativer Bericht zu SMS-Benachrichtigungen selbstständiger Ärzte. SMS sind im Abonnement/Paket enthalten und werden nicht als separate Abrechnungsposition berechnet.",
    period: "Zeitraum",
    doctors: "Selbstständige Ärzte",
    sent: "Gesendet",
    delivered: "Zugestellt",
    failed: "Fehlgeschlagen",
    skipped: "Übersprungen",
    confirmations: "Bestätigungen",
    reminders: "24h-Erinnerungen",
    detailsTitle: "Nutzung nach Arzt",
    detailsDescription:
      "Aggregierte Werte je selbstständigem Arzt, ohne Patientendaten und ohne SMS-Abrechnungsbeträge.",
    empty:
      "Für den ausgewählten Zeitraum gibt es keine selbstständigen Ärzte oder SMS-Aktivität.",
    privacyTitle: "Operative Daten",
    privacyDescription:
      "Dieser Bericht enthält nur aggregierte Zahlen. Telefonnummern, SMS-Inhalte, Diagnosen, medizinische Notizen oder Daten aus der Medizinischen Akte werden nicht angezeigt.",
  },
};

function currentMonthValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
}

function monthRange(
  monthParam: string | undefined,
  locale: AppLocale
) {
  const currentMonth = currentMonthValue();

  const normalized =
    monthParam &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)
      ? monthParam
      : currentMonth;

  const [year, month] = normalized.split("-").map(Number);

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const intlLocale =
    locale === "ro"
      ? "ro-RO"
      : locale === "de"
        ? "de-DE"
        : "en-GB";

  return {
    month: normalized,
    startIso: start.toISOString(),
    endExclusiveIso: end.toISOString(),
    label: new Intl.DateTimeFormat(intlLocale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(start),
  };
}

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-[13px] text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function doctorName(
  doctor: DoctorRow,
  profile: ProfileRow | undefined
) {
  const name = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (name) return name;

  return doctor.slug
    .split("-")
    .map((part) =>
      part
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : part
    )
    .join(" ");
}

function addLogToUsage(
  usage: DoctorUsage,
  log: SmsLogRow
) {
  if (log.status === "sent") {
    usage.sent += 1;

    if (log.event === "confirmed") {
      usage.confirmations += 1;
    }

    if (log.event === "reminder_24_hours") {
      usage.reminders += 1;
    }
  }

  if (log.delivery_report_status === "delivered") {
    usage.delivered += 1;
  }

  if (
    log.status === "failed" ||
    log.delivery_report_status === "failed" ||
    log.delivery_report_status === "expired"
  ) {
    usage.failed += 1;
  }

  if (log.status === "skipped") {
    usage.skipped += 1;
  }
}

export default async function ManagerDoctorSmsPage({
  searchParams,
}: ManagerDoctorSmsPageProps) {
  const locale = await getStoredAppLocale();
  const copy = COPY[locale];
  const access = await requireClinicInvoiceAccess();

  if (!access.ok) {
    if (access.status === 401) {
      const parameters = new URLSearchParams({
        locale,
        next: "/manager-dashboard/doctor-sms",
      });

      redirect(`/login?${parameters.toString()}`);
    }

    redirect("/manager-dashboard/invoices");
  }

  if (access.actor.role !== "manager") {
    redirect("/dashboard");
  }

  const parameters = (await searchParams) ?? {};
  const range = monthRange(parameters.month, locale);
  const admin = createAdminClient();

  const { data: doctorsData, error: doctorsError } = await admin
    .from("doctors")
    .select("id, profile_id, slug, email")
    .eq("account_type", "independent")
    .eq("status", "active")
    .order("slug", { ascending: true });

  if (doctorsError) {
    console.error(
      "Manager independent Doctor SMS query failed:",
      doctorsError
    );
  }

  const doctors = (doctorsData ?? []) as DoctorRow[];
  const profileIds = doctors.map((doctor) => doctor.profile_id);

  let profiles: ProfileRow[] = [];

  if (profileIds.length > 0) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", profileIds);

    if (error) {
      console.error(
        "Manager independent Doctor SMS profile query failed:",
        error
      );
    }

    profiles = (data ?? []) as ProfileRow[];
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  const usageByDoctor = new Map<string, DoctorUsage>(
    doctors.map((doctor) => [
      doctor.id,
      {
        id: doctor.id,
        name: doctorName(
          doctor,
          profileMap.get(doctor.profile_id)
        ),
        email: doctor.email,
        sent: 0,
        delivered: 0,
        failed: 0,
        skipped: 0,
        confirmations: 0,
        reminders: 0,
      },
    ])
  );

  const doctorIds = doctors.map((doctor) => doctor.id);

  if (doctorIds.length > 0) {
    const { data, error } = await admin
      .from("sms_delivery_logs")
      .select(`
        id,
        doctor_id,
        event,
        status,
        delivery_report_status,
        created_at
      `)
      .in("doctor_id", doctorIds)
      .gte("created_at", range.startIso)
      .lt("created_at", range.endExclusiveIso);

    if (error) {
      console.error(
        "Manager independent Doctor SMS usage query failed:",
        error
      );
    }

    for (const log of (data ?? []) as SmsLogRow[]) {
      if (!log.doctor_id) continue;

      const usage = usageByDoctor.get(log.doctor_id);

      if (!usage) continue;

      addLogToUsage(usage, log);
    }
  }

  const usageRows = Array.from(usageByDoctor.values());

  const totals = usageRows.reduce(
    (result, row) => ({
      doctors: result.doctors + 1,
      sent: result.sent + row.sent,
      delivered: result.delivered + row.delivered,
      failed: result.failed + row.failed,
      skipped: result.skipped + row.skipped,
      confirmations: result.confirmations + row.confirmations,
      reminders: result.reminders + row.reminders,
    }),
    {
      doctors: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
      confirmations: 0,
      reminders: 0,
    }
  );

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          {copy.eyebrow}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.title}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.description}
        </p>
      </header>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="grid gap-[21px] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.period}
            </p>

            <p className="mt-[8px] text-xl font-bold capitalize text-gray-900">
              {range.label}
            </p>
          </div>

          <ClinicManagerMonthSelector
            value={range.month}
            locale={locale}
            basePath="/manager-dashboard/doctor-sms"
          />
        </div>
      </section>

      <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        <SummaryBox
          label={copy.doctors}
          value={totals.doctors}
        />
        <SummaryBox
          label={copy.sent}
          value={totals.sent}
        />
        <SummaryBox
          label={copy.delivered}
          value={totals.delivered}
        />
        <SummaryBox
          label={copy.failed}
          value={totals.failed}
        />
        <SummaryBox
          label={copy.skipped}
          value={totals.skipped}
        />
        <SummaryBox
          label={copy.confirmations}
          value={totals.confirmations}
        />
        <SummaryBox
          label={copy.reminders}
          value={totals.reminders}
        />
      </div>

      <section>
        <h2 className="text-2xl font-bold text-gray-900">
          {copy.detailsTitle}
        </h2>

        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.detailsDescription}
        </p>

        {usageRows.length === 0 ? (
          <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
            {copy.empty}
          </div>
        ) : (
          <div className="mt-[21px] space-y-[13px]">
            {usageRows.map((row) => (
              <article
                key={row.id}
                className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm"
              >
                <div className="flex flex-col gap-[13px] xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {row.name}
                    </h3>

                    <p className="mt-[5px] text-sm text-gray-500">
                      {row.email ?? "—"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-3 xl:min-w-[680px] xl:grid-cols-6">
                    {[
                      [copy.sent, row.sent],
                      [copy.delivered, row.delivered],
                      [copy.failed, row.failed],
                      [copy.skipped, row.skipped],
                      [copy.confirmations, row.confirmations],
                      [copy.reminders, row.reminders],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-[13px] bg-gray-50 p-[8px] text-center"
                      >
                        <p className="text-xs text-gray-500">
                          {label}
                        </p>

                        <p className="mt-[5px] text-lg font-bold text-gray-900">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[21px] border border-blue-200 bg-blue-50 p-[21px] text-blue-950">
        <h2 className="font-bold">
          {copy.privacyTitle}
        </h2>

        <p className="mt-[8px] text-sm leading-6">
          {copy.privacyDescription}
        </p>
      </section>
    </div>
  );
}
