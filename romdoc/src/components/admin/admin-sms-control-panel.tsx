"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
};

function formatDate(value: string | null) {
  if (!value) {
    return "â€”";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPeriod(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatMoney(minorAmount: number, currency = "RON") {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minorAmount / 100);
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .trim();
}

function paymentStatusLabel(status: string) {
  if (status === "paid") {
    return "PlÄƒtit";
  }

  if (status === "checkout_open") {
    return "Checkout deschis";
  }

  if (status === "failed") {
    return "EÈ™uat";
  }

  if (status === "cancelled") {
    return "Anulat";
  }

  if (status === "refunded") {
    return "Rambursat";
  }

  return "NeplÄƒtit";
}

function sagaStatusLabel(status: string) {
  if (status === "issued") {
    return "EmisÄƒ";
  }

  if (status === "cancelled") {
    return "AnulatÄƒ";
  }

  return "NeemisÄƒ";
}

export default function AdminSmsControlPanel() {
  const [settings, setSettings] = useState<SmsSettings | null>(null);
  const [billing, setBilling] = useState<SmsBilling | null>(null);
  const [doctorCounters, setDoctorCounters] = useState<DoctorCounter[]>([]);
  const [smsBillingPeriods, setSmsBillingPeriods] = useState<SmsBillingPeriod[]>([]);
  const [sagaReferences, setSagaReferences] = useState<Record<string, string>>({});
  const [savingSagaPeriodId, setSavingSagaPeriodId] = useState<string | null>(null);
  const [invoiceReferences, setInvoiceReferences] = useState<Record<string, string>>({});
  const [invoicingDoctorId, setInvoicingDoctorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [billingStatusFilter, setBillingStatusFilter] = useState("open");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          result.error ?? "SetÄƒrile SMS nu au putut fi Ã®ncÄƒrcate."
        );
      }

      setSettings(result.settings ?? null);
      setBilling(result.billing ?? null);
      setDoctorCounters(result.doctorCounters ?? []);
      setSmsBillingPeriods(result.smsBillingPeriods ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "SetÄƒrile SMS nu au putut fi Ã®ncÄƒrcate."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadData]);

  const filteredCounters = useMemo(() => {
    const normalizedSearch = normalizeForSearch(search);

    return doctorCounters.filter((counter) => {
      const searchMatches =
        !normalizedSearch ||
        normalizeForSearch(`${counter.doctorName} ${counter.slug}`).includes(
          normalizedSearch
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

  const filteredBillingPeriods = useMemo(() => {
    const normalizedSearch = normalizeForSearch(search);

    return smsBillingPeriods.filter((period) => {
      const searchMatches =
        !normalizedSearch ||
        normalizeForSearch(`${period.doctorName} ${period.slug}`).includes(
          normalizedSearch
        );

      const statusMatches =
        billingStatusFilter === "all" ||
        (billingStatusFilter === "open" && period.payment_status !== "paid") ||
        (billingStatusFilter === "paid" && period.payment_status === "paid") ||
        (billingStatusFilter === "saga_missing" &&
          period.saga_invoice_status !== "issued") ||
        (billingStatusFilter === "saga_issued" &&
          period.saga_invoice_status === "issued");

      return searchMatches && statusMatches;
    });
  }, [billingStatusFilter, search, smsBillingPeriods]);

  const totals = useMemo(() => {
    return doctorCounters.reduce(
      (currentTotals, counter) => ({
        total: currentTotals.total + counter.total,
        sent: currentTotals.sent + counter.sent,
        failed: currentTotals.failed + counter.failed,
        skipped: currentTotals.skipped + counter.skipped,
        confirmed: currentTotals.confirmed + counter.confirmed,
        reminder24h: currentTotals.reminder24h + counter.reminder24h,
        invoiced: currentTotals.invoiced + counter.invoiced,
        uninvoiced: currentTotals.uninvoiced + counter.uninvoiced,
        notBillable: currentTotals.notBillable + counter.notBillable,
        credited: currentTotals.credited + counter.credited,
        estimatedUninvoicedMinor:
          currentTotals.estimatedUninvoicedMinor +
          counter.estimatedUninvoicedMinor,
        estimatedInvoicedMinor:
          currentTotals.estimatedInvoicedMinor + counter.estimatedInvoicedMinor,
      }),
      {
        total: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        confirmed: 0,
        reminder24h: 0,
        invoiced: 0,
        uninvoiced: 0,
        notBillable: 0,
        credited: 0,
        estimatedUninvoicedMinor: 0,
        estimatedInvoicedMinor: 0,
      }
    );
  }, [doctorCounters]);

  const billingTotals = useMemo(() => {
    return smsBillingPeriods.reduce(
      (currentTotals, period) => ({
        unpaidMinor:
          currentTotals.unpaidMinor +
          (period.payment_status === "paid" ? 0 : period.gross_amount_minor),
        paidMinor:
          currentTotals.paidMinor +
          (period.payment_status === "paid" ? period.gross_amount_minor : 0),
        sagaMissing: currentTotals.sagaMissing +
          (period.saga_invoice_status === "issued" ? 0 : 1),
        periods: currentTotals.periods + 1,
      }),
      {
        unpaidMinor: 0,
        paidMinor: 0,
        sagaMissing: 0,
        periods: 0,
      }
    );
  }, [smsBillingPeriods]);

  async function saveSettings(nextSettings: SmsSettings) {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/sms", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smsEnabled: nextSettings.sms_enabled,
          confirmationSmsEnabled: nextSettings.confirmation_sms_enabled,
          reminder24hSmsEnabled: nextSettings.reminder_24h_sms_enabled,
        }),
      });

      const result = (await response.json()) as SmsAdminResponse;

      if (!response.ok || !result.settings) {
        throw new Error(
          result.error ?? "SetÄƒrile SMS nu au putut fi salvate."
        );
      }

      setSettings(result.settings);
      setSuccess(result.message ?? "SetÄƒrile SMS au fost salvate.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "SetÄƒrile SMS nu au putut fi salvate."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function markDoctorSmsAsInvoiced(counter: DoctorCounter) {
    const invoiceReference = (invoiceReferences[counter.doctorId] ?? "").trim();

    if (!invoiceReference) {
      setError("Introdu referinÈ›a facturii Ã®nainte de marcare.");
      setSuccess("");
      return;
    }

    setInvoicingDoctorId(counter.doctorId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/sms", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark_doctor_sms_invoiced",
          doctorId: counter.doctorId,
          invoiceReference,
        }),
      });

      const result = (await response.json()) as SmsAdminResponse;

      if (!response.ok) {
        throw new Error(
          result.error ?? "SMS-urile nu au putut fi marcate ca facturate."
        );
      }

      setSuccess(
        result.message ??
          `${counter.uninvoiced} SMS-uri au fost marcate ca facturate.`
      );
      setInvoiceReferences((current) => ({
        ...current,
        [counter.doctorId]: "",
      }));
      await loadData();
    } catch (invoiceError) {
      setError(
        invoiceError instanceof Error
          ? invoiceError.message
          : "SMS-urile nu au putut fi marcate ca facturate."
      );
    } finally {
      setInvoicingDoctorId(null);
    }
  }

  async function saveSagaReference(period: SmsBillingPeriod) {
    const invoiceReference =
      (sagaReferences[period.id] ?? period.saga_invoice_reference ?? "").trim();

    if (!invoiceReference) {
      setError("Introdu referinÈ›a facturii SAGA Ã®nainte de salvare.");
      setSuccess("");
      return;
    }

    setSavingSagaPeriodId(period.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/sms", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark_sms_billing_period_saga_issued",
          billingPeriodId: period.id,
          invoiceReference,
        }),
      });

      const result = (await response.json()) as SmsAdminResponse;

      if (!response.ok) {
        throw new Error(
          result.error ?? "ReferinÈ›a SAGA nu a putut fi salvatÄƒ."
        );
      }

      setSuccess(result.message ?? "ReferinÈ›a SAGA a fost salvatÄƒ.");
      setSagaReferences((current) => ({
        ...current,
        [period.id]: "",
      }));
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "ReferinÈ›a SAGA nu a putut fi salvatÄƒ."
      );
    } finally {
      setSavingSagaPeriodId(null);
    }
  }

  function updateSetting(field: keyof SmsSettings, value: boolean) {
    if (!settings) {
      return;
    }

    const nextSettings = {
      ...settings,
      [field]: value,
    };

    setSettings(nextSettings);
    void saveSettings(nextSettings);
  }

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">Se Ã®ncarcÄƒ setÄƒrile SMS...</p>
      </section>
    );
  }

  const currency = billing?.currency ?? "RON";
  const unitPrice = billing?.unitCostMinor ?? 30;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              SMS
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              Control serviciu SMS
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
              ActiveazÄƒ sau opreÈ™te notificÄƒrile SMS pentru confirmÄƒri È™i reamintiri cu 24 de ore Ã®nainte. ProgramÄƒrile nu trebuie sÄƒ eÈ™ueze dacÄƒ trimiterea SMS nu reuÈ™eÈ™te.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isSaving || Boolean(invoicingDoctorId) || Boolean(savingSagaPeriodId)}
            className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ReÃ®ncarcÄƒ
          </button>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            role="status"
            className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {success}
          </div>
        ) : null}

        {settings ? (
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            <label className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">Master SMS switch</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    OpreÈ™te sau porneÈ™te toate SMS-urile RomDoc.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.sms_enabled}
                  disabled={isSaving}
                  onChange={(event) =>
                    updateSetting("sms_enabled", event.target.checked)
                  }
                  className="mt-1 h-5 w-5"
                />
              </div>
            </label>

            <label className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">ConfirmÄƒri SMS</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Trimite SMS cÃ¢nd o programare este confirmatÄƒ.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.confirmation_sms_enabled}
                  disabled={isSaving || !settings.sms_enabled}
                  onChange={(event) =>
                    updateSetting("confirmation_sms_enabled", event.target.checked)
                  }
                  className="mt-1 h-5 w-5"
                />
              </div>
            </label>

            <label className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">Reamintire 24h SMS</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Trimite SMS cu aproximativ 24 de ore Ã®nainte de programare.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reminder_24h_sms_enabled}
                  disabled={isSaving || !settings.sms_enabled}
                  onChange={(event) =>
                    updateSetting("reminder_24h_sms_enabled", event.target.checked)
                  }
                  className="mt-1 h-5 w-5"
                />
              </div>
            </label>
          </div>
        ) : null}

        <p className="mt-5 text-xs leading-5 text-gray-500">
          Provider configurat: SMSLink. Pentru producÈ›ie sunt necesare variabilele de mediu SMSLINK_CONNECTION_ID È™i SMSLINK_PASSWORD.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Facturare SMS / SAGA
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              MonitorizeazÄƒ soldurile SMS plÄƒtite/neplÄƒtite È™i salveazÄƒ referinÈ›a facturii fiscale emise Ã®n SAGA.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="CautÄƒ medic sau slug"
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-950"
            />

            <select
              value={billingStatusFilter}
              onChange={(event) => setBillingStatusFilter(event.target.value)}
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-950"
            >
              <option value="open">Solduri neplÄƒtite</option>
              <option value="paid">PlÄƒtite</option>
              <option value="saga_missing">FÄƒrÄƒ facturÄƒ SAGA</option>
              <option value="saga_issued">Cu facturÄƒ SAGA</option>
              <option value="all">Toate perioadele</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Sold neplÄƒtit</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{formatMoney(billingTotals.unpaidMinor, currency)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">PlÄƒtit</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{formatMoney(billingTotals.paidMinor, currency)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Perioade</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{billingTotals.periods}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">FÄƒrÄƒ SAGA</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{billingTotals.sagaMissing}</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
          <div className="hidden grid-cols-[1.5fr_0.9fr_0.7fr_0.9fr_0.9fr_0.9fr_1.4fr] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
            <span>Medic</span>
            <span>PerioadÄƒ</span>
            <span>SMS</span>
            <span>Total</span>
            <span>PlatÄƒ</span>
            <span>SAGA</span>
            <span>ReferinÈ›Äƒ SAGA</span>
          </div>

          {filteredBillingPeriods.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-600">
              Nu existÄƒ perioade de facturare pentru filtrul selectat.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredBillingPeriods.map((period) => {
                const isSavingSaga = savingSagaPeriodId === period.id;
                const currentSagaReference =
                  sagaReferences[period.id] ?? period.saga_invoice_reference ?? "";

                return (
                  <div
                    key={period.id}
                    className="grid gap-3 px-4 py-4 text-sm text-gray-700 lg:grid-cols-[1.5fr_0.9fr_0.7fr_0.9fr_0.9fr_0.9fr_1.4fr]"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{period.doctorName}</p>
                      <p className="text-xs text-gray-500">{period.slug}</p>
                    </div>
                    <p><span className="font-semibold lg:hidden">PerioadÄƒ: </span>{formatPeriod(period.period_start)}</p>
                    <p><span className="font-semibold lg:hidden">SMS: </span>{period.sms_count}</p>
                    <p><span className="font-semibold lg:hidden">Total: </span>{formatMoney(period.gross_amount_minor, period.currency)}</p>
                    <div>
                      <p>{paymentStatusLabel(period.payment_status)}</p>
                      <p className="text-xs text-gray-500">{formatDate(period.paid_at)}</p>
                    </div>
                    <div>
                      <p>{sagaStatusLabel(period.saga_invoice_status)}</p>
                      <p className="text-xs text-gray-500">{formatDate(period.saga_invoice_issued_at)}</p>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={currentSagaReference}
                        onChange={(event) =>
                          setSagaReferences((current) => ({
                            ...current,
                            [period.id]: event.target.value,
                          }))
                        }
                        placeholder="Ex: SAGA-2026-001"
                        disabled={isSavingSaga}
                        className="romdoc-focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-950 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => void saveSagaReference(period)}
                        disabled={isSavingSaga}
                        className="romdoc-focus-ring w-full rounded-lg bg-[#036661] px-3 py-2 text-xs font-semibold text-white hover:bg-[#024d49] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                      >
                        {isSavingSaga ? "Se salveazÄƒ..." : "SalveazÄƒ SAGA"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Counter SMS pe medic
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              PreÈ› configurat: {formatMoney(unitPrice, currency)} / SMS trimis + TVA. Doar SMS-urile trimise cu succes sunt marcate ca facturabile.
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-950 lg:w-[260px]"
          >
            <option value="all">ToÈ›i medicii</option>
            <option value="sent">Cu SMS trimise</option>
            <option value="uninvoiced">Cu SMS nefacturate</option>
            <option value="invoiced">Cu SMS facturate</option>
            <option value="failed">Cu SMS eÈ™uate</option>
            <option value="zero">FÄƒrÄƒ SMS</option>
          </select>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totals.total}</p>
          </div>
          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Trimise</p>
            <p className="mt-1 text-2xl font-bold text-green-900">{totals.sent}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Nefacturate</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{totals.uninvoiced}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Facturate</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{totals.invoiced}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Valoare nefacturatÄƒ</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{formatMoney(totals.estimatedUninvoicedMinor, currency)}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">EÈ™uate</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{totals.failed}</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
          <div className="hidden grid-cols-[1.8fr_0.7fr_0.7fr_0.85fr_0.85fr_1fr_0.85fr_1.5fr] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
            <span>Medic</span>
            <span>Trimise</span>
            <span>EÈ™uate</span>
            <span>Nefacturate</span>
            <span>Facturate</span>
            <span>Valoare</span>
            <span>Ultimul SMS</span>
            <span>Facturare veche</span>
          </div>

          {filteredCounters.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-600">
              Nu existÄƒ rezultate pentru filtrul selectat.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCounters.map((counter) => {
                const isInvoicing = invoicingDoctorId === counter.doctorId;
                const canMarkInvoiced = counter.uninvoiced > 0 && !isInvoicing;

                return (
                  <div
                    key={counter.doctorId}
                    className="grid gap-3 px-4 py-4 text-sm text-gray-700 lg:grid-cols-[1.8fr_0.7fr_0.7fr_0.85fr_0.85fr_1fr_0.85fr_1.5fr]"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{counter.doctorName}</p>
                      <p className="text-xs text-gray-500">{counter.slug}</p>
                    </div>
                    <p><span className="font-semibold lg:hidden">Trimise: </span>{counter.sent}</p>
                    <p><span className="font-semibold lg:hidden">EÈ™uate: </span>{counter.failed}</p>
                    <p><span className="font-semibold lg:hidden">Nefacturate: </span>{counter.uninvoiced}</p>
                    <p><span className="font-semibold lg:hidden">Facturate: </span>{counter.invoiced}</p>
                    <p><span className="font-semibold lg:hidden">Valoare nefacturatÄƒ: </span>{formatMoney(counter.estimatedUninvoicedMinor, currency)}</p>
                    <p><span className="font-semibold lg:hidden">Ultimul SMS: </span>{formatDate(counter.lastSentAt)}</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={invoiceReferences[counter.doctorId] ?? ""}
                        onChange={(event) =>
                          setInvoiceReferences((current) => ({
                            ...current,
                            [counter.doctorId]: event.target.value,
                          }))
                        }
                        disabled={counter.uninvoiced === 0 || isInvoicing}
                        placeholder="Factura nr."
                        className="romdoc-focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-950 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => void markDoctorSmsAsInvoiced(counter)}
                        disabled={!canMarkInvoiced}
                        className="romdoc-focus-ring w-full rounded-lg bg-[#036661] px-3 py-2 text-xs font-semibold text-white hover:bg-[#024d49] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                      >
                        {isInvoicing ? "Se salveazÄƒ..." : "MarcheazÄƒ facturat"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

