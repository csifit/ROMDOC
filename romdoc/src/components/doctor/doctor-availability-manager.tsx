"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

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

const weekdayLabels: Record<
  number,
  string
> = {
  0: "Duminică",
  1: "Luni",
  2: "Marți",
  3: "Miercuri",
  4: "Joi",
  5: "Vineri",
  6: "Sâmbătă",
};

function shortTime(
  value: string | null
) {
  return value
    ? value.slice(0, 5)
    : "";
}

async function readResponse(
  response: Response
) {
  const result =
    (await response.json()) as ApiResponse;

  if (!response.ok) {
    throw new Error(
      result.error ??
        "Operațiunea nu a putut fi finalizată."
    );
  }

  return result;
}

function AvailabilityRow({
  item,
  clinics,
}: {
  item: AvailabilityItem;
  clinics: ClinicOption[];
}) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [clinicId, setClinicId] =
    useState(item.clinicId);

  const [weekday, setWeekday] =
    useState(item.weekday.toString());

  const [startTime, setStartTime] =
    useState(shortTime(item.startTime));

  const [endTime, setEndTime] =
    useState(shortTime(item.endTime));

  const [duration, setDuration] =
    useState(
      item.durationMinutes.toString()
    );

  const [isActive, setIsActive] =
    useState(item.isActive);

  const [breakStart, setBreakStart] =
    useState("");

  const [breakEnd, setBreakEnd] =
    useState("");

  const [breakLabel, setBreakLabel] =
    useState("");

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  function saveAvailability() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/availability",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              availabilityId: item.id,
              clinicId,
              weekday:
                Number(weekday),
              startTime,
              endTime,
              durationMinutes:
                Number(duration),
              isActive,
            }),
          }
        );

        await readResponse(response);

        setMessage(
          "Programul a fost salvat."
        );

        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Programul nu a putut fi salvat."
        );
      }
    });
  }

  function deleteAvailability() {
    if (
      !window.confirm(
        "Ștergi acest interval și toate pauzele sale?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/availability",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              resource:
                "availability",
              id: item.id,
            }),
          }
        );

        await readResponse(response);
        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Programul nu a putut fi șters."
        );
      }
    });
  }

  function addBreak(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/availability",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              resource: "break",
              availabilityId:
                item.id,
              startTime:
                breakStart,
              endTime: breakEnd,
              label:
                breakLabel.trim() ||
                null,
            }),
          }
        );

        await readResponse(response);

        setBreakStart("");
        setBreakEnd("");
        setBreakLabel("");

        router.refresh();
      } catch (breakError) {
        setError(
          breakError instanceof Error
            ? breakError.message
            : "Pauza nu a putut fi adăugată."
        );
      }
    });
  }

  function deleteBreak(
    breakId: string
  ) {
    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/availability",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              resource: "break",
              id: breakId,
            }),
          }
        );

        await readResponse(response);
        router.refresh();
      } catch (breakError) {
        setError(
          breakError instanceof Error
            ? breakError.message
            : "Pauza nu a putut fi ștearsă."
        );
      }
    });
  }

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <label>
          <span className="text-sm font-medium text-gray-700">
            Clinica
          </span>

          <select
            value={clinicId}
            onChange={(event) =>
              setClinicId(
                event.target.value
              )
            }
            disabled={isPending}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5"
          >
            {clinics.map((clinic) => (
              <option
                key={clinic.id}
                value={clinic.id}
              >
                {clinic.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-medium text-gray-700">
            Ziua
          </span>

          <select
            value={weekday}
            onChange={(event) =>
              setWeekday(
                event.target.value
              )
            }
            disabled={isPending}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5"
          >
            {Object.entries(
              weekdayLabels
            ).map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="text-sm font-medium text-gray-700">
            Început
          </span>

          <input
            type="time"
            value={startTime}
            onChange={(event) =>
              setStartTime(
                event.target.value
              )
            }
            disabled={isPending}
            className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5"
          />
        </label>

        <label>
          <span className="text-sm font-medium text-gray-700">
            Sfârșit
          </span>

          <input
            type="time"
            value={endTime}
            onChange={(event) =>
              setEndTime(
                event.target.value
              )
            }
            disabled={isPending}
            className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5"
          />
        </label>

        <label>
          <span className="text-sm font-medium text-gray-700">
            Durata
          </span>

          <select
            value={duration}
            onChange={(event) =>
              setDuration(
                event.target.value
              )
            }
            disabled={isPending}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5"
          >
            {[15, 20, 30, 45, 60, 90, 120].map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value} min
                </option>
              )
            )}
          </select>
        </label>

        <label className="flex items-end">
          <span className="flex w-full items-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) =>
                setIsActive(
                  event.target.checked
                )
              }
              disabled={isPending}
            />

            Activ
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveAvailability}
          disabled={isPending}
          className="rounded-xl bg-[#D97757] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Salvează intervalul
        </button>

        <button
          type="button"
          onClick={deleteAvailability}
          disabled={isPending}
          className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Șterge intervalul
        </button>
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-4">
        <h3 className="font-semibold text-gray-900">
          Pauze recurente
        </h3>

        {item.breaks.length > 0 && (
          <div className="mt-3 space-y-2">
            {item.breaks.map(
              (breakItem) => (
                <div
                  key={breakItem.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <span className="text-sm text-gray-700">
                    {shortTime(
                      breakItem.startTime
                    )}{" "}
                    –{" "}
                    {shortTime(
                      breakItem.endTime
                    )}
                    {breakItem.label
                      ? ` — ${breakItem.label}`
                      : ""}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      deleteBreak(
                        breakItem.id
                      )
                    }
                    disabled={isPending}
                    className="text-sm font-medium text-red-700"
                  >
                    Șterge
                  </button>
                </div>
              )
            )}
          </div>
        )}

        <form
          onSubmit={addBreak}
          className="mt-4 grid gap-3 sm:grid-cols-[140px_140px_1fr_auto]"
        >
          <input
            type="time"
            required
            value={breakStart}
            onChange={(event) =>
              setBreakStart(
                event.target.value
              )
            }
            disabled={isPending}
            className="rounded-xl border border-gray-300 px-3 py-2.5"
          />

          <input
            type="time"
            required
            value={breakEnd}
            onChange={(event) =>
              setBreakEnd(
                event.target.value
              )
            }
            disabled={isPending}
            className="rounded-xl border border-gray-300 px-3 py-2.5"
          />

          <input
            type="text"
            value={breakLabel}
            onChange={(event) =>
              setBreakLabel(
                event.target.value
              )
            }
            disabled={isPending}
            placeholder="Ex. Pauză de prânz"
            className="rounded-xl border border-gray-300 px-3 py-2.5"
          />

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-100 disabled:opacity-60"
          >
            Adaugă pauza
          </button>
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

export default function DoctorAvailabilityManager({
  clinics,
  availability,
  daysOff,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [clinicId, setClinicId] =
    useState(clinics[0]?.id ?? "");

  const [weekday, setWeekday] =
    useState("1");

  const [startTime, setStartTime] =
    useState("08:00");

  const [endTime, setEndTime] =
    useState("17:00");

  const [duration, setDuration] =
    useState("30");

  const [dayOffClinicId, setDayOffClinicId] =
    useState("");

  const [dayOffDate, setDayOffDate] =
    useState("");

  const [isAllDay, setIsAllDay] =
    useState(true);

  const [dayOffStart, setDayOffStart] =
    useState("");

  const [dayOffEnd, setDayOffEnd] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  function addAvailability(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/availability",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              resource:
                "availability",
              clinicId,
              weekday:
                Number(weekday),
              startTime,
              endTime,
              durationMinutes:
                Number(duration),
              isActive: true,
            }),
          }
        );

        await readResponse(response);
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Programul nu a putut fi adăugat."
        );
      }
    });
  }

  function addDayOff(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/availability",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              resource: "day_off",
              clinicId:
                dayOffClinicId ||
                null,
              date: dayOffDate,
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

        await readResponse(response);

        setDayOffDate("");
        setDayOffStart("");
        setDayOffEnd("");
        setReason("");
        setIsAllDay(true);

        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Indisponibilitatea nu a putut fi adăugată."
        );
      }
    });
  }

  function deleteDayOff(id: string) {
    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/availability",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              resource: "day_off",
              id,
            }),
          }
        );

        await readResponse(response);
        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Indisponibilitatea nu a putut fi ștearsă."
        );
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          Adaugă un interval de lucru
        </h2>

        <form
          onSubmit={addAvailability}
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6"
        >
          <select
            required
            value={clinicId}
            onChange={(event) =>
              setClinicId(
                event.target.value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          >
            {clinics.map((clinic) => (
              <option
                key={clinic.id}
                value={clinic.id}
              >
                {clinic.name}
              </option>
            ))}
          </select>

          <select
            value={weekday}
            onChange={(event) =>
              setWeekday(
                event.target.value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          >
            {Object.entries(
              weekdayLabels
            ).map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </select>

          <input
            type="time"
            required
            value={startTime}
            onChange={(event) =>
              setStartTime(
                event.target.value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          />

          <input
            type="time"
            required
            value={endTime}
            onChange={(event) =>
              setEndTime(
                event.target.value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          />

          <select
            value={duration}
            onChange={(event) =>
              setDuration(
                event.target.value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          >
            {[15, 20, 30, 45, 60, 90, 120].map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value} minute
                </option>
              )
            )}
          </select>

          <button
            type="submit"
            disabled={
              isPending ||
              clinics.length === 0
            }
            className="rounded-xl bg-[#D97757] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            Adaugă
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900">
          Program săptămânal
        </h2>

        <div className="mt-5 space-y-5">
          {availability.length > 0 ? (
            availability.map((item) => (
              <AvailabilityRow
                key={item.id}
                item={item}
                clinics={clinics}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">
              Nu ai configurat încă programul.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          Zile și perioade indisponibile
        </h2>

        <form
          onSubmit={addDayOff}
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6"
        >
          <select
            value={dayOffClinicId}
            onChange={(event) =>
              setDayOffClinicId(
                event.target.value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          >
            <option value="">
              Toate clinicile
            </option>

            {clinics.map((clinic) => (
              <option
                key={clinic.id}
                value={clinic.id}
              >
                {clinic.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            required
            value={dayOffDate}
            onChange={(event) =>
              setDayOffDate(
                event.target.value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3"
          />

          <label className="flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-3">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(event) =>
                setIsAllDay(
                  event.target.checked
                )
              }
            />

            Toată ziua
          </label>

          <input
            type="time"
            required={!isAllDay}
            disabled={isAllDay}
            value={dayOffStart}
            onChange={(event) =>
              setDayOffStart(
                event.target.value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3 disabled:bg-gray-100"
          />

          <input
            type="time"
            required={!isAllDay}
            disabled={isAllDay}
            value={dayOffEnd}
            onChange={(event) =>
              setDayOffEnd(
                event.target.value
              )
            }
            className="rounded-xl border border-gray-300 px-3 py-3 disabled:bg-gray-100"
          />

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#D97757] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            Adaugă
          </button>

          <input
            type="text"
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value
              )
            }
            placeholder="Motiv opțional"
            className="rounded-xl border border-gray-300 px-3 py-3 md:col-span-2 xl:col-span-6"
          />
        </form>

        <div className="mt-6 space-y-3">
          {daysOff.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {new Intl.DateTimeFormat(
                    "ro-RO",
                    {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    }
                  ).format(
                    new Date(
                      `${item.date}T12:00:00`
                    )
                  )}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {item.clinicName ??
                    "Toate clinicile"}
                  {" — "}
                  {item.isAllDay
                    ? "Toată ziua"
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

              <button
                type="button"
                onClick={() =>
                  deleteDayOff(item.id)
                }
                disabled={isPending}
                className="w-fit text-sm font-medium text-red-700"
              >
                Șterge
              </button>
            </div>
          ))}

          {daysOff.length === 0 && (
            <p className="text-sm text-gray-600">
              Nu există indisponibilități configurate.
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