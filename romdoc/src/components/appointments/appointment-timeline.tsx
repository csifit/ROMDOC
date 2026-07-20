"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getAppointmentStatusLabel,
} from "@/lib/appointments/appointment-status";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

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

export type AppointmentTimelineCopy = {
  title: string;
  eventSingular: string;
  eventPlural: string;
  viewEvolution: string;
  loading: string;
  loadFailed: string;
  retry: string;
  empty: string;
  statusChange: string;
  appointmentChange: string;
  reason: string;
  unknownEvent: string;
  unknownRole: string;
  events: Record<string, string>;
  roles: Record<string, string>;
};

type Props = {
  appointmentId: string;
  defaultOpen?: boolean;
  locale?: AppLocale;
  copy?: AppointmentTimelineCopy;
};

const DEFAULT_COPY:
  AppointmentTimelineCopy = {
    title:
      "Istoricul programării",
    eventSingular:
      "eveniment",
    eventPlural:
      "evenimente",
    viewEvolution:
      "Vezi evoluția programării",
    loading:
      "Se încarcă istoricul...",
    loadFailed:
      "Istoricul nu a putut fi încărcat.",
    retry:
      "Reîncearcă",
    empty:
      "Nu există încă evenimente disponibile.",
    statusChange:
      "Status:",
    appointmentChange:
      "Programare:",
    reason:
      "Motiv:",
    unknownEvent:
      "Programare actualizată",
    unknownRole:
      "Utilizator",
    events: {
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
    },
    roles: {
      patient: "Pacient",
      user: "Pacient",
      doctor: "Medic",
      staff:
        "Personal medical",
      admin: "RomDoc",
      system: "Sistem",
    },
  };

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

function formatDateTime(
  value: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function formatSlot(
  date: string | null,
  time: string | null,
  locale: AppLocale
) {
  if (!date) {
    return null;
  }

  const formattedDate =
    new Intl.DateTimeFormat(
      INTL_LOCALE[locale],
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
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
  locale = "ro",
  copy = DEFAULT_COPY,
}: Props) {
  const [open, setOpen] =
    useState(defaultOpen);

  const [loaded, setLoaded] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [mode, setMode] =
    useState<
      "patient" | "operational"
    >("patient");

  const [timeline, setTimeline] =
    useState<
      AppointmentTimelineItem[]
    >([]);

  const [error, setError] =
    useState("");

  async function loadTimeline() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/appointments/${appointmentId}/timeline`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const payload =
        (await response.json()) as
          TimelineResponse;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : copy.loadFailed
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

      setLoaded(true);
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
      setLoading(false);
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
        aria-expanded={open}
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
        className="romdoc-focus-ring flex w-full items-center justify-between gap-[13px] rounded-[13px] border border-gray-200 bg-gray-50 px-[13px] py-[13px] text-left transition hover:border-[#036661]/40 hover:bg-white"
      >
        <span>
          <span className="block text-sm font-semibold text-gray-900">
            {copy.title}
          </span>

          <span className="mt-[3px] block text-xs text-gray-500">
            {loaded
              ? `${timeline.length} ${
                  timeline.length ===
                  1
                    ? copy.eventSingular
                    : copy.eventPlural
                }`
              : copy.viewEvolution}
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
              {copy.loading}
            </p>
          ) : error ? (
            <div
              role="alert"
              className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
            >
              <p>{error}</p>

              <button
                type="button"
                onClick={() =>
                  void loadTimeline()
                }
                className="romdoc-focus-ring mt-[13px] rounded-[13px] border border-red-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-red-800"
              >
                {copy.retry}
              </button>
            </div>
          ) : timeline.length ===
            0 ? (
            <p className="text-sm text-gray-600">
              {copy.empty}
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
                      event.previousTime,
                      locale
                    );

                  const newSlot =
                    formatSlot(
                      event.newDate,
                      event.newTime,
                      locale
                    );

                  const previousStatus =
                    event.previousStatus
                      ? getAppointmentStatusLabel(
                          event.previousStatus,
                          locale
                        )
                      : null;

                  const newStatus =
                    getAppointmentStatusLabel(
                      event.newStatus,
                      locale
                    );

                  const eventLabel =
                    copy.events[
                      event.eventType
                    ] ??
                    copy.unknownEvent;

                  const roleLabel =
                    copy.roles[
                      event.actorRole
                    ] ??
                    copy.unknownRole;

                  return (
                    <li
                      key={event.id}
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
                            {eventLabel}
                          </p>

                          <time className="text-xs text-gray-500">
                            {formatDateTime(
                              event.occurredAt,
                              locale
                            )}
                          </time>
                        </div>

                        {mode ===
                          "operational" && (
                          <p className="mt-[5px] text-xs text-gray-500">
                            {event.actorName ??
                              roleLabel}{" "}
                            ·{" "}
                            {roleLabel}
                          </p>
                        )}

                        {previousStatus &&
                          previousStatus !==
                            newStatus && (
                            <p className="mt-[8px] text-xs text-gray-600">
                              {
                                copy.statusChange
                              }{" "}
                              <span className="font-medium">
                                {
                                  previousStatus
                                }
                              </span>{" "}
                              →{" "}
                              <span className="font-medium">
                                {newStatus}
                              </span>
                            </p>
                          )}

                        {previousSlot &&
                        newSlot &&
                        previousSlot !==
                          newSlot ? (
                          <p className="mt-[8px] text-xs text-gray-600">
                            {
                              copy.appointmentChange
                            }{" "}
                            <span className="font-medium">
                              {previousSlot}
                            </span>{" "}
                            →{" "}
                            <span className="font-medium">
                              {newSlot}
                            </span>
                          </p>
                        ) : newSlot ? (
                          <p className="mt-[8px] text-xs text-gray-600">
                            {
                              copy.appointmentChange
                            }{" "}
                            <span className="font-medium">
                              {newSlot}
                            </span>
                          </p>
                        ) : null}

                        {event.reason && (
                          <p className="mt-[8px] text-xs leading-5 text-gray-600">
                            {copy.reason}{" "}
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
