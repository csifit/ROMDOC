import CreateClinicInvoiceFromEstimateLink from "@/components/invoices/create-clinic-invoice-from-estimate-link";
import ClinicManagerMonthSelector from "@/components/clinic-manager/clinic-manager-month-selector";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { PlatformInvoicingDataWithCurrency } from "@/lib/billing/platform-billing-currency";
import {
  formatPlatformBillingCurrency,
  formatPlatformBillingMonth,
  type PlatformBillingCurrency,
  type PlatformInvoiceAmountRow,
} from "@/lib/billing/platform-invoicing";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";

type PlatformSmsReportProps = {
  locale: AppLocale;
  data: PlatformInvoicingDataWithCurrency;
  clientType: "independent_doctor" | "clinic_organization";
  basePath:
    | "/manager-dashboard/doctor-sms"
    | "/manager-dashboard/clinic-sms";
};

type CurrencyTotals = Record<PlatformBillingCurrency, number>;

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-[13px] text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function currencyLabel(locale: AppLocale) {
  if (locale === "de") return "Währung";
  if (locale === "en") return "Currency";
  return "Monedă";
}

function formatCurrencyTotals(
  totals: CurrencyTotals,
  locale: AppLocale,
  defaultCurrency: PlatformBillingCurrency
) {
  const order: PlatformBillingCurrency[] = [
    defaultCurrency,
    defaultCurrency === "EUR" ? "RON" : "EUR",
  ];
  const values = order
    .filter((currency) => totals[currency] !== 0)
    .map((currency) =>
      formatPlatformBillingCurrency(totals[currency], locale, currency)
    );

  return values.length > 0
    ? values.join(" · ")
    : formatPlatformBillingCurrency(0, locale, defaultCurrency);
}

function ClientDetails({
  row,
  locale,
  data,
  clientType,
}: {
  row: PlatformInvoiceAmountRow;
  locale: AppLocale;
  data: PlatformInvoicingDataWithCurrency;
  clientType: "independent_doctor" | "clinic_organization";
}) {
  const copy = getPlatformOperatorBilling(locale);
  const billing = row.billingDetails;

  return (
    <details className="group overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
      <summary className="romdoc-focus-ring flex cursor-pointer list-none flex-col gap-[13px] p-[21px] marker:content-none md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{row.clientName}</h3>
          <p className="mt-[5px] text-sm text-gray-500">
            {row.accountEmail || copy.common.emailUnavailable}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-[8px] md:min-w-[360px]">
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.smsReport.subscription}</p>
            <p className="mt-[5px] font-bold text-gray-900">
              {row.subscriptionCount}
            </p>
          </div>
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.smsReport.sms}</p>
            <p className="mt-[5px] font-bold text-gray-900">
              {row.totalSmsCount}
            </p>
          </div>
          <div className="rounded-[13px] bg-[#036661]/5 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.smsReport.total}</p>
            <p className="mt-[5px] font-bold text-[#036661]">
              {formatPlatformBillingCurrency(row.total, locale, row.currency)}
            </p>
          </div>
        </div>
      </summary>

      <div className="border-t border-gray-200 bg-gray-50/60 p-[21px]">
        <div className="grid gap-[21px] xl:grid-cols-2">
          <dl className="space-y-[8px] text-sm">
            {[
              [copy.smsReport.subscription, String(row.subscriptionCount)],
              [copy.smsReport.sms, String(row.totalSmsCount)],
              [copy.smsReport.confirmations, String(row.confirmationSmsCount)],
              [copy.smsReport.reminders, String(row.reminder24hSmsCount)],
              [
                copy.smsReport.subtotal,
                formatPlatformBillingCurrency(
                  row.subtotal,
                  locale,
                  row.currency
                ),
              ],
              [
                copy.smsReport.vat,
                formatPlatformBillingCurrency(
                  row.vatAmount,
                  locale,
                  row.currency
                ),
              ],
              [
                copy.smsReport.total,
                formatPlatformBillingCurrency(row.total, locale, row.currency),
              ],
            ].map(([label, value], index) => (
              <div
                key={String(label)}
                className={`flex items-start justify-between gap-[13px] ${
                  index === 6
                    ? "border-t border-gray-200 pt-[13px] font-bold"
                    : ""
                }`}
              >
                <dt className="text-gray-600">{label}</dt>
                <dd className="text-right font-semibold text-gray-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <aside
            className={`rounded-[13px] border p-[13px] ${
              billing
                ? "border-[#036661]/20 bg-[#036661]/5"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              {copy.smsReport.invoiceTo}
            </p>
            {billing ? (
              <dl className="mt-[8px] space-y-[5px] text-sm leading-6 text-gray-700">
                <div>
                  <dt className="sr-only">
                    {copy.amounts.invoiceDetails.legalName}
                  </dt>
                  <dd className="font-semibold text-gray-950">
                    {billing.legalName || row.clientName}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-[5px]">
                  <dt className="font-medium">{copy.smsReport.taxId}:</dt>
                  <dd>{billing.taxId || copy.common.none}</dd>
                </div>
                <div className="flex flex-wrap gap-[5px]">
                  <dt className="font-medium">{copy.smsReport.billingEmail}:</dt>
                  <dd>{billing.billingEmail || copy.common.none}</dd>
                </div>
                <div className="flex flex-wrap gap-[5px]">
                  <dt className="font-medium">{copy.smsReport.address}:</dt>
                  <dd>{billing.billingAddress || copy.common.none}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-[8px] text-sm leading-6 text-amber-900">
                {copy.smsReport.missingBilling}
              </p>
            )}
          </aside>
        </div>

        {clientType === "clinic_organization" ? (
          <div className="mt-[21px]">
            <CreateClinicInvoiceFromEstimateLink
              href="/manager-dashboard/invoices"
              organizationId={row.id}
              billingPeriodStart={data.range.startDate}
              billingPeriodEnd={data.range.endDate}
              estimatedAmountRon={row.total}
              label={copy.invoiceWorkspace.add}
              className="romdoc-focus-ring inline-flex rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49]"
            />
          </div>
        ) : null}
      </div>
    </details>
  );
}

export default function PlatformSmsReport({
  locale,
  data,
  clientType,
  basePath,
}: PlatformSmsReportProps) {
  const copy = getPlatformOperatorBilling(locale);
  const rows =
    clientType === "independent_doctor"
      ? data.independentDoctors
      : data.clinicOrganizations;
  const totals = rows.reduce(
    (result, row) => ({
      subscriptions: result.subscriptions + row.subscriptionCount,
      sms: result.sms + row.totalSmsCount,
      amounts: {
        ...result.amounts,
        [row.currency]: result.amounts[row.currency] + row.total,
      },
    }),
    {
      subscriptions: 0,
      sms: 0,
      amounts: { RON: 0, EUR: 0 } as CurrencyTotals,
    }
  );

  const monthLabel = formatPlatformBillingMonth(data.range.month, locale);
  const title =
    clientType === "independent_doctor"
      ? copy.smsReport.titleIndependent
      : copy.smsReport.titleOrganizations;

  return (
    <div className="space-y-[34px]">
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.common.period}
            </p>
            <p className="mt-[8px] text-xl font-bold capitalize text-gray-900">
              {monthLabel}
            </p>
            <p className="mt-[5px] text-sm text-gray-500">
              {currencyLabel(locale)}: {data.defaultCurrency}
            </p>
          </div>
          <div className="w-full max-w-sm">
            <ClinicManagerMonthSelector
              value={data.range.month}
              locale={locale}
              basePath={basePath}
              maxMonth={data.range.currentMonth}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-[13px] md:grid-cols-2 xl:grid-cols-4">
        <Metric label={copy.smsReport.summaryClients} value={rows.length} />
        <Metric
          label={copy.smsReport.summarySubscriptions}
          value={totals.subscriptions}
        />
        <Metric label={copy.smsReport.summarySent} value={totals.sms} />
        <Metric
          label={copy.smsReport.summaryCost}
          value={formatCurrencyTotals(
            totals.amounts,
            locale,
            data.defaultCurrency
          )}
        />
      </div>

      {data.hasPartialError ? (
        <section className="rounded-[21px] border border-amber-200 bg-amber-50 p-[21px] text-amber-950">
          <h2 className="font-bold">{copy.amounts.partialTitle}</h2>
          <p className="mt-[8px] text-sm leading-6">
            {copy.amounts.partialDescription}
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-[8px] text-sm leading-6 text-gray-600">
          {copy.smsReport.helper}
        </p>

        {rows.length === 0 ? (
          <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
            {copy.smsReport.noClients}
          </div>
        ) : (
          <div className="mt-[21px] space-y-[13px]">
            {rows.map((row) => (
              <ClientDetails
                key={`${row.clientType}-${row.id}`}
                row={row}
                locale={locale}
                data={data}
                clientType={clientType}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[21px] border border-blue-200 bg-blue-50 p-[21px] text-blue-950">
        <h2 className="font-bold">{copy.smsReport.privacyTitle}</h2>
        <p className="mt-[8px] text-sm leading-6">
          {copy.smsReport.privacyDescription}
        </p>
      </section>
    </div>
  );
}
