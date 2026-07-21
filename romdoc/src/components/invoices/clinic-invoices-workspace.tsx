"use client";

import {
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  type ClinicInvoiceOrganization,
  type ClinicInvoiceRow,
  type ClinicInvoiceStatus,
} from "@/lib/invoices/clinic-invoices";
import {
  getPlatformOperatorBilling,
  interpolatePlatformBillingCopy,
  PLATFORM_OPERATOR_BILLING_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-billing";

export type ClinicInvoiceInitialDraft = {
  organizationId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  estimatedAmountRon: string;
};

type ClinicInvoicesWorkspaceProps = {
  invoices: ClinicInvoiceRow[];
  organizations: ClinicInvoiceOrganization[];
  initialDraft?: ClinicInvoiceInitialDraft | null;
  locale: AppLocale;
};

type ApiResponse = {
  code?: string;
  error?: string;
  success?: boolean;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function previousMonthStart() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  )
    .toISOString()
    .slice(0, 10);
}

function previousMonthEnd() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)
  )
    .toISOString()
    .slice(0, 10);
}

function statusClasses(status: ClinicInvoiceStatus) {
  if (status === "paid") return "border-green-200 bg-green-50 text-green-800";
  if (status === "draft") return "border-gray-200 bg-gray-100 text-gray-700";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

export default function ClinicInvoicesWorkspace({
  invoices,
  organizations,
  initialDraft = null,
  locale,
}: ClinicInvoicesWorkspaceProps) {
  const copy = getPlatformOperatorBilling(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hasValidInitialDraft =
    initialDraft !== null &&
    organizations.some(
      (organization) => organization.id === initialDraft.organizationId
    );

  const [showCreateForm, setShowCreateForm] = useState(hasValidInitialDraft);
  const [search, setSearch] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [organizationId, setOrganizationId] = useState(
    hasValidInitialDraft ? initialDraft.organizationId : ""
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState(isoToday());
  const [billingPeriodStart, setBillingPeriodStart] = useState(
    hasValidInitialDraft
      ? initialDraft.billingPeriodStart
      : previousMonthStart()
  );
  const [billingPeriodEnd, setBillingPeriodEnd] = useState(
    hasValidInitialDraft ? initialDraft.billingPeriodEnd : previousMonthEnd()
  );
  const [estimatedAmountRon, setEstimatedAmountRon] = useState(
    hasValidInitialDraft ? initialDraft.estimatedAmountRon : ""
  );
  const [amountRon, setAmountRon] = useState(
    hasValidInitialDraft ? initialDraft.estimatedAmountRon : ""
  );
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState("");

  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(isoToday());
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const currency = (value: number) =>
    new Intl.NumberFormat(PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale], {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 2,
    }).format(value);

  const dateLabel = (value: string | null) => {
    if (!value) return copy.common.none;
    return new Intl.DateTimeFormat(
      PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale],
      { dateStyle: "medium", timeZone: "UTC" }
    ).format(new Date(`${value}T00:00:00Z`));
  };

  const periodLabel = (start: string, end: string) => {
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);

    if (
      startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
      startDate.getUTCMonth() === endDate.getUTCMonth()
    ) {
      return new Intl.DateTimeFormat(
        PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale],
        { month: "long", year: "numeric", timeZone: "UTC" }
      ).format(startDate);
    }

    return `${dateLabel(start)} – ${dateLabel(end)}`;
  };

  const statusLabel = (status: ClinicInvoiceStatus) => {
    if (status === "paid") return copy.invoiceWorkspace.statusPaid;
    if (status === "draft") return copy.invoiceWorkspace.statusDraft;
    return copy.invoiceWorkspace.statusInvoiced;
  };

  const filteredInvoices = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(locale);

    return invoices.filter((invoice) => {
      if (organizationFilter && invoice.organizationId !== organizationFilter) {
        return false;
      }
      if (statusFilter && invoice.status !== statusFilter) return false;
      if (dateFrom && invoice.issuedOn < dateFrom) return false;
      if (dateTo && invoice.issuedOn > dateTo) return false;
      if (!needle) return true;

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
        .toLocaleLowerCase(locale)
        .includes(needle);
    });
  }, [dateFrom, dateTo, invoices, locale, organizationFilter, search, statusFilter]);

  const processedPeriodInvoices = useMemo(() => {
    if (!organizationId || !billingPeriodStart || !billingPeriodEnd) return [];

    return invoices.filter(
      (invoice) =>
        invoice.organizationId === organizationId &&
        ["invoiced", "paid"].includes(invoice.status) &&
        invoice.billingPeriodStart <= billingPeriodEnd &&
        invoice.billingPeriodEnd >= billingPeriodStart
    );
  }, [billingPeriodEnd, billingPeriodStart, invoices, organizationId]);

  const duplicateInvoiceNumber = useMemo(() => {
    const normalized = invoiceNumber.trim().toLocaleLowerCase(locale);
    if (!normalized) return null;

    return (
      invoices.find(
        (invoice) =>
          invoice.invoiceNumber.trim().toLocaleLowerCase(locale) === normalized
      ) ?? null
    );
  }, [invoiceNumber, invoices, locale]);

  const totals = useMemo(
    () =>
      invoices.reduce(
        (result, invoice) => {
          result.total += invoice.amountRon;
          if (invoice.status === "paid") result.paid += invoice.amountRon;
          if (invoice.status === "invoiced") result.outstanding += invoice.amountRon;
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
    setCreateError("");
  }

  function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");

    if (processedPeriodInvoices.length > 0 || duplicateInvoiceNumber) {
      setCreateError(copy.invoiceWorkspace.resolveDuplicates);
      return;
    }

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
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : copy.invoiceWorkspace.createFailed
          );
        }

        resetCreateForm();
        setShowCreateForm(false);
        router.refresh();
      } catch (error) {
        setCreateError(
          error instanceof Error
            ? error.message
            : copy.invoiceWorkspace.createFailed
        );
      }
    });
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentInvoiceId) return;
    setPaymentError("");

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
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : copy.invoiceWorkspace.paymentFailed
          );
        }

        setPaymentInvoiceId(null);
        setPaidOn(isoToday());
        setPaymentReference("");
        router.refresh();
      } catch (error) {
        setPaymentError(
          error instanceof Error
            ? error.message
            : copy.invoiceWorkspace.paymentFailed
        );
      }
    });
  }

  const filtersActive = Boolean(
    search || organizationFilter || statusFilter || dateFrom || dateTo
  );

  return (
    <div className="space-y-[21px]">
      <div className="grid gap-[13px] md:grid-cols-3">
        {[
          [copy.invoiceWorkspace.summaryTotal, totals.total],
          [copy.invoiceWorkspace.summaryOutstanding, totals.outstanding],
          [copy.invoiceWorkspace.summaryPaid, totals.paid],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {label}
            </p>
            <p className="mt-[13px] text-2xl font-bold text-gray-900">
              {currency(Number(value))}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {copy.invoiceWorkspace.title}
            </h2>
            <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
              {copy.invoiceWorkspace.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setCreateError("");
            }}
            className="romdoc-focus-ring w-fit rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49]"
          >
            {showCreateForm
              ? copy.invoiceWorkspace.closeForm
              : copy.invoiceWorkspace.add}
          </button>
        </div>

        {showCreateForm ? (
          <form
            onSubmit={submitInvoice}
            className="mt-[21px] rounded-[21px] border border-gray-200 bg-gray-50 p-[21px]"
          >
            <h3 className="text-lg font-bold text-gray-900">
              {copy.invoiceWorkspace.formTitle}
            </h3>

            {hasValidInitialDraft ? (
              <p className="mt-[13px] rounded-[13px] border border-[#036661]/20 bg-[#036661]/5 p-[13px] text-sm leading-6 text-gray-700">
                {copy.invoiceWorkspace.prefilled}
              </p>
            ) : null}

            <div className="mt-[21px] grid gap-[13px] md:grid-cols-2 xl:grid-cols-3">
              <label className="block md:col-span-2 xl:col-span-1">
                <span className="text-sm font-semibold text-gray-700">
                  {copy.invoiceWorkspace.organization}
                </span>
                <select
                  required
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-950"
                >
                  <option value="">
                    {copy.invoiceWorkspace.chooseOrganization}
                  </option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {copy.invoiceWorkspace.invoiceNumber}
                </span>
                <input
                  required
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-950"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {copy.invoiceWorkspace.issuedOn}
                </span>
                <input
                  required
                  type="date"
                  value={issuedOn}
                  onChange={(event) => setIssuedOn(event.target.value)}
                  className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-950"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {copy.invoiceWorkspace.periodStart}
                </span>
                <input
                  required
                  type="date"
                  value={billingPeriodStart}
                  onChange={(event) => setBillingPeriodStart(event.target.value)}
                  className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-950"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {copy.invoiceWorkspace.periodEnd}
                </span>
                <input
                  required
                  type="date"
                  value={billingPeriodEnd}
                  onChange={(event) => setBillingPeriodEnd(event.target.value)}
                  className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-950"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {copy.invoiceWorkspace.estimatedAmount}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedAmountRon}
                  onChange={(event) => setEstimatedAmountRon(event.target.value)}
                  className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-950"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {copy.invoiceWorkspace.finalAmount}
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountRon}
                  onChange={(event) => setAmountRon(event.target.value)}
                  className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-950"
                />
              </label>

              <label className="block md:col-span-2 xl:col-span-3">
                <span className="text-sm font-semibold text-gray-700">
                  {copy.invoiceWorkspace.notes}
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={copy.invoiceWorkspace.notesPlaceholder}
                  rows={3}
                  className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-950"
                />
              </label>
            </div>

            {processedPeriodInvoices.length > 0 ? (
              <p className="mt-[13px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm text-amber-900">
                {copy.invoiceWorkspace.duplicatePeriod}
              </p>
            ) : null}
            {duplicateInvoiceNumber ? (
              <p className="mt-[13px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm text-amber-900">
                {copy.invoiceWorkspace.duplicateNumber}
              </p>
            ) : null}
            {createError ? (
              <p role="alert" className="mt-[13px] text-sm text-red-700">
                {createError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending || processedPeriodInvoices.length > 0 || Boolean(duplicateInvoiceNumber)}
              className="romdoc-focus-ring mt-[21px] rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? copy.invoiceWorkspace.saving
                : copy.invoiceWorkspace.save}
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {copy.invoiceWorkspace.filtersTitle}
            </h2>
            <p className="mt-[5px] text-sm text-gray-500">
              {interpolatePlatformBillingCopy(
                copy.invoiceWorkspace.invoicesCount,
                { filtered: filteredInvoices.length, total: invoices.length }
              )}
            </p>
          </div>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setOrganizationFilter("");
                setStatusFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="romdoc-focus-ring w-fit rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {copy.invoiceWorkspace.resetFilters}
            </button>
          ) : null}
        </div>

        <div className="mt-[21px] grid gap-[13px] md:grid-cols-2 xl:grid-cols-5">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.invoiceWorkspace.searchPlaceholder}
            className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm xl:col-span-2"
          />
          <select
            value={organizationFilter}
            onChange={(event) => setOrganizationFilter(event.target.value)}
            className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm"
          >
            <option value="">{copy.invoiceWorkspace.allOrganizations}</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm"
          >
            <option value="">{copy.invoiceWorkspace.allStatuses}</option>
            <option value="draft">{copy.invoiceWorkspace.statusDraft}</option>
            <option value="invoiced">{copy.invoiceWorkspace.statusInvoiced}</option>
            <option value="paid">{copy.invoiceWorkspace.statusPaid}</option>
          </select>
          <div className="grid grid-cols-2 gap-[8px]">
            <input
              aria-label={copy.invoiceWorkspace.dateFrom}
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="romdoc-focus-ring min-w-0 rounded-[13px] border border-gray-300 px-[8px] py-[13px] text-xs"
            />
            <input
              aria-label={copy.invoiceWorkspace.dateTo}
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="romdoc-focus-ring min-w-0 rounded-[13px] border border-gray-300 px-[8px] py-[13px] text-xs"
            />
          </div>
        </div>
      </section>

      {filteredInvoices.length === 0 ? (
        <div className="rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
          {copy.invoiceWorkspace.empty}
        </div>
      ) : (
        <div className="space-y-[13px]">
          {filteredInvoices.map((invoice) => (
            <details
              key={invoice.id}
              className="group overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm"
            >
              <summary className="romdoc-focus-ring flex cursor-pointer list-none flex-col gap-[13px] p-[21px] marker:content-none lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-[8px]">
                    <h3 className="text-lg font-bold text-gray-900">
                      {invoice.invoiceNumber}
                    </h3>
                    <span className={`rounded-full border px-[8px] py-[5px] text-xs font-semibold ${statusClasses(invoice.status)}`}>
                      {statusLabel(invoice.status)}
                    </span>
                  </div>
                  <p className="mt-[5px] text-sm text-gray-600">
                    {invoice.organizationName} · {periodLabel(invoice.billingPeriodStart, invoice.billingPeriodEnd)}
                  </p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {currency(invoice.amountRon)}
                  </p>
                  <p className="mt-[5px] text-xs text-gray-500">
                    {copy.invoiceWorkspace.issued}: {dateLabel(invoice.issuedOn)}
                  </p>
                </div>
              </summary>

              <div className="border-t border-gray-200 bg-gray-50/60 p-[21px]">
                <dl className="grid gap-[13px] md:grid-cols-2 xl:grid-cols-4">
                  {[
                    [copy.invoiceWorkspace.organizationDetails, invoice.companyName || invoice.organizationName],
                    [copy.amounts.invoiceDetails.taxId, invoice.taxId || copy.common.none],
                    [copy.amounts.invoiceDetails.billingEmail, invoice.billingEmail || copy.common.none],
                    [copy.invoiceWorkspace.billingPeriod, periodLabel(invoice.billingPeriodStart, invoice.billingPeriodEnd)],
                    [copy.invoiceWorkspace.estimatedAmount, invoice.estimatedAmountRon === null ? copy.common.none : currency(invoice.estimatedAmountRon)],
                    [copy.invoiceWorkspace.amount, currency(invoice.amountRon)],
                    [copy.invoiceWorkspace.paidOn, dateLabel(invoice.paidOn)],
                    [copy.invoiceWorkspace.paymentReference, invoice.paymentReference || copy.common.none],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {label}
                      </dt>
                      <dd className="mt-[5px] text-sm font-medium text-gray-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {invoice.notes ? (
                  <p className="mt-[13px] rounded-[13px] border border-gray-200 bg-white p-[13px] text-sm leading-6 text-gray-700">
                    {invoice.notes}
                  </p>
                ) : null}

                {invoice.status === "invoiced" ? (
                  paymentInvoiceId === invoice.id ? (
                    <form
                      onSubmit={submitPayment}
                      className="mt-[21px] rounded-[13px] border border-green-200 bg-green-50 p-[13px]"
                    >
                      <h4 className="font-bold text-green-950">
                        {copy.invoiceWorkspace.markPaidTitle}
                      </h4>
                      <div className="mt-[13px] grid gap-[13px] md:grid-cols-2">
                        <label>
                          <span className="text-sm font-semibold text-green-950">
                            {copy.invoiceWorkspace.paidDate}
                          </span>
                          <input
                            required
                            type="date"
                            min={invoice.issuedOn}
                            value={paidOn}
                            onChange={(event) => setPaidOn(event.target.value)}
                            className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-green-300 bg-white px-[13px] py-[13px] text-sm"
                          />
                        </label>
                        <label>
                          <span className="text-sm font-semibold text-green-950">
                            {copy.invoiceWorkspace.paymentReferenceOptional}
                          </span>
                          <input
                            value={paymentReference}
                            onChange={(event) => setPaymentReference(event.target.value)}
                            className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-green-300 bg-white px-[13px] py-[13px] text-sm"
                          />
                        </label>
                      </div>
                      {paymentError ? (
                        <p role="alert" className="mt-[13px] text-sm text-red-700">
                          {paymentError}
                        </p>
                      ) : null}
                      <div className="mt-[13px] flex flex-wrap gap-[8px]">
                        <button
                          type="submit"
                          disabled={isPending}
                          className="romdoc-focus-ring rounded-[13px] bg-green-700 px-[21px] py-[13px] text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {isPending
                            ? copy.invoiceWorkspace.confirming
                            : copy.invoiceWorkspace.confirmPayment}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentInvoiceId(null);
                            setPaymentError("");
                          }}
                          className="romdoc-focus-ring rounded-[13px] border border-green-300 bg-white px-[21px] py-[13px] text-sm font-semibold text-green-900"
                        >
                          {copy.common.cancel}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentInvoiceId(invoice.id);
                        setPaidOn(isoToday());
                        setPaymentReference("");
                        setPaymentError("");
                      }}
                      className="romdoc-focus-ring mt-[21px] rounded-[13px] border border-green-300 bg-green-50 px-[21px] py-[13px] text-sm font-semibold text-green-900 transition hover:bg-green-100"
                    >
                      {copy.invoiceWorkspace.markPaid}
                    </button>
                  )
                ) : null}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
