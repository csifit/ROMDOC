"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  formatPlatformBillingCurrency,
  type PlatformInvoiceAmountRow,
  type PlatformMonthRange,
} from "@/lib/billing/platform-invoicing";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getPlatformOperatorBillingHistory } from "@/lib/i18n/platform-operator-billing-history";

type Props = {
  locale: AppLocale;
  row: PlatformInvoiceAmountRow;
  range: PlatformMonthRange;
  openInitially?: boolean;
  initialAmount?: number;
};

type ApiResponse = {
  code?: string;
  message?: string;
  error?: string;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function ClientBillingInvoiceActions({
  locale,
  row,
  range,
  openInitially = false,
  initialAmount,
}: Props) {
  const copy = getPlatformOperatorBillingHistory(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInvoiceForm, setShowInvoiceForm] = useState(
    openInitially && !row.invoiceRecord && range.month !== range.currentMonth
  );
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState(isoToday());
  const [finalAmount, setFinalAmount] = useState(
    String((initialAmount ?? row.total).toFixed(2))
  );
  const [currency, setCurrency] = useState(row.currency);
  const [notes, setNotes] = useState("");
  const [paidOn, setPaidOn] = useState(isoToday());
  const [paymentReference, setPaymentReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isCurrentMonth = range.month === range.currentMonth;
  const invoice = row.invoiceRecord;

  function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const numericAmount = Number(finalAmount.replace(",", "."));
    if (!invoiceNumber.trim() || !issuedOn || !Number.isFinite(numericAmount) || numericAmount < 0) {
      setError(copy.invoice.failed);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/client-billing-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientType: row.clientType,
            clientId: row.id,
            billingPeriodStart: range.startDate,
            billingPeriodEnd: range.endDate,
            invoiceNumber: invoiceNumber.trim(),
            issuedOn,
            estimatedAmount: row.total,
            amount: numericAmount,
            currency,
            notes: notes.trim() || null,
          }),
        });
        const result = (await response.json()) as ApiResponse;
        if (!response.ok) {
          throw new Error(locale === "ro" && result.error ? result.error : copy.invoice.failed);
        }
        setMessage(copy.invoice.saved);
        setShowInvoiceForm(false);
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : copy.invoice.failed);
      }
    });
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoice) return;
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/client-billing-invoices/${invoice.id}/paid`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paidOn,
              paymentReference: paymentReference.trim() || null,
            }),
          }
        );
        const result = (await response.json()) as ApiResponse;
        if (!response.ok) {
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : copy.invoice.paymentFailed
          );
        }
        setMessage(copy.invoice.paid);
        setShowPaymentForm(false);
        router.refresh();
      } catch (paymentError) {
        setError(
          paymentError instanceof Error
            ? paymentError.message
            : copy.invoice.paymentFailed
        );
      }
    });
  }

  if (invoice) {
    return (
      <section className="mt-[21px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px]">
        <div className="flex flex-wrap items-start justify-between gap-[13px]">
          <div>
            <p className="font-bold text-blue-950">
              {copy.history.invoiceNumber.replace("{number}", invoice.invoiceNumber)}
            </p>
            <p className="mt-[5px] text-sm text-blue-900">
              {copy.history.issuedOn}: {invoice.issuedOn}
            </p>
            <p className="mt-[5px] text-sm text-blue-900">
              {copy.history.invoiceAmount}: {formatPlatformBillingCurrency(
                invoice.amount,
                locale,
                invoice.currency
              )}
            </p>
            {invoice.paidOn ? (
              <p className="mt-[5px] text-sm text-blue-900">
                {copy.history.paidOn}: {invoice.paidOn}
              </p>
            ) : null}
            {invoice.paymentReference ? (
              <p className="mt-[5px] text-sm text-blue-900">
                {copy.history.paymentReference}: {invoice.paymentReference}
              </p>
            ) : null}
          </div>
          <span className={`rounded-full px-[13px] py-[8px] text-xs font-semibold ${
            invoice.status === "paid"
              ? "bg-green-100 text-green-800"
              : "bg-blue-100 text-blue-800"
          }`}>
            {invoice.status === "paid"
              ? copy.history.paidBadge
              : copy.history.invoicedBadge}
          </span>
        </div>

        {invoice.status === "invoiced" ? (
          showPaymentForm ? (
            <form onSubmit={submitPayment} className="mt-[13px] border-t border-blue-200 pt-[13px]">
              <div className="grid gap-[13px] md:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold text-blue-950">
                    {copy.invoice.paidDate}
                  </span>
                  <input
                    required
                    type="date"
                    min={invoice.issuedOn}
                    value={paidOn}
                    onChange={(event) => setPaidOn(event.target.value)}
                    className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-blue-300 bg-white px-[13px] py-[13px]"
                  />
                </label>
                <label>
                  <span className="text-sm font-semibold text-blue-950">
                    {copy.invoice.paymentReference}
                  </span>
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-blue-300 bg-white px-[13px] py-[13px]"
                  />
                </label>
              </div>
              <div className="mt-[13px] flex flex-wrap gap-[8px]">
                <button
                  type="submit"
                  disabled={isPending}
                  className="romdoc-focus-ring rounded-[13px] bg-green-700 px-[21px] py-[13px] text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isPending ? copy.invoice.confirmingPaid : copy.invoice.confirmPaid}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="romdoc-focus-ring rounded-[13px] border border-blue-300 bg-white px-[21px] py-[13px] text-sm font-semibold text-blue-900"
                >
                  {copy.invoice.close}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowPaymentForm(true);
                setMessage("");
                setError("");
              }}
              className="romdoc-focus-ring mt-[13px] rounded-[13px] border border-green-300 bg-white px-[21px] py-[13px] text-sm font-semibold text-green-800"
            >
              {copy.invoice.markPaid}
            </button>
          )
        ) : null}

        {message ? (
          <p className="mt-[13px] text-sm font-medium text-green-800">{message}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-[13px] text-sm font-medium text-red-700">{error}</p>
        ) : null}
      </section>
    );
  }

  if (isCurrentMonth) {
    return (
      <p className="mt-[21px] rounded-[13px] border border-gray-200 bg-gray-50 p-[13px] text-sm text-gray-600">
        {copy.invoice.currentMonthBlocked}
      </p>
    );
  }

  return (
    <section className="mt-[21px]">
      {showInvoiceForm ? (
        <form onSubmit={submitInvoice} className="rounded-[13px] border border-gray-200 bg-white p-[13px]">
          <div className="flex items-start justify-between gap-[13px]">
            <div>
              <h5 className="font-bold text-gray-950">{copy.invoice.title}</h5>
              <p className="mt-[5px] text-sm leading-6 text-gray-600">
                {copy.invoice.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInvoiceForm(false)}
              className="romdoc-focus-ring rounded-[8px] border border-gray-300 px-[13px] py-[8px] text-xs font-semibold"
            >
              {copy.invoice.close}
            </button>
          </div>

          <div className="mt-[13px] grid gap-[13px] md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="text-sm font-semibold text-gray-700">{copy.invoice.number}</span>
              <input
                required
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-gray-700">{copy.invoice.issuedOn}</span>
              <input
                required
                type="date"
                value={issuedOn}
                onChange={(event) => setIssuedOn(event.target.value)}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-gray-700">{copy.invoice.finalAmount}</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={finalAmount}
                onChange={(event) => setFinalAmount(event.target.value)}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-gray-700">{copy.invoice.currency}</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as "RON" | "EUR")}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
          </div>

          <label className="mt-[13px] block">
            <span className="text-sm font-semibold text-gray-700">{copy.invoice.notes}</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={copy.invoice.notesPlaceholder}
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
            />
          </label>

          <p className="mt-[13px] text-sm text-gray-600">
            {copy.invoice.estimatedAmount}: {formatPlatformBillingCurrency(
              row.total,
              locale,
              row.currency
            )}
          </p>

          <button
            type="submit"
            disabled={isPending}
            className="romdoc-focus-ring mt-[13px] rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? copy.invoice.saving : copy.invoice.save}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setShowInvoiceForm(true);
            setMessage("");
            setError("");
          }}
          className="romdoc-focus-ring rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white"
        >
          {copy.invoice.record}
        </button>
      )}

      {message ? (
        <p className="mt-[13px] text-sm font-medium text-green-800">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-[13px] text-sm font-medium text-red-700">{error}</p>
      ) : null}
    </section>
  );
}
