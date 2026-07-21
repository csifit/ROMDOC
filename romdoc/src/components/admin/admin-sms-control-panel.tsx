"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformOperatorBilling,
  PLATFORM_OPERATOR_BILLING_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-billing";

type SmsSettings = {
  sms_enabled: boolean;
  confirmation_sms_enabled: boolean;
  reminder_24h_sms_enabled: boolean;
  provider: string;
  updated_at: string | null;
};

type SmsBilling = {
  unitCostMinor: number;
  currency: string;
  vatMode: "plus_vat";
};

type DoctorCounter = {
  doctorId: string;
  doctorName: string;
  slug: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  confirmed: number;
  reminder24h: number;
  invoiced: number;
  uninvoiced: number;
  notBillable: number;
  credited: number;
  estimatedUninvoicedMinor: number;
  estimatedInvoicedMinor: number;
  lastSentAt: string | null;
};

type SmsBillingPeriod = {
  id: string;
  doctor_id: string;
  profile_id: string;
  doctorName: string;
  slug: string;
  period_start: string;
  period_end: string;
  sms_count: number;
  net_amount_minor: number;
  vat_amount_minor: number;
  gross_amount_minor: number;
  currency: string;
  payment_status: string;
  paid_at: string | null;
  saga_invoice_status: string;
  saga_invoice_reference: string | null;
  saga_invoice_issued_at: string | null;
};

type SmsAdminResponse = {
  settings?: SmsSettings;
  billing?: SmsBilling;
  doctorCounters?: DoctorCounter[];
  smsBillingPeriods?: SmsBillingPeriod[];
  updatedCount?: number;
  message?: string;
  error?: string;
  code?: string;
};

type AdminSmsControlPanelProps = {
  locale: AppLocale;
};

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function AdminSmsControlPanel({
  locale,
}: AdminSmsControlPanelProps) {
  const copy = getPlatformOperatorBilling(locale);
  const localeTag = PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale];
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<SmsSettings | null>(null);
  const [billing, setBilling] = useState<SmsBilling | null>(null);
  const [doctorCounters, setDoctorCounters] = useState<DoctorCounter[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<SmsBillingPeriod[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invoiceReferences, setInvoiceReferences] = useState<Record<string, string>>({});
  const [sagaReferences, setSagaReferences] = useState<Record<string, string>>({});
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const formatMoney = (minor: number, currency = "RON") =>
    new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(minor / 100);

  const formatDate = (value: string | null) => {
    if (!value) return copy.common.none;
    return new Intl.DateTimeFormat(localeTag, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }).format(new Date(value));
  };

  const formatPeriod = (value: string) =>
    new Intl.DateTimeFormat(localeTag, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T12:00:00Z`));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/sms", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as SmsAdminResponse;

      if (!response.ok) {
        throw new Error(
          locale === "ro" && result.error
            ? result.error
            : copy.smsPanel.loadFailed
        );
      }

      setSettings(result.settings ?? null);
      setBilling(result.billing ?? null);
      setDoctorCounters(result.doctorCounters ?? []);
      setBillingPeriods(result.smsBillingPeriods ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.smsPanel.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.smsPanel.loadFailed, locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCounters = useMemo(() => {
    const needle = normalizeForSearch(search);

    return doctorCounters.filter((counter) => {
      const searchMatches =
        !needle ||
        normalizeForSearch(`${counter.doctorName} ${counter.slug}`).includes(
          needle
        );
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "sent" && counter.sent > 0) ||
        (statusFilter === "failed" && counter.failed > 0) ||
        (statusFilter === "uninvoiced" && counter.uninvoiced > 0) ||
        (statusFilter === "invoiced" && counter.invoiced > 0) ||
        (statusFilter === "zero" && counter.total === 0);
      return searchMatches && statusMatches;
    });
  }, [doctorCounters, search, statusFilter]);

  const filteredPeriods = useMemo(() => {
    const needle = normalizeForSearch(search);
    return billingPeriods.filter(
      (period) =>
        !needle ||
        normalizeForSearch(`${period.doctorName} ${period.slug}`).includes(needle)
    );
  }, [billingPeriods, search]);

  const totals = useMemo(
    () =>
      doctorCounters.reduce(
        (result, counter) => ({
          total: result.total + counter.total,
          sent: result.sent + counter.sent,
          failed: result.failed + counter.failed,
          confirmations: result.confirmations + counter.confirmed,
          reminders: result.reminders + counter.reminder24h,
          uninvoiced: result.uninvoiced + counter.uninvoiced,
          estimated: result.estimated + counter.estimatedUninvoicedMinor,
        }),
        {
          total: 0,
          sent: 0,
          failed: 0,
          confirmations: 0,
          reminders: 0,
          uninvoiced: 0,
          estimated: 0,
        }
      ),
    [doctorCounters]
  );

  function saveSettings() {
    if (!settings) return;
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/sms", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            smsEnabled: settings.sms_enabled,
            confirmationSmsEnabled: settings.confirmation_sms_enabled,
            reminder24hSmsEnabled: settings.reminder_24h_sms_enabled,
          }),
        });
        const result = (await response.json()) as SmsAdminResponse;

        if (!response.ok || !result.settings) {
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : copy.smsPanel.saveFailed
          );
        }

        setSettings(result.settings);
        setMessage(copy.smsPanel.updated);
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : copy.smsPanel.saveFailed
        );
      }
    });
  }

  function markDoctorInvoiced(counter: DoctorCounter) {
    const invoiceReference = (invoiceReferences[counter.doctorId] ?? "").trim();
    if (!invoiceReference) {
      setError(copy.smsPanel.invoiceReference);
      return;
    }

    setActiveDoctorId(counter.doctorId);
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/sms", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_doctor_sms_invoiced",
            doctorId: counter.doctorId,
            invoiceReference,
          }),
        });
        const result = (await response.json()) as SmsAdminResponse;
        if (!response.ok) {
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : copy.smsPanel.saveFailed
          );
        }

        setInvoiceReferences((current) => ({
          ...current,
          [counter.doctorId]: "",
        }));
        setMessage(result.message ?? copy.smsPanel.updated);
        await loadData();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : copy.smsPanel.saveFailed
        );
      } finally {
        setActiveDoctorId(null);
      }
    });
  }

  function saveSagaReference(period: SmsBillingPeriod) {
    const invoiceReference = (
      sagaReferences[period.id] ??
      period.saga_invoice_reference ??
      ""
    ).trim();

    if (!invoiceReference) {
      setError(copy.smsPanel.sagaReference);
      return;
    }

    setActivePeriodId(period.id);
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/sms", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_sms_billing_period_saga_issued",
            billingPeriodId: period.id,
            invoiceReference,
          }),
        });
        const result = (await response.json()) as SmsAdminResponse;
        if (!response.ok) {
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : copy.smsPanel.saveFailed
          );
        }

        setMessage(result.message ?? copy.smsPanel.updated);
        await loadData();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : copy.smsPanel.saveFailed
        );
      } finally {
        setActivePeriodId(null);
      }
    });
  }

  const paymentLabel = (status: string) => {
    if (status === "paid") return copy.smsPanel.statuses.paid;
    if (status === "checkout_open") return copy.smsPanel.statuses.checkoutOpen;
    if (status === "failed") return copy.smsPanel.statuses.failed;
    if (status === "cancelled") return copy.smsPanel.statuses.cancelled;
    if (status === "refunded") return copy.smsPanel.statuses.refunded;
    return copy.smsPanel.statuses.unpaid;
  };

  const sagaLabel = (status: string) => {
    if (status === "issued") return copy.smsPanel.statuses.sagaIssued;
    if (status === "cancelled") return copy.smsPanel.statuses.sagaCancelled;
    return copy.smsPanel.statuses.sagaMissing;
  };

  if (isLoading) {
    return (
      <div className="rounded-[21px] border border-gray-200 bg-white p-[34px] text-center text-sm text-gray-600 shadow-sm">
        {copy.common.loading}
      </div>
    );
  }

  return (
    <div className="space-y-[34px]">
      {error ? (
        <p role="alert" className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800">
          {message}
        </p>
      ) : null}

      {settings ? (
        <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            {copy.smsPanel.serviceTitle}
          </h2>
          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {copy.smsPanel.serviceDescription}
          </p>

          <div className="mt-[21px] grid gap-[13px] md:grid-cols-3">
            {[
              ["sms_enabled", copy.smsPanel.serviceEnabled],
              ["confirmation_sms_enabled", copy.smsPanel.confirmationEnabled],
              ["reminder_24h_sms_enabled", copy.smsPanel.reminderEnabled],
            ].map(([key, label]) => {
              const settingKey = key as
                | "sms_enabled"
                | "confirmation_sms_enabled"
                | "reminder_24h_sms_enabled";
              return (
                <label
                  key={key}
                  className="flex items-center justify-between gap-[13px] rounded-[13px] border border-gray-200 bg-gray-50 p-[13px]"
                >
                  <span className="text-sm font-semibold text-gray-800">
                    {label}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[settingKey]}
                    onChange={(event) =>
                      setSettings((current) =>
                        current
                          ? { ...current, [settingKey]: event.target.checked }
                          : current
                      )
                    }
                    className="h-5 w-5 accent-[#036661]"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-[13px] flex flex-wrap items-center justify-between gap-[13px] text-sm text-gray-600">
            <p>
              {copy.smsPanel.provider}: <strong>{settings.provider}</strong>
              {billing ? (
                <> · {formatMoney(billing.unitCostMinor, billing.currency)} / SMS</>
              ) : null}
            </p>
            <p>
              {copy.smsPanel.updatedAt}: {formatDate(settings.updated_at)}
            </p>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={saveSettings}
            className="romdoc-focus-ring mt-[21px] rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:opacity-60"
          >
            {isPending ? copy.common.saving : copy.smsPanel.saveSettings}
          </button>
        </section>
      ) : null}

      <div className="grid gap-[13px] md:grid-cols-2 xl:grid-cols-4">
        {[
          [copy.smsPanel.sent, totals.sent],
          [copy.smsPanel.failed, totals.failed],
          [copy.smsPanel.uninvoiced, totals.uninvoiced],
          [copy.smsPanel.estimated, formatMoney(totals.estimated, billing?.currency)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {label}
            </p>
            <p className="mt-[13px] text-2xl font-bold text-gray-900">
              {value}
            </p>
          </div>
        ))}
      </div>

      <section>
        <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {copy.smsPanel.countersTitle}
            </h2>
            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {copy.smsPanel.countersDescription}
            </p>
          </div>
          <div className="grid gap-[8px] sm:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.smsPanel.searchPlaceholder}
              className="romdoc-focus-ring rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="romdoc-focus-ring rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            >
              <option value="all">{copy.smsPanel.allStatuses}</option>
              <option value="sent">{copy.smsPanel.withSent}</option>
              <option value="failed">{copy.smsPanel.withFailed}</option>
              <option value="uninvoiced">{copy.smsPanel.withUninvoiced}</option>
              <option value="invoiced">{copy.smsPanel.withInvoiced}</option>
              <option value="zero">{copy.smsPanel.zero}</option>
            </select>
          </div>
        </div>

        {filteredCounters.length === 0 ? (
          <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
            {copy.smsPanel.emptyCounters}
          </div>
        ) : (
          <div className="mt-[21px] space-y-[13px]">
            {filteredCounters.map((counter) => (
              <details key={counter.doctorId} className="rounded-[21px] border border-gray-200 bg-white shadow-sm">
                <summary className="romdoc-focus-ring flex cursor-pointer list-none flex-col gap-[13px] p-[21px] marker:content-none md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{counter.doctorName}</h3>
                    <p className="mt-[5px] text-xs text-gray-500">{counter.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-[8px] text-xs font-semibold">
                    <span className="rounded-full bg-green-100 px-[8px] py-[5px] text-green-800">
                      {copy.smsPanel.sent}: {counter.sent}
                    </span>
                    <span className="rounded-full bg-amber-100 px-[8px] py-[5px] text-amber-900">
                      {copy.smsPanel.uninvoiced}: {counter.uninvoiced}
                    </span>
                    <span className="rounded-full bg-gray-100 px-[8px] py-[5px] text-gray-700">
                      {copy.smsPanel.lastSent}: {formatDate(counter.lastSentAt)}
                    </span>
                  </div>
                </summary>

                <div className="border-t border-gray-200 bg-gray-50/60 p-[21px]">
                  <dl className="grid gap-[13px] sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      [copy.smsPanel.total, counter.total],
                      [copy.smsPanel.failed, counter.failed],
                      [copy.smsPanel.confirmations, counter.confirmed],
                      [copy.smsPanel.reminders, counter.reminder24h],
                      [copy.smsPanel.invoiced, counter.invoiced],
                      [copy.smsPanel.notBillable, counter.notBillable],
                      [copy.smsPanel.estimated, formatMoney(counter.estimatedUninvoicedMinor, billing?.currency)],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {label}
                        </dt>
                        <dd className="mt-[5px] text-sm font-semibold text-gray-900">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {counter.uninvoiced > 0 ? (
                    <div className="mt-[21px] flex flex-col gap-[8px] sm:flex-row">
                      <input
                        value={invoiceReferences[counter.doctorId] ?? ""}
                        onChange={(event) =>
                          setInvoiceReferences((current) => ({
                            ...current,
                            [counter.doctorId]: event.target.value,
                          }))
                        }
                        placeholder={copy.smsPanel.invoiceReference}
                        className="romdoc-focus-ring min-w-0 flex-1 rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
                      />
                      <button
                        type="button"
                        disabled={isPending && activeDoctorId === counter.doctorId}
                        onClick={() => markDoctorInvoiced(counter)}
                        className="romdoc-focus-ring rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {isPending && activeDoctorId === counter.doctorId
                          ? copy.smsPanel.processing
                          : copy.smsPanel.markInvoiced}
                      </button>
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900">
          {copy.smsPanel.periodsTitle}
        </h2>
        <p className="mt-[8px] text-sm leading-6 text-gray-600">
          {copy.smsPanel.periodsDescription}
        </p>

        {filteredPeriods.length === 0 ? (
          <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
            {copy.smsPanel.emptyPeriods}
          </div>
        ) : (
          <div className="mt-[21px] space-y-[13px]">
            {filteredPeriods.map((period) => (
              <details key={period.id} className="rounded-[21px] border border-gray-200 bg-white shadow-sm">
                <summary className="romdoc-focus-ring flex cursor-pointer list-none flex-col gap-[13px] p-[21px] marker:content-none md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{period.doctorName}</h3>
                    <p className="mt-[5px] text-sm capitalize text-gray-500">
                      {formatPeriod(period.period_start)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-[8px] text-xs font-semibold">
                    <span className="rounded-full bg-gray-100 px-[8px] py-[5px] text-gray-700">
                      {copy.smsPanel.smsCount}: {period.sms_count}
                    </span>
                    <span className="rounded-full bg-blue-100 px-[8px] py-[5px] text-blue-800">
                      {paymentLabel(period.payment_status)}
                    </span>
                    <span className="rounded-full bg-amber-100 px-[8px] py-[5px] text-amber-900">
                      {sagaLabel(period.saga_invoice_status)}
                    </span>
                  </div>
                </summary>

                <div className="border-t border-gray-200 bg-gray-50/60 p-[21px]">
                  <dl className="grid gap-[13px] sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      [copy.smsPanel.period, `${period.period_start} – ${period.period_end}`],
                      [copy.smsPanel.net, formatMoney(period.net_amount_minor, period.currency)],
                      [copy.smsPanel.gross, formatMoney(period.gross_amount_minor, period.currency)],
                      [copy.smsPanel.paymentStatus, paymentLabel(period.payment_status)],
                      [copy.smsPanel.sagaStatus, sagaLabel(period.saga_invoice_status)],
                      [copy.smsPanel.sagaReference, period.saga_invoice_reference || copy.common.none],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {label}
                        </dt>
                        <dd className="mt-[5px] text-sm font-semibold text-gray-900">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-[21px] flex flex-col gap-[8px] sm:flex-row">
                    <input
                      value={
                        sagaReferences[period.id] ??
                        period.saga_invoice_reference ??
                        ""
                      }
                      onChange={(event) =>
                        setSagaReferences((current) => ({
                          ...current,
                          [period.id]: event.target.value,
                        }))
                      }
                      placeholder={copy.smsPanel.sagaReference}
                      className="romdoc-focus-ring min-w-0 flex-1 rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
                    />
                    <button
                      type="button"
                      disabled={isPending && activePeriodId === period.id}
                      onClick={() => saveSagaReference(period)}
                      className="romdoc-focus-ring rounded-[13px] border border-[#036661]/30 bg-[#036661]/5 px-[21px] py-[13px] text-sm font-semibold text-[#036661] disabled:opacity-60"
                    >
                      {isPending && activePeriodId === period.id
                        ? copy.smsPanel.processing
                        : copy.smsPanel.saveSaga}
                    </button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
