"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type PublicSlot = {
  time: string;
  durationMinutes: number;
};

type AvailableDate = {
  date: string;
  availableSlotCount: number;
  slots: PublicSlot[];
};

type AvailabilityApiResponse = {
  timezone?: string;
  bookingWindowDays?: number;
  dates?: AvailableDate[];
  error?: string;
};

type PublicAvailabilityCalendarProps = {
  doctorId: string;
  clinicId: string;
  minimumDate: string;
  maximumDate: string;
  selectedDate: string;
  selectedTime: string;
  disabled?: boolean;
  onDateChange: (date: string) => void;
  onTimeChange: (
    time: string,
    durationMinutes: number
  ) => void;
};

const WEEKDAY_LABELS = [
  "Lu",
  "Ma",
  "Mi",
  "Jo",
  "Vi",
  "SÃ¢",
  "Du",
];

const ROMANIAN_DATE_FORMATTER =
  new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const ROMANIAN_MONTH_FORMATTER =
  new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

function parseDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(year, month - 1, day)
  );
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getMonthStart(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      1
    )
  );
}

function getMonthEnd(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      0
    )
  );
}

function addMonths(
  value: Date,
  numberOfMonths: number
) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth() + numberOfMonths,
      1
    )
  );
}

function getCalendarCells(month: Date) {
  const firstDay = getMonthStart(month);
  const lastDay = getMonthEnd(month);

  // JavaScript uses Sunday = 0. Convert to Monday = 0.
  const leadingEmptyCells =
    (firstDay.getUTCDay() + 6) % 7;

  const cells: Array<{
    key: string;
    date: string | null;
    dayNumber: number | null;
  }> = [];

  for (
    let index = 0;
    index < leadingEmptyCells;
    index += 1
  ) {
    cells.push({
      key: `empty-start-${index}`,
      date: null,
      dayNumber: null,
    });
  }

  for (
    let day = 1;
    day <= lastDay.getUTCDate();
    day += 1
  ) {
    const date = new Date(
      Date.UTC(
        month.getUTCFullYear(),
        month.getUTCMonth(),
        day
      )
    );

    cells.push({
      key: formatDate(date),
      date: formatDate(date),
      dayNumber: day,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      date: null,
      dayNumber: null,
    });
  }

  return cells;
}

function getDateRangeForMonth(
  month: Date,
  minimumDate: string,
  maximumDate: string
) {
  const monthStart = formatDate(
    getMonthStart(month)
  );

  const monthEnd = formatDate(
    getMonthEnd(month)
  );

  const from =
    monthStart < minimumDate
      ? minimumDate
      : monthStart;

  const to =
    monthEnd > maximumDate
      ? maximumDate
      : monthEnd;

  return from <= to
    ? { from, to }
    : null;
}

export default function PublicAvailabilityCalendar({
  doctorId,
  clinicId,
  minimumDate,
  maximumDate,
  selectedDate,
  selectedTime,
  disabled = false,
  onDateChange,
  onTimeChange,
}: PublicAvailabilityCalendarProps) {
  const initialMonth = useMemo(() => {
    const initialDate = selectedDate
      ? parseDate(selectedDate)
      : parseDate(minimumDate);

    return getMonthStart(initialDate);
  }, [minimumDate, selectedDate]);

  const [visibleMonth, setVisibleMonth] =
    useState(initialMonth);

  const [availability, setAvailability] =
    useState<AvailableDate[]>([]);

  const [hasLoadedAvailability, setHasLoadedAvailability] =
    useState(false);

  const [reloadKey, setReloadKey] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setVisibleMonth(
        getMonthStart(
          parseDate(selectedDate)
        )
      );
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!clinicId) {
      const timerId = window.setTimeout(() => {
        setAvailability([]);
        setHasLoadedAvailability(false);
        setLoadError(null);
      }, 0);

      return () => {
        window.clearTimeout(timerId);
      };
    }

    const range = getDateRangeForMonth(
      visibleMonth,
      minimumDate,
      maximumDate
    );

    if (!range) {
      const timerId = window.setTimeout(() => {
        setAvailability([]);
        setHasLoadedAvailability(true);
        setLoadError(null);
      }, 0);

      return () => {
        window.clearTimeout(timerId);
      };
    }

    const { from, to } = range;
    const controller = new AbortController();

    async function loadAvailability() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const query = new URLSearchParams({
          doctorId,
          clinicId,
          from,
          to,
        });

        const response = await fetch(
          `/api/availability/slots?${query.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result =
          (await response.json()) as AvailabilityApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Disponibilitatea nu a putut fi Ã®ncÄƒrcatÄƒ."
          );
        }

        setAvailability(
          result.dates ?? []
        );
        setHasLoadedAvailability(true);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setAvailability([]);
        setHasLoadedAvailability(true);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Disponibilitatea nu a putut fi Ã®ncÄƒrcatÄƒ."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      controller.abort();
    };
  }, [
    clinicId,
    doctorId,
    maximumDate,
    minimumDate,
    reloadKey,
    visibleMonth,
  ]);

  const availabilityByDate = useMemo(
    () =>
      new Map(
        availability.map((item) => [
          item.date,
          item,
        ])
      ),
    [availability]
  );

  const selectedAvailability =
    selectedDate
      ? availabilityByDate.get(
          selectedDate
        ) ?? null
      : null;

  const hasAnyAvailableSlot =
    availability.some(
      (item) =>
        item.availableSlotCount > 0
    );

  useEffect(() => {
    if (
      !selectedDate ||
      isLoading ||
      loadError
    ) {
      return;
    }

    const selectedDateIsInVisibleMonth =
      selectedDate.startsWith(
        formatDate(visibleMonth).slice(
          0,
          7
        )
      );

    if (
      selectedDateIsInVisibleMonth &&
      (!selectedAvailability ||
        selectedAvailability.availableSlotCount ===
          0)
    ) {
      onDateChange("");
      onTimeChange("", 30);
    }
  }, [
    isLoading,
    loadError,
    onDateChange,
    onTimeChange,
    selectedAvailability,
    selectedDate,
    visibleMonth,
  ]);

  const calendarCells = useMemo(
    () => getCalendarCells(visibleMonth),
    [visibleMonth]
  );

  const previousMonth = addMonths(
    visibleMonth,
    -1
  );

  const nextMonth = addMonths(
    visibleMonth,
    1
  );

  const canGoToPreviousMonth =
    formatDate(
      getMonthEnd(previousMonth)
    ) >= minimumDate;

  const canGoToNextMonth =
    formatDate(
      getMonthStart(nextMonth)
    ) <= maximumDate;

  function selectDate(date: string) {
    const dateAvailability =
      availabilityByDate.get(date);

    if (
      disabled ||
      !dateAvailability ||
      dateAvailability.availableSlotCount < 1
    ) {
      return;
    }

    onDateChange(date);
    onTimeChange("", 30);
  }

  function retryLoadingAvailability() {
    setReloadKey((currentKey) =>
      currentKey + 1
    );
  }

  return (
    <section
      aria-labelledby="availability-calendar-title"
      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
    >
      <div>
        <h3
          id="availability-calendar-title"
          className="text-base font-semibold text-gray-900"
        >
          SelecteazÄƒ data È™i ora
        </h3>

        <p className="mt-1 text-sm leading-6 text-gray-600">
          Datele verzi au cel puÈ›in un interval disponibil. Programarea online se trimite dupÄƒ alegerea unei date È™i a unei ore.
        </p>
      </div>

      {!clinicId ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-600">
          SelecteazÄƒ mai Ã®ntÃ¢i clinica pentru a vedea calendarul disponibil.
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="Luna precedentÄƒ"
                disabled={
                  disabled ||
                  isLoading ||
                  !canGoToPreviousMonth
                }
                onClick={() =>
                  setVisibleMonth(
                    previousMonth
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-xl text-gray-700 transition hover:border-[#036661] hover:text-[#036661] disabled:cursor-not-allowed disabled:opacity-35"
              >
                â€¹
              </button>

              <p className="text-center font-semibold capitalize text-gray-900">
                {ROMANIAN_MONTH_FORMATTER.format(
                  visibleMonth
                )}
              </p>

              <button
                type="button"
                aria-label="Luna urmÄƒtoare"
                disabled={
                  disabled ||
                  isLoading ||
                  !canGoToNextMonth
                }
                onClick={() =>
                  setVisibleMonth(nextMonth)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-xl text-gray-700 transition hover:border-[#036661] hover:text-[#036661] disabled:cursor-not-allowed disabled:opacity-35"
              >
                â€º
              </button>
            </div>

            <div
              aria-hidden="true"
              className="mt-4 grid grid-cols-7 gap-1 text-center"
            >
              {WEEKDAY_LABELS.map(
                (weekday) => (
                  <span
                    key={weekday}
                    className="py-1 text-xs font-semibold text-gray-500"
                  >
                    {weekday}
                  </span>
                )
              )}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarCells.map((cell) => {
                if (
                  !cell.date ||
                  cell.dayNumber === null
                ) {
                  return (
                    <span
                      key={cell.key}
                      aria-hidden="true"
                      className="aspect-square"
                    />
                  );
                }

                const item =
                  availabilityByDate.get(
                    cell.date
                  );

                const isAvailable =
                  (item?.availableSlotCount ?? 0) > 0;

                const isSelected =
                  selectedDate === cell.date;

                const isOutsideBookingWindow =
                  cell.date < minimumDate ||
                  cell.date > maximumDate;

                const isDisabled =
                  disabled ||
                  isLoading ||
                  isOutsideBookingWindow ||
                  !isAvailable;

                const label = isAvailable
                  ? `${ROMANIAN_DATE_FORMATTER.format(
                      parseDate(cell.date)
                    )}, ${item?.availableSlotCount ?? 0} intervale disponibile`
                  : `${ROMANIAN_DATE_FORMATTER.format(
                      parseDate(cell.date)
                    )}, indisponibil`;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    aria-label={label}
                    aria-pressed={isSelected}
                    disabled={isDisabled}
                    onClick={() =>
                      selectDate(cell.date!)
                    }
                    className={[
                      "aspect-square rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#036661] focus:ring-offset-2",
                      isSelected
                        ? "bg-[#036661] text-white shadow-sm"
                        : isAvailable
                          ? "bg-green-100 text-green-900 hover:bg-green-200"
                          : "cursor-not-allowed bg-gray-100 text-gray-400",
                    ].join(" ")}
                  >
                    {cell.dayNumber}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-200" />
                Disponibil
              </span>

              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#036661]" />
                Selectat
              </span>

              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-gray-200" />
                Indisponibil
              </span>
            </div>
          </div>

          <div
            aria-live="polite"
            className="mt-4"
          >
            {isLoading && (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-5 text-sm text-gray-600">
                Se Ã®ncarcÄƒ disponibilitatea...
              </div>
            )}

            {!isLoading && loadError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800"
              >
                <p>{loadError}</p>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={retryLoadingAvailability}
                  className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ÃŽncearcÄƒ din nou
                </button>
              </div>
            )}

            {!isLoading &&
              !loadError &&
              hasLoadedAvailability &&
              !hasAnyAvailableSlot && (
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-5 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">
                    Nu existÄƒ intervale libere afiÈ™ate pentru aceastÄƒ lunÄƒ.
                  </p>

                  <p className="mt-2 leading-6">
                    PoÈ›i verifica o altÄƒ lunÄƒ disponibilÄƒ Ã®n calendar. Programarea online rÄƒmÃ¢ne disponibilÄƒ doar dupÄƒ alegerea unei date È™i a unei ore libere.
                  </p>
                </div>
              )}

            {!isLoading &&
              !loadError &&
              selectedDate &&
              selectedAvailability && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="font-semibold text-gray-900">
                    Ore disponibile pentru{" "}
                    {ROMANIAN_DATE_FORMATTER.format(
                      parseDate(selectedDate)
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedAvailability.slots.map(
                      (slot) => {
                        const isSelected =
                          selectedTime ===
                          slot.time;

                        return (
                          <button
                            key={`${selectedDate}-${slot.time}`}
                            type="button"
                            aria-pressed={
                              isSelected
                            }
                            disabled={disabled}
                            onClick={() =>
                              onTimeChange(
                                slot.time,
                                slot.durationMinutes
                              )
                            }
                            className={[
                              "rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#036661] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                              isSelected
                                ? "border-[#036661] bg-[#036661] text-white"
                                : "border-gray-300 bg-white text-gray-800 hover:border-[#036661] hover:text-[#036661]",
                            ].join(" ")}
                          >
                            {slot.time}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-600">
            <p className="font-medium text-gray-900">
              Nu gÄƒseÈ™ti o orÄƒ potrivitÄƒ?
            </p>

            <p className="mt-1 leading-6">
              Momentan, RomDoc trimite programarea online doar dupÄƒ selectarea unui interval disponibil. ÃŽntr-un pas urmÄƒtor, aici poate apÄƒrea o opÈ›iune de solicitare generalÄƒ, astfel Ã®ncÃ¢t clinica sÄƒ te poatÄƒ contacta.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

