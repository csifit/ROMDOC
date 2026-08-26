"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

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
  delivered: number;
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

type AdminSmsControlPanelProps = {
  locale: AppLocale;
};

type Copy = {
  loading: string;
  none: string;
  saving: string;
  loadFailed: string;
  saveFailed: string;
  updated: string;
  serviceTitle: string;
  serviceDescription: string;
  serviceEnabled: string;
  confirmationEnabled: string;
  reminderEnabled: string;
  provider: string;
  updatedAt: string;
  saveSettings: string;
  operationalTitle: string;
  operationalDescription: string;
  total: string;
  sent: string;
  delivered: string;
  failed: string;
  skipped: string;
  confirmations: string;
  reminders: string;
  countersTitle: string;
  countersDescription: string;
  searchPlaceholder: string;
  allStatuses: string;
  withSent: string;
  withDelivered: string;
  withFailed: string;
  withSkipped: string;
  zero: string;
  lastSent: string;
  emptyCounters: string;
  includedNotice: string;
};

const COPY: Record<
  AppLocale,
  Copy
> = {
  ro: {
    loading: "Se încarcă...",
    none: "—",
    saving: "Se salvează...",
    loadFailed:
      "Datele SMS nu au putut fi încărcate.",
    saveFailed:
      "Setările SMS nu au putut fi salvate.",
    updated:
      "Setările SMS au fost actualizate.",
    serviceTitle:
      "Serviciu SMS",
    serviceDescription:
      "Controlează trimiterea confirmărilor și reamintirilor SMS. Aceste comutatoare nu modifică prețul abonamentului.",
    serviceEnabled:
      "Serviciu SMS activ",
    confirmationEnabled:
      "SMS de confirmare",
    reminderEnabled:
      "Reamintire SMS 24h",
    provider:
      "Furnizor",
    updatedAt:
      "Actualizat",
    saveSettings:
      "Salvează setările",
    operationalTitle:
      "Rezumat operațional",
    operationalDescription:
      "Date agregate despre trimiterea și livrarea SMS-urilor pe platformă.",
    total:
      "Înregistrări",
    sent:
      "Trimise",
    delivered:
      "Livrate",
    failed:
      "Eșuate",
    skipped:
      "Omise",
    confirmations:
      "Confirmări",
    reminders:
      "Reamintiri 24h",
    countersTitle:
      "Utilizare SMS pe medic",
    countersDescription:
      "Contoare operaționale pentru fiecare medic. Nu sunt afișate costuri, facturi sau valori nefacturate.",
    searchPlaceholder:
      "Caută medic...",
    allStatuses:
      "Toate stările",
    withSent:
      "Cu SMS trimise",
    withDelivered:
      "Cu SMS livrate",
    withFailed:
      "Cu SMS eșuate",
    withSkipped:
      "Cu SMS omise",
    zero:
      "Fără activitate",
    lastSent:
      "Ultimul SMS",
    emptyCounters:
      "Nu există medici care corespund filtrelor.",
    includedNotice:
      "SMS-urile sunt incluse în abonamentele RomDoc și sunt urmărite aici numai ca utilizare operațională.",
  },
  en: {
    loading: "Loading...",
    none: "—",
    saving: "Saving...",
    loadFailed:
      "SMS data could not be loaded.",
    saveFailed:
      "SMS settings could not be saved.",
    updated:
      "SMS settings were updated.",
    serviceTitle:
      "SMS service",
    serviceDescription:
      "Control appointment confirmation and reminder SMS. These switches do not change the subscription price.",
    serviceEnabled:
      "SMS service enabled",
    confirmationEnabled:
      "Confirmation SMS",
    reminderEnabled:
      "24h reminder SMS",
    provider:
      "Provider",
    updatedAt:
      "Updated",
    saveSettings:
      "Save settings",
    operationalTitle:
      "Operational summary",
    operationalDescription:
      "Aggregate platform SMS sending and delivery information.",
    total:
      "Records",
    sent:
      "Sent",
    delivered:
      "Delivered",
    failed:
      "Failed",
    skipped:
      "Skipped",
    confirmations:
      "Confirmations",
    reminders:
      "24h reminders",
    countersTitle:
      "SMS usage by doctor",
    countersDescription:
      "Operational counters for each doctor. No costs, invoices or uninvoiced values are displayed.",
    searchPlaceholder:
      "Search doctor...",
    allStatuses:
      "All statuses",
    withSent:
      "With sent SMS",
    withDelivered:
      "With delivered SMS",
    withFailed:
      "With failed SMS",
    withSkipped:
      "With skipped SMS",
    zero:
      "No activity",
    lastSent:
      "Last SMS",
    emptyCounters:
      "No doctors match the selected filters.",
    includedNotice:
      "SMS is included in RomDoc subscriptions and is tracked here only as operational usage.",
  },
  de: {
    loading: "Wird geladen...",
    none: "—",
    saving: "Wird gespeichert...",
    loadFailed:
      "SMS-Daten konnten nicht geladen werden.",
    saveFailed:
      "SMS-Einstellungen konnten nicht gespeichert werden.",
    updated:
      "SMS-Einstellungen wurden aktualisiert.",
    serviceTitle:
      "SMS-Dienst",
    serviceDescription:
      "Steuere Bestätigungs- und Erinnerungs-SMS für Termine. Diese Schalter ändern den Abonnementpreis nicht.",
    serviceEnabled:
      "SMS-Dienst aktiv",
    confirmationEnabled:
      "Bestätigungs-SMS",
    reminderEnabled:
      "24h-Erinnerungs-SMS",
    provider:
      "Anbieter",
    updatedAt:
      "Aktualisiert",
    saveSettings:
      "Einstellungen speichern",
    operationalTitle:
      "Operative Übersicht",
    operationalDescription:
      "Aggregierte Informationen zum SMS-Versand und zur Zustellung auf der Plattform.",
    total:
      "Einträge",
    sent:
      "Gesendet",
    delivered:
      "Zugestellt",
    failed:
      "Fehlgeschlagen",
    skipped:
      "Übersprungen",
    confirmations:
      "Bestätigungen",
    reminders:
      "24h-Erinnerungen",
    countersTitle:
      "SMS-Nutzung nach Arzt",
    countersDescription:
      "Operative Zähler für jeden Arzt. Es werden keine Kosten, Rechnungen oder nicht abgerechneten Beträge angezeigt.",
    searchPlaceholder:
      "Arzt suchen...",
    allStatuses:
      "Alle Status",
    withSent:
      "Mit gesendeten SMS",
    withDelivered:
      "Mit zugestellten SMS",
    withFailed:
      "Mit fehlgeschlagenen SMS",
    withSkipped:
      "Mit übersprungenen SMS",
    zero:
      "Keine Aktivität",
    lastSent:
      "Letzte SMS",
    emptyCounters:
      "Keine Ärzte entsprechen den gewählten Filtern.",
    includedNotice:
      "SMS sind in den RomDoc-Abonnements enthalten und werden hier nur als operative Nutzung verfolgt.",
  },
};

function normalizeForSearch(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function localeTag(
  locale: AppLocale
) {
  if (locale === "de") {
    return "de-DE";
  }

  if (locale === "en") {
    return "en-GB";
  }

  return "ro-RO";
}

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-[13px] text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

export default function AdminSmsControlPanel({
  locale,
}: AdminSmsControlPanelProps) {
  const copy =
    COPY[locale];

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    settings,
    setSettings,
  ] = useState<
    SmsSettings | null
  >(null);

  const [
    doctorCounters,
    setDoctorCounters,
  ] = useState<
    DoctorCounter[]
  >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const formatDate =
    useCallback(
      (
        value:
          | string
          | null
      ) => {
        if (!value) {
          return copy.none;
        }

        return new Intl.DateTimeFormat(
          localeTag(locale),
          {
            dateStyle:
              "medium",
            timeStyle:
              "short",
            timeZone:
              "Europe/Bucharest",
          }
        ).format(
          new Date(value)
        );
      },
      [
        copy.none,
        locale,
      ]
    );

  const loadData =
    useCallback(
      async () => {
        setIsLoading(
          true
        );

        setError("");

        try {
          const response =
            await fetch(
              "/api/admin/sms",
              {
                method:
                  "GET",
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as
              SmsAdminResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              locale ===
                "ro" &&
              result.error
                ? result.error
                : copy.loadFailed
            );
          }

          setSettings(
            result.settings ??
              null
          );

          setDoctorCounters(
            result.doctorCounters ??
              []
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : copy.loadFailed
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        copy.loadFailed,
        locale,
      ]
    );

  useEffect(
    () => {
      void loadData();
    },
    [loadData]
  );

  const filteredCounters =
    useMemo(
      () => {
        const needle =
          normalizeForSearch(
            search
          );

        return doctorCounters.filter(
          (
            counter
          ) => {
            const searchMatches =
              !needle ||
              normalizeForSearch(
                `${counter.doctorName} ${counter.slug}`
              ).includes(
                needle
              );

            const statusMatches =
              statusFilter ===
                "all" ||
              (
                statusFilter ===
                  "sent" &&
                counter.sent >
                  0
              ) ||
              (
                statusFilter ===
                  "delivered" &&
                counter.delivered >
                  0
              ) ||
              (
                statusFilter ===
                  "failed" &&
                counter.failed >
                  0
              ) ||
              (
                statusFilter ===
                  "skipped" &&
                counter.skipped >
                  0
              ) ||
              (
                statusFilter ===
                  "zero" &&
                counter.total ===
                  0
              );

            return (
              searchMatches &&
              statusMatches
            );
          }
        );
      },
      [
        doctorCounters,
        search,
        statusFilter,
      ]
    );

  const totals =
    useMemo(
      () =>
        doctorCounters.reduce(
          (
            result,
            counter
          ) => ({
            total:
              result.total +
              counter.total,
            sent:
              result.sent +
              counter.sent,
            delivered:
              result.delivered +
              counter.delivered,
            failed:
              result.failed +
              counter.failed,
            skipped:
              result.skipped +
              counter.skipped,
            confirmations:
              result.confirmations +
              counter.confirmed,
            reminders:
              result.reminders +
              counter.reminder24h,
          }),
          {
            total: 0,
            sent: 0,
            delivered: 0,
            failed: 0,
            skipped: 0,
            confirmations: 0,
            reminders: 0,
          }
        ),
      [
        doctorCounters,
      ]
    );

  function saveSettings() {
    if (!settings) {
      return;
    }

    setMessage("");
    setError("");

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/admin/sms",
              {
                method:
                  "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify(
                    {
                      smsEnabled:
                        settings.sms_enabled,
                      confirmationSmsEnabled:
                        settings.confirmation_sms_enabled,
                      reminder24hSmsEnabled:
                        settings.reminder_24h_sms_enabled,
                    }
                  ),
              }
            );

          const result =
            (await response.json()) as
              SmsAdminResponse;

          if (
            !response.ok ||
            !result.settings
          ) {
            throw new Error(
              locale ===
                "ro" &&
              result.error
                ? result.error
                : copy.saveFailed
            );
          }

          setSettings(
            result.settings
          );

          setMessage(
            copy.updated
          );
        } catch (
          saveError
        ) {
          setError(
            saveError instanceof
              Error
              ? saveError.message
              : copy.saveFailed
          );
        }
      }
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-[21px] border border-gray-200 bg-white p-[34px] text-center text-sm text-gray-600 shadow-sm">
        {copy.loading}
      </div>
    );
  }

  return (
    <div className="space-y-[34px]">
      {error ? (
        <p
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
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
            {copy.serviceTitle}
          </h2>

          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {copy.serviceDescription}
          </p>

          <div className="mt-[21px] grid gap-[13px] md:grid-cols-3">
            {[
              [
                "sms_enabled",
                copy.serviceEnabled,
              ],
              [
                "confirmation_sms_enabled",
                copy.confirmationEnabled,
              ],
              [
                "reminder_24h_sms_enabled",
                copy.reminderEnabled,
              ],
            ].map(
              ([
                key,
                label,
              ]) => {
                const settingKey =
                  key as
                    | "sms_enabled"
                    | "confirmation_sms_enabled"
                    | "reminder_24h_sms_enabled";

                return (
                  <label
                    key={
                      key
                    }
                    className="flex items-center justify-between gap-[13px] rounded-[13px] border border-gray-200 bg-gray-50 p-[13px]"
                  >
                    <span className="text-sm font-semibold text-gray-800">
                      {
                        label
                      }
                    </span>

                    <input
                      type="checkbox"
                      checked={
                        settings[
                          settingKey
                        ]
                      }
                      onChange={(
                        event
                      ) =>
                        setSettings(
                          (
                            current
                          ) =>
                            current
                              ? {
                                  ...current,
                                  [settingKey]:
                                    event
                                      .target
                                      .checked,
                                }
                              : current
                        )
                      }
                      className="h-5 w-5 accent-[#036661]"
                    />
                  </label>
                );
              }
            )}
          </div>

          <div className="mt-[13px] flex flex-wrap items-center justify-between gap-[13px] text-sm text-gray-600">
            <p>
              {
                copy.provider
              }
              :{" "}
              <strong>
                {
                  settings.provider
                }
              </strong>
            </p>

            <p>
              {
                copy.updatedAt
              }
              :{" "}
              {formatDate(
                settings.updated_at
              )}
            </p>
          </div>

          <button
            type="button"
            disabled={
              isPending
            }
            onClick={
              saveSettings
            }
            className="romdoc-focus-ring mt-[21px] rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:opacity-60"
          >
            {isPending
              ? copy.saving
              : copy.saveSettings}
          </button>
        </section>
      ) : null}

      <section>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {
              copy.operationalTitle
            }
          </h2>

          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {
              copy.operationalDescription
            }
          </p>
        </div>

        <div className="mt-[21px] grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
          <SummaryBox
            label={
              copy.total
            }
            value={
              totals.total
            }
          />

          <SummaryBox
            label={
              copy.sent
            }
            value={
              totals.sent
            }
          />

          <SummaryBox
            label={
              copy.delivered
            }
            value={
              totals.delivered
            }
          />

          <SummaryBox
            label={
              copy.failed
            }
            value={
              totals.failed
            }
          />

          <SummaryBox
            label={
              copy.skipped
            }
            value={
              totals.skipped
            }
          />

          <SummaryBox
            label={
              copy.confirmations
            }
            value={
              totals.confirmations
            }
          />

          <SummaryBox
            label={
              copy.reminders
            }
            value={
              totals.reminders
            }
          />
        </div>

        <p className="mt-[13px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-sm leading-6 text-blue-950">
          {
            copy.includedNotice
          }
        </p>
      </section>

      <section>
        <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {
                copy.countersTitle
              }
            </h2>

            <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
              {
                copy.countersDescription
              }
            </p>
          </div>

          <div className="grid gap-[8px] sm:grid-cols-2">
            <input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder={
                copy.searchPlaceholder
              }
              className="romdoc-focus-ring rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            />

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target
                    .value
                )
              }
              className="romdoc-focus-ring rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            >
              <option value="all">
                {
                  copy.allStatuses
                }
              </option>
              <option value="sent">
                {
                  copy.withSent
                }
              </option>
              <option value="delivered">
                {
                  copy.withDelivered
                }
              </option>
              <option value="failed">
                {
                  copy.withFailed
                }
              </option>
              <option value="skipped">
                {
                  copy.withSkipped
                }
              </option>
              <option value="zero">
                {
                  copy.zero
                }
              </option>
            </select>
          </div>
        </div>

        {filteredCounters.length ===
        0 ? (
          <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
            {
              copy.emptyCounters
            }
          </div>
        ) : (
          <div className="mt-[21px] space-y-[13px]">
            {filteredCounters.map(
              (
                counter
              ) => (
                <details
                  key={
                    counter.doctorId
                  }
                  className="rounded-[21px] border border-gray-200 bg-white shadow-sm"
                >
                  <summary className="romdoc-focus-ring flex cursor-pointer list-none flex-col gap-[13px] p-[21px] marker:content-none md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {
                          counter.doctorName
                        }
                      </h3>

                      <p className="mt-[5px] text-xs text-gray-500">
                        {
                          counter.slug
                        }
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-[8px] text-xs font-semibold">
                      <span className="rounded-full bg-blue-100 px-[8px] py-[5px] text-blue-800">
                        {
                          copy.sent
                        }
                        :{" "}
                        {
                          counter.sent
                        }
                      </span>

                      <span className="rounded-full bg-green-100 px-[8px] py-[5px] text-green-800">
                        {
                          copy.delivered
                        }
                        :{" "}
                        {
                          counter.delivered
                        }
                      </span>

                      <span className="rounded-full bg-gray-100 px-[8px] py-[5px] text-gray-700">
                        {
                          copy.lastSent
                        }
                        :{" "}
                        {formatDate(
                          counter.lastSentAt
                        )}
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-gray-200 bg-gray-50/60 p-[21px]">
                    <dl className="grid gap-[13px] sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        [
                          copy.total,
                          counter.total,
                        ],
                        [
                          copy.sent,
                          counter.sent,
                        ],
                        [
                          copy.delivered,
                          counter.delivered,
                        ],
                        [
                          copy.failed,
                          counter.failed,
                        ],
                        [
                          copy.skipped,
                          counter.skipped,
                        ],
                        [
                          copy.confirmations,
                          counter.confirmed,
                        ],
                        [
                          copy.reminders,
                          counter.reminder24h,
                        ],
                      ].map(
                        ([
                          label,
                          value,
                        ]) => (
                          <div
                            key={
                              String(
                                label
                              )
                            }
                          >
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {
                                label
                              }
                            </dt>

                            <dd className="mt-[5px] text-sm font-semibold text-gray-900">
                              {
                                value
                              }
                            </dd>
                          </div>
                        )
                      )}
                    </dl>
                  </div>
                </details>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
