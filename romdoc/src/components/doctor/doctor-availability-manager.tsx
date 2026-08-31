"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  useRouter,
} from "next/navigation";

import Button from "@/components/ui/button";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type ClinicOption = {
  id: string;
  name: string;
};

type BreakItem = {
  id: string;
  startTime: string;
  endTime: string;
  label: string | null;
};

export type AvailabilityItem = {
  id: string;
  clinicId: string;
  clinicName: string;
  weekday: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isActive: boolean;
  breaks: BreakItem[];
};

export type DayOffItem = {
  id: string;
  clinicId: string | null;
  clinicName: string | null;
  date: string;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
};

type Props = {
  clinics: ClinicOption[];
  availability: AvailabilityItem[];
  daysOff: DayOffItem[];
};

type ApiResponse = {
  success?: boolean;
  error?: string;
};

const WEEKDAYS = [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
] as const;

const DATE_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

const COMPACT_COPY = {
  ro: {
    clinicSchedule: "Program clinică",
    interval: "interval",
    intervals: "intervale",
    break: "pauză",
    breaks: "pauze",
    inactive: "inactiv",
    inactivePlural: "inactive",
    closed: "Fără program",
    expandHint: "Deschide ziua pentru editare",
    noIntervalsForDay:
      "Nu există intervale de lucru pentru această zi. Folosește cardul „Adaugă un interval de lucru” de mai sus pentru a crea unul.",
  },
  en: {
    clinicSchedule: "Clinic schedule",
    interval: "interval",
    intervals: "intervals",
    break: "break",
    breaks: "breaks",
    inactive: "inactive",
    inactivePlural: "inactive",
    closed: "No working hours",
    expandHint: "Open the day to edit",
    noIntervalsForDay:
      "There are no working intervals for this day. Use the “Add a working interval” card above to create one.",
  },
  de: {
    clinicSchedule: "Klinikplan",
    interval: "Intervall",
    intervals: "Intervalle",
    break: "Pause",
    breaks: "Pausen",
    inactive: "inaktiv",
    inactivePlural: "inaktiv",
    closed: "Keine Sprechzeiten",
    expandHint: "Tag zum Bearbeiten öffnen",
    noIntervalsForDay:
      "Für diesen Tag gibt es keine Arbeitsintervalle. Verwenden Sie oben „Arbeitsintervall hinzufügen“, um eines zu erstellen.",
  },
} as const;

function shortTime(
  value: string | null
) {
  return value
    ? value.slice(
        0,
        5
      )
    : "";
}

async function readResponse(
  response: Response,
  locale: AppLocale,
  fallback: string
) {
  const result =
    (await response.json()) as
      ApiResponse;

  if (
    !response.ok
  ) {
    throw new Error(
      locale === "ro" &&
      result.error
        ? result.error
        : fallback
    );
  }

  return result;
}

type AvailabilityRowProps = {
  item: AvailabilityItem;
  clinics: ClinicOption[];
};

function AvailabilityRow({
  item,
  clinics,
}: AvailabilityRowProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorConfiguration.availability"
    );

  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    clinicId,
    setClinicId,
  ] =
    useState(
      item.clinicId
    );

  const [
    weekday,
    setWeekday,
  ] =
    useState(
      item.weekday
        .toString()
    );

  const [
    startTime,
    setStartTime,
  ] =
    useState(
      shortTime(
        item.startTime
      )
    );

  const [
    endTime,
    setEndTime,
  ] =
    useState(
      shortTime(
        item.endTime
      )
    );

  const [
    duration,
    setDuration,
  ] =
    useState(
      item.durationMinutes
        .toString()
    );

  const [
    isActive,
    setIsActive,
  ] =
    useState(
      item.isActive
    );

  const [
    breakStart,
    setBreakStart,
  ] =
    useState(
      ""
    );

  const [
    breakEnd,
    setBreakEnd,
  ] =
    useState(
      ""
    );

  const [
    breakLabel,
    setBreakLabel,
  ] =
    useState(
      ""
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  function saveAvailability() {
    setMessage(
      null
    );

    setError(
      null
    );

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/availability",
              {
                method:
                  "PATCH",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    availabilityId:
                      item.id,

                    clinicId,

                    weekday:
                      Number(
                        weekday
                      ),

                    startTime,
                    endTime,

                    durationMinutes:
                      Number(
                        duration
                      ),

                    isActive,
                  }),
              }
            );

          await readResponse(
            response,
            locale,
            t(
              "scheduleSaveError"
            )
          );

          setMessage(
            t(
              "scheduleSaved"
            )
          );

          router.refresh();
        } catch (
          saveError
        ) {
          setError(
            saveError instanceof
              Error
              ? saveError.message
              : t(
                  "scheduleSaveError"
                )
          );
        }
      }
    );
  }

  function deleteAvailability() {
    if (
      !window.confirm(
        t(
          "deleteIntervalConfirm"
        )
      )
    ) {
      return;
    }

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/availability",
              {
                method:
                  "DELETE",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    resource:
                      "availability",

                    id:
                      item.id,
                  }),
              }
            );

          await readResponse(
            response,
            locale,
            t(
              "scheduleDeleteError"
            )
          );

          router.refresh();
        } catch (
          deleteError
        ) {
          setError(
            deleteError instanceof
              Error
              ? deleteError.message
              : t(
                  "scheduleDeleteError"
                )
          );
        }
      }
    );
  }

  function addBreak(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage(
      null
    );

    setError(
      null
    );

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/availability",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    resource:
                      "break",

                    availabilityId:
                      item.id,

                    startTime:
                      breakStart,

                    endTime:
                      breakEnd,

                    label:
                      breakLabel
                        .trim() ||
                      null,
                  }),
              }
            );

          await readResponse(
            response,
            locale,
            t(
              "breakAddError"
            )
          );

          setBreakStart(
            ""
          );

          setBreakEnd(
            ""
          );

          setBreakLabel(
            ""
          );

          router.refresh();
        } catch (
          breakError
        ) {
          setError(
            breakError instanceof
              Error
              ? breakError.message
              : t(
                  "breakAddError"
                )
          );
        }
      }
    );
  }

  function deleteBreak(
    breakId:
      string
  ) {
    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/availability",
              {
                method:
                  "DELETE",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    resource:
                      "break",

                    id:
                      breakId,
                  }),
              }
            );

          await readResponse(
            response,
            locale,
            t(
              "breakDeleteError"
            )
          );

          router.refresh();
        } catch (
          breakError
        ) {
          setError(
            breakError instanceof
              Error
              ? breakError.message
              : t(
                  "breakDeleteError"
                )
          );
        }
      }
    );
  }

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <p className="font-semibold text-gray-900">
            {shortTime(
              item.startTime
            )}
            {" – "}
            {shortTime(
              item.endTime
            )}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {t(
              "minutes",
              {
                count:
                  item.durationMinutes,
              }
            )}
            {item.breaks.length
              ? ` · ${item.breaks.length} ${
                  item.breaks.length === 1
                    ? COMPACT_COPY[locale].break
                    : COMPACT_COPY[locale].breaks
                }`
              : ""}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            item.isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {item.isActive
            ? t(
                "active"
              )
            : COMPACT_COPY[
                locale
              ].inactive}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <label>
          <span className="text-sm font-medium text-gray-700">
            {t(
              "clinic"
            )}
          </span>

          <select
            value={
              clinicId
            }
            onChange={(
              event
            ) =>
              setClinicId(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5"
          >
            {clinics.map(
              (
                clinic
              ) => (
                <option
                  key={
                    clinic.id
                  }
                  value={
                    clinic.id
                  }
                >
                  {
                    clinic.name
                  }
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="text-sm font-medium text-gray-700">
            {t(
              "day"
            )}
          </span>

          <select
            value={
              weekday
            }
            onChange={(
              event
            ) =>
              setWeekday(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5"
          >
            {WEEKDAYS.map(
              (
                value
              ) => (
                <option
                  key={
                    value
                  }
                  value={
                    value
                  }
                >
                  {t(
                    `weekdays.${value}`
                  )}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="text-sm font-medium text-gray-700">
            {t(
              "start"
            )}
          </span>

          <input
            type="time"
            value={
              startTime
            }
            onChange={(
              event
            ) =>
              setStartTime(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5"
          />
        </label>

        <label>
          <span className="text-sm font-medium text-gray-700">
            {t(
              "end"
            )}
          </span>

          <input
            type="time"
            value={
              endTime
            }
            onChange={(
              event
            ) =>
              setEndTime(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5"
          />
        </label>

        <label>
          <span className="text-sm font-medium text-gray-700">
            {t(
              "duration"
            )}
          </span>

          <select
            value={
              duration
            }
            onChange={(
              event
            ) =>
              setDuration(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5"
          >
            {[
              15,
              20,
              30,
              45,
              60,
              90,
              120,
            ].map(
              (
                value
              ) => (
                <option
                  key={
                    value
                  }
                  value={
                    value
                  }
                >
                  {t(
                    "minutes",
                    {
                      count:
                        value,
                    }
                  )}
                </option>
              )
            )}
          </select>
        </label>

        <label className="flex items-end">
          <span className="flex w-full items-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5">
            <input
              type="checkbox"
              checked={
                isActive
              }
              onChange={(
                event
              ) =>
                setIsActive(
                  event.target
                    .checked
                )
              }
              disabled={
                isPending
              }
            />

            {t(
              "active"
            )}
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={
            saveAvailability
          }
          disabled={
            isPending
          }
          size="sm"
        >
          {t(
            "saveInterval"
          )}
        </Button>

        <Button
          type="button"
          onClick={
            deleteAvailability
          }
          disabled={
            isPending
          }
          variant="danger-outline"
          size="sm"
        >
          {t(
            "deleteInterval"
          )}
        </Button>
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-4">
        <h3 className="font-semibold text-gray-900">
          {t(
            "recurringBreaks"
          )}
        </h3>

        {item.breaks.length > 0 && (
          <div className="mt-3 space-y-2">
            {item.breaks.map(
              (
                breakItem
              ) => (
                <div
                  key={
                    breakItem.id
                  }
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <span className="text-sm text-gray-700">
                    {shortTime(
                      breakItem.startTime
                    )}
                    {" – "}
                    {shortTime(
                      breakItem.endTime
                    )}

                    {breakItem.label
                      ? ` — ${breakItem.label}`
                      : ""}
                  </span>

                  <Button
                    type="button"
                    onClick={() =>
                      deleteBreak(
                        breakItem.id
                      )
                    }
                    disabled={
                      isPending
                    }
                    variant="danger-outline"
                    size="sm"
                  >
                    {t(
                      "delete"
                    )}
                  </Button>
                </div>
              )
            )}
          </div>
        )}

        <form
          onSubmit={
            addBreak
          }
          className="mt-4 grid gap-3 sm:grid-cols-[140px_140px_1fr_auto]"
        >
          <input
            type="time"
            required
            value={
              breakStart
            }
            onChange={(
              event
            ) =>
              setBreakStart(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            className="rounded-xl border border-gray-300 px-3 py-2.5"
          />

          <input
            type="time"
            required
            value={
              breakEnd
            }
            onChange={(
              event
            ) =>
              setBreakEnd(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            className="rounded-xl border border-gray-300 px-3 py-2.5"
          />

          <input
            type="text"
            value={
              breakLabel
            }
            onChange={(
              event
            ) =>
              setBreakLabel(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            placeholder={t(
              "breakPlaceholder"
            )}
            className="rounded-xl border border-gray-300 px-3 py-2.5"
          />

          <Button
            type="submit"
            disabled={
              isPending
            }
            variant="secondary"
            size="sm"
          >
            {t(
              "addBreak"
            )}
          </Button>
        </form>
      </div>

      {message && (
        <p className="mt-4 text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
    </article>
  );
}

type ClinicScheduleGroup = {
  clinic: ClinicOption;
  items: AvailabilityItem[];
};

function WeeklySchedule({
  clinics,
  availability,
}: {
  clinics: ClinicOption[];
  availability: AvailabilityItem[];
}) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorConfiguration.availability"
    );

  const copy =
    COMPACT_COPY[
      locale
    ];

  const clinicGroups =
    useMemo<
      ClinicScheduleGroup[]
    >(
      () =>
        clinics
          .map(
            (
              clinic
            ) => ({
              clinic,
              items:
                availability.filter(
                  (
                    item
                  ) =>
                    item.clinicId ===
                    clinic.id
                ),
            })
          )
          .filter(
            (
              group
            ) =>
              group.items.length >
              0
          ),
      [
        clinics,
        availability,
      ]
    );

  if (
    availability.length ===
    0
  ) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">
        {t(
          "noSchedule"
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {clinicGroups.map(
        (
          group
        ) => (
          <section
            key={
              group.clinic.id
            }
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#F0EEE9] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {
                    copy.clinicSchedule
                  }
                </p>

                <h3 className="mt-1 text-lg font-bold text-gray-900">
                  {
                    group.clinic.name
                  }
                </h3>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                {
                  group.items.length
                }{" "}
                {group.items.length ===
                1
                  ? copy.interval
                  : copy.intervals}
              </span>
            </header>

            <div className="divide-y divide-gray-200">
              {WEEKDAYS.map(
                (
                  day
                ) => {
                  const dayItems =
                    group.items
                      .filter(
                        (
                          item
                        ) =>
                          item.weekday ===
                          day
                      )
                      .sort(
                        (
                          first,
                          second
                        ) =>
                          first.startTime.localeCompare(
                            second.startTime
                          )
                      );

                  const activeItems =
                    dayItems.filter(
                      (
                        item
                      ) =>
                        item.isActive
                    );

                  const breakCount =
                    dayItems.reduce(
                      (
                        total,
                        item
                      ) =>
                        total +
                        item.breaks.length,
                      0
                    );

                  const inactiveCount =
                    dayItems.length -
                    activeItems.length;

                  const timeSummary =
                    activeItems.length >
                    0
                      ? activeItems
                          .map(
                            (
                              item
                            ) =>
                              `${shortTime(
                                item.startTime
                              )}–${shortTime(
                                item.endTime
                              )}`
                          )
                          .join(
                            " · "
                          )
                      : copy.closed;

                  return (
                    <details
                      key={
                        day
                      }
                      className="group/day"
                    >
                      <summary className="romdoc-focus-ring grid cursor-pointer list-none grid-cols-[minmax(110px,0.8fr)_minmax(0,2fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-gray-50 sm:px-5 [&::-webkit-details-marker]:hidden">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {t(
                              `weekdays.${day}`
                            )}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm ${
                              activeItems.length >
                              0
                                ? "font-medium text-gray-800"
                                : "text-gray-400"
                            }`}
                          >
                            {
                              timeSummary
                            }
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                            {dayItems.length >
                            0 ? (
                              <span>
                                {
                                  dayItems.length
                                }{" "}
                                {dayItems.length ===
                                1
                                  ? copy.interval
                                  : copy.intervals}
                              </span>
                            ) : null}

                            {breakCount >
                            0 ? (
                              <span>
                                {
                                  breakCount
                                }{" "}
                                {breakCount ===
                                1
                                  ? copy.break
                                  : copy.breaks}
                              </span>
                            ) : null}

                            {inactiveCount >
                            0 ? (
                              <span>
                                {
                                  inactiveCount
                                }{" "}
                                {inactiveCount ===
                                1
                                  ? copy.inactive
                                  : copy.inactivePlural}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="hidden text-xs text-gray-400 lg:inline">
                            {
                              copy.expandHint
                            }
                          </span>

                          <span className="text-lg text-gray-500 transition-transform group-open/day:rotate-180">
                            ⌄
                          </span>
                        </div>
                      </summary>

                      <div className="border-t border-gray-100 bg-gray-50/70 p-4 sm:p-5">
                        {dayItems.length >
                        0 ? (
                          <div className="space-y-4">
                            {dayItems.map(
                              (
                                item
                              ) => (
                                <AvailabilityRow
                                  key={
                                    item.id
                                  }
                                  item={
                                    item
                                  }
                                  clinics={
                                    clinics
                                  }
                                />
                              )
                            )}
                          </div>
                        ) : (
                          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
                            {
                              copy.noIntervalsForDay
                            }
                          </p>
                        )}
                      </div>
                    </details>
                  );
                }
              )}
            </div>
          </section>
        )
      )}
    </div>
  );
}

export default function DoctorAvailabilityManager({
  clinics,
  availability,
  daysOff,
}: Props) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorConfiguration.availability"
    );

  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    clinicId,
    setClinicId,
  ] =
    useState(
      clinics[0]?.id ??
      ""
    );

  const [
    weekday,
    setWeekday,
  ] =
    useState(
      "1"
    );

  const [
    startTime,
    setStartTime,
  ] =
    useState(
      "08:00"
    );

  const [
    endTime,
    setEndTime,
  ] =
    useState(
      "17:00"
    );

  const [
    duration,
    setDuration,
  ] =
    useState(
      "30"
    );

  const [
    dayOffClinicId,
    setDayOffClinicId,
  ] =
    useState(
      ""
    );

  const [
    dayOffDate,
    setDayOffDate,
  ] =
    useState(
      ""
    );

  const [
    isAllDay,
    setIsAllDay,
  ] =
    useState(
      true
    );

  const [
    dayOffStart,
    setDayOffStart,
  ] =
    useState(
      ""
    );

  const [
    dayOffEnd,
    setDayOffEnd,
  ] =
    useState(
      ""
    );

  const [
    reason,
    setReason,
  ] =
    useState(
      ""
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  function addAvailability(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/availability",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    resource:
                      "availability",

                    clinicId,

                    weekday:
                      Number(
                        weekday
                      ),

                    startTime,
                    endTime,

                    durationMinutes:
                      Number(
                        duration
                      ),

                    isActive:
                      true,
                  }),
              }
            );

          await readResponse(
            response,
            locale,
            t(
              "scheduleAddError"
            )
          );

          router.refresh();
        } catch (
          submitError
        ) {
          setError(
            submitError instanceof
              Error
              ? submitError.message
              : t(
                  "scheduleAddError"
                )
          );
        }
      }
    );
  }

  function addDayOff(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/availability",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    resource:
                      "day_off",

                    clinicId:
                      dayOffClinicId ||
                      null,

                    date:
                      dayOffDate,

                    isAllDay,

                    startTime:
                      isAllDay
                        ? null
                        : dayOffStart,

                    endTime:
                      isAllDay
                        ? null
                        : dayOffEnd,

                    reason:
                      reason.trim() ||
                      null,
                  }),
              }
            );

          await readResponse(
            response,
            locale,
            t(
              "dayOffAddError"
            )
          );

          setDayOffDate(
            ""
          );

          setDayOffStart(
            ""
          );

          setDayOffEnd(
            ""
          );

          setReason(
            ""
          );

          setIsAllDay(
            true
          );

          router.refresh();
        } catch (
          submitError
        ) {
          setError(
            submitError instanceof
              Error
              ? submitError.message
              : t(
                  "dayOffAddError"
                )
          );
        }
      }
    );
  }

  function deleteDayOff(
    id:
      string
  ) {
    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/availability",
              {
                method:
                  "DELETE",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    resource:
                      "day_off",

                    id,
                  }),
              }
            );

          await readResponse(
            response,
            locale,
            t(
              "dayOffDeleteError"
            )
          );

          router.refresh();
        } catch (
          deleteError
        ) {
          setError(
            deleteError instanceof
              Error
              ? deleteError.message
              : t(
                  "dayOffDeleteError"
                )
          );
        }
      }
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          {t(
            "addWorkInterval"
          )}
        </h2>

        <form
          onSubmit={
            addAvailability
          }
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6"
        >
          <select
            required
            value={
              clinicId
            }
            onChange={(
              event
            ) =>
              setClinicId(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          >
            {clinics.map(
              (
                clinic
              ) => (
                <option
                  key={
                    clinic.id
                  }
                  value={
                    clinic.id
                  }
                >
                  {
                    clinic.name
                  }
                </option>
              )
            )}
          </select>

          <select
            value={
              weekday
            }
            onChange={(
              event
            ) =>
              setWeekday(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          >
            {WEEKDAYS.map(
              (
                value
              ) => (
                <option
                  key={
                    value
                  }
                  value={
                    value
                  }
                >
                  {t(
                    `weekdays.${value}`
                  )}
                </option>
              )
            )}
          </select>

          <input
            type="time"
            required
            value={
              startTime
            }
            onChange={(
              event
            ) =>
              setStartTime(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          />

          <input
            type="time"
            required
            value={
              endTime
            }
            onChange={(
              event
            ) =>
              setEndTime(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          />

          <select
            value={
              duration
            }
            onChange={(
              event
            ) =>
              setDuration(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          >
            {[
              15,
              20,
              30,
              45,
              60,
              90,
              120,
            ].map(
              (
                value
              ) => (
                <option
                  key={
                    value
                  }
                  value={
                    value
                  }
                >
                  {t(
                    "minutes",
                    {
                      count:
                        value,
                    }
                  )}
                </option>
              )
            )}
          </select>

          <Button
            type="submit"
            disabled={
              isPending ||
              clinics.length ===
                0
            }
          >
            {t(
              "add"
            )}
          </Button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900">
          {t(
            "weeklySchedule"
          )}
        </h2>

        <div className="mt-5">
          <WeeklySchedule
            clinics={
              clinics
            }
            availability={
              availability
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          {t(
            "daysOff"
          )}
        </h2>

        <form
          onSubmit={
            addDayOff
          }
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6"
        >
          <select
            value={
              dayOffClinicId
            }
            onChange={(
              event
            ) =>
              setDayOffClinicId(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          >
            <option value="">
              {t(
                "allClinics"
              )}
            </option>

            {clinics.map(
              (
                clinic
              ) => (
                <option
                  key={
                    clinic.id
                  }
                  value={
                    clinic.id
                  }
                >
                  {
                    clinic.name
                  }
                </option>
              )
            )}
          </select>

          <input
            type="date"
            required
            value={
              dayOffDate
            }
            onChange={(
              event
            ) =>
              setDayOffDate(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          />

          <label className="flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-3">
            <input
              type="checkbox"
              checked={
                isAllDay
              }
              onChange={(
                event
              ) =>
                setIsAllDay(
                  event.target
                    .checked
                )
              }
            />

            {t(
              "allDay"
            )}
          </label>

          <input
            type="time"
            required={
              !isAllDay
            }
            disabled={
              isAllDay
            }
            value={
              dayOffStart
            }
            onChange={(
              event
            ) =>
              setDayOffStart(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3 disabled:bg-gray-100"
          />

          <input
            type="time"
            required={
              !isAllDay
            }
            disabled={
              isAllDay
            }
            value={
              dayOffEnd
            }
            onChange={(
              event
            ) =>
              setDayOffEnd(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3 disabled:bg-gray-100"
          />

          <Button
            type="submit"
            disabled={
              isPending
            }
          >
            {t(
              "add"
            )}
          </Button>

          <input
            type="text"
            value={
              reason
            }
            onChange={(
              event
            ) =>
              setReason(
                event.target
                  .value
              )
            }
            placeholder={t(
              "reasonPlaceholder"
            )}
            className="rounded-xl border border-gray-300 px-3 py-3 md:col-span-2 xl:col-span-6"
          />
        </form>

        <div className="mt-6 space-y-3">
          {daysOff.map(
            (
              item
            ) => (
              <div
                key={
                  item.id
                }
                className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {new Intl
                      .DateTimeFormat(
                        DATE_LOCALE[
                          locale
                        ],
                        {
                          day:
                            "2-digit",

                          month:
                            "long",

                          year:
                            "numeric",
                        }
                      )
                      .format(
                        new Date(
                          `${item.date}T12:00:00`
                        )
                      )}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {item.clinicName ??
                      t(
                        "allClinics"
                      )}
                    {" — "}
                    {item.isAllDay
                      ? t(
                          "allDay"
                        )
                      : `${shortTime(
                          item.startTime
                        )}–${shortTime(
                          item.endTime
                        )}`}
                    {item.reason
                      ? ` — ${item.reason}`
                      : ""}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() =>
                    deleteDayOff(
                      item.id
                    )
                  }
                  disabled={
                    isPending
                  }
                  variant="danger-outline"
                  className="w-fit"
                >
                  {t(
                    "delete"
                  )}
                </Button>
              </div>
            )
          )}

          {daysOff.length ===
            0 && (
            <p className="text-sm text-gray-600">
              {t(
                "noDaysOff"
              )}
            </p>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
