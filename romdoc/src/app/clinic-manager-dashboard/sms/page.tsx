import {
  redirect,
} from "next/navigation";

import ClinicManagerMonthSelector from "@/components/clinic-manager/clinic-manager-month-selector";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

type OrganizationMember = {
  organization_id: string;
};

type ClinicOrganization = {
  id: string;
  name: string;
  status: string;
};

type SmsUsageRow = {
  sms_log_id: string;
  organization_id: string;
  organization_name: string | null;
  doctor_id: string | null;
  clinic_id: string | null;
  event: string | null;
  status: string | null;
  delivery_report_status: string | null;
  masked_recipient: string | null;
  provider: string | null;
  provider_message_id: string | null;
  created_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
};

type ClinicManagerSmsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  period: string;
  calculatedRange: string;
  unavailableTitle: string;
  unavailableDescription: string;
  noOrganizationsTitle: string;
  noOrganizationsDescription: string;
  stats: {
    sent: string;
    sentHelper: string;
    delivered: string;
    deliveredHelper: string;
    failed: string;
    failedHelper: string;
    skipped: string;
    skippedHelper: string;
    confirmations: string;
    confirmationsHelper: string;
    reminders: string;
    remindersHelper: string;
  };
  detailsTitle: string;
  detailsDescription: string;
  count: string;
  empty: string;
  organization: string;
  event: string;
  recipient: string;
  provider: string;
  sentAt: string;
  delivery: string;
  deliveryStatuses: Record<string, string>;
  eventTypes: Record<string, string>;
  deliveryReportNote: string;
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    eyebrow: "SMS",
    title: "Utilizare SMS",
    description:
      "Vizualizare operațională a notificărilor SMS asociate organizațiilor tale. Datele sunt informative și nu reprezintă costuri sau facturare.",
    period: "Perioadă",
    calculatedRange: "Interval",
    unavailableTitle: "Datele SMS nu sunt disponibile momentan",
    unavailableDescription:
      "RomDoc nu a putut încărca toate datele SMS pentru organizațiile tale. Încearcă din nou.",
    noOrganizationsTitle: "Nu există organizații active",
    noOrganizationsDescription:
      "Contul tău nu este asociat în prezent unei organizații de clinică active.",
    stats: {
      sent: "Trimise",
      sentHelper: "SMS acceptate pentru trimitere de furnizor.",
      delivered: "Livrate",
      deliveredHelper: "SMS confirmate ca livrate de furnizor.",
      failed: "Eșuate",
      failedHelper: "SMS eșuate la trimitere sau livrare.",
      skipped: "Omise",
      skippedHelper: "SMS care nu au fost trimise.",
      confirmations: "Confirmări",
      confirmationsHelper: "SMS trimise la confirmarea programării.",
      reminders: "Reamintiri 24h",
      remindersHelper: "SMS de reamintire trimise înaintea programării.",
    },
    detailsTitle: "Activitate SMS",
    detailsDescription:
      "Metadate operaționale despre trimitere și livrare. Numerele de telefon sunt mascate, iar conținutul mesajelor nu este afișat.",
    count: "{count} înregistrări",
    empty: "Nu există activitate SMS în perioada selectată.",
    organization: "Organizație",
    event: "Tip SMS",
    recipient: "Destinatar",
    provider: "Furnizor",
    sentAt: "Data",
    delivery: "Stare",
    deliveryStatuses: {
      sent: "Trimis",
      delivered: "Livrat",
      failed: "Eșuat",
      skipped: "Omis",
      accepted: "Acceptat",
      expired: "Expirat",
      unknown: "Necunoscut",
    },
    eventTypes: {
      confirmed: "Confirmare",
      reminder_24_hours: "Reamintire 24h",
      unknown: "Alt tip",
    },
    deliveryReportNote:
      "Starea „Livrat” depinde de raportul de livrare primit de la furnizor și poate apărea după trimiterea SMS-ului.",
  },
  en: {
    eyebrow: "SMS",
    title: "SMS usage",
    description:
      "Operational view of SMS notifications associated with your organisations. These figures are informational and do not represent costs or billing.",
    period: "Period",
    calculatedRange: "Range",
    unavailableTitle: "SMS data is temporarily unavailable",
    unavailableDescription:
      "RomDoc could not load all SMS data for your organisations. Please try again.",
    noOrganizationsTitle: "No active organisations",
    noOrganizationsDescription:
      "Your account is not currently associated with an active clinic organisation.",
    stats: {
      sent: "Sent",
      sentHelper: "SMS accepted for sending by the provider.",
      delivered: "Delivered",
      deliveredHelper: "SMS confirmed as delivered by the provider.",
      failed: "Failed",
      failedHelper: "SMS that failed during sending or delivery.",
      skipped: "Skipped",
      skippedHelper: "SMS that were not sent.",
      confirmations: "Confirmations",
      confirmationsHelper: "SMS sent when appointments were confirmed.",
      reminders: "24h reminders",
      remindersHelper: "Reminder SMS sent before appointments.",
    },
    detailsTitle: "SMS activity",
    detailsDescription:
      "Operational sending and delivery metadata. Phone numbers are masked and message content is not displayed.",
    count: "{count} records",
    empty: "There is no SMS activity in the selected period.",
    organization: "Organisation",
    event: "SMS type",
    recipient: "Recipient",
    provider: "Provider",
    sentAt: "Date",
    delivery: "Status",
    deliveryStatuses: {
      sent: "Sent",
      delivered: "Delivered",
      failed: "Failed",
      skipped: "Skipped",
      accepted: "Accepted",
      expired: "Expired",
      unknown: "Unknown",
    },
    eventTypes: {
      confirmed: "Confirmation",
      reminder_24_hours: "24h reminder",
      unknown: "Other",
    },
    deliveryReportNote:
      "The “Delivered” status depends on the delivery report received from the provider and may appear after the SMS was sent.",
  },
  de: {
    eyebrow: "SMS",
    title: "SMS-Nutzung",
    description:
      "Operative Übersicht der SMS-Benachrichtigungen deiner Organisationen. Diese Angaben dienen nur zur Information und stellen keine Kosten oder Abrechnung dar.",
    period: "Zeitraum",
    calculatedRange: "Intervall",
    unavailableTitle: "SMS-Daten sind vorübergehend nicht verfügbar",
    unavailableDescription:
      "RomDoc konnte nicht alle SMS-Daten deiner Organisationen laden. Bitte versuche es erneut.",
    noOrganizationsTitle: "Keine aktiven Organisationen",
    noOrganizationsDescription:
      "Dein Konto ist derzeit keiner aktiven Klinikorganisation zugeordnet.",
    stats: {
      sent: "Gesendet",
      sentHelper: "Vom Anbieter zum Versand angenommene SMS.",
      delivered: "Zugestellt",
      deliveredHelper: "Vom Anbieter als zugestellt bestätigte SMS.",
      failed: "Fehlgeschlagen",
      failedHelper: "Beim Versand oder bei der Zustellung fehlgeschlagene SMS.",
      skipped: "Übersprungen",
      skippedHelper: "SMS, die nicht gesendet wurden.",
      confirmations: "Bestätigungen",
      confirmationsHelper: "SMS bei bestätigten Terminen.",
      reminders: "24h-Erinnerungen",
      remindersHelper: "Erinnerungs-SMS vor Terminen.",
    },
    detailsTitle: "SMS-Aktivität",
    detailsDescription:
      "Operative Versand- und Zustellmetadaten. Telefonnummern sind maskiert und Nachrichteninhalte werden nicht angezeigt.",
    count: "{count} Einträge",
    empty: "Im ausgewählten Zeitraum gibt es keine SMS-Aktivität.",
    organization: "Organisation",
    event: "SMS-Typ",
    recipient: "Empfänger",
    provider: "Anbieter",
    sentAt: "Datum",
    delivery: "Status",
    deliveryStatuses: {
      sent: "Gesendet",
      delivered: "Zugestellt",
      failed: "Fehlgeschlagen",
      skipped: "Übersprungen",
      accepted: "Angenommen",
      expired: "Abgelaufen",
      unknown: "Unbekannt",
    },
    eventTypes: {
      confirmed: "Bestätigung",
      reminder_24_hours: "24h-Erinnerung",
      unknown: "Andere",
    },
    deliveryReportNote:
      "Der Status „Zugestellt“ basiert auf dem Zustellbericht des Anbieters und kann erst nach dem Versand erscheinen.",
  },
};

const INTL_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
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
  const actualCurrentMonth = currentMonthValue();
  const normalized =
    monthParam &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)
      ? monthParam
      : actualCurrentMonth;

  const [year, month] = normalized.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return {
    label: new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(start),
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    currentMonth: normalized,
    actualCurrentMonth,
  };
}

function formatDateTime(
  value: string | null,
  locale: AppLocale
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function SummaryBox({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-[13px] text-2xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-[8px] text-sm leading-6 text-gray-600">
        {helper}
      </p>
    </div>
  );
}

function interpolateCount(
  template: string,
  count: number
) {
  return template.replace(
    "{count}",
    String(count)
  );
}

function operationalStatus(
  row: SmsUsageRow
) {
  if (
    row.status === "failed" ||
    row.delivery_report_status === "failed" ||
    row.delivery_report_status === "expired"
  ) {
    return row.delivery_report_status === "expired"
      ? "expired"
      : "failed";
  }

  if (row.status === "skipped") {
    return "skipped";
  }

  if (row.delivery_report_status === "delivered") {
    return "delivered";
  }

  if (row.delivery_report_status === "accepted") {
    return "accepted";
  }

  if (row.status === "sent") {
    return "sent";
  }

  return "unknown";
}

function statusClasses(status: string) {
  if (status === "delivered") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (
    status === "failed" ||
    status === "expired"
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    status === "sent" ||
    status === "accepted"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

export default async function ClinicManagerSmsPage({
  searchParams,
}: ClinicManagerSmsPageProps) {
  const locale = await getStoredAppLocale();
  const copy = COPY[locale];
  const parameters = await searchParams;
  const range = monthRange(parameters?.month, locale);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const loginParameters = new URLSearchParams({
      locale,
      next: "/clinic-manager-dashboard/sms",
    });

    redirect(`/login?${loginParameters.toString()}`);
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "clinic_manager" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const { data: memberships } = await supabase
    .from("clinic_organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .eq("status", "active");

  const activeMemberships =
    (memberships ?? []) as OrganizationMember[];

  const organizationIds = activeMemberships.map(
    (membership) => membership.organization_id
  );

  let organizations: ClinicOrganization[] = [];
  let usageRows: SmsUsageRow[] = [];
  let hasUsageError = false;

  if (organizationIds.length > 0) {
    const { data: organizationsData } = await supabase
      .from("clinic_organizations")
      .select("id, name, status")
      .in("id", organizationIds)
      .eq("status", "active")
      .order("name", {
        ascending: true,
      });

    organizations =
      (organizationsData ?? []) as ClinicOrganization[];

    const activeOrganizationIds = organizations.map(
      (organization) => organization.id
    );

    const usageResults = await Promise.all(
      activeOrganizationIds.map(
        async (organizationId) => {
          const { data, error } = await supabase.rpc(
            "get_clinic_organization_sms_usage",
            {
              target_organization_id: organizationId,
              period_start: range.startDate,
              period_end: range.endDate,
            }
          );

          if (error) {
            console.error(
              "Clinic SMS usage query failed:",
              error
            );

            return {
              rows: [] as SmsUsageRow[],
              failed: true,
            };
          }

          return {
            rows: (data ?? []) as SmsUsageRow[],
            failed: false,
          };
        }
      )
    );

    usageRows = usageResults.flatMap(
      (result) => result.rows
    );

    hasUsageError = usageResults.some(
      (result) => result.failed
    );
  }

  const organizationNameById = new Map(
    organizations.map(
      (organization) => [
        organization.id,
        organization.name,
      ]
    )
  );

  const sentCount = usageRows.filter(
    (row) => row.status === "sent"
  ).length;

  const deliveredCount = usageRows.filter(
    (row) =>
      row.delivery_report_status === "delivered"
  ).length;

  const failedCount = usageRows.filter(
    (row) =>
      row.status === "failed" ||
      row.delivery_report_status === "failed" ||
      row.delivery_report_status === "expired"
  ).length;

  const skippedCount = usageRows.filter(
    (row) => row.status === "skipped"
  ).length;

  const confirmationCount = usageRows.filter(
    (row) =>
      row.status === "sent" &&
      row.event === "confirmed"
  ).length;

  const reminderCount = usageRows.filter(
    (row) =>
      row.status === "sent" &&
      row.event === "reminder_24_hours"
  ).length;

  function deliveryLabel(row: SmsUsageRow) {
    const status = operationalStatus(row);

    return (
      copy.deliveryStatuses[status] ??
      copy.deliveryStatuses.unknown
    );
  }

  function eventLabel(event: string | null) {
    const normalized =
      event === "confirmed" ||
      event === "reminder_24_hours"
        ? event
        : "unknown";

    return (
      copy.eventTypes[normalized] ??
      copy.eventTypes.unknown
    );
  }

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
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
            <h2 className="text-xl font-bold capitalize text-gray-900">
              {copy.period}: {range.label}
            </h2>

            <p className="mt-[5px] text-sm text-gray-600">
              {copy.calculatedRange}: {range.startDate} —{" "}
              {range.endDate}
            </p>
          </div>

          <ClinicManagerMonthSelector
            value={range.currentMonth}
            locale={locale}
            basePath="/clinic-manager-dashboard/sms"
          />
        </div>
      </section>

      {hasUsageError ? (
        <section
          role="alert"
          className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-sm leading-6 text-red-800 shadow-sm"
        >
          <h2 className="font-semibold">
            {copy.unavailableTitle}
          </h2>

          <p className="mt-[8px]">
            {copy.unavailableDescription}
          </p>
        </section>
      ) : null}

      {organizations.length === 0 ? (
        <section className="rounded-[21px] border border-dashed border-gray-300 bg-white p-[21px] shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {copy.noOrganizationsTitle}
          </h2>

          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {copy.noOrganizationsDescription}
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-3">
            <SummaryBox
              label={copy.stats.sent}
              value={sentCount}
              helper={copy.stats.sentHelper}
            />

            <SummaryBox
              label={copy.stats.delivered}
              value={deliveredCount}
              helper={copy.stats.deliveredHelper}
            />

            <SummaryBox
              label={copy.stats.failed}
              value={failedCount}
              helper={copy.stats.failedHelper}
            />

            <SummaryBox
              label={copy.stats.skipped}
              value={skippedCount}
              helper={copy.stats.skippedHelper}
            />

            <SummaryBox
              label={copy.stats.confirmations}
              value={confirmationCount}
              helper={copy.stats.confirmationsHelper}
            />

            <SummaryBox
              label={copy.stats.reminders}
              value={reminderCount}
              helper={copy.stats.remindersHelper}
            />
          </div>

          <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-[13px]">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {copy.detailsTitle}
                </h2>

                <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
                  {copy.detailsDescription}
                </p>
              </div>

              <span className="rounded-full bg-[#F0EEE9] px-[13px] py-[5px] text-sm font-semibold text-gray-700">
                {interpolateCount(
                  copy.count,
                  usageRows.length
                )}
              </span>
            </div>

            {usageRows.length === 0 ? (
              <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm leading-6 text-gray-600">
                {copy.empty}
              </div>
            ) : (
              <>
                <div className="mt-[21px] space-y-[13px] md:hidden">
                  {usageRows.map((row) => {
                    const status =
                      operationalStatus(row);

                    return (
                      <article
                        key={`${row.sms_log_id}-mobile`}
                        className="rounded-[13px] border border-gray-200 p-[13px]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-[8px]">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {eventLabel(row.event)}
                            </h3>

                            <p className="mt-[5px] text-xs text-gray-500">
                              {formatDateTime(
                                row.created_at,
                                locale
                              )}
                            </p>
                          </div>

                          <span
                            className={`inline-flex rounded-full border px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                              status
                            )}`}
                          >
                            {deliveryLabel(row)}
                          </span>
                        </div>

                        <dl className="mt-[13px] grid gap-[13px] text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {copy.organization}
                            </dt>
                            <dd className="mt-[5px] text-gray-700">
                              {organizationNameById.get(
                                row.organization_id
                              ) ??
                                row.organization_name ??
                                "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {copy.recipient}
                            </dt>
                            <dd className="mt-[5px] font-mono text-gray-700">
                              {row.masked_recipient ?? "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {copy.provider}
                            </dt>
                            <dd className="mt-[5px] text-gray-700">
                              {row.provider ?? "—"}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-[21px] hidden overflow-x-auto md:block">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-gray-500">
                        <th className="border-b border-gray-200 px-[13px] py-[8px]">
                          {copy.sentAt}
                        </th>
                        <th className="border-b border-gray-200 px-[13px] py-[8px]">
                          {copy.organization}
                        </th>
                        <th className="border-b border-gray-200 px-[13px] py-[8px]">
                          {copy.event}
                        </th>
                        <th className="border-b border-gray-200 px-[13px] py-[8px]">
                          {copy.recipient}
                        </th>
                        <th className="border-b border-gray-200 px-[13px] py-[8px]">
                          {copy.provider}
                        </th>
                        <th className="border-b border-gray-200 px-[13px] py-[8px]">
                          {copy.delivery}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {usageRows.map((row) => {
                        const status =
                          operationalStatus(row);

                        return (
                          <tr
                            key={row.sms_log_id}
                            className="align-top"
                          >
                            <td className="border-b border-gray-100 px-[13px] py-[13px] text-gray-700">
                              {formatDateTime(
                                row.created_at,
                                locale
                              )}
                            </td>
                            <td className="border-b border-gray-100 px-[13px] py-[13px] font-medium text-gray-900">
                              {organizationNameById.get(
                                row.organization_id
                              ) ??
                                row.organization_name ??
                                "—"}
                            </td>
                            <td className="border-b border-gray-100 px-[13px] py-[13px] text-gray-700">
                              {eventLabel(row.event)}
                            </td>
                            <td className="border-b border-gray-100 px-[13px] py-[13px] font-mono text-gray-700">
                              {row.masked_recipient ?? "—"}
                            </td>
                            <td className="border-b border-gray-100 px-[13px] py-[13px] text-gray-700">
                              {row.provider ?? "—"}
                            </td>
                            <td className="border-b border-gray-100 px-[13px] py-[13px]">
                              <span
                                className={`inline-flex rounded-full border px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                                  status
                                )}`}
                              >
                                {deliveryLabel(row)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="mt-[13px] text-xs leading-5 text-gray-500">
                  {copy.deliveryReportNote}
                </p>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
