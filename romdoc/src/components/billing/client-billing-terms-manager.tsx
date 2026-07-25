"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import type {
  PlatformBillingClientOption,
  PlatformBillingCurrency,
  PlatformVatTreatment,
  PlatformVatValidationStatus,
} from "@/lib/billing/platform-invoicing";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getPlatformOperatorBillingHistory } from "@/lib/i18n/platform-operator-billing-history";

type Props = {
  locale: AppLocale;
  clients: PlatformBillingClientOption[];
  defaultCurrency: PlatformBillingCurrency;
};

type ApiResponse = {
  code?: string;
  message?: string;
  error?: string;
};

function numberValue(value: number | null) {
  if (value === null) return "";
  return String(value.toFixed(4)).replace(/0+$/, "").replace(/\.$/, "");
}

function clientKey(client: PlatformBillingClientOption) {
  return `${client.clientType}:${client.id}`;
}

export default function ClientBillingTermsManager({
  locale,
  clients,
  defaultCurrency,
}: Props) {
  const copy = getPlatformOperatorBillingHistory(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [smsPrice, setSmsPrice] = useState("");
  const [currency, setCurrency] =
    useState<PlatformBillingCurrency>(defaultCurrency);
  const [vatPercent, setVatPercent] = useState("");
  const [vatTreatment, setVatTreatment] =
    useState<PlatformVatTreatment>("domestic");
  const [vatReason, setVatReason] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [vatValidationStatus, setVatValidationStatus] =
    useState<PlatformVatValidationStatus | "">("");
  const [vatValidatedAt, setVatValidatedAt] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredClients = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(locale);
    if (!needle) return clients;

    return clients.filter((client) =>
      `${client.name} ${client.accountEmail ?? ""}`
        .toLocaleLowerCase(locale)
        .includes(needle)
    );
  }, [clients, locale, search]);

  const selectedClient = useMemo(
    () => clients.find((client) => clientKey(client) === selectedKey) ?? null,
    [clients, selectedKey]
  );

  useEffect(() => {
    const terms = selectedClient?.terms;
    setSubscriptionPrice(numberValue(terms?.subscriptionUnitPrice ?? null));
    setSmsPrice(numberValue(terms?.smsUnitPrice ?? null));
    setCurrency(terms?.currency ?? defaultCurrency);
    setVatPercent(
      terms?.vatRate === null || terms?.vatRate === undefined
        ? ""
        : numberValue(terms.vatRate * 100)
    );
    setVatTreatment(terms?.vatTreatment ?? "domestic");
    setVatReason(terms?.vatReason ?? "");
    setVatNumber(terms?.vatNumber ?? "");
    setVatValidationStatus(terms?.vatValidationStatus ?? "");
    setVatValidatedAt(terms?.vatValidatedAt?.slice(0, 10) ?? "");
    setEffectiveFrom(terms?.effectiveFrom ?? "");
    setEffectiveUntil(terms?.effectiveUntil ?? "");
    setMessage("");
    setError("");
  }, [defaultCurrency, selectedClient]);

  function parseOptionalNumber(value: string) {
    if (!value.trim()) return null;
    const numeric = Number(value.replace(",", "."));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
  }

  function save() {
    if (!selectedClient) return;
    setMessage("");
    setError("");

    const subscription = parseOptionalNumber(subscriptionPrice);
    const sms = parseOptionalNumber(smsPrice);
    const vat = parseOptionalNumber(vatPercent);

    if (subscription === undefined || sms === undefined) {
      setError(copy.pricing.invalidPrices);
      return;
    }
    if (vat === undefined || (vat !== null && vat > 100)) {
      setError(copy.pricing.invalidVat);
      return;
    }
    if (effectiveFrom && effectiveUntil && effectiveUntil < effectiveFrom) {
      setError(copy.pricing.invalidDates);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/client-billing-terms", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientType: selectedClient.clientType,
            clientId: selectedClient.id,
            subscriptionUnitPrice: subscription,
            smsUnitPrice: sms,
            currency,
            vatRate: vat === null ? null : vat / 100,
            vatTreatment,
            vatReason: vatReason.trim() || null,
            vatNumber: vatNumber.trim() || null,
            vatValidationStatus: vatValidationStatus || null,
            vatValidatedAt: vatValidatedAt || null,
            effectiveFrom: effectiveFrom || null,
            effectiveUntil: effectiveUntil || null,
          }),
        });
        const result = (await response.json()) as ApiResponse;
        if (!response.ok) {
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : copy.pricing.invalidPrices
          );
        }
        setMessage(copy.pricing.saved);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : copy.pricing.invalidPrices
        );
      }
    });
  }

  function resetToGlobal() {
    if (!selectedClient?.terms) return;
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/client-billing-terms", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientType: selectedClient.clientType,
            clientId: selectedClient.id,
          }),
        });
        const result = (await response.json()) as ApiResponse;
        if (!response.ok) {
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : copy.pricing.invalidPrices
          );
        }
        setMessage(copy.pricing.resetDone);
        router.refresh();
      } catch (resetError) {
        setError(
          resetError instanceof Error
            ? resetError.message
            : copy.pricing.invalidPrices
        );
      }
    });
  }

  const doctorClients = filteredClients.filter(
    (client) => client.clientType === "independent_doctor"
  );
  const organizationClients = filteredClients.filter(
    (client) => client.clientType === "clinic_organization"
  );
  const secondaryCurrency: PlatformBillingCurrency =
    defaultCurrency === "EUR" ? "RON" : "EUR";

  return (
    <section className="rounded-[21px] border border-[#9A4F35]/20 bg-white p-[21px] shadow-sm">
      <p className="text-sm font-semibold text-[#9A4F35]">
        {copy.pricing.eyebrow}
      </p>
      <h3 className="mt-[8px] text-xl font-bold text-gray-900">
        {copy.pricing.title}
      </h3>
      <p className="mt-[8px] max-w-4xl text-sm leading-6 text-gray-600">
        {copy.pricing.description}
      </p>

      <div className="mt-[21px] grid gap-[13px] lg:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-gray-700">
            {copy.pricing.search}
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.pricing.searchPlaceholder}
            className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-gray-700">
            {copy.pricing.selectClient}
          </span>
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
          >
            <option value="">{copy.pricing.selectClient}</option>
            {doctorClients.length > 0 ? (
              <optgroup label={copy.pricing.independentDoctors}>
                {doctorClients.map((client) => (
                  <option key={clientKey(client)} value={clientKey(client)}>
                    {client.name} — {client.accountEmail ?? "—"}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {organizationClients.length > 0 ? (
              <optgroup label={copy.pricing.clinicOrganizations}>
                {organizationClients.map((client) => (
                  <option key={clientKey(client)} value={clientKey(client)}>
                    {client.name} — {client.accountEmail ?? "—"}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          {filteredClients.length === 0 ? (
            <p className="mt-[8px] text-xs text-amber-700">
              {copy.pricing.noClients}
            </p>
          ) : null}
        </label>
      </div>

      {selectedClient ? (
        <div className="mt-[21px] rounded-[21px] border border-gray-200 bg-gray-50 p-[21px]">
          <div className="flex flex-wrap items-center justify-between gap-[13px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {copy.pricing.selected}
              </p>
              <p className="mt-[5px] font-bold text-gray-950">
                {selectedClient.name}
              </p>
              <p className="mt-[5px] text-sm text-gray-600">
                {selectedClient.accountEmail ?? "—"}
              </p>
            </div>
            <span
              className={`rounded-full px-[13px] py-[8px] text-xs font-semibold ${
                selectedClient.terms
                  ? "bg-[#036661]/10 text-[#036661]"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {selectedClient.terms
                ? copy.pricing.hasOverride
                : copy.pricing.usesGlobal}
            </span>
          </div>

          <div className="mt-[21px] grid gap-[13px] md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.subscriptionPrice}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={subscriptionPrice}
                onChange={(event) => setSubscriptionPrice(event.target.value)}
                placeholder={copy.pricing.optionalGlobalFallback}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.smsPrice}
              </span>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={smsPrice}
                onChange={(event) => setSmsPrice(event.target.value)}
                placeholder={copy.pricing.optionalGlobalFallback}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.currency}
              </span>
              <select
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value as PlatformBillingCurrency)
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value={defaultCurrency}>{defaultCurrency}</option>
                <option value={secondaryCurrency}>{secondaryCurrency}</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.vatPercent}
              </span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={vatPercent}
                onChange={(event) => setVatPercent(event.target.value)}
                placeholder={copy.pricing.optionalGlobalFallback}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              />
            </label>
          </div>

          <div className="mt-[13px] grid gap-[13px] md:grid-cols-2 xl:grid-cols-3">
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.vatTreatment}
              </span>
              <select
                value={vatTreatment}
                onChange={(event) =>
                  setVatTreatment(event.target.value as PlatformVatTreatment)
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                {(
                  [
                    "domestic",
                    "reverse_charge",
                    "outside_scope",
                    "exempt",
                    "custom",
                  ] as PlatformVatTreatment[]
                ).map((value) => (
                  <option key={value} value={value}>
                    {copy.vatTreatment[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.vatReason}
              </span>
              <input
                value={vatReason}
                onChange={(event) => setVatReason(event.target.value)}
                placeholder={copy.pricing.vatReasonPlaceholder}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              />
            </label>
          </div>

          <div className="mt-[13px] grid gap-[13px] md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.vatNumber} · {copy.pricing.optional}
              </span>
              <input
                value={vatNumber}
                onChange={(event) => setVatNumber(event.target.value)}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.vatValidationStatus} · {copy.pricing.optional}
              </span>
              <select
                value={vatValidationStatus}
                onChange={(event) =>
                  setVatValidationStatus(
                    event.target.value as PlatformVatValidationStatus | ""
                  )
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="">{copy.vatValidation.empty}</option>
                {(
                  [
                    "not_checked",
                    "valid",
                    "invalid",
                    "unavailable",
                  ] as PlatformVatValidationStatus[]
                ).map((value) => (
                  <option key={value} value={value}>
                    {copy.vatValidation[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.vatValidatedAt} · {copy.pricing.optional}
              </span>
              <input
                type="date"
                value={vatValidatedAt}
                onChange={(event) => setVatValidatedAt(event.target.value)}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              />
            </label>
            <div className="hidden xl:block" />
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.effectiveFrom} · {copy.pricing.optional}
              </span>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-gray-700">
                {copy.pricing.effectiveUntil} · {copy.pricing.optional}
              </span>
              <input
                type="date"
                min={effectiveFrom || undefined}
                value={effectiveUntil}
                onChange={(event) => setEffectiveUntil(event.target.value)}
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              />
            </label>
          </div>

          <div className="mt-[21px] flex flex-wrap gap-[8px]">
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="romdoc-focus-ring rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? copy.pricing.saving : copy.pricing.save}
            </button>
            {selectedClient.terms ? (
              <button
                type="button"
                onClick={resetToGlobal}
                disabled={isPending}
                className="romdoc-focus-ring rounded-[13px] border border-red-200 bg-white px-[21px] py-[13px] text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                {isPending ? copy.pricing.resetting : copy.pricing.reset}
              </button>
            ) : null}
          </div>

          {message ? (
            <p className="mt-[13px] rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800">
              {message}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm text-gray-600">
          {copy.pricing.loadClient}
        </p>
      )}
    </section>
  );
}
