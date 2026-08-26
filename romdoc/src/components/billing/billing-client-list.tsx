"use client";

import {
  useMemo,
  useState,
} from "react";

import ClientBillingInvoiceActions from "@/components/billing/client-billing-invoice-actions";
import type {
  PlatformBillingCurrency,
  PlatformInvoiceAmountRow,
  PlatformInvoicingData,
} from "@/lib/billing/platform-invoicing";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getPlatformOperatorBilling,
} from "@/lib/i18n/platform-operator-billing";
import {
  getPlatformOperatorBillingHistory,
  interpolatePlatformBillingHistory,
} from "@/lib/i18n/platform-operator-billing-history";

export type InitialClientInvoiceDraft = {
  clientType:
    | "clinic_organization"
    | "independent_doctor";
  clientId: string;
  estimatedAmount?: number;
};

type BillingClientListProps = {
  locale: AppLocale;
  data: PlatformInvoicingData;
  initialInvoiceDraft?:
    | InitialClientInvoiceDraft
    | null;
};

type ClientFilterStatus =
  | "all"
  | "unprocessed"
  | "invoiced"
  | "paid";

const SMS_INCLUDED_COPY: Record<
  AppLocale,
  {
    usage: string;
    included: string;
  }
> = {
  ro: {
    usage: "Utilizare SMS",
    included:
      "SMS-urile sunt incluse în abonament și nu sunt calculate separat.",
  },
  en: {
    usage: "SMS usage",
    included:
      "SMS is included in the subscription and is not calculated separately.",
  },
  de: {
    usage: "SMS-Nutzung",
    included:
      "SMS sind im Abonnement enthalten und werden nicht separat berechnet.",
  },
};

function localeTag(
  locale: AppLocale
) {
  if (locale === "de") {
    return "de-DE";
  }

  if (locale === "en") {
    return "en-GB";
  }

  return "ro-RO";
}

function formatCurrency(
  value: number,
  locale: AppLocale,
  currency: PlatformBillingCurrency
) {
  return new Intl.NumberFormat(
    localeTag(locale),
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function normalizeSearch(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function filterStatus(
  row: PlatformInvoiceAmountRow
): Exclude<
  ClientFilterStatus,
  "all"
> {
  if (
    row.invoiceRecord?.status ===
    "paid"
  ) {
    return "paid";
  }

  if (
    row.invoiceRecord?.status ===
    "invoiced"
  ) {
    return "invoiced";
  }

  return "unprocessed";
}

function visibleStatus(
  row: PlatformInvoiceAmountRow,
  data: PlatformInvoicingData
):
  | "estimate"
  | "ready"
  | "invoiced"
  | "paid" {
  if (
    row.invoiceRecord?.status ===
    "paid"
  ) {
    return "paid";
  }

  if (
    row.invoiceRecord?.status ===
    "invoiced"
  ) {
    return "invoiced";
  }

  return data.range.month ===
    data.range.currentMonth
    ? "estimate"
    : "ready";
}

function statusClasses(
  status:
    | "estimate"
    | "ready"
    | "invoiced"
    | "paid"
) {
  if (status === "paid") {
    return "bg-green-100 text-green-800";
  }

  if (
    status === "invoiced"
  ) {
    return "bg-blue-100 text-blue-800";
  }

  if (status === "ready") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-gray-100 text-gray-700";
}

function BillingDetails({
  row,
  locale,
}: {
  row: PlatformInvoiceAmountRow;
  locale: AppLocale;
}) {
  const copy =
    getPlatformOperatorBillingHistory(
      locale
    );

  const oldCopy =
    getPlatformOperatorBilling(
      locale
    );

  const details =
    row.billingDetails;

  return (
    <aside
      className={`rounded-[13px] border p-[13px] ${
        details
          ? "border-[#036661]/20 bg-[#036661]/5"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
        {
          copy.history
            .invoiceTo
        }
      </p>

      {details ? (
        <dl className="mt-[8px] grid gap-[5px] text-sm leading-6 text-gray-700">
          <div>
            <dt className="sr-only">
              {
                oldCopy.amounts
                  .invoiceDetails
                  .legalName
              }
            </dt>

            <dd className="font-semibold text-gray-950">
              {details.legalName ||
                row.clientName}
            </dd>
          </div>

          {details.taxId ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {
                  oldCopy.amounts
                    .invoiceDetails
                    .taxId
                }
                :
              </dt>
              <dd>
                {details.taxId}
              </dd>
            </div>
          ) : null}

          {details.tradeRegisterNumber ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {
                  oldCopy.amounts
                    .invoiceDetails
                    .tradeRegister
                }
                :
              </dt>
              <dd>
                {
                  details.tradeRegisterNumber
                }
              </dd>
            </div>
          ) : null}

          {details.billingAddress ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {
                  oldCopy.amounts
                    .invoiceDetails
                    .address
                }
                :
              </dt>
              <dd>
                {
                  details.billingAddress
                }
              </dd>
            </div>
          ) : null}

          {details.billingEmail ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {
                  oldCopy.amounts
                    .invoiceDetails
                    .billingEmail
                }
                :
              </dt>
              <dd>
                {
                  details.billingEmail
                }
              </dd>
            </div>
          ) : null}

          {details.vatNumber ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {
                  oldCopy.amounts
                    .invoiceDetails
                    .vatNumber
                }
                :
              </dt>
              <dd>
                {
                  details.vatNumber
                }
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-[8px] text-sm leading-6 text-amber-900">
          {
            copy.history
              .billingMissing
          }
        </p>
      )}
    </aside>
  );
}

function ClientRow({
  row,
  locale,
  data,
  initialInvoiceDraft,
}: {
  row: PlatformInvoiceAmountRow;
  locale: AppLocale;
  data: PlatformInvoicingData;
  initialInvoiceDraft?:
    | InitialClientInvoiceDraft
    | null;
}) {
  const copy =
    getPlatformOperatorBillingHistory(
      locale
    );

  const oldCopy =
    getPlatformOperatorBilling(
      locale
    );

  const smsCopy =
    SMS_INCLUDED_COPY[
      locale
    ];

  const status =
    visibleStatus(
      row,
      data
    );

  const statusLabel =
    status === "paid"
      ? copy.history
          .paidBadge
      : status ===
          "invoiced"
        ? copy.history
            .invoicedBadge
        : status ===
            "ready"
          ? copy.history
              .readyBadge
          : copy.history
              .currentBadge;

  const displayedCurrency =
    row.invoiceRecord
      ?.currency ??
    row.currency;

  const displayedTotal =
    row.invoiceRecord
      ?.amount ??
    row.total;

  const isInitialRow =
    initialInvoiceDraft?.clientType ===
      row.clientType &&
    initialInvoiceDraft.clientId ===
      row.id;

  return (
    <details
      open={
        isInitialRow ||
        undefined
      }
      className="group overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm"
    >
      <summary className="romdoc-focus-ring flex cursor-pointer list-none flex-col gap-[13px] p-[21px] marker:content-none xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[8px]">
            <h4 className="truncate text-lg font-bold text-gray-900">
              {
                row.clientName
              }
            </h4>

            <span className="rounded-full bg-gray-100 px-[8px] py-[5px] text-xs font-semibold text-gray-700">
              {row.clientType ===
              "independent_doctor"
                ? oldCopy.amounts
                    .independentDoctor
                : oldCopy.amounts
                    .clinicOrganization}
            </span>

            <span
              className={`rounded-full px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                status
              )}`}
            >
              {
                statusLabel
              }
            </span>
          </div>

          <p className="mt-[5px] text-sm text-gray-500">
            {row.accountEmail ||
              oldCopy.common
                .emailUnavailable}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-[8px] sm:grid-cols-3 xl:min-w-[660px] xl:grid-cols-6">
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">
              {row.clientType ===
              "clinic_organization"
                ? copy.history
                    .managedDoctors
                : oldCopy.amounts
                    .subscriptions}
            </p>

            <p className="mt-[5px] text-lg font-bold text-gray-900">
              {
                row.subscriptionCount
              }
            </p>
          </div>

          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">
              {
                copy.history
                  .subscriptionPrice
              }
            </p>

            <p className="mt-[5px] text-sm font-bold text-gray-900">
              {formatCurrency(
                row.subscriptionUnitPrice,
                locale,
                row.currency
              )}
            </p>
          </div>

          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">
              {
                oldCopy.amounts
                  .smsSent
              }
            </p>

            <p className="mt-[5px] text-lg font-bold text-gray-900">
              {
                row.totalSmsCount
              }
            </p>
          </div>

          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">
              {
                copy.history
                  .subtotal
              }
            </p>

            <p className="mt-[5px] text-sm font-bold text-gray-900">
              {formatCurrency(
                row.subtotal,
                locale,
                row.currency
              )}
            </p>
          </div>

          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">
              {
                copy.history.vat
              }
            </p>

            <p className="mt-[5px] text-sm font-bold text-gray-900">
              {formatCurrency(
                row.vatAmount,
                locale,
                row.currency
              )}
            </p>
          </div>

          <div className="rounded-[13px] bg-[#036661]/5 p-[8px] text-center">
            <p className="text-xs text-gray-500">
              {
                copy.history.total
              }
            </p>

            <p className="mt-[5px] text-sm font-bold text-[#036661]">
              {formatCurrency(
                displayedTotal,
                locale,
                displayedCurrency
              )}
            </p>
          </div>
        </div>
      </summary>

      <div className="border-t border-gray-200 bg-gray-50/60 p-[21px]">
        <div className="grid gap-[21px] xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div>
            <dl className="grid gap-[8px] text-sm">
              <div className="flex items-start justify-between gap-[13px]">
                <dt className="text-gray-600">
                  {
                    row.subscriptionCount
                  }{" "}
                  ×{" "}
                  {formatCurrency(
                    row.subscriptionUnitPrice,
                    locale,
                    row.currency
                  )}
                </dt>

                <dd className="font-semibold text-gray-900">
                  {formatCurrency(
                    row.subscriptionAmount,
                    locale,
                    row.currency
                  )}
                </dd>
              </div>

              <div className="rounded-[13px] border border-blue-200 bg-blue-50 p-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-[8px]">
                  <dt className="font-medium text-blue-950">
                    {
                      smsCopy.usage
                    }
                  </dt>

                  <dd className="font-bold text-blue-950">
                    {
                      row.totalSmsCount
                    }
                  </dd>
                </div>

                <p className="mt-[5px] text-xs leading-5 text-blue-900">
                  {
                    smsCopy.included
                  }
                </p>

                <div className="mt-[8px] text-xs leading-5 text-blue-900">
                  {
                    oldCopy.amounts
                      .confirmationSms
                  }
                  :{" "}
                  {
                    row.confirmationSmsCount
                  }
                  {" · "}
                  {
                    oldCopy.amounts
                      .reminderSms
                  }
                  :{" "}
                  {
                    row.reminder24hSmsCount
                  }
                  {" · "}
                  {
                    copy.history
                      .otherSms
                  }
                  :{" "}
                  {
                    row.otherSmsCount
                  }
                </div>
              </div>

              <div className="mt-[5px] flex items-start justify-between gap-[13px] border-t border-gray-200 pt-[13px]">
                <dt className="font-medium text-gray-700">
                  {
                    copy.history
                      .subtotal
                  }
                </dt>

                <dd className="font-semibold text-gray-900">
                  {formatCurrency(
                    row.subtotal,
                    locale,
                    row.currency
                  )}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-[13px]">
                <dt className="text-gray-600">
                  {
                    copy.history.vat
                  }{" "}
                  {new Intl.NumberFormat(
                    localeTag(
                      locale
                    ),
                    {
                      style:
                        "percent",
                      maximumFractionDigits:
                        2,
                    }
                  ).format(
                    row.vatRate
                  )}
                </dt>

                <dd className="font-semibold text-gray-900">
                  {formatCurrency(
                    row.vatAmount,
                    locale,
                    row.currency
                  )}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-[13px] border-t border-gray-200 pt-[13px] text-base">
                <dt className="font-bold text-gray-900">
                  {
                    copy.history
                      .total
                  }
                </dt>

                <dd className="font-bold text-[#036661]">
                  {formatCurrency(
                    row.total,
                    locale,
                    row.currency
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-[13px] flex flex-wrap gap-[8px] text-xs">
              <span
                className={`rounded-full px-[8px] py-[5px] font-semibold ${
                  row.billingTermsSource ===
                  "client"
                    ? "bg-[#036661]/10 text-[#036661]"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {row.billingTermsSource ===
                "client"
                  ? copy.history
                      .clientTerms
                  : copy.history
                      .globalTerms}
              </span>

              <span className="rounded-full bg-gray-200 px-[8px] py-[5px] font-semibold text-gray-700">
                {
                  copy.vatTreatment[
                    row.vatTreatment
                  ]
                }
              </span>

              {row.vatReason ? (
                <span className="rounded-full bg-gray-200 px-[8px] py-[5px] text-gray-700">
                  {
                    row.vatReason
                  }
                </span>
              ) : null}
            </div>

            <ClientBillingInvoiceActions
              locale={locale}
              row={row}
              range={
                data.range
              }
              openInitially={
                isInitialRow
              }
              initialAmount={
                isInitialRow
                  ? initialInvoiceDraft?.estimatedAmount
                  : undefined
              }
            />
          </div>

          <BillingDetails
            row={row}
            locale={locale}
          />
        </div>
      </div>
    </details>
  );
}

function ClientGroup({
  title,
  rows,
  locale,
  data,
  initialInvoiceDraft,
}: {
  title: string;
  rows: PlatformInvoiceAmountRow[];
  locale: AppLocale;
  data: PlatformInvoicingData;
  initialInvoiceDraft?:
    | InitialClientInvoiceDraft
    | null;
}) {
  const copy =
    getPlatformOperatorBillingHistory(
      locale
    );

  if (rows.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-[13px] flex items-end justify-between gap-[13px]">
        <h3 className="text-xl font-bold text-gray-900">
          {title}
        </h3>

        <span className="text-sm font-semibold text-gray-500">
          {interpolatePlatformBillingHistory(
            copy.history
              .clientCount,
            {
              count:
                rows.length,
            }
          )}
        </span>
      </div>

      <div className="space-y-[13px]">
        {rows.map(
          (row) => (
            <ClientRow
              key={`${row.clientType}-${row.id}`}
              row={row}
              locale={
                locale
              }
              data={data}
              initialInvoiceDraft={
                initialInvoiceDraft
              }
            />
          )
        )}
      </div>
    </section>
  );
}

export default function BillingClientList({
  locale,
  data,
  initialInvoiceDraft = null,
}: BillingClientListProps) {
  const copy =
    getPlatformOperatorBillingHistory(
      locale
    );

  const oldCopy =
    getPlatformOperatorBilling(
      locale
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] =
    useState<ClientFilterStatus>(
      "all"
    );

  const filteredRows =
    useMemo(
      () => {
        const query =
          normalizeSearch(
            search
          );

        return data.rows.filter(
          (row) => {
            if (
              status !==
                "all" &&
              filterStatus(
                row
              ) !==
                status
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            const searchable =
              normalizeSearch(
                [
                  row.clientName,
                  row.accountEmail,
                  row.billingDetails
                    ?.legalName,
                  row.billingDetails
                    ?.billingEmail,
                  row.billingDetails
                    ?.taxId,
                ]
                  .filter(
                    Boolean
                  )
                  .join(" ")
              );

            return searchable.includes(
              query
            );
          }
        );
      },
      [
        data.rows,
        search,
        status,
      ]
    );

  const independentDoctors =
    filteredRows.filter(
      (row) =>
        row.clientType ===
        "independent_doctor"
    );

  const clinicOrganizations =
    filteredRows.filter(
      (row) =>
        row.clientType ===
        "clinic_organization"
    );

  const hasFilters =
    search.trim().length >
      0 ||
    status !== "all";

  return (
    <div className="mt-[34px]">
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col gap-[13px] lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-[13px] md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {
                  copy.history
                    .clientSearch
                }
              </span>

              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event: {
                    target: {
                      value: string;
                    };
                  }
                ) =>
                  setSearch(
                    event
                      .target
                      .value
                  )
                }
                placeholder={
                  copy.history
                    .clientSearchPlaceholder
                }
                className="romdoc-focus-ring mt-[5px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[11px] text-sm text-gray-900 placeholder:text-gray-400"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {
                  copy.history
                    .invoiceStatusFilter
                }
              </span>

              <select
                value={
                  status
                }
                onChange={(
                  event: {
                    target: {
                      value: string;
                    };
                  }
                ) =>
                  setStatus(
                    event
                      .target
                      .value as ClientFilterStatus
                  )
                }
                className="romdoc-focus-ring mt-[5px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[11px] text-sm text-gray-900"
              >
                <option value="all">
                  {
                    copy.history
                      .filterAll
                  }
                </option>

                <option value="unprocessed">
                  {
                    copy.history
                      .filterUnprocessed
                  }
                </option>

                <option value="invoiced">
                  {
                    copy.history
                      .invoicedBadge
                  }
                </option>

                <option value="paid">
                  {
                    copy.history
                      .paidBadge
                  }
                </option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-[8px]">
            <span className="rounded-full bg-gray-100 px-[13px] py-[8px] text-sm font-semibold text-gray-700">
              {interpolatePlatformBillingHistory(
                copy.history
                  .filteredClientCount,
                {
                  visible:
                    filteredRows.length,
                  total:
                    data.rows
                      .length,
                }
              )}
            </span>

            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus(
                    "all"
                  );
                }}
                className="romdoc-focus-ring rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 transition hover:border-[#036661] hover:text-[#036661]"
              >
                {
                  copy.history
                    .clearFilters
                }
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {filteredRows.length ===
      0 ? (
        <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
          {
            copy.history
              .noFilteredRows
          }
        </div>
      ) : (
        <div className="mt-[34px] space-y-[34px]">
          <ClientGroup
            title={
              oldCopy.amounts
                .independentDoctors
            }
            rows={
              independentDoctors
            }
            locale={
              locale
            }
            data={data}
            initialInvoiceDraft={
              initialInvoiceDraft
            }
          />

          <ClientGroup
            title={
              oldCopy.amounts
                .clinicOrganizations
            }
            rows={
              clinicOrganizations
            }
            locale={
              locale
            }
            data={data}
            initialInvoiceDraft={
              initialInvoiceDraft
            }
          />
        </div>
      )}
    </div>
  );
}
