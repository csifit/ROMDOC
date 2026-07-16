"use client";

import {
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  type ClinicInvoiceOrganization,
  type ClinicInvoiceRow,
  type ClinicInvoiceStatus,
} from "@/lib/invoices/clinic-invoices";

type Props = {
  invoices: ClinicInvoiceRow[];
  organizations: ClinicInvoiceOrganization[];
};

type ApiResponse = {
  error?: string;
};

function currency(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 2,
  }).format(value);
}

function dateLabel(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function periodLabel(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  if (
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth()
  ) {
    return new Intl.DateTimeFormat("ro-RO", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(startDate);
  }

  return `${dateLabel(start)} – ${dateLabel(end)}`;
}

function statusLabel(status: ClinicInvoiceStatus) {
  if (status === "paid") return "Plătită";
  if (status === "draft") return "Draft";
  return "Facturată";
}

function statusClasses(status: ClinicInvoiceStatus) {
  if (status === "paid") return "bg-green-100 text-green-800";
  if (status === "draft") return "bg-gray-100 text-gray-700";
  return "bg-blue-100 text-blue-800";
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function previousMonthStart() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  ).toISOString().slice(0, 10);
}

function previousMonthEnd() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)
  ).toISOString().slice(0, 10);
}

export default function ClinicInvoicesWorkspace({
  invoices,
  organizations,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [organizationId, setOrganizationId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState(isoToday());
  const [billingPeriodStart, setBillingPeriodStart] = useState(previousMonthStart());
  const [billingPeriodEnd, setBillingPeriodEnd] = useState(previousMonthEnd());
  const [estimatedAmountRon, setEstimatedAmountRon] = useState("");
  const [amountRon, setAmountRon] = useState("");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(isoToday());
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("ro-RO");

    return invoices.filter((invoice) => {
      if (organizationFilter && invoice.organizationId !== organizationFilter) {
        return false;
      }

      if (statusFilter && invoice.status !== statusFilter) {
        return false;
      }

      if (dateFrom && invoice.issuedOn < dateFrom) {
        return false;
      }

      if (dateTo && invoice.issuedOn > dateTo) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [
        invoice.invoiceNumber,
        invoice.organizationName,
        invoice.companyName,
        invoice.taxId,
        invoice.billingEmail,
        invoice.paymentReference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ro-RO")
        .includes(needle);
    });
  }, [invoices, organizationFilter, statusFilter, dateFrom, dateTo, search]);

  const totals = useMemo(
    () =>
      invoices.reduce(
        (result, invoice) => {
          result.total += invoice.amountRon;

          if (invoice.status === "paid") {
            result.paid += invoice.amountRon;
          }

          if (invoice.status === "invoiced") {
            result.outstanding += invoice.amountRon;
          }

          return result;
        },
        { total: 0, paid: 0, outstanding: 0 }
      ),
    [invoices]
  );

  function resetCreateForm() {
    setOrganizationId("");
    setInvoiceNumber("");
    setIssuedOn(isoToday());
    setBillingPeriodStart(previousMonthStart());
    setBillingPeriodEnd(previousMonthEnd());
    setEstimatedAmountRon("");
    setAmountRon("");
    setNotes("");
    setCreateError(null);
  }

  function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/clinic-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            invoiceNumber,
            issuedOn,
            billingPeriodStart,
            billingPeriodEnd,
            estimatedAmountRon,
            amountRon,
            notes,
            status: "invoiced",
          }),
        });

        const result = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Factura nu a putut fi salvată.");
        }

        resetCreateForm();
        setShowCreateForm(false);
        router.refresh();
      } catch (error) {
        setCreateError(
          error instanceof Error
            ? error.message
            : "Factura nu a putut fi salvată."
        );
      }
    });
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError(null);

    if (!paymentInvoiceId) return;

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/clinic-invoices/${paymentInvoiceId}/paid`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paidOn, paymentReference }),
          }
        );

        const result = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Plata nu a putut fi confirmată.");
        }

        setPaymentInvoiceId(null);
        setPaidOn(isoToday());
        setPaymentReference("");
        router.refresh();
      } catch (error) {
        setPaymentError(
          error instanceof Error
            ? error.message
            : "Plata nu a putut fi confirmată."
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Total înregistrat", totals.total],
          ["De încasat", totals.outstanding],
          ["Încasat", totals.paid],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {label}
            </p>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              {currency(Number(value))}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Facturi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              RomDoc urmărește facturile create manual în SAGA și confirmarea
              încasării.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setCreateError(null);
            }}
            className="romdoc-focus-ring rounded-xl bg-[#036661] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff2800]"
          >
            {showCreateForm ? "Închide formularul" : "Adaugă factură"}
          </button>
        </div>

        {showCreateForm ? (
          <form
            onSubmit={submitInvoice}
            className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5"
          >
            <h3 className="text-lg font-bold text-gray-900">
              Înregistrează factura din SAGA
            </h3>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Organizație clinică
                </span>
                <select
                  required
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                >
                  <option value="">Selectează organizația</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                      {organization.companyName
                        ? ` — ${organization.companyName}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Număr factură
                </span>
                <input
                  required
                  maxLength={100}
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="Ex. RD-2026-0012"
                  className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Emisă la
                </span>
                <input
                  required
                  type="date"
                  value={issuedOn}
                  onChange={(event) => setIssuedOn(event.target.value)}
                  className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold text-gray-800">
                    Perioadă de la
                  </span>
                  <input
                    required
                    type="date"
                    value={billingPeriodStart}
                    onChange={(event) =>
                      setBillingPeriodStart(event.target.value)
                    }
                    className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-gray-800">
                    Până la
                  </span>
                  <input
                    required
                    type="date"
                    value={billingPeriodEnd}
                    onChange={(event) =>
                      setBillingPeriodEnd(event.target.value)
                    }
                    className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Estimare RomDoc
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedAmountRon}
                  onChange={(event) =>
                    setEstimatedAmountRon(event.target.value)
                  }
                  placeholder="Opțional"
                  className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Sumă facturată
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountRon}
                  onChange={(event) => setAmountRon(event.target.value)}
                  placeholder="0.00"
                  className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                />
              </label>

              <label className="md:col-span-2">
                <span className="text-sm font-semibold text-gray-800">
                  Notițe
                </span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Opțional"
                  className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                />
              </label>
            </div>

            {createError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {createError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="romdoc-focus-ring mt-5 rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:opacity-60"
            >
              {isPending ? "Se salvează..." : "Salvează ca Facturată"}
            </button>
          </form>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          <label className="lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Caută
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Număr, organizație, firmă, CUI sau e-mail..."
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
            />
          </label>

          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Organizație
            </span>
            <select
              value={organizationFilter}
              onChange={(event) => setOrganizationFilter(event.target.value)}
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
            >
              <option value="">Toate</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
            >
              <option value="">Toate</option>
              <option value="draft">Draft</option>
              <option value="invoiced">Facturată</option>
              <option value="paid">Plătită</option>
            </select>
          </label>

          <div className="grid gap-3">
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Emisă de la
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm"
              />
            </label>

            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Până la
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm"
              />
            </label>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          {filteredInvoices.length} din {invoices.length} facturi
        </p>

        {filteredInvoices.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
            Nu există facturi care corespund filtrelor selectate.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1100px] divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-3">Număr factură</th>
                  <th className="px-3 py-3">Emisă la</th>
                  <th className="px-3 py-3">Perioadă</th>
                  <th className="px-3 py-3">Organizație clinică</th>
                  <th className="px-3 py-3 text-right">Estimare</th>
                  <th className="px-3 py-3 text-right">Facturat</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Plătită la</th>
                  <th className="px-3 py-3">Acțiune</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="align-top">
                    <td className="px-3 py-4">
                      <p className="font-bold text-gray-900">
                        {invoice.invoiceNumber}
                      </p>
                      {invoice.paymentReference ? (
                        <p className="mt-1 text-xs text-gray-500">
                          Ref. plată: {invoice.paymentReference}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-4 text-gray-700">
                      {dateLabel(invoice.issuedOn)}
                    </td>
                    <td className="px-3 py-4 text-gray-700">
                      {periodLabel(
                        invoice.billingPeriodStart,
                        invoice.billingPeriodEnd
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-gray-900">
                        {invoice.organizationName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {invoice.companyName ?? "Date firmă indisponibile"}
                        {invoice.taxId ? ` · ${invoice.taxId}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-right text-gray-700">
                      {invoice.estimatedAmountRon === null
                        ? "—"
                        : currency(invoice.estimatedAmountRon)}
                    </td>
                    <td className="px-3 py-4 text-right font-bold text-gray-900">
                      {currency(invoice.amountRon)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                          invoice.status
                        )}`}
                      >
                        {statusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-gray-700">
                      {dateLabel(invoice.paidOn)}
                    </td>
                    <td className="px-3 py-4">
                      {invoice.status === "paid" ? (
                        <span className="font-semibold text-green-700">
                          Plătită
                        </span>
                      ) : invoice.status === "invoiced" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentInvoiceId(invoice.id);
                            setPaidOn(isoToday());
                            setPaymentReference("");
                            setPaymentError(null);
                          }}
                          className="romdoc-focus-ring rounded-xl border border-[#036661] px-3 py-2 text-xs font-semibold text-[#036661] hover:bg-[#036661] hover:text-white"
                        >
                          Marchează Plătită
                        </button>
                      ) : (
                        <span className="text-gray-500">Draft</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {paymentInvoiceId ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <form
            onSubmit={submitPayment}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-gray-900">
              Confirmă plata facturii
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Acțiunea marchează factura ca plătită în CRM-ul RomDoc.
            </p>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-gray-800">
                Data plății
              </span>
              <input
                required
                type="date"
                value={paidOn}
                onChange={(event) => setPaidOn(event.target.value)}
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-gray-800">
                Referință plată
              </span>
              <input
                maxLength={200}
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Opțional"
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
              />
            </label>

            {paymentError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {paymentError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setPaymentInvoiceId(null)}
                className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="romdoc-focus-ring rounded-xl bg-[#036661] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff2800] disabled:opacity-60"
              >
                {isPending ? "Se confirmă..." : "Confirmă plata"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
