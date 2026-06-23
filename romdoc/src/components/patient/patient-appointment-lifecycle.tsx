"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type TimelineEvent = {
  event_id: string;
  event_type:
    | "requested"
    | "confirmed"
    | "rescheduled"
    | "cancelled"
    | "completed"
    | "no_show"
    | "updated";
  status: string;
  event_date: string | null;
  event_time: string | null;
  occurred_at: string;
};

type ApiResponse = {
  timeline?: TimelineEvent[];
  error?: string;
};

type PatientAppointmentLifecycleProps = {
  appointmentId: string;
  status: string;
  appointmentDate: string;
  appointmentTime: string | null;
};

const eventLabels: Record<
  TimelineEvent["event_type"],
  string
> = {
  requested: "Solicitare trimisă",
  confirmed: "Programare confirmată",
  rescheduled: "Programare reprogramată",
  cancelled: "Programare anulată",
  completed: "Consultație finalizată",
  no_show: "Neprezentare înregistrată",
  updated: "Programare actualizată",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSlot(
  date: string | null,
  time: string | null
) {
  if (!date) {
    return null;
  }

  const formattedDate =
    new Intl.DateTimeFormat("ro-RO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T12:00:00`));

  return time
    ? `${formattedDate}, ${time.slice(0, 5)}`
    : formattedDate;
}

export default function PatientAppointmentLifecycle({
  appointmentId,
  status,
  appointmentDate,
  appointmentTime,
}: PatientAppointmentLifecycleProps) {
  const router = useRouter();

  const [timeline, setTimeline] =
    useState<TimelineEvent[]>([]);
  const [timelineOpen, setTimelineOpen] =
    useState(false);
  const [timelineLoaded, setTimelineLoaded] =
    useState(false);
  const [isLoadingTimeline, setIsLoadingTimeline] =
    useState(false);
  const [isCancelling, setIsCancelling] =
    useState(false);
  const [reason, setReason] = useState("");
  const [showCancellation, setShowCancellation] =
    useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCancel = useMemo(() => {
    if (
      !["pending", "confirmed", "rescheduled"].includes(
        status
      )
    ) {
      return false;
    }

    if (!appointmentDate || !appointmentTime) {
      return false;
    }

    const start = new Date(
      `${appointmentDate}T${appointmentTime.slice(0, 5)}:00`
    );

    return (
      !Number.isNaN(start.getTime()) &&
      start.getTime() > Date.now()
    );
  }, [
    status,
    appointmentDate,
    appointmentTime,
  ]);

  async function loadTimeline() {
    if (timelineLoaded || isLoadingTimeline) {
      return;
    }

    setIsLoadingTimeline(true);
    setError("");

    try {
      const response = await fetch(
        `/api/patient/appointments/${appointmentId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const payload =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Istoricul nu a putut fi încărcat."
        );
      }

      setTimeline(payload.timeline ?? []);
      setTimelineLoaded(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Istoricul nu a putut fi încărcat."
      );
    } finally {
      setIsLoadingTimeline(false);
    }
  }

  useEffect(() => {
    if (timelineOpen) {
      void loadTimeline();
    }
  }, [timelineOpen]);

  async function cancelAppointment() {
    if (!canCancel || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/patient/appointments/${appointmentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim() || null,
          }),
        }
      );

      const payload =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Programarea nu a putut fi anulată."
        );
      }

      setMessage("Programarea a fost anulată.");
      setShowCancellation(false);
      setTimelineLoaded(false);
      setTimeline([]);
      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Programarea nu a putut fi anulată."
      );
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-5">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            setTimelineOpen((current) => !current)
          }
          className="romdoc-button romdoc-button-secondary romdoc-button-sm"
        >
          {timelineOpen
            ? "Ascunde istoricul"
            : "Vezi istoricul"}
        </button>

        {canCancel && (
          <button
            type="button"
            onClick={() =>
              setShowCancellation((current) => !current)
            }
            className="romdoc-focus-ring rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Anulează programarea
          </button>
        )}
      </div>

      {showCancellation && canCancel && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <label
            htmlFor={`cancellation-reason-${appointmentId}`}
            className="text-sm font-semibold text-red-900"
          >
            Motivul anulării — opțional
          </label>

          <textarea
            id={`cancellation-reason-${appointmentId}`}
            value={reason}
            onChange={(event) =>
              setReason(event.target.value)
            }
            maxLength={1000}
            rows={3}
            className="romdoc-focus-ring mt-2 block w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-gray-900"
            placeholder="Poți transmite un motiv scurt clinicii."
          />

          <p className="mt-1 text-xs text-red-700">
            {reason.length} / 1000
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void cancelAppointment()}
              disabled={isCancelling}
              className="romdoc-focus-ring rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              {isCancelling
                ? "Se anulează..."
                : "Confirmă anularea"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCancellation(false);
                setReason("");
                setError("");
              }}
              disabled={isCancelling}
              className="romdoc-button romdoc-button-muted romdoc-button-sm"
            >
              Renunță
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {timelineOpen && (
        <div className="mt-5 rounded-xl bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-900">
            Istoricul programării
          </h3>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            Sunt afișate doar actualizările relevante pentru pacient.
          </p>

          {isLoadingTimeline ? (
            <p className="mt-4 text-sm text-gray-600">
              Se încarcă istoricul...
            </p>
          ) : timeline.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              Nu există încă actualizări disponibile.
            </p>
          ) : (
            <ol className="mt-5 space-y-4 border-l-2 border-gray-200 pl-5">
              {timeline.map((event) => {
                const slot = formatSlot(
                  event.event_date,
                  event.event_time
                );

                return (
                  <li
                    key={event.event_id}
                    className="relative"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#036661]"
                    />

                    <p className="text-sm font-semibold text-gray-900">
                      {eventLabels[event.event_type]}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDateTime(event.occurred_at)}
                    </p>

                    {slot && (
                      <p className="mt-1 text-xs text-gray-600">
                        {slot}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
