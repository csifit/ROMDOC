import Link from "next/link";

import BillingClientList, {
  type InitialClientInvoiceDraft,
} from "@/components/billing/billing-client-list";
import ClientBillingTermsManager from "@/components/billing/client-billing-terms-manager";
import PlatformBillingSettingsForm from "@/components/billing/platform-billing-settings-form";
import ClinicManagerMonthSelector from "@/components/clinic-manager/clinic-manager-month-selector";
import type { PlatformBillingCurrency } from "@/lib/billing/platform-invoicing";
import {
  formatPlatformBillingCurrency,
  formatPlatformBillingMonth,
} from "@/lib/billing/platform-invoicing";
import type { PlatformInvoicingDataWithCurrency } from "@/lib/billing/platform-billing-currency";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";
import {
  getPlatformOperatorBillingHistory,
  interpolatePlatformBillingHistory,
} from "@/lib/i18n/platform-operator-billing-history";

export type { InitialClientInvoiceDraft };

type AmountsToInvoiceProps = {
  locale: AppLocale;
  data: PlatformInvoicingDataWithCurrency;
  role: "admin" | "manager";
  initialInvoiceDraft?: InitialClientInvoiceDraft | null;
};

type CurrencyTotals = {
  estimatedSubtotal: number;
  estimatedVat: number;
  displayedTotal: number;
  clientCount: number;
};

const GLOBAL_PRICING_DESCRIPTION: Record<AppLocale, string> = {
  ro:
    "Deschide pentru a vedea sau modifica prețul global al abonamentului/pachetului, moneda și TVA. SMS-urile sunt incluse și nu au tarif separat.",
  en:
    "Open to view or change the global subscription/package price, currency and VAT. SMS is included and has no separate unit price.",
  de:
    "Öffnen, um den globalen Abonnement-/Paketpreis, die Währung und den MwSt.-Satz anzuzeigen oder zu ändern. SMS sind enthalten und haben keinen separaten Einzelpreis.",
};

function currencyLabel(locale: AppLocale) {
  if (locale === "de") return "Währung";
  if (locale === "en") return "Currency";
  return "Monedă";
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
  const basePath =
    role === "admin" ? "/admin/invoices" : "/manager-dashboard/invoices";
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

  const currencyOrder: PlatformBillingCurrency[] = [
    data.defaultCurrency,
    data.defaultCurrency === "EUR" ? "RON" : "EUR",
  ];

  return (
    <div className="space-y-[34px]">
      {role === "admin" ? (
        <ClientBillingTermsManager
          locale={locale}
          clients={data.pricingClients}
          defaultCurrency={data.defaultCurrency}
        />
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
            <p className="mt-[8px] text-sm text-gray-500">
              {currencyLabel(locale)}: {data.defaultCurrency}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-[13px] py-[8px] text-sm font-semibold ${
              isCurrent
                ? "border border-gray-300 bg-white text-gray-700"
                : "border border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
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

          <div className="mt-[13px] max-w-sm">
            <ClinicManagerMonthSelector
              value={data.range.month}
              locale={locale}
              basePath={basePath}
              maxMonth={data.range.currentMonth}
            />
          </div>
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

        {role === "admin" ? (
          <details className="group mt-[21px] overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
            <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] p-[21px] marker:content-none">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9A4F35]">
                  {copy.history.administratorOnly}
                </p>
                <h3 className="mt-[5px] text-lg font-bold text-gray-900">
                  {copy.history.globalPricingTitle}
                </h3>
                <p className="mt-[5px] text-sm leading-6 text-gray-600">
                  {GLOBAL_PRICING_DESCRIPTION[locale]}
                </p>
              </div>

              <span
                aria-hidden="true"
                className="text-2xl font-light text-gray-500 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>

            <div className="border-t border-gray-200 bg-gray-50/60 p-[13px] sm:p-[21px]">
              <PlatformBillingSettingsForm
                locale={locale}
                rates={data.rates}
                currency={data.defaultCurrency}
                canEdit
              />
            </div>
          </details>
        ) : null}

        <div className="mt-[21px] grid gap-[13px] xl:grid-cols-2">
          {currencyOrder.map((currency) => {
            const value = totals.get(currency);
            if (!value) return null;

            return (
              <section
                key={currency}
                className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm"
              >
                <div className="flex items-center justify-between gap-[13px]">
                  <h3 className="text-xl font-bold text-gray-900">
                    {currency}
                  </h3>
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
                      {formatPlatformBillingCurrency(
                        value.estimatedSubtotal,
                        locale,
                        currency
                      )}
                    </dd>
                  </div>

                  <div className="rounded-[13px] bg-gray-50 p-[13px]">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.history.vat}
                    </dt>
                    <dd className="mt-[8px] text-lg font-bold text-gray-900">
                      {formatPlatformBillingCurrency(
                        value.estimatedVat,
                        locale,
                        currency
                      )}
                    </dd>
                  </div>

                  <div className="rounded-[13px] bg-[#036661]/5 p-[13px]">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.history.total}
                    </dt>
                    <dd className="mt-[8px] text-lg font-bold text-[#036661]">
                      {formatPlatformBillingCurrency(
                        value.displayedTotal,
                        locale,
                        currency
                      )}
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
          <BillingClientList
            locale={locale}
            data={data}
            initialInvoiceDraft={initialInvoiceDraft}
          />
        )}
      </section>
    </div>
  );
}
