import {
  redirect,
} from "next/navigation";

import ClinicManagerMonthSelector from "@/components/clinic-manager/clinic-manager-month-selector";
import {
  requireClinicInvoiceAccess,
} from "@/lib/invoices/require-clinic-invoice-access";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

type ManagerClinicSmsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

type OrganizationRow = {
  id: string;
  name: string;
};

type RelationshipRow = {
  organization_id: string;
  doctor_id: string | null;
};

type SmsLogRow = {
  id: string;
  doctor_id: string | null;
  payer_clinic_organization_id: string | null;
  payer_type: string | null;
  event: string | null;
  status: string | null;
  delivery_report_status: string | null;
  created_at: string;
};

type OrganizationUsage = {
  id: string;
  name: string;
  managedDoctors: number;
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
  organizations: string;
  managedDoctors: string;
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
    title: "SMS organizații de clinică",
    description:
      "Raport operațional al notificărilor SMS pentru organizațiile de clinică. SMS-urile sunt incluse în modelul de abonament și nu sunt calculate aici ca poziții separate de cost.",
    period: "Perioadă",
    organizations: "Organizații",
    managedDoctors: "Medici gestionați",
    sent: "Trimise",
    delivered: "Livrate",
    failed: "Eșuate",
    skipped: "Omise",
    confirmations: "Confirmări",
    reminders: "Reamintiri 24h",
    detailsTitle: "Utilizare pe organizație",
    detailsDescription:
      "Numere agregate pentru fiecare organizație, fără date despre pacienți și fără valori de facturare SMS.",
    empty:
      "Nu există organizații de clinică sau activitate SMS pentru perioada selectată.",
    privacyTitle: "Date operaționale",
    privacyDescription:
      "Raportul conține doar numere agregate. Nu afișează numere de telefon, conținut SMS, diagnostice, note medicale sau date din Dosarul Medical.",
  },
  en: {
    eyebrow: "SMS operations",
    title: "Clinic organisation SMS",
    description:
      "Operational SMS notification report for clinic organisations. SMS is included in the subscription model and is not calculated here as a separate cost item.",
    period: "Period",
    organizations: "Organisations",
    managedDoctors: "Managed doctors",
    sent: "Sent",
    delivered: "Delivered",
    failed: "Failed",
    skipped: "Skipped",
    confirmations: "Confirmations",
    reminders: "24h reminders",
    detailsTitle: "Usage by organisation",
    detailsDescription:
      "Aggregate figures for each organisation, without patient data and without SMS billing amounts.",
    empty:
      "There are no clinic organisations or SMS activity for the selected period.",
    privacyTitle: "Operational data",
    privacyDescription:
      "This report contains aggregate counts only. It does not show phone numbers, SMS content, diagnoses, medical notes or Medical Folder data.",
  },
  de: {
    eyebrow: "SMS-Betrieb",
    title: "SMS der Klinikorganisationen",
    description:
      "Operativer Bericht zu SMS-Benachrichtigungen der Klinikorganisationen. SMS sind im Abonnementmodell enthalten und werden hier nicht als separate Kostenposition berechnet.",
    period: "Zeitraum",
    organizations: "Organisationen",
    managedDoctors: "Verwaltete Ärzte",
    sent: "Gesendet",
    delivered: "Zugestellt",
    failed: "Fehlgeschlagen",
    skipped: "Übersprungen",
    confirmations: "Bestätigungen",
    reminders: "24h-Erinnerungen",
    detailsTitle: "Nutzung nach Organisation",
    detailsDescription:
      "Aggregierte Werte je Organisation, ohne Patientendaten und ohne SMS-Abrechnungsbeträge.",
    empty:
      "Für den ausgewählten Zeitraum gibt es keine Klinikorganisationen oder SMS-Aktivität.",
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

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

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

  const [year, month] = normalized
    .split("-")
    .map(Number);

  const start = new Date(
    Date.UTC(year, month - 1, 1)
  );

  const end = new Date(
    Date.UTC(year, month, 1)
  );

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
    label: new Intl.DateTimeFormat(
      intlLocale,
      {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }
    ).format(start),
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

function makeEmptyUsage(
  organization: OrganizationRow,
  managedDoctors: number
): OrganizationUsage {
  return {
    id: organization.id,
    name: organization.name,
    managedDoctors,
    sent: 0,
    delivered: 0,
    failed: 0,
    skipped: 0,
    confirmations: 0,
    reminders: 0,
  };
}

function addLogToUsage(
  usage: OrganizationUsage,
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

  if (
    log.delivery_report_status === "delivered"
  ) {
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

export default async function ManagerClinicSmsPage({
  searchParams,
}: ManagerClinicSmsPageProps) {
  const locale = await getStoredAppLocale();
  const copy = COPY[locale];

  const access =
    await requireClinicInvoiceAccess();

  if (!access.ok) {
    if (access.status === 401) {
      const parameters =
        new URLSearchParams({
          locale,
          next:
            "/manager-dashboard/clinic-sms",
        });

      redirect(
        `/login?${parameters.toString()}`
      );
    }

    redirect(
      "/manager-dashboard/invoices"
    );
  }

  if (
    access.actor.role !== "manager"
  ) {
    redirect("/dashboard");
  }

  const parameters =
    (await searchParams) ?? {};

  const range = monthRange(
    parameters.month,
    locale
  );

  const admin = createAdminClient();

  const {
    data: organizationsData,
    error: organizationsError,
  } = await admin
    .from("clinic_organizations")
    .select("id, name")
    .eq("status", "active")
    .order("name", {
      ascending: true,
    });

  if (organizationsError) {
    console.error(
      "Manager clinic SMS organization query failed:",
      organizationsError
    );
  }

  const organizations =
    (organizationsData ??
      []) as OrganizationRow[];

  const organizationIds =
    organizations.map(
      (organization) =>
        organization.id
    );

  let relationships:
    RelationshipRow[] = [];

  if (
    organizationIds.length > 0
  ) {
    const {
      data,
      error,
    } = await admin
      .from(
        "clinic_doctor_relationships"
      )
      .select(
        "organization_id, doctor_id"
      )
      .in(
        "organization_id",
        organizationIds
      )
      .eq(
        "payment_responsibility",
        "clinic_paid"
      )
      .eq(
        "invitation_status",
        "accepted"
      );

    if (error) {
      console.error(
        "Manager clinic SMS doctor relationship query failed:",
        error
      );
    }

    relationships =
      (data ??
        []) as RelationshipRow[];
  }

  const doctorOrganization =
    new Map<string, string>();

  const doctorIdsByOrganization =
    new Map<
      string,
      Set<string>
    >();

  for (
    const relationship
    of relationships
  ) {
    if (
      !relationship.doctor_id
    ) {
      continue;
    }

    if (
      !doctorOrganization.has(
        relationship.doctor_id
      )
    ) {
      doctorOrganization.set(
        relationship.doctor_id,
        relationship.organization_id
      );
    }

    const currentSet =
      doctorIdsByOrganization.get(
        relationship.organization_id
      ) ??
      new Set<string>();

    currentSet.add(
      relationship.doctor_id
    );

    doctorIdsByOrganization.set(
      relationship.organization_id,
      currentSet
    );
  }

  const doctorIds = Array.from(
    doctorOrganization.keys()
  );

  const directLogMap =
    new Map<string, SmsLogRow>();

  if (
    organizationIds.length > 0
  ) {
    const {
      data,
      error,
    } = await admin
      .from("sms_delivery_logs")
      .select(`
        id,
        doctor_id,
        payer_clinic_organization_id,
        payer_type,
        event,
        status,
        delivery_report_status,
        created_at
      `)
      .in(
        "payer_clinic_organization_id",
        organizationIds
      )
      .gte(
        "created_at",
        range.startIso
      )
      .lt(
        "created_at",
        range.endExclusiveIso
      );

    if (error) {
      console.error(
        "Manager clinic SMS direct usage query failed:",
        error
      );
    }

    for (
      const row
      of (data ??
        []) as SmsLogRow[]
    ) {
      directLogMap.set(
        row.id,
        row
      );
    }
  }

  if (
    doctorIds.length > 0
  ) {
    const {
      data,
      error,
    } = await admin
      .from("sms_delivery_logs")
      .select(`
        id,
        doctor_id,
        payer_clinic_organization_id,
        payer_type,
        event,
        status,
        delivery_report_status,
        created_at
      `)
      .is(
        "payer_clinic_organization_id",
        null
      )
      .in(
        "doctor_id",
        doctorIds
      )
      .gte(
        "created_at",
        range.startIso
      )
      .lt(
        "created_at",
        range.endExclusiveIso
      );

    if (error) {
      console.error(
        "Manager clinic SMS fallback usage query failed:",
        error
      );
    }

    for (
      const row
      of (data ??
        []) as SmsLogRow[]
    ) {
      if (
        row.payer_type ===
          "romdoc" ||
        row.payer_type ===
          "not_billable"
      ) {
        continue;
      }

      directLogMap.set(
        row.id,
        row
      );
    }
  }

  const usageByOrganization =
    new Map<
      string,
      OrganizationUsage
    >(
      organizations.map(
        (organization) => [
          organization.id,
          makeEmptyUsage(
            organization,
            doctorIdsByOrganization.get(
              organization.id
            )?.size ?? 0
          ),
        ]
      )
    );

  for (
    const log
    of directLogMap.values()
  ) {
    const organizationId =
      log.payer_clinic_organization_id ??
      (
        log.doctor_id
          ? doctorOrganization.get(
              log.doctor_id
            )
          : null
      );

    if (
      !organizationId
    ) {
      continue;
    }

    const usage =
      usageByOrganization.get(
        organizationId
      );

    if (!usage) {
      continue;
    }

    addLogToUsage(
      usage,
      log
    );
  }

  const usageRows =
    Array.from(
      usageByOrganization.values()
    );

  const totals = usageRows.reduce(
    (result, row) => ({
      organizations:
        result.organizations + 1,
      managedDoctors:
        result.managedDoctors +
        row.managedDoctors,
      sent:
        result.sent + row.sent,
      delivered:
        result.delivered +
        row.delivered,
      failed:
        result.failed +
        row.failed,
      skipped:
        result.skipped +
        row.skipped,
      confirmations:
        result.confirmations +
        row.confirmations,
      reminders:
        result.reminders +
        row.reminders,
    }),
    {
      organizations: 0,
      managedDoctors: 0,
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
            basePath="/manager-dashboard/clinic-sms"
          />
        </div>
      </section>

      <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        <SummaryBox
          label={copy.organizations}
          value={totals.organizations}
        />

        <SummaryBox
          label={copy.managedDoctors}
          value={totals.managedDoctors}
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
            {usageRows.map(
              (row) => (
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
                        {copy.managedDoctors}:{" "}
                        {row.managedDoctors}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-3 xl:min-w-[680px] xl:grid-cols-6">
                      {[
                        [
                          copy.sent,
                          row.sent,
                        ],
                        [
                          copy.delivered,
                          row.delivered,
                        ],
                        [
                          copy.failed,
                          row.failed,
                        ],
                        [
                          copy.skipped,
                          row.skipped,
                        ],
                        [
                          copy.confirmations,
                          row.confirmations,
                        ],
                        [
                          copy.reminders,
                          row.reminders,
                        ],
                      ].map(
                        ([
                          label,
                          value,
                        ]) => (
                          <div
                            key={String(
                              label
                            )}
                            className="rounded-[13px] bg-gray-50 p-[8px] text-center"
                          >
                            <p className="text-xs text-gray-500">
                              {label}
                            </p>

                            <p className="mt-[5px] text-lg font-bold text-gray-900">
                              {value}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </article>
              )
            )}
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
