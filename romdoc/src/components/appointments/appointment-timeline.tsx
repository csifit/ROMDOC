"use client";

import {
  useEffect,
  useState,
} from "react";

export type AppointmentTimelineItem = {
  id: string;
  eventType: string;
  previousStatus: string | null;
  newStatus: string;
  actorRole: string;
  actorName: string | null;
  reason: string | null;
  previousDate: string | null;
  previousTime: string | null;
  newDate: string | null;
  newTime: string | null;
  occurredAt: string;
};

type TimelineResponse = {
  mode?: "patient" | "operational";
  timeline?: AppointmentTimelineItem[];
  error?: string;
};

type Props = {
  appointmentId: string;
  defaultOpen?: boolean;
};

function eventLabel(
  eventType: string
) {
  const labels: Record<
    string,
    string
  > = {
    appointment_created:
      "Solicitare creată",
    confirmed:
      "Programare confirmată",
    rescheduled:
      "Programare reprogramată",
    cancelled_by_patient:
      "Programare anulată de pacient",
    cancelled_by_doctor:
      "Programare anulată de medic",
    cancelled_by_staff:
      "Programare anulată de personal",
    cancelled_by_admin:
      "Programare anulată de RomDoc",
    cancelled_by_system:
      "Programare anulată automat",
    completed:
      "Consultație finalizată",
    marked_no_show:
      "Neprezentare înregistrată",
    schedule_changed:
      "Data sau ora modificată",
    notes_updated:
      "Observații actualizate",
    status_changed:
      "Status actualizat",
  };

  return (
    labels[eventType] ??
    "Programare actualizată"
  );
}

function roleLabel(
  role: string
) {
  const labels: Record<
    string,
    string
  > = {
    patient:
      "Pacient",
    user:
      "Pacient",
    doctor:
      "Medic",
    staff:
      "Personal medical",
    admin:
      "RomDoc",
    system:
      "Sistem",
  };

  return (
    labels[role] ??
    "Utilizator"
  );
}

function statusLabel(
  status: string | null
) {
  if (!status) {
    return null;
  }

  const labels: Record<
    string,
    string
  > = {
    pending:
      "În așteptare",
    confirmed:
      "Confirmată",
    rescheduled:
      "Reprogramată",
    cancelled:
      "Anulată",
    completed:
      "Finalizată",
    no_show:
      "Neprezentare",
  };

  return (
    labels[status] ??
    status
  );
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function formatSlot(
  date: string | null,
  time: string | null
) {
  if (!date) {
    return null;
  }

  const formattedDate =
    new Intl.DateTimeFormat(
      "ro-RO",
      {
        day:
          "2-digit",
        month:
          "long",
        year:
          "numeric",
      }
    ).format(
      new Date(
        `${date}T12:00:00`
      )
    );

  return time
    ? `${formattedDate}, ${time.slice(
        0,
        5
      )}`
    : formattedDate;
}

export default function AppointmentTimeline({
  appointmentId,
  defaultOpen = false,
}: Props) {
  const [
    open,
    setOpen,
  ] =
    useState(
      defaultOpen
    );

  const [
    loaded,
    setLoaded,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    mode,
    setMode,
  ] =
    useState<
      "patient" | "operational"
    >(
      "patient"
    );

  const [
    timeline,
    setTimeline,
  ] =
    useState<
      AppointmentTimelineItem[]
    >([]);

  const [
    error,
    setError,
  ] =
    useState("");

  async function loadTimeline() {
    if (
      loading
    ) {
      return;
    }

    setLoading(
      true
    );

    setError(
      ""
    );

    try {
      const response =
        await fetch(
          `/api/appointments/${appointmentId}/timeline`,
          {
            method:
              "GET",
            cache:
              "no-store",
          }
        );

      const payload =
        (await response.json()) as
          TimelineResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          payload.error ??
            "Istoricul nu a putut fi încărcat."
        );
      }

      setMode(
        payload.mode ??
          "patient"
      );

      setTimeline(
        payload.timeline ??
          []
      );

      setLoaded(
        true
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof
          Error
          ? loadError.message
          : "Istoricul nu a putut fi încărcat."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  useEffect(() => {
    if (
      open &&
      !loaded
    ) {
      void loadTimeline();
    }
  }, [
    loaded,
    open,
  ]);

  return (
    <section className="mt-[21px] border-t border-gray-200 pt-[21px]">
      <button
        type="button"
        aria-expanded={
          open
        }
        onClick={() =>
          setOpen(
            (
              current
            ) =>
              !current
          )
        }
        className="romdoc-focus-ring flex w-full items-center justify-between gap-[13px] rounded-[13px] border border-gray-200 bg-gray-50 px-[13px] py-[13px] text-left transition hover:border-[#036661]/40 hover:bg-white"
      >
        <span>
          <span className="block text-sm font-semibold text-gray-900">
            Istoricul programării
          </span>

          <span className="mt-[3px] block text-xs text-gray-500">
            {loaded
              ? `${timeline.length} evenimente`
              : "Vezi evoluția programării"}
          </span>
        </span>

        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`h-[21px] w-[21px] shrink-0 text-gray-500 transition-transform ${
            open
              ? "rotate-180"
              : ""
          }`}
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="mt-[13px] rounded-[21px] border border-gray-200 bg-white p-[21px]">
          {loading ? (
            <p className="text-sm text-gray-600">
              Se încarcă istoricul...
            </p>
          ) : error ? (
            <div
              role="alert"
              className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
            >
              <p>
                {
                  error
                }
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadTimeline()
                }
                className="romdoc-focus-ring mt-[13px] rounded-[13px] border border-red-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-red-800"
              >
                Reîncearcă
              </button>
            </div>
          ) : timeline.length ===
            0 ? (
            <p className="text-sm text-gray-600">
              Nu există încă evenimente disponibile.
            </p>
          ) : (
            <ol className="relative ml-[8px] border-l-2 border-gray-200 pl-[21px]">
              {timeline.map(
                (
                  event,
                  index
                ) => {
                  const previousSlot =
                    formatSlot(
                      event.previousDate,
                      event.previousTime
                    );

                  const newSlot =
                    formatSlot(
                      event.newDate,
                      event.newTime
                    );

                  const previousStatus =
                    statusLabel(
                      event.previousStatus
                    );

                  const newStatus =
                    statusLabel(
                      event.newStatus
                    );

                  return (
                    <li
                      key={
                        event.id
                      }
                      className={
                        index ===
                        timeline.length -
                          1
                          ? ""
                          : "pb-[21px]"
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="absolute -left-[7px] mt-[5px] h-[13px] w-[13px] rounded-full border-[3px] border-white bg-[#036661]"
                      />

                      <div className="rounded-[13px] bg-gray-50 p-[13px]">
                        <div className="flex flex-col gap-[5px] sm:flex-row sm:items-start sm:justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            {eventLabel(
                              event.eventType
                            )}
                          </p>

                          <time className="text-xs text-gray-500">
                            {formatDateTime(
                              event.occurredAt
                            )}
                          </time>
                        </div>

                        {mode ===
                          "operational" && (
                          <p className="mt-[5px] text-xs text-gray-500">
                            {event.actorName ??
                              roleLabel(
                                event.actorRole
                              )}{" "}
                            ·{" "}
                            {roleLabel(
                              event.actorRole
                            )}
                          </p>
                        )}

                        {previousStatus &&
                          newStatus &&
                          previousStatus !==
                            newStatus && (
                            <p className="mt-[8px] text-xs text-gray-600">
                              Status:{" "}
                              <span className="font-medium">
                                {
                                  previousStatus
                                }
                              </span>{" "}
                              →{" "}
                              <span className="font-medium">
                                {
                                  newStatus
                                }
                              </span>
                            </p>
                          )}

                        {previousSlot &&
                          newSlot &&
                          previousSlot !==
                            newSlot ? (
                            <p className="mt-[8px] text-xs text-gray-600">
                              Programare:{" "}
                              <span className="font-medium">
                                {
                                  previousSlot
                                }
                              </span>{" "}
                              →{" "}
                              <span className="font-medium">
                                {
                                  newSlot
                                }
                              </span>
                            </p>
                          ) : newSlot ? (
                            <p className="mt-[8px] text-xs text-gray-600">
                              Programare:{" "}
                              <span className="font-medium">
                                {
                                  newSlot
                                }
                              </span>
                            </p>
                          ) : null}

                        {event.reason && (
                          <p className="mt-[8px] text-xs leading-5 text-gray-600">
                            Motiv:{" "}
                            <span className="font-medium text-gray-800">
                              {
                                event.reason
                              }
                            </span>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                }
              )}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
