import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";

import {
  type AppLocale,
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
  id: string;
  organization_id: string;

  doctor_id:
    | string
    | null;

  clinic_id:
    | string
    | null;

  event_type:
    | string
    | null;

  delivery_status:
    | string
    | null;

  invoice_status:
    | string
    | null;

  masked_recipient:
    | string
    | null;

  unit_cost_minor:
    | number
    | null;

  currency:
    | string
    | null;

  provider_message_id:
    | string
    | null;

  sent_at:
    | string
    | null;

  created_at:
    | string
    | null;
};

type ClinicManagerSmsPageProps = {
  searchParams?:
    Promise<{
      month?: string;
    }>;
};

const INTL_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro:
      "ro-RO",
    en:
      "en-GB",
    de:
      "de-DE",
  };

function currentMonthValue() {
  const parts =
    new Intl
      .DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Europe/Bucharest",

          year:
            "numeric",

          month:
            "2-digit",
        }
      )
      .formatToParts(
        new Date()
      );

  const year =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "month"
    )?.value;

  return `${year}-${month}`;
}

function monthRange(
  monthParam:
    | string
    | undefined,
  locale:
    AppLocale
) {
  const fallback =
    currentMonthValue();

  const normalized =
    monthParam &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(
      monthParam
    )
      ? monthParam
      : fallback;

  const [
    year,
    month,
  ] =
    normalized
      .split(
        "-"
      )
      .map(
        Number
      );

  const start =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        1
      )
    );

  const end =
    new Date(
      Date.UTC(
        year,
        month,
        1
      )
    );

  const previous =
    new Date(
      Date.UTC(
        year,
        month -
          2,
        1
      )
    );

  const next =
    new Date(
      Date.UTC(
        year,
        month,
        1
      )
    );

  function value(
    date:
      Date
  ) {
    return `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    )}`;
  }

  return {
    label:
      new Intl
        .DateTimeFormat(
          INTL_LOCALE[
            locale
          ],
          {
            month:
              "long",

            year:
              "numeric",

            timeZone:
              "UTC",
          }
        )
        .format(
          start
        ),

    startDate:
      start
        .toISOString()
        .slice(
          0,
          10
        ),

    endDate:
      end
        .toISOString()
        .slice(
          0,
          10
        ),

    currentMonth:
      normalized,

    actualCurrentMonth:
      fallback,

    previousMonth:
      value(
        previous
      ),

    nextMonth:
      value(
        next
      ),
  };
}

function formatCurrencyMinor(
  valueMinor:
    number,
  currency:
    string,
  locale:
    AppLocale
) {
  return new Intl
    .NumberFormat(
      INTL_LOCALE[
        locale
      ],
      {
        style:
          "currency",

        currency,

        maximumFractionDigits:
          2,
      }
    )
    .format(
      valueMinor /
        100
    );
}

function formatDateTime(
  value:
    | string
    | null,
  locale:
    AppLocale
) {
  if (
    !value
  ) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      INTL_LOCALE[
        locale
      ],
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Bucharest",
      }
    )
    .format(
      new Date(
        value
      )
    );
}

function SummaryBox({
  label,
  value,
  helper,
}: {
  label: string;

  value:
    | string
    | number;

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

function statusClasses(
  status:
    string | null
) {
  switch (
    status
  ) {
    case "sent":
    case "invoiced":
      return "border-green-200 bg-green-50 text-green-800";

    case "queued":
    case "uninvoiced":
      return "border-amber-200 bg-amber-50 text-amber-900";

    case "failed":
      return "border-red-200 bg-red-50 text-red-800";

    case "credited":
    case "not_billable":
    case "skipped":
      return "border-gray-200 bg-gray-50 text-gray-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

export default async function ClinicManagerSmsPage({
  searchParams,
}: ClinicManagerSmsPageProps) {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "ClinicOrganisationDashboard.sms",
    });

  const parameters =
    await searchParams;

  const range =
    monthRange(
      parameters?.month,
      locale
    );

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  const profileId =
    user?.id;

  const {
    data:
      memberships,
  } =
    profileId
      ? await supabase
          .from(
            "clinic_organization_members"
          )
          .select(
            "organization_id"
          )
          .eq(
            "profile_id",
            profileId
          )
          .eq(
            "status",
            "active"
          )
      : {
          data:
            [],
        };

  const activeMemberships =
    (
      memberships ??
      []
    ) as
      OrganizationMember[];

  const organizationIds =
    activeMemberships.map(
      (
        membership
      ) =>
        membership.organization_id
    );

  let organizations:
    ClinicOrganization[] =
    [];

  let usageRows:
    SmsUsageRow[] =
    [];

  let hasUsageError =
    false;

  if (
    organizationIds.length >
    0
  ) {
    const {
      data:
        organizationsData,
    } =
      await supabase
        .from(
          "clinic_organizations"
        )
        .select(
          "id, name, status"
        )
        .in(
          "id",
          organizationIds
        )
        .order(
          "name",
          {
            ascending:
              true,
          }
        );

    organizations =
      (
        organizationsData ??
        []
      ) as
        ClinicOrganization[];

    const usageResults =
      await Promise.all(
        organizationIds.map(
          async (
            organizationId
          ) => {
            const {
              data,
              error,
            } =
              await supabase.rpc(
                "get_clinic_organization_sms_usage",
                {
                  target_organization_id:
                    organizationId,

                  period_start:
                    range.startDate,

                  period_end:
                    range.endDate,
                }
              );

            if (
              error
            ) {
              console.error(
                "Clinic SMS usage query failed:",
                error
              );

              return {
                rows:
                  [] as
                    SmsUsageRow[],

                failed:
                  true,
              };
            }

            return {
              rows:
                (
                  data ??
                  []
                ) as
                  SmsUsageRow[],

              failed:
                false,
            };
          }
        )
      );

    usageRows =
      usageResults.flatMap(
        (
          result
        ) =>
          result.rows
      );

    hasUsageError =
      usageResults.some(
        (
          result
        ) =>
          result.failed
      );
  }

  const organizationNameById =
    new Map(
      organizations.map(
        (
          organization
        ) => [
          organization.id,
          organization.name,
        ]
      )
    );

  const sentRows =
    usageRows.filter(
      (
        row
      ) =>
        row.delivery_status ===
        "sent"
    );

  const failedRows =
    usageRows.filter(
      (
        row
      ) =>
        row.delivery_status ===
        "failed"
    );

  const uninvoicedRows =
    usageRows.filter(
      (
        row
      ) =>
        row.invoice_status ===
        "uninvoiced"
    );

  const estimatedUninvoicedCostMinor =
    uninvoicedRows.reduce(
      (
        total,
        row
      ) =>
        total +
        (
          row.unit_cost_minor ??
          0
        ),
      0
    );

  const currency =
    usageRows.find(
      (
        row
      ) =>
        row.currency
    )?.currency ??
    "RON";

  function deliveryLabel(
    status:
      | string
      | null
  ) {
    const normalized =
      [
        "sent",
        "failed",
        "skipped",
        "queued",
      ].includes(
        status ??
        ""
      )
        ? status
        : "unknown";

    return t(
      `deliveryStatuses.${normalized}`
    );
  }

  function invoiceLabel(
    status:
      | string
      | null
  ) {
    const normalized =
      [
        "uninvoiced",
        "invoiced",
        "credited",
        "not_billable",
      ].includes(
        status ??
        ""
      )
        ? status
        : "unknown";

    return t(
      `invoiceStatuses.${normalized}`
    );
  }

  function eventLabel(
    event:
      | string
      | null
  ) {
    const normalized =
      [
        "confirmed",
        "reminder_24_hours",
      ].includes(
        event ??
        ""
      )
        ? event
        : "unknown";

    return t(
      `eventTypes.${normalized}`
    );
  }

  function StatusBadge({
    status,
    label,
  }: {
    status:
      | string
      | null;

    label: string;
  }) {
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

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {t(
            "eyebrow"
          )}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {t(
            "title"
          )}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>
      </header>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-[13px]">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t(
                "period"
              )}
              :{" "}
              {
                range.label
              }
            </h2>

            <p className="mt-[5px] text-sm text-gray-600">
              {t(
                "calculatedRange"
              )}
              :{" "}
              {
                range.startDate
              }{" "}
              —{" "}
              {
                range.endDate
              }
            </p>
          </div>

          <div className="flex flex-wrap gap-[8px]">
            <Link
              href={`/clinic-manager-dashboard/sms?month=${range.previousMonth}`}
              className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[8px] text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t(
                "previousMonth"
              )}
            </Link>

            {range.currentMonth !==
              range.actualCurrentMonth && (
              <Link
                href={`/clinic-manager-dashboard/sms?month=${range.actualCurrentMonth}`}
                className="romdoc-focus-ring rounded-[13px] border border-[#036661] px-[13px] py-[8px] text-sm font-semibold text-[#036661] hover:bg-[#036661]/10"
              >
                {t(
                  "currentMonth"
                )}
              </Link>
            )}

            <Link
              href={`/clinic-manager-dashboard/sms?month=${range.nextMonth}`}
              className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[8px] text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t(
                "nextMonth"
              )}
            </Link>
          </div>
        </div>
      </section>

      {hasUsageError && (
        <section
          role="alert"
          className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-sm leading-6 text-red-800 shadow-sm"
        >
          <h2 className="font-semibold">
            {t(
              "unavailableTitle"
            )}
          </h2>

          <p className="mt-[8px]">
            {t(
              "unavailableDescription"
            )}
          </p>
        </section>
      )}

      {organizations.length ===
      0 ? (
        <section className="rounded-[21px] border border-dashed border-gray-300 bg-white p-[21px] shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t(
              "noOrganizationsTitle"
            )}
          </h2>

          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {t(
              "noOrganizationsDescription"
            )}
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
            <SummaryBox
              label={t(
                "stats.sent"
              )}
              value={
                sentRows.length
              }
              helper={t(
                "stats.sentHelper"
              )}
            />

            <SummaryBox
              label={t(
                "stats.failed"
              )}
              value={
                failedRows.length
              }
              helper={t(
                "stats.failedHelper"
              )}
            />

            <SummaryBox
              label={t(
                "stats.uninvoiced"
              )}
              value={
                uninvoicedRows.length
              }
              helper={t(
                "stats.uninvoicedHelper"
              )}
            />

            <SummaryBox
              label={t(
                "stats.estimatedCost"
              )}
              value={formatCurrencyMinor(
                estimatedUninvoicedCostMinor,
                currency,
                locale
              )}
              helper={t(
                "stats.estimatedCostHelper"
              )}
            />
          </div>

          <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-[13px]">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {t(
                    "detailsTitle"
                  )}
                </h2>

                <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
                  {t(
                    "detailsDescription"
                  )}
                </p>
              </div>

              <span className="rounded-full bg-[#F0EEE9] px-[13px] py-[5px] text-sm font-semibold text-gray-700">
                {t(
                  "count",
                  {
                    count:
                      usageRows.length,
                  }
                )}
              </span>
            </div>

            {usageRows.length ===
            0 ? (
              <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm leading-6 text-gray-600">
                {t(
                  "empty"
                )}
              </div>
            ) : (
              <>
                <div className="mt-[21px] space-y-[13px] md:hidden">
                  {usageRows.map(
                    (
                      row
                    ) => (
                      <article
                        key={`${row.id}-mobile`}
                        className="rounded-[13px] border border-gray-200 p-[13px]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-[8px]">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {eventLabel(
                                row.event_type
                              )}
                            </h3>

                            <p className="mt-[5px] text-xs text-gray-500">
                              {formatDateTime(
                                row.sent_at ??
                                  row.created_at,
                                locale
                              )}
                            </p>
                          </div>

                          <StatusBadge
                            status={
                              row.delivery_status
                            }
                            label={deliveryLabel(
                              row.delivery_status
                            )}
                          />
                        </div>

                        <dl className="mt-[13px] grid gap-[13px] text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t(
                                "organization"
                              )}
                            </dt>

                            <dd className="mt-[5px] text-gray-700">
                              {organizationNameById.get(
                                row.organization_id
                              ) ??
                                "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t(
                                "billing"
                              )}
                            </dt>

                            <dd className="mt-[5px]">
                              <StatusBadge
                                status={
                                  row.invoice_status
                                }
                                label={invoiceLabel(
                                  row.invoice_status
                                )}
                              />
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t(
                                "phone"
                              )}
                            </dt>

                            <dd className="mt-[5px] font-mono text-gray-700">
                              {row.masked_recipient ??
                                "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t(
                                "cost"
                              )}
                            </dt>

                            <dd className="mt-[5px] font-semibold text-gray-900">
                              {formatCurrencyMinor(
                                row.unit_cost_minor ??
                                  0,
                                row.currency ??
                                  currency,
                                locale
                              )}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    )
                  )}
                </div>

                <div className="mt-[21px] hidden overflow-hidden rounded-[13px] border border-gray-200 md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-[13px] py-[13px]">
                            {t(
                              "date"
                            )}
                          </th>

                          <th className="px-[13px] py-[13px]">
                            {t(
                              "organization"
                            )}
                          </th>

                          <th className="px-[13px] py-[13px]">
                            {t(
                              "event"
                            )}
                          </th>

                          <th className="px-[13px] py-[13px]">
                            {t(
                              "delivery"
                            )}
                          </th>

                          <th className="px-[13px] py-[13px]">
                            {t(
                              "billing"
                            )}
                          </th>

                          <th className="px-[13px] py-[13px]">
                            {t(
                              "phone"
                            )}
                          </th>

                          <th className="px-[13px] py-[13px]">
                            {t(
                              "cost"
                            )}
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 bg-white">
                        {usageRows.map(
                          (
                            row
                          ) => (
                            <tr
                              key={
                                row.id
                              }
                              className="align-top"
                            >
                              <td className="px-[13px] py-[13px] text-gray-700">
                                {formatDateTime(
                                  row.sent_at ??
                                    row.created_at,
                                  locale
                                )}
                              </td>

                              <td className="px-[13px] py-[13px] text-gray-700">
                                {organizationNameById.get(
                                  row.organization_id
                                ) ??
                                  "—"}
                              </td>

                              <td className="px-[13px] py-[13px] text-gray-700">
                                {eventLabel(
                                  row.event_type
                                )}
                              </td>

                              <td className="px-[13px] py-[13px]">
                                <StatusBadge
                                  status={
                                    row.delivery_status
                                  }
                                  label={deliveryLabel(
                                    row.delivery_status
                                  )}
                                />
                              </td>

                              <td className="px-[13px] py-[13px]">
                                <StatusBadge
                                  status={
                                    row.invoice_status
                                  }
                                  label={invoiceLabel(
                                    row.invoice_status
                                  )}
                                />
                              </td>

                              <td className="px-[13px] py-[13px] font-mono text-gray-700">
                                {row.masked_recipient ??
                                  "—"}
                              </td>

                              <td className="px-[13px] py-[13px] font-semibold text-gray-900">
                                {formatCurrencyMinor(
                                  row.unit_cost_minor ??
                                    0,
                                  row.currency ??
                                    currency,
                                  locale
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="rounded-[21px] border border-amber-200 bg-amber-50 p-[21px] text-sm leading-6 text-amber-900 shadow-sm">
            <h2 className="font-semibold">
              {t(
                "visibilityTitle"
              )}
            </h2>

            <p className="mt-[8px]">
              {t(
                "visibilityDescription"
              )}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
