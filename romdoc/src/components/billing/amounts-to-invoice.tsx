import Link from "next/link";

import ClientBillingInvoiceActions from "@/components/billing/client-billing-invoice-actions";
import ClientBillingTermsManager from "@/components/billing/client-billing-terms-manager";
import PlatformBillingSettingsForm from "@/components/billing/platform-billing-settings-form";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  formatPlatformBillingCurrency,
  formatPlatformBillingMonth,
  type PlatformBillingCurrency,
  type PlatformInvoiceAmountRow,
  type PlatformInvoicingData,
} from "@/lib/billing/platform-invoicing";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";
import {
  getPlatformOperatorBillingHistory,
  interpolatePlatformBillingHistory,
} from "@/lib/i18n/platform-operator-billing-history";

export type InitialClientInvoiceDraft = {
  clientType: "clinic_organization" | "independent_doctor";
  clientId: string;
  estimatedAmount?: number;
};

type AmountsToInvoiceProps = {
  locale: AppLocale;
  data: PlatformInvoicingData;
  role: "admin" | "manager";
  initialInvoiceDraft?: InitialClientInvoiceDraft | null;
};

type CurrencyTotals = {
  estimatedSubtotal: number;
  estimatedVat: number;
  displayedTotal: number;
  clientCount: number;
};

function statusClasses(status: "estimate" | "ready" | "invoiced" | "paid") {
  if (status === "paid") return "bg-green-100 text-green-800";
  if (status === "invoiced") return "bg-blue-100 text-blue-800";
  if (status === "ready") return "bg-amber-100 text-amber-900";
  return "bg-gray-100 text-gray-700";
}

function BillingDetails({
  row,
  locale,
}: {
  row: PlatformInvoiceAmountRow;
  locale: AppLocale;
}) {
  const copy = getPlatformOperatorBillingHistory(locale);
  const oldCopy = getPlatformOperatorBilling(locale);
  const details = row.billingDetails;

  return (
    <aside
      className={`rounded-[13px] border p-[13px] ${
        details
          ? "border-[#036661]/20 bg-[#036661]/5"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
        {copy.history.invoiceTo}
      </p>
      {details ? (
        <dl className="mt-[8px] grid gap-[5px] text-sm leading-6 text-gray-700">
          <div>
            <dt className="sr-only">{oldCopy.amounts.invoiceDetails.legalName}</dt>
            <dd className="font-semibold text-gray-950">
              {details.legalName || row.clientName}
            </dd>
          </div>
          {details.taxId ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">{oldCopy.amounts.invoiceDetails.taxId}:</dt>
              <dd>{details.taxId}</dd>
            </div>
          ) : null}
          {details.tradeRegisterNumber ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {oldCopy.amounts.invoiceDetails.tradeRegister}:
              </dt>
              <dd>{details.tradeRegisterNumber}</dd>
            </div>
          ) : null}
          {details.billingAddress ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">{oldCopy.amounts.invoiceDetails.address}:</dt>
              <dd>{details.billingAddress}</dd>
            </div>
          ) : null}
          {details.billingEmail ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {oldCopy.amounts.invoiceDetails.billingEmail}:
              </dt>
              <dd>{details.billingEmail}</dd>
            </div>
          ) : null}
          {details.vatNumber ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">{oldCopy.amounts.invoiceDetails.vatNumber}:</dt>
              <dd>{details.vatNumber}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-[8px] text-sm leading-6 text-amber-900">
          {copy.history.billingMissing}
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
  initialInvoiceDraft?: InitialClientInvoiceDraft | null;
}) {
  const copy = getPlatformOperatorBillingHistory(locale);
  const oldCopy = getPlatformOperatorBilling(locale);
  const isCurrent = data.range.month === data.range.currentMonth;
  const status = row.invoiceRecord
    ? row.invoiceRecord.status
    : isCurrent
      ? "estimate"
      : "ready";
  const statusLabel =
    status === "paid"
      ? copy.history.paidBadge
      : status === "invoiced"
        ? copy.history.invoicedBadge
        : status === "ready"
          ? copy.history.readyBadge
          : copy.history.currentBadge;
  const displayedCurrency = row.invoiceRecord?.currency ?? row.currency;
  const displayedTotal = row.invoiceRecord?.amount ?? row.total;

  return (
    <details className="group overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
      <summary className="romdoc-focus-ring flex cursor-pointer list-none flex-col gap-[13px] p-[21px] marker:content-none xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[8px]">
            <h4 className="truncate text-lg font-bold text-gray-900">
              {row.clientName}
            </h4>
            <span className="rounded-full bg-gray-100 px-[8px] py-[5px] text-xs font-semibold text-gray-700">
              {row.clientType === "independent_doctor"
                ? oldCopy.amounts.independentDoctor
                : oldCopy.amounts.clinicOrganization}
            </span>
            <span className={`rounded-full px-[8px] py-[5px] text-xs font-semibold ${statusClasses(status)}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-[5px] text-sm text-gray-500">
            {row.accountEmail || oldCopy.common.emailUnavailable}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-[8px] sm:grid-cols-3 xl:min-w-[760px] xl:grid-cols-7">
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">
              {row.clientType === "clinic_organization"
                ? copy.history.managedDoctors
                : oldCopy.amounts.subscriptions}
            </p>
            <p className="mt-[5px] text-lg font-bold text-gray-900">
              {row.subscriptionCount}
            </p>
          </div>
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.history.subscriptionPrice}</p>
            <p className="mt-[5px] text-sm font-bold text-gray-900">
              {formatPlatformBillingCurrency(
                row.subscriptionUnitPrice,
                locale,
                row.currency
              )}
            </p>
          </div>
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">{oldCopy.amounts.smsSent}</p>
            <p className="mt-[5px] text-lg font-bold text-gray-900">
              {row.totalSmsCount}
            </p>
          </div>
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.history.smsPrice}</p>
            <p className="mt-[5px] text-sm font-bold text-gray-900">
              {formatPlatformBillingCurrency(
                row.smsUnitPrice,
                locale,
                row.currency
              )}
            </p>
          </div>
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.history.subtotal}</p>
            <p className="mt-[5px] text-sm font-bold text-gray-900">
              {formatPlatformBillingCurrency(row.subtotal, locale, row.currency)}
            </p>
          </div>
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.history.vat}</p>
            <p className="mt-[5px] text-sm font-bold text-gray-900">
              {formatPlatformBillingCurrency(row.vatAmount, locale, row.currency)}
            </p>
          </div>
          <div className="col-span-2 rounded-[13px] bg-[#036661]/5 p-[8px] text-center sm:col-span-1">
            <p className="text-xs text-gray-500">{copy.history.total}</p>
            <p className="mt-[5px] text-sm font-bold text-[#036661]">
              {formatPlatformBillingCurrency(
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
                  {row.subscriptionCount} × {formatPlatformBillingCurrency(
                    row.subscriptionUnitPrice,
                    locale,
                    row.currency
                  )}
                </dt>
                <dd className="font-semibold text-gray-900">
                  {formatPlatformBillingCurrency(
                    row.subscriptionAmount,
                    locale,
                    row.currency
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-[13px]">
                <dt className="text-gray-600">
                  {row.totalSmsCount} × {formatPlatformBillingCurrency(
                    row.smsUnitPrice,
                    locale,
                    row.currency
                  )}
                </dt>
                <dd className="font-semibold text-gray-900">
                  {formatPlatformBillingCurrency(
                    row.smsAmount,
                    locale,
                    row.currency
                  )}
                </dd>
              </div>
              <div className="pl-[13px] text-xs leading-5 text-gray-500">
                {oldCopy.amounts.confirmationSms}: {row.confirmationSmsCount} · {oldCopy.amounts.reminderSms}: {row.reminder24hSmsCount} · {copy.history.otherSms}: {row.otherSmsCount}
              </div>
              <div className="mt-[5px] flex items-start justify-between gap-[13px] border-t border-gray-200 pt-[13px]">
                <dt className="font-medium text-gray-700">{copy.history.subtotal}</dt>
                <dd className="font-semibold text-gray-900">
                  {formatPlatformBillingCurrency(row.subtotal, locale, row.currency)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-[13px]">
                <dt className="text-gray-600">
                  {copy.history.vat} {new Intl.NumberFormat(
                    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
                    { style: "percent", maximumFractionDigits: 2 }
                  ).format(row.vatRate)}
                </dt>
                <dd className="font-semibold text-gray-900">
                  {formatPlatformBillingCurrency(row.vatAmount, locale, row.currency)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-[13px] border-t border-gray-200 pt-[13px] text-base">
                <dt className="font-bold text-gray-900">{copy.history.total}</dt>
                <dd className="font-bold text-[#036661]">
                  {formatPlatformBillingCurrency(row.total, locale, row.currency)}
                </dd>
              </div>
            </dl>

            <div className="mt-[13px] flex flex-wrap gap-[8px] text-xs">
              <span className={`rounded-full px-[8px] py-[5px] font-semibold ${
                row.billingTermsSource === "client"
                  ? "bg-[#036661]/10 text-[#036661]"
                  : "bg-gray-200 text-gray-700"
              }`}>
                {row.billingTermsSource === "client"
                  ? copy.history.clientTerms
                  : copy.history.globalTerms}
              </span>
              <span className="rounded-full bg-gray-200 px-[8px] py-[5px] font-semibold text-gray-700">
                {copy.vatTreatment[row.vatTreatment]}
              </span>
              {row.vatReason ? (
                <span className="rounded-full bg-gray-200 px-[8px] py-[5px] text-gray-700">
                  {row.vatReason}
                </span>
              ) : null}
            </div>

            <ClientBillingInvoiceActions
              locale={locale}
              row={row}
              range={data.range}
              openInitially={
                initialInvoiceDraft?.clientType === row.clientType &&
                initialInvoiceDraft.clientId === row.id
              }
              initialAmount={
                initialInvoiceDraft?.clientType === row.clientType &&
                initialInvoiceDraft.clientId === row.id
                  ? initialInvoiceDraft.estimatedAmount
                  : undefined
              }
            />
          </div>

          <BillingDetails row={row} locale={locale} />
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
  initialInvoiceDraft?: InitialClientInvoiceDraft | null;
}) {
  const copy = getPlatformOperatorBillingHistory(locale);
  if (rows.length === 0) return null;

  return (
    <section>
      <div className="mb-[13px] flex items-end justify-between gap-[13px]">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <span className="text-sm font-semibold text-gray-500">
          {interpolatePlatformBillingHistory(copy.history.clientCount, {
            count: rows.length,
          })}
        </span>
      </div>
      <div className="space-y-[13px]">
        {rows.map((row) => (
          <ClientRow
            key={`${row.clientType}-${row.id}`}
            row={row}
            locale={locale}
            data={data}
            initialInvoiceDraft={initialInvoiceDraft}
          />
        ))}
      </div>
    </section>
  );
}

export default function AmountsToInvoice({
  locale,
  data,
  role,
  initialInvoiceDraft = null,
}: AmountsToInvoiceProps) {
  const copy = getPlatformOperatorBillingHistory(locale);
  const oldCopy = getPlatformOperatorBilling(locale);
  const monthLabel = formatPlatformBillingMonth(data.range.month, locale);
  const isCurrent = data.range.month === data.range.currentMonth;
  const basePath = role === "admin" ? "/admin/invoices" : "/manager-dashboard/invoices";
  const totals = new Map<PlatformBillingCurrency, CurrencyTotals>();

  for (const row of data.rows) {
    const currency = row.invoiceRecord?.currency ?? row.currency;
    const current = totals.get(currency) ?? {
      estimatedSubtotal: 0,
      estimatedVat: 0,
      displayedTotal: 0,
      clientCount: 0,
    };
    current.estimatedSubtotal += row.subtotal;
    current.estimatedVat += row.vatAmount;
    current.displayedTotal += row.invoiceRecord?.amount ?? row.total;
    current.clientCount += 1;
    totals.set(currency, current);
  }

  return (
    <div className="space-y-[34px]">
      {role === "admin" ? (
        <ClientBillingTermsManager locale={locale} clients={data.pricingClients} />
      ) : null}

      <section className="rounded-[34px] border border-[#036661]/20 bg-[#F8FBFA] p-[21px] shadow-sm sm:p-[34px]">
        <header className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-[#036661]">
              {copy.history.eyebrow}
            </p>
            <h2 className="mt-[8px] text-2xl font-bold text-gray-900 sm:text-3xl">
              {copy.history.title}
            </h2>
            <p className="mt-[13px] max-w-4xl text-sm leading-6 text-gray-600">
              {interpolatePlatformBillingHistory(
                isCurrent
                  ? copy.history.currentDescription
                  : copy.history.pastDescription,
                { month: monthLabel }
              )}
            </p>
          </div>
          <span className={`w-fit rounded-full px-[13px] py-[8px] text-sm font-semibold ${
            isCurrent
              ? "border border-gray-300 bg-white text-gray-700"
              : "border border-amber-200 bg-amber-50 text-amber-900"
          }`}>
            {isCurrent ? copy.history.currentBadge : copy.history.readyBadge}
          </span>
        </header>

        <nav className="mt-[21px]" aria-label={copy.history.months}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {copy.history.months}
          </p>
          <div className="mt-[8px] flex flex-wrap gap-[8px]">
            {data.historyMonths.map((month) => (
              <Link
                key={month}
                href={`${basePath}?month=${month}`}
                className={`romdoc-focus-ring rounded-full px-[13px] py-[8px] text-sm font-semibold capitalize transition ${
                  month === data.range.month
                    ? "bg-[#036661] text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:border-[#036661]"
                }`}
              >
                {formatPlatformBillingMonth(month, locale)}
              </Link>
            ))}
          </div>
          <form action={basePath} method="get" className="mt-[13px] flex flex-wrap items-end gap-[8px]">
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {copy.history.chooseMonth}
              </span>
              <input
                type="month"
                name="month"
                defaultValue={data.range.month}
                className="romdoc-focus-ring mt-[5px] rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm"
              />
            </label>
            <button
              type="submit"
              className="romdoc-focus-ring rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-800"
            >
              {copy.history.openMonth}
            </button>
          </form>
        </nav>

        {data.range.month === data.previousCalendarMonth ? (
          <div className="mt-[21px]">
            <a
              href={`/api/admin/billing-export?month=${data.range.month}&locale=${locale}`}
              className="romdoc-focus-ring inline-flex items-center justify-center rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49]"
            >
              {copy.history.exportPrevious}
            </a>
          </div>
        ) : (
          <p className="mt-[13px] text-xs text-gray-500">
            {copy.history.exportOnlyPrevious}
          </p>
        )}

        {data.hasPartialError ? (
          <div className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-amber-950">
            <p className="font-semibold">{oldCopy.amounts.partialTitle}</p>
            <p className="mt-[5px] text-sm leading-6">
              {oldCopy.amounts.partialDescription}
            </p>
          </div>
        ) : null}

        <div className="mt-[21px]">
          <PlatformBillingSettingsForm
            locale={locale}
            rates={data.rates}
            canEdit={role === "admin"}
          />
        </div>

        <div className="mt-[21px] grid gap-[13px] xl:grid-cols-2">
          {(["RON", "EUR"] as PlatformBillingCurrency[]).map((currency) => {
            const value = totals.get(currency);
            if (!value) return null;
            return (
              <section key={currency} className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
                <div className="flex items-center justify-between gap-[13px]">
                  <h3 className="text-xl font-bold text-gray-900">{currency}</h3>
                  <span className="text-sm font-semibold text-gray-500">
                    {value.clientCount}
                  </span>
                </div>
                <dl className="mt-[13px] grid gap-[8px] sm:grid-cols-3">
                  <div className="rounded-[13px] bg-gray-50 p-[13px]">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.history.subtotal}
                    </dt>
                    <dd className="mt-[8px] text-lg font-bold text-gray-900">
                      {formatPlatformBillingCurrency(value.estimatedSubtotal, locale, currency)}
                    </dd>
                  </div>
                  <div className="rounded-[13px] bg-gray-50 p-[13px]">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.history.vat}
                    </dt>
                    <dd className="mt-[8px] text-lg font-bold text-gray-900">
                      {formatPlatformBillingCurrency(value.estimatedVat, locale, currency)}
                    </dd>
                  </div>
                  <div className="rounded-[13px] bg-[#036661]/5 p-[13px]">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.history.total}
                    </dt>
                    <dd className="mt-[8px] text-lg font-bold text-[#036661]">
                      {formatPlatformBillingCurrency(value.displayedTotal, locale, currency)}
                    </dd>
                  </div>
                </dl>
              </section>
            );
          })}
        </div>

        <div className="mt-[13px] space-y-[5px] text-xs leading-5 text-gray-500">
          <p>{copy.history.liveCalculation}</p>
          <p>{copy.history.noMixedTotal}</p>
        </div>

        {data.rows.length === 0 ? (
          <div className="mt-[34px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
            {copy.history.noRows}
          </div>
        ) : (
          <div className="mt-[34px] space-y-[34px]">
            <ClientGroup
              title={oldCopy.amounts.independentDoctors}
              rows={data.independentDoctors}
              locale={locale}
              data={data}
              initialInvoiceDraft={initialInvoiceDraft}
            />
            <ClientGroup
              title={oldCopy.amounts.clinicOrganizations}
              rows={data.clinicOrganizations}
              locale={locale}
              data={data}
              initialInvoiceDraft={initialInvoiceDraft}
            />
          </div>
        )}
      </section>
    </div>
  );
}
