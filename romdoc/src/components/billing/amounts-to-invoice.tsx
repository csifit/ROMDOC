import CreateClinicInvoiceFromEstimateLink from "@/components/invoices/create-clinic-invoice-from-estimate-link";
import PlatformBillingSettingsForm from "@/components/billing/platform-billing-settings-form";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  formatPlatformBillingCurrency,
  formatPlatformBillingMonth,
  type PlatformInvoiceAmountRow,
  type PlatformInvoicingData,
} from "@/lib/billing/platform-invoicing";
import {
  getPlatformOperatorBilling,
  interpolatePlatformBillingCopy,
  PLATFORM_OPERATOR_BILLING_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-billing";

type AmountsToInvoiceProps = {
  locale: AppLocale;
  data: PlatformInvoicingData;
  role: "admin" | "manager";
};

function SummaryValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[13px] border border-gray-200 bg-gray-50 p-[13px]">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-[8px] text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function BillingDetails({
  row,
  locale,
}: {
  row: PlatformInvoiceAmountRow;
  locale: AppLocale;
}) {
  const copy = getPlatformOperatorBilling(locale);
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
        {copy.common.invoiceTo}
      </p>

      {details ? (
        <dl className="mt-[8px] grid gap-[5px] text-sm leading-6 text-gray-700">
          <div>
            <dt className="sr-only">{copy.amounts.invoiceDetails.legalName}</dt>
            <dd className="font-semibold text-gray-950">
              {details.legalName || row.clientName}
            </dd>
          </div>
          {details.taxId ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">{copy.amounts.invoiceDetails.taxId}:</dt>
              <dd>{details.taxId}</dd>
            </div>
          ) : null}
          {details.tradeRegisterNumber ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {copy.amounts.invoiceDetails.tradeRegister}:
              </dt>
              <dd>{details.tradeRegisterNumber}</dd>
            </div>
          ) : null}
          {details.billingAddress ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">{copy.amounts.invoiceDetails.address}:</dt>
              <dd>{details.billingAddress}</dd>
            </div>
          ) : null}
          {details.billingEmail ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {copy.amounts.invoiceDetails.billingEmail}:
              </dt>
              <dd>{details.billingEmail}</dd>
            </div>
          ) : null}
          {details.vatNumber ? (
            <div className="flex flex-wrap gap-[5px]">
              <dt className="font-medium">
                {copy.amounts.invoiceDetails.vatNumber}:
              </dt>
              <dd>{details.vatNumber}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-[8px] text-sm leading-6 text-amber-900">
          {copy.common.billingUnavailable}
        </p>
      )}
    </aside>
  );
}

function ClientRow({
  row,
  locale,
  data,
  role,
}: {
  row: PlatformInvoiceAmountRow;
  locale: AppLocale;
  data: PlatformInvoicingData;
  role: "admin" | "manager";
}) {
  const copy = getPlatformOperatorBilling(locale);
  const typeLabel =
    row.clientType === "independent_doctor"
      ? copy.amounts.independentDoctor
      : copy.amounts.clinicOrganization;
  const subscriptionLabel =
    row.subscriptionCount === 1
      ? copy.amounts.subscriptionSingle
      : interpolatePlatformBillingCopy(copy.amounts.subscriptionMultiple, {
          count: row.subscriptionCount,
        });

  return (
    <details className="group overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
      <summary className="romdoc-focus-ring flex cursor-pointer list-none flex-col gap-[13px] p-[21px] marker:content-none lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[8px]">
            <h4 className="truncate text-lg font-bold text-gray-900">
              {row.clientName}
            </h4>
            <span className="rounded-full bg-gray-100 px-[8px] py-[5px] text-xs font-semibold text-gray-700">
              {typeLabel}
            </span>
          </div>
          <p className="mt-[5px] text-sm text-gray-500">
            {row.accountEmail || copy.common.emailUnavailable}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-[8px] sm:min-w-[420px]">
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.amounts.subscriptions}</p>
            <p className="mt-[5px] text-lg font-bold text-gray-900">
              {row.subscriptionCount}
            </p>
          </div>
          <div className="rounded-[13px] bg-gray-50 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.amounts.smsSent}</p>
            <p className="mt-[5px] text-lg font-bold text-gray-900">
              {row.totalSmsCount}
            </p>
          </div>
          <div className="rounded-[13px] bg-[#036661]/5 p-[8px] text-center">
            <p className="text-xs text-gray-500">{copy.common.total}</p>
            <p className="mt-[5px] text-lg font-bold text-[#036661]">
              {formatPlatformBillingCurrency(row.totalRon, locale)}
            </p>
          </div>
        </div>
      </summary>

      <div className="border-t border-gray-200 bg-gray-50/60 p-[21px]">
        <div className="grid gap-[21px] xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div>
            <dl className="grid gap-[8px] text-sm">
              <div className="flex items-start justify-between gap-[13px]">
                <dt className="text-gray-600">{subscriptionLabel}</dt>
                <dd className="font-semibold text-gray-900">
                  {formatPlatformBillingCurrency(
                    row.subscriptionAmountRon,
                    locale
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-[13px]">
                <dt className="text-gray-600">
                  {copy.amounts.smsSent} × {new Intl.NumberFormat(
                    PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale],
                    { minimumFractionDigits: 2, maximumFractionDigits: 4 }
                  ).format(data.rates.smsPriceRon)} RON
                </dt>
                <dd className="font-semibold text-gray-900">
                  {formatPlatformBillingCurrency(row.smsAmountRon, locale)}
                </dd>
              </div>
              <div className="pl-[13px] text-xs leading-5 text-gray-500">
                {copy.amounts.confirmationSms}: {row.confirmationSmsCount} · {copy.amounts.reminderSms}: {row.reminder24hSmsCount}
              </div>
              <div className="mt-[5px] flex items-start justify-between gap-[13px] border-t border-gray-200 pt-[13px]">
                <dt className="font-medium text-gray-700">{copy.common.subtotal}</dt>
                <dd className="font-semibold text-gray-900">
                  {formatPlatformBillingCurrency(row.subtotalRon, locale)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-[13px]">
                <dt className="text-gray-600">
                  {copy.common.vat} {new Intl.NumberFormat(
                    PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale],
                    { style: "percent", maximumFractionDigits: 2 }
                  ).format(data.rates.vatRate)}
                </dt>
                <dd className="font-semibold text-gray-900">
                  {formatPlatformBillingCurrency(row.vatRon, locale)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-[13px] border-t border-gray-200 pt-[13px] text-base">
                <dt className="font-bold text-gray-900">{copy.common.total}</dt>
                <dd className="font-bold text-[#036661]">
                  {formatPlatformBillingCurrency(row.totalRon, locale)}
                </dd>
              </div>
            </dl>

            {row.clientType === "clinic_organization" ? (
              <div className="mt-[21px]">
                <CreateClinicInvoiceFromEstimateLink
                  href={
                    role === "admin"
                      ? "/admin/invoices"
                      : "/manager-dashboard/invoices"
                  }
                  organizationId={row.id}
                  billingPeriodStart={data.range.startDate}
                  billingPeriodEnd={data.range.endDate}
                  estimatedAmountRon={row.totalRon}
                  label={copy.invoiceWorkspace.add}
                  className="romdoc-focus-ring inline-flex items-center justify-center rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49]"
                />
              </div>
            ) : null}
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
  role,
}: {
  title: string;
  rows: PlatformInvoiceAmountRow[];
  locale: AppLocale;
  data: PlatformInvoicingData;
  role: "admin" | "manager";
}) {
  if (rows.length === 0) return null;

  return (
    <section>
      <div className="mb-[13px] flex items-end justify-between gap-[13px]">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <span className="text-sm font-semibold text-gray-500">{rows.length}</span>
      </div>
      <div className="space-y-[13px]">
        {rows.map((row) => (
          <ClientRow
            key={`${row.clientType}-${row.id}`}
            row={row}
            locale={locale}
            data={data}
            role={role}
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
}: AmountsToInvoiceProps) {
  const copy = getPlatformOperatorBilling(locale);
  const monthLabel = formatPlatformBillingMonth(data.range.month, locale);
  const totals = data.rows.reduce(
    (result, row) => ({
      subtotal: result.subtotal + row.subtotalRon,
      vat: result.vat + row.vatRon,
      total: result.total + row.totalRon,
    }),
    { subtotal: 0, vat: 0, total: 0 }
  );

  return (
    <section className="rounded-[34px] border border-[#036661]/20 bg-[#F8FBFA] p-[21px] shadow-sm sm:p-[34px]">
      <header className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {copy.amounts.eyebrow}
          </p>
          <h2 className="mt-[8px] text-2xl font-bold text-gray-900 sm:text-3xl">
            {copy.amounts.title}
          </h2>
          <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
            {interpolatePlatformBillingCopy(copy.amounts.description, {
              month: monthLabel,
            })}
          </p>
        </div>
        <div className="rounded-full border border-[#036661]/20 bg-white px-[13px] py-[8px] text-sm font-semibold capitalize text-[#036661]">
          {monthLabel}
        </div>
      </header>

      {data.hasPartialError ? (
        <div className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-amber-950">
          <p className="font-semibold">{copy.amounts.partialTitle}</p>
          <p className="mt-[5px] text-sm leading-6">
            {copy.amounts.partialDescription}
          </p>
        </div>
      ) : null}

      <div className="mt-[21px]">
        <PlatformBillingSettingsForm
          locale={locale}
          rates={data.rates}
          canEdit
        />
      </div>

      <div className="mt-[21px] grid gap-[13px] md:grid-cols-3">
        <SummaryValue
          label={copy.amounts.grandSubtotal}
          value={formatPlatformBillingCurrency(totals.subtotal, locale)}
        />
        <SummaryValue
          label={copy.amounts.grandVat}
          value={formatPlatformBillingCurrency(totals.vat, locale)}
        />
        <SummaryValue
          label={copy.amounts.grandTotal}
          value={formatPlatformBillingCurrency(totals.total, locale)}
        />
      </div>

      <p className="mt-[13px] text-xs leading-5 text-gray-500">
        {copy.common.notInvoice}
      </p>

      {data.rows.length === 0 ? (
        <div className="mt-[34px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
          {copy.amounts.noRows}
        </div>
      ) : (
        <div className="mt-[34px] space-y-[34px]">
          <ClientGroup
            title={copy.amounts.independentDoctors}
            rows={data.independentDoctors}
            locale={locale}
            data={data}
            role={role}
          />
          <ClientGroup
            title={copy.amounts.clinicOrganizations}
            rows={data.clinicOrganizations}
            locale={locale}
            data={data}
            role={role}
          />
        </div>
      )}
    </section>
  );
}
