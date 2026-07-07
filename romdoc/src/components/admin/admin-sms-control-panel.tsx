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
  lastSentAt: string | null;
};

type SmsAdminResponse = {
  settings?: SmsSettings;
  doctorCounters?: DoctorCounter[];
  message?: string;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .trim();
}

export default function AdminSmsControlPanel() {
  const [settings, setSettings] = useState<SmsSettings | null>(null);
  const [doctorCounters, setDoctorCounters] = useState<DoctorCounter[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
          result.error ?? "Setările SMS nu au putut fi încărcate."
        );
      }

      setSettings(result.settings ?? null);
      setDoctorCounters(result.doctorCounters ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Setările SMS nu au putut fi încărcate."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCounters = useMemo(() => {
    const normalizedSearch = normalizeForSearch(search);

    return doctorCounters.filter((counter) => {
      const searchMatches =
        !normalizedSearch ||
        normalizeForSearch(
          `${counter.doctorName} ${counter.slug}`
        ).includes(normalizedSearch);

      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "sent" && counter.sent > 0) ||
        (statusFilter === "failed" && counter.failed > 0) ||
        (statusFilter === "zero" && counter.total === 0);

      return searchMatches && statusMatches;
    });
  }, [doctorCounters, search, statusFilter]);

  const totals = useMemo(() => {
    return doctorCounters.reduce(
      (currentTotals, counter) => ({
        total: currentTotals.total + counter.total,
        sent: currentTotals.sent + counter.sent,
        failed: currentTotals.failed + counter.failed,
        skipped: currentTotals.skipped + counter.skipped,
        confirmed: currentTotals.confirmed + counter.confirmed,
        reminder24h:
          currentTotals.reminder24h + counter.reminder24h,
      }),
      {
        total: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        confirmed: 0,
        reminder24h: 0,
      }
    );
  }, [doctorCounters]);

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
          confirmationSmsEnabled:
            nextSettings.confirmation_sms_enabled,
          reminder24hSmsEnabled:
            nextSettings.reminder_24h_sms_enabled,
        }),
      });

      const result = (await response.json()) as SmsAdminResponse;

      if (!response.ok || !result.settings) {
        throw new Error(
          result.error ?? "Setările SMS nu au putut fi salvate."
        );
      }

      setSettings(result.settings);
      setSuccess(result.message ?? "Setările SMS au fost salvate.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Setările SMS nu au putut fi salvate."
      );
    } finally {
      setIsSaving(false);
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
        <p className="text-sm text-gray-600">
          Se încarcă setările SMS...
        </p>
      </section>
    );
  }

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
              Activează sau oprește notificările SMS pentru confirmări și reamintiri cu 24 de ore înainte. Programările nu trebuie să eșueze dacă trimiterea SMS nu reușește.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isSaving}
            className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reîncarcă
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
                  <p className="font-semibold text-gray-900">
                    Master SMS switch
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Oprește sau pornește toate SMS-urile RomDoc.
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
                  <p className="font-semibold text-gray-900">
                    Confirmări SMS
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Trimite SMS când o programare este confirmată.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.confirmation_sms_enabled}
                  disabled={isSaving || !settings.sms_enabled}
                  onChange={(event) =>
                    updateSetting(
                      "confirmation_sms_enabled",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-5 w-5"
                />
              </div>
            </label>

            <label className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">
                    Reamintire 24h SMS
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Trimite SMS cu aproximativ 24 de ore înainte de programare.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reminder_24h_sms_enabled}
                  disabled={isSaving || !settings.sms_enabled}
                  onChange={(event) =>
                    updateSetting(
                      "reminder_24h_sms_enabled",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-5 w-5"
                />
              </div>
            </label>
          </div>
        ) : null}

        <p className="mt-5 text-xs leading-5 text-gray-500">
          Provider configurat: Twilio. Pentru producție sunt necesare variabilele de mediu Twilio și un număr/sender aprobat.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Counter SMS pe medic
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Fiecare medic apare pe un singur rând. Contorul ajută la estimarea costurilor și la viitoare ajustări de abonament.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Caută medic sau slug"
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-950"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-950"
            >
              <option value="all">Toți medicii</option>
              <option value="sent">Cu SMS trimise</option>
              <option value="failed">Cu SMS eșuate</option>
              <option value="zero">Fără SMS</option>
            </select>
          </div>
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
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Eșuate</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{totals.failed}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Sărite</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{totals.skipped}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Confirmări</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{totals.confirmed}</p>
          </div>
          <div className="rounded-xl bg-purple-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">24h</p>
            <p className="mt-1 text-2xl font-bold text-purple-900">{totals.reminder24h}</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
            <span>Medic</span>
            <span>Total</span>
            <span>Trimise</span>
            <span>Eșuate</span>
            <span>Confirmări</span>
            <span>24h</span>
            <span>Ultimul SMS</span>
          </div>

          {filteredCounters.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-600">
              Nu există rezultate pentru filtrul selectat.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCounters.map((counter) => (
                <div
                  key={counter.doctorId}
                  className="grid gap-3 px-4 py-4 text-sm text-gray-700 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr]"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {counter.doctorName}
                    </p>
                    <p className="text-xs text-gray-500">{counter.slug}</p>
                  </div>
                  <p><span className="font-semibold lg:hidden">Total: </span>{counter.total}</p>
                  <p><span className="font-semibold lg:hidden">Trimise: </span>{counter.sent}</p>
                  <p><span className="font-semibold lg:hidden">Eșuate: </span>{counter.failed}</p>
                  <p><span className="font-semibold lg:hidden">Confirmări: </span>{counter.confirmed}</p>
                  <p><span className="font-semibold lg:hidden">24h: </span>{counter.reminder24h}</p>
                  <p><span className="font-semibold lg:hidden">Ultimul SMS: </span>{formatDate(counter.lastSentAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
