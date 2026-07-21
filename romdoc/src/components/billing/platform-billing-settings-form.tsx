"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { PlatformBillingRates } from "@/lib/billing/platform-invoicing";
import {
  getPlatformOperatorBilling,
  interpolatePlatformBillingCopy,
  PLATFORM_OPERATOR_BILLING_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-billing";

type PlatformBillingSettingsFormProps = {
  locale: AppLocale;
  rates: PlatformBillingRates;
  canEdit: boolean;
};

type SettingsApiResponse = {
  code?: string;
  message?: string;
  error?: string;
  settings?: {
    subscriptionPriceRon: number;
    smsPriceRon: number;
    vatRate: number;
    updatedAt: string | null;
    updatedByProfileId: string | null;
    canEdit: boolean;
  };
};

function numberInputValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(value.toFixed(4)).replace(/0+$/, "").replace(/\.$/, "");
}

export default function PlatformBillingSettingsForm({
  locale,
  rates,
  canEdit,
}: PlatformBillingSettingsFormProps) {
  const copy = getPlatformOperatorBilling(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [subscriptionPrice, setSubscriptionPrice] = useState(
    numberInputValue(rates.subscriptionPriceRon)
  );
  const [smsPrice, setSmsPrice] = useState(numberInputValue(rates.smsPriceRon));
  const [vatPercent, setVatPercent] = useState(
    numberInputValue(rates.vatRate * 100)
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updatedLabel = rates.updatedAt
    ? interpolatePlatformBillingCopy(copy.settings.updatedAt, {
        date: new Intl.DateTimeFormat(
          PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale],
          {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Europe/Bucharest",
          }
        ).format(new Date(rates.updatedAt)),
      })
    : null;

  function reset() {
    setSubscriptionPrice(numberInputValue(rates.subscriptionPriceRon));
    setSmsPrice(numberInputValue(rates.smsPriceRon));
    setVatPercent(numberInputValue(rates.vatRate * 100));
    setMessage("");
    setError("");
    setIsEditing(false);
  }

  function save() {
    setMessage("");
    setError("");

    const subscription = Number(subscriptionPrice);
    const sms = Number(smsPrice);
    const vat = Number(vatPercent);

    if (!Number.isFinite(subscription) || subscription < 0) {
      setError(copy.settings.invalidSubscription);
      return;
    }

    if (!Number.isFinite(sms) || sms < 0) {
      setError(copy.settings.invalidSms);
      return;
    }

    if (!Number.isFinite(vat) || vat < 0 || vat > 100) {
      setError(copy.settings.invalidVat);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/billing-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriptionPriceRon: subscription,
            smsPriceRon: sms,
            vatRate: vat / 100,
          }),
        });

        const result = (await response.json()) as SettingsApiResponse;

        if (!response.ok || !result.settings) {
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : copy.settings.saveFailed
          );
        }

        setSubscriptionPrice(numberInputValue(result.settings.subscriptionPriceRon));
        setSmsPrice(numberInputValue(result.settings.smsPriceRon));
        setVatPercent(numberInputValue(result.settings.vatRate * 100));
        setMessage(copy.settings.saved);
        setIsEditing(false);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : copy.settings.saveFailed
        );
      }
    });
  }

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {copy.settings.title}
          </h3>
          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {copy.settings.description}
          </p>
          {!canEdit ? (
            <p className="mt-[8px] text-xs leading-5 text-gray-500">
              {copy.settings.adminOnly}
            </p>
          ) : null}
          {updatedLabel ? (
            <p className="mt-[8px] text-xs text-gray-500">{updatedLabel}</p>
          ) : null}
        </div>

        {canEdit && !isEditing ? (
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setError("");
              setIsEditing(true);
            }}
            className="romdoc-focus-ring w-fit rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-800 transition hover:border-[#036661] hover:text-[#036661]"
          >
            {copy.settings.edit}
          </button>
        ) : null}
      </div>

      <div className="mt-[21px] grid gap-[13px] md:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {copy.settings.subscriptionPrice}
          </span>
          {isEditing ? (
            <div className="mt-[8px] flex items-center rounded-[13px] border border-gray-300 bg-white focus-within:border-[#036661] focus-within:ring-2 focus-within:ring-[#036661]/20">
              <input
                type="number"
                min="0"
                step="0.01"
                value={subscriptionPrice}
                onChange={(event) => setSubscriptionPrice(event.target.value)}
                className="min-w-0 flex-1 rounded-l-[13px] px-[13px] py-[13px] text-lg font-bold text-gray-900 outline-none"
              />
              <span className="px-[13px] text-sm font-semibold text-gray-500">
                {copy.settings.currency}
              </span>
            </div>
          ) : (
            <p className="mt-[8px] text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat(PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale], {
                style: "currency",
                currency: "RON",
                maximumFractionDigits: 2,
              }).format(rates.subscriptionPriceRon)}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {copy.settings.smsPrice}
          </span>
          {isEditing ? (
            <div className="mt-[8px] flex items-center rounded-[13px] border border-gray-300 bg-white focus-within:border-[#036661] focus-within:ring-2 focus-within:ring-[#036661]/20">
              <input
                type="number"
                min="0"
                step="0.01"
                value={smsPrice}
                onChange={(event) => setSmsPrice(event.target.value)}
                className="min-w-0 flex-1 rounded-l-[13px] px-[13px] py-[13px] text-lg font-bold text-gray-900 outline-none"
              />
              <span className="px-[13px] text-sm font-semibold text-gray-500">
                {copy.settings.currency}
              </span>
            </div>
          ) : (
            <p className="mt-[8px] text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat(PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale], {
                style: "currency",
                currency: "RON",
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              }).format(rates.smsPriceRon)}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {copy.settings.vatRate}
          </span>
          {isEditing ? (
            <div className="mt-[8px] flex items-center rounded-[13px] border border-gray-300 bg-white focus-within:border-[#036661] focus-within:ring-2 focus-within:ring-[#036661]/20">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={vatPercent}
                onChange={(event) => setVatPercent(event.target.value)}
                className="min-w-0 flex-1 rounded-l-[13px] px-[13px] py-[13px] text-lg font-bold text-gray-900 outline-none"
              />
              <span className="px-[13px] text-sm font-semibold text-gray-500">%</span>
            </div>
          ) : (
            <p className="mt-[8px] text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat(PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale], {
                style: "percent",
                maximumFractionDigits: 2,
              }).format(rates.vatRate)}
            </p>
          )}
        </label>
      </div>

      {isEditing ? (
        <div className="mt-[21px] flex flex-wrap gap-[8px]">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="romdoc-focus-ring rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? copy.settings.saving : copy.settings.save}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            className="romdoc-focus-ring rounded-[13px] border border-gray-300 bg-white px-[21px] py-[13px] text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {copy.settings.cancel}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="mt-[13px] rounded-[13px] border border-green-200 bg-green-50 px-[13px] py-[8px] text-sm text-green-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 px-[13px] py-[8px] text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
