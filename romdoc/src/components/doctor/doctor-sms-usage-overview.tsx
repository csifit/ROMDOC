import type { AppLocale } from "@/lib/i18n/app-locale";

type SmsUsageOverviewCopy = {
  currentMonth: string;
  previousMonth: string;
  provisional: string;
  closed: string;
  currency: string;
  sent: string;
  invoiced: string;
  uninvoiced: string;
  estimatedNet: string;
  uninvoicedNet: string;
  net: string;
  vat: string;
  gross: string;
  paymentStatus: string;
  invoiceStatus: string;
  noActivity: string;
  payment: Record<string, string>;
  invoice: Record<string, string>;
};

const COPY: Record<AppLocale, SmsUsageOverviewCopy> = {
  ro: {
    currentMonth: "Luna curentă",
    previousMonth: "Luna precedentă",
    provisional: "Date provizorii",
    closed: "Lună închisă",
    currency: "Monedă",
    sent: "SMS trimise",
    invoiced: "Facturate",
    uninvoiced: "Nefacturate",
    estimatedNet: "Cost net estimat",
    uninvoicedNet: "Net nefacturat",
    net: "Net",
    vat: "TVA",
    gross: "Total cu TVA",
    paymentStatus: "Plată",
    invoiceStatus: "Factură",
    noActivity: "Fără activitate SMS în această lună.",
    payment: {
      unpaid: "Neplătit",
      checkout_open: "Plată în curs",
      paid: "Plătit",
      failed: "Plată eșuată",
      cancelled: "Anulat",
      refunded: "Rambursat",
      not_applicable: "Nu se aplică",
    },
    invoice: {
      not_issued: "Neemisă",
      issued: "Emisă",
      cancelled: "Anulată",
      not_applicable: "Nu se aplică",
    },
  },
  en: {
    currentMonth: "Current month",
    previousMonth: "Previous month",
    provisional: "Provisional data",
    closed: "Closed month",
    currency: "Currency",
    sent: "SMS sent",
    invoiced: "Invoiced",
    uninvoiced: "Uninvoiced",
    estimatedNet: "Estimated net cost",
    uninvoicedNet: "Uninvoiced net",
    net: "Net",
    vat: "VAT",
    gross: "Total including VAT",
    paymentStatus: "Payment",
    invoiceStatus: "Invoice",
    noActivity: "No SMS activity in this month.",
    payment: {
      unpaid: "Unpaid",
      checkout_open: "Payment in progress",
      paid: "Paid",
      failed: "Payment failed",
      cancelled: "Cancelled",
      refunded: "Refunded",
      not_applicable: "Not applicable",
    },
    invoice: {
      not_issued: "Not issued",
      issued: "Issued",
      cancelled: "Cancelled",
      not_applicable: "Not applicable",
    },
  },
  de: {
    currentMonth: "Aktueller Monat",
    previousMonth: "Vorheriger Monat",
    provisional: "Vorläufige Daten",
    closed: "Abgeschlossener Monat",
    currency: "Währung",
    sent: "Gesendete SMS",
    invoiced: "Abgerechnet",
    uninvoiced: "Nicht abgerechnet",
    estimatedNet: "Geschätzte Nettokosten",
    uninvoicedNet: "Nicht abgerechnet netto",
    net: "Netto",
    vat: "MwSt.",
    gross: "Gesamt inkl. MwSt.",
    paymentStatus: "Zahlung",
    invoiceStatus: "Rechnung",
    noActivity: "Keine SMS-Aktivität in diesem Monat.",
    payment: {
      unpaid: "Unbezahlt",
      checkout_open: "Zahlung läuft",
      paid: "Bezahlt",
      failed: "Zahlung fehlgeschlagen",
      cancelled: "Storniert",
      refunded: "Erstattet",
      not_applicable: "Nicht zutreffend",
    },
    invoice: {
      not_issued: "Nicht ausgestellt",
      issued: "Ausgestellt",
      cancelled: "Storniert",
      not_applicable: "Nicht zutreffend",
    },
  },
};

type CurrentMonthOverview = {
  label: string;
  currency: string;
  sent: number;
  invoiced: number;
  uninvoiced: number;
  estimatedNetFormatted: string;
  uninvoicedNetFormatted: string;
};

type PreviousMonthOverview = {
  label: string;
  currency: string;
  hasActivity: boolean;
  smsCount: number;
  netFormatted: string;
  vatFormatted: string;
  grossFormatted: string;
  paymentStatus: string;
  invoiceStatus: string;
};

type DoctorSmsUsageOverviewProps = {
  locale: AppLocale;
  eyebrow: string;
  title: string;
  description: string;
  current: CurrentMonthOverview;
  previous: PreviousMonthOverview;
};

function statusClasses(kind: "provisional" | "closed") {
  return kind === "provisional"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function DoctorSmsUsageOverview({
  locale,
  eyebrow,
  title,
  description,
  current,
  previous,
}: DoctorSmsUsageOverviewProps) {
  const copy = COPY[locale];
  const paymentLabel =
    copy.payment[previous.paymentStatus] ?? previous.paymentStatus;
  const invoiceLabel =
    copy.invoice[previous.invoiceStatus] ?? previous.invoiceStatus;

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          {description}
        </p>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {copy.currentMonth}
              </p>
              <h3 className="mt-1 text-lg font-bold capitalize text-gray-900">
                {current.label}
              </h3>
            </div>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                "provisional"
              )}`}
            >
              {copy.provisional}
            </span>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            {copy.currency}: {current.currency}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniStat label={copy.sent} value={current.sent} />
            <MiniStat label={copy.invoiced} value={current.invoiced} />
            <MiniStat label={copy.uninvoiced} value={current.uninvoiced} />
            <MiniStat
              label={copy.estimatedNet}
              value={current.estimatedNetFormatted}
            />
          </div>

          <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <span className="font-semibold">{copy.uninvoicedNet}:</span>{" "}
            {current.uninvoicedNetFormatted}
          </p>
        </article>

        <article className="rounded-2xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {copy.previousMonth}
              </p>
              <h3 className="mt-1 text-lg font-bold capitalize text-gray-900">
                {previous.label}
              </h3>
            </div>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                "closed"
              )}`}
            >
              {copy.closed}
            </span>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            {copy.currency}: {previous.currency}
          </p>

          {previous.hasActivity ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MiniStat label={copy.sent} value={previous.smsCount} />
                <MiniStat label={copy.net} value={previous.netFormatted} />
                <MiniStat label={copy.vat} value={previous.vatFormatted} />
                <MiniStat label={copy.gross} value={previous.grossFormatted} />
              </div>

              <dl className="mt-4 grid gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {copy.paymentStatus}
                  </dt>
                  <dd className="mt-1 font-semibold text-gray-900">
                    {paymentLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {copy.invoiceStatus}
                  </dt>
                  <dd className="mt-1 font-semibold text-gray-900">
                    {invoiceLabel}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
              {copy.noActivity}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
