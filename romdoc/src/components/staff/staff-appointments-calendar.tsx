"use client";

import allLocales from "@fullcalendar/core/locales-all";
import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import Link from "next/link";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useMemo,
  useRef,
  useState,
} from "react";

import StaffAppointmentActions from "@/components/staff/staff-appointment-actions";
import type {
  StaffAppointmentListItem,
} from "@/components/staff/staff-appointments-filtered-list";
import Button from "@/components/ui/button";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type CalendarMode =
  | "agenda"
  | "day"
  | "week"
  | "month";

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show";

type StatusStyle = {
  dotClassName: string;
  badgeClassName: string;
  eventBackground: string;
  eventBorder: string;
  eventText: string;
};

type Props = {
  appointments:
    StaffAppointmentListItem[];

  onUpdated:
    () =>
      void |
      Promise<void>;
};

const STATUS_STYLES:
  Record<
    AppointmentStatus,
    StatusStyle
  > = {
    pending: {
      dotClassName:
        "bg-amber-500",

      badgeClassName:
        "border-amber-200 bg-amber-50 text-amber-800",

      eventBackground:
        "#F59E0B",

      eventBorder:
        "#D97706",

      eventText:
        "#111827",
    },

    confirmed: {
      dotClassName:
        "bg-green-600",

      badgeClassName:
        "border-green-200 bg-green-50 text-green-800",

      eventBackground:
        "#16A34A",

      eventBorder:
        "#15803D",

      eventText:
        "#FFFFFF",
    },

    rescheduled: {
      dotClassName:
        "bg-blue-600",

      badgeClassName:
        "border-blue-200 bg-blue-50 text-blue-800",

      eventBackground:
        "#2563EB",

      eventBorder:
        "#1D4ED8",

      eventText:
        "#FFFFFF",
    },

    completed: {
      dotClassName:
        "bg-gray-500",

      badgeClassName:
        "border-gray-200 bg-gray-100 text-gray-700",

      eventBackground:
        "#6B7280",

      eventBorder:
        "#4B5563",

      eventText:
        "#FFFFFF",
    },

    cancelled: {
      dotClassName:
        "bg-red-600",

      badgeClassName:
        "border-red-200 bg-red-50 text-red-800",

      eventBackground:
        "#DC2626",

      eventBorder:
        "#B91C1C",

      eventText:
        "#FFFFFF",
    },

    no_show: {
      dotClassName:
        "bg-orange-700",

      badgeClassName:
        "border-orange-200 bg-orange-50 text-orange-900",

      eventBackground:
        "#C2410C",

      eventBorder:
        "#9A3412",

      eventText:
        "#FFFFFF",
    },
  };

const CALENDAR_VIEW:
  Record<
    Exclude<
      CalendarMode,
      "agenda"
    >,
    string
  > = {
    day:
      "timeGridDay",

    week:
      "timeGridWeek",

    month:
      "dayGridMonth",
  };

const DATE_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro:
      "ro-RO",
    en:
      "en-GB",
    de:
      "de-DE",
  };

const FULLCALENDAR_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro:
      "ro",
    en:
      "en-gb",
    de:
      "de",
  };

function isAppointmentStatus(
  status:
    string
): status is
  AppointmentStatus {
  return [
    "pending",
    "confirmed",
    "rescheduled",
    "completed",
    "cancelled",
    "no_show",
  ].includes(
    status
  );
}

function statusStyle(
  status:
    string
) {
  return isAppointmentStatus(
    status
  )
    ? STATUS_STYLES[
        status
      ]
    : STATUS_STYLES
        .pending;
}

function effectiveDate(
  appointment:
    StaffAppointmentListItem
) {
  return (
    appointment
      .scheduledDate ??
    appointment
      .requestedDate
  );
}

function effectiveTime(
  appointment:
    StaffAppointmentListItem
) {
  return (
    appointment
      .scheduledTime ??
    appointment
      .requestedTime
  );
}

function normalizeTime(
  value:
    | string
    | null
) {
  if (!value) {
    return "09:00:00";
  }

  if (
    /^\d{2}:\d{2}:\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  if (
    /^\d{2}:\d{2}$/.test(
      value
    )
  ) {
    return `${value}:00`;
  }

  return "09:00:00";
}

function shortTime(
  value:
    | string
    | null
) {
  return value
    ? value.slice(
        0,
        5
      )
    : "—";
}

function timestamp(
  appointment:
    StaffAppointmentListItem
) {
  return new Date(
    `${effectiveDate(
      appointment
    )}T${normalizeTime(
      effectiveTime(
        appointment
      )
    )}`
  ).getTime();
}

function isUpcoming(
  appointment:
    StaffAppointmentListItem
) {
  return (
    timestamp(
      appointment
    ) >=
      Date.now() &&
    ![
      "cancelled",
      "completed",
      "no_show",
    ].includes(
      appointment.status
    )
  );
}

export default function StaffAppointmentsCalendar({
  appointments,
  onUpdated,
}: Props) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "StaffOperationalDashboard.calendar"
    );

  const listT =
    useTranslations(
      "StaffOperationalDashboard.list"
    );

  const calendarRef =
    useRef<
      FullCalendar | null
    >(
      null
    );

  const [
    mode,
    setMode,
  ] =
    useState<CalendarMode>(
      "agenda"
    );

  const [
    agendaFilter,
    setAgendaFilter,
  ] =
    useState<
      "upcoming" |
      "all"
    >(
      "upcoming"
    );

  const [
    calendarTitle,
    setCalendarTitle,
  ] =
    useState(
      t(
        "agendaTitle"
      )
    );

  const [
    selectedAppointmentId,
    setSelectedAppointmentId,
  ] =
    useState<
      string | null
    >(
      null
    );

  function statusLabel(
    status:
      string
  ) {
    const normalized =
      isAppointmentStatus(
        status
      )
        ? status
        : "pending";

    return t(
      `statuses.${normalized}`
    );
  }

  function sourceLabel(
    source:
      string | null
  ) {
    const normalized =
      source &&
      [
        "phone",
        "walk_in",
        "email",
        "other",
      ].includes(
        source
      )
        ? source
        : "online";

    return t(
      `sources.${normalized}`
    );
  }

  function formatDate(
    value:
      string
  ) {
    return new Intl
      .DateTimeFormat(
        DATE_LOCALE[
          locale
        ],
        {
          weekday:
            "short",

          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric",
        }
      )
      .format(
        new Date(
          `${value}T12:00:00`
        )
      );
  }

  function formatLongDate(
    value:
      string
  ) {
    return new Intl
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
          `${value}T12:00:00`
        )
      );
  }

  const sortedAppointments =
    useMemo(
      () =>
        [
          ...appointments,
        ].sort(
          (
            first,
            second
          ) =>
            timestamp(
              first
            ) -
            timestamp(
              second
            )
        ),
      [
        appointments,
      ]
    );

  const agendaAppointments =
    useMemo(
      () =>
        agendaFilter ===
        "upcoming"
          ? sortedAppointments.filter(
              isUpcoming
            )
          : sortedAppointments,
      [
        agendaFilter,
        sortedAppointments,
      ]
    );

  const groupedAgenda =
    useMemo(
      () => {
        const groups =
          new Map<
            string,
            StaffAppointmentListItem[]
          >();

        for (
          const appointment of
            agendaAppointments
        ) {
          const date =
            effectiveDate(
              appointment
            );

          groups.set(
            date,
            [
              ...(
                groups.get(
                  date
                ) ??
                []
              ),
              appointment,
            ]
          );
        }

        return Array.from(
          groups.entries()
        );
      },
      [
        agendaAppointments,
      ]
    );

  const selectedAppointment =
    useMemo(
      () =>
        appointments.find(
          (
            appointment
          ) =>
            appointment.id ===
            selectedAppointmentId
        ) ??
        null,
      [
        appointments,
        selectedAppointmentId,
      ]
    );

  const events =
    useMemo<
      EventInput[]
    >(
      () =>
        appointments.map(
          (
            appointment
          ) => {
            const style =
              statusStyle(
                appointment.status
              );

            return {
              id:
                appointment.id,

              title:
                appointment.patientName,

              start:
                `${effectiveDate(
                  appointment
                )}T${normalizeTime(
                  effectiveTime(
                    appointment
                  )
                )}`,

              backgroundColor:
                style.eventBackground,

              borderColor:
                style.eventBorder,

              textColor:
                style.eventText,
            };
          }
        ),
      [
        appointments,
      ]
    );

  function moveCalendar(
    direction:
      | "previous"
      | "today"
      | "next"
  ) {
    const api =
      calendarRef.current
        ?.getApi();

    if (!api) {
      return;
    }

    if (
      direction ===
      "previous"
    ) {
      api.prev();
    } else if (
      direction ===
      "next"
    ) {
      api.next();
    } else {
      api.today();
    }
  }

  function handleDatesSet(
    dateInfo:
      DatesSetArg
  ) {
    setCalendarTitle(
      dateInfo.view
        .title
    );
  }

  function handleEventClick(
    clickInfo:
      EventClickArg
  ) {
    setSelectedAppointmentId(
      clickInfo.event
        .id
    );
  }

  function renderEventContent(
    eventInfo:
      EventContentArg
  ) {
    const appointment =
      appointments.find(
        (
          item
        ) =>
          item.id ===
          eventInfo.event
            .id
      );

    if (
      !appointment
    ) {
      return null;
    }

    return (
      <div className="min-w-0 px-[5px] py-[3px] text-[11px] leading-4">
        <div className="truncate font-semibold">
          {eventInfo.timeText && (
            <span>
              {
                eventInfo.timeText
              }{" "}
            </span>
          )}

          {
            appointment.patientName
          }
        </div>

        <div className="truncate opacity-90">
          {
            appointment.doctorName
          }
        </div>
      </div>
    );
  }

  const modes:
    CalendarMode[] =
    [
      "agenda",
      "day",
      "week",
      "month",
    ];

  const statuses:
    AppointmentStatus[] =
    [
      "pending",
      "confirmed",
      "rescheduled",
      "completed",
      "cancelled",
      "no_show",
    ];

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[13px] shadow-sm sm:p-[21px]">
      <div className="flex flex-col gap-[13px] border-b border-gray-200 pb-[13px] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {t(
              "eyebrow"
            )}
          </p>

          <h2 className="mt-[5px] text-xl font-bold text-gray-900">
            {mode ===
            "agenda"
              ? t(
                  "agendaTitle"
                )
              : calendarTitle}
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-[5px] rounded-[13px] bg-gray-100 p-[5px]">
          {modes.map(
            (
              value
            ) => (
              <button
                key={
                  value
                }
                type="button"
                onClick={() =>
                  setMode(
                    value
                  )
                }
                aria-pressed={
                  mode ===
                  value
                }
                className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[8px] py-[5px] text-xs font-semibold ${
                  mode ===
                  value
                    ? "bg-white text-[#036661] shadow-sm"
                    : "text-gray-600 hover:bg-white/70"
                }`}
              >
                {t(
                  `modes.${value}`
                )}
              </button>
            )
          )}
        </div>
      </div>

      <div className="mt-[13px] flex flex-wrap gap-x-[13px] gap-y-[8px]">
        {statuses.map(
          (
            status
          ) => (
            <div
              key={
                status
              }
              className="flex items-center gap-[5px] text-[11px] text-gray-600"
            >
              <span
                className={`h-[8px] w-[8px] rounded-full ${STATUS_STYLES[
                  status
                ].dotClassName}`}
              />

              <span>
                {statusLabel(
                  status
                )}
              </span>
            </div>
          )
        )}
      </div>

      {appointments.length ===
      0 ? (
        <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-center text-sm text-gray-600">
          {t(
            "empty"
          )}
        </div>
      ) : (
        <div className="mt-[21px] grid gap-[21px] lg:grid-cols-[minmax(0,1.618fr)_minmax(320px,1fr)] lg:items-start">
          <div className="min-w-0">
            {mode ===
            "agenda" ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-[8px]">
                  <p className="text-sm text-gray-600">
                    {t(
                      "appointmentCount",
                      {
                        count:
                          agendaAppointments.length,
                      }
                    )}
                  </p>

                  <div className="flex rounded-[13px] border border-gray-200 p-[3px]">
                    <button
                      type="button"
                      onClick={() =>
                        setAgendaFilter(
                          "upcoming"
                        )
                      }
                      className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[13px] py-[5px] text-xs font-semibold ${
                        agendaFilter ===
                        "upcoming"
                          ? "bg-[#036661] text-white"
                          : "text-gray-600"
                      }`}
                    >
                      {t(
                        "upcoming"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAgendaFilter(
                          "all"
                        )
                      }
                      className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[13px] py-[5px] text-xs font-semibold ${
                        agendaFilter ===
                        "all"
                          ? "bg-[#036661] text-white"
                          : "text-gray-600"
                      }`}
                    >
                      {t(
                        "all"
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-[13px] max-h-[610px] space-y-[13px] overflow-y-auto pr-[5px]">
                  {groupedAgenda.length >
                  0 ? (
                    groupedAgenda.map(
                      ([
                        date,
                        dateAppointments,
                      ]) => (
                        <div
                          key={
                            date
                          }
                        >
                          <h3 className="sticky top-0 z-10 rounded-[8px] bg-gray-50 px-[13px] py-[8px] text-xs font-bold capitalize text-gray-700">
                            {formatDate(
                              date
                            )}
                          </h3>

                          <div className="mt-[5px] space-y-[5px]">
                            {dateAppointments.map(
                              (
                                appointment
                              ) => {
                                const style =
                                  statusStyle(
                                    appointment.status
                                  );

                                const selected =
                                  appointment.id ===
                                  selectedAppointmentId;

                                return (
                                  <button
                                    key={
                                      appointment.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      setSelectedAppointmentId(
                                        appointment.id
                                      )
                                    }
                                    className={`romdoc-focus-ring block w-full rounded-[13px] border p-[13px] text-left ${
                                      selected
                                        ? "border-[#036661] bg-[#036661]/5 shadow-sm"
                                        : "border-gray-200 bg-white hover:border-[#036661]/40"
                                    }`}
                                  >
                                    <div className="flex items-start gap-[13px]">
                                      <div className="w-[55px] shrink-0 rounded-[8px] bg-gray-50 px-[5px] py-[8px] text-center">
                                        <p className="font-bold text-gray-900">
                                          {shortTime(
                                            effectiveTime(
                                              appointment
                                            )
                                          )}
                                        </p>
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-[8px]">
                                          <div className="min-w-0">
                                            <p className="truncate font-semibold text-gray-900">
                                              {
                                                appointment.patientName
                                              }
                                            </p>

                                            <p className="mt-[3px] truncate text-xs text-gray-600">
                                              {
                                                appointment.doctorName
                                              }
                                            </p>

                                            <p className="mt-[3px] truncate text-xs text-gray-500">
                                              {
                                                appointment.clinicName
                                              }
                                            </p>
                                          </div>

                                          <span
                                            className={`rounded-full border px-[8px] py-[3px] text-[11px] font-semibold ${style.badgeClassName}`}
                                          >
                                            {statusLabel(
                                              appointment.status
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-center text-sm text-gray-600">
                      {t(
                        "noUpcoming"
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-[13px] flex flex-wrap items-center justify-between gap-[8px]">
                  <div className="flex gap-[5px]">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        moveCalendar(
                          "previous"
                        )
                      }
                    >
                      ←
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        moveCalendar(
                          "today"
                        )
                      }
                    >
                      {t(
                        "today"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        moveCalendar(
                          "next"
                        )
                      }
                    >
                      →
                    </Button>
                  </div>

                  <p className="text-sm font-semibold capitalize text-gray-900">
                    {
                      calendarTitle
                    }
                  </p>
                </div>

                <div className="staff-calendar overflow-x-auto rounded-[13px] border border-gray-200">
                  <div
                    className={
                      mode ===
                      "week"
                        ? "min-w-[690px]"
                        : mode ===
                            "day"
                          ? "min-w-[390px]"
                          : "min-w-[610px]"
                    }
                  >
                    <FullCalendar
                      key={`${mode}-${locale}`}
                      ref={
                        calendarRef
                      }
                      plugins={[
                        dayGridPlugin,
                        timeGridPlugin,
                        interactionPlugin,
                      ]}
                      locales={
                        allLocales
                      }
                      locale={
                        FULLCALENDAR_LOCALE[
                          locale
                        ]
                      }
                      initialView={
                        CALENDAR_VIEW[
                          mode
                        ]
                      }
                      headerToolbar={
                        false
                      }
                      events={
                        events
                      }
                      eventClick={
                        handleEventClick
                      }
                      eventContent={
                        renderEventContent
                      }
                      datesSet={
                        handleDatesSet
                      }
                      height="auto"
                      nowIndicator
                      dayMaxEvents
                      firstDay={
                        1
                      }
                      slotMinTime="06:00:00"
                      slotMaxTime="22:00:00"
                      slotDuration="00:30:00"
                      allDaySlot={
                        false
                      }
                      eventDisplay="block"
                      displayEventEnd={
                        false
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-[21px]">
            {selectedAppointment ? (
              <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
                <div className="flex items-start justify-between gap-[13px]">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#036661]">
                      {t(
                        "details"
                      )}
                    </p>

                    <h3 className="mt-[5px] truncate text-xl font-bold text-gray-900">
                      {
                        selectedAppointment.patientName
                      }
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAppointmentId(
                        null
                      )
                    }
                    aria-label={t(
                      "closeDetails"
                    )}
                    className="romdoc-focus-ring flex h-[34px] w-[34px] items-center justify-center rounded-full border border-gray-200 text-gray-500"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-[13px] flex flex-wrap items-center gap-[8px]">
                  <span
                    className={`rounded-full border px-[13px] py-[5px] text-xs font-semibold ${statusStyle(
                      selectedAppointment.status
                    ).badgeClassName}`}
                  >
                    {statusLabel(
                      selectedAppointment.status
                    )}
                  </span>

                  <span className="text-sm text-gray-600">
                    {formatLongDate(
                      effectiveDate(
                        selectedAppointment
                      )
                    )}
                    ,{" "}
                    {shortTime(
                      effectiveTime(
                        selectedAppointment
                      )
                    )}
                  </span>
                </div>

                <div className="mt-[21px] space-y-[13px]">
                  {[
                    [
                      t(
                        "doctor"
                      ),
                      selectedAppointment.doctorName,
                    ],
                    [
                      t(
                        "clinic"
                      ),
                      selectedAppointment.clinicName,
                    ],
                    [
                      t(
                        "phone"
                      ),
                      selectedAppointment.patientPhone,
                    ],
                    [
                      t(
                        "email"
                      ),
                      selectedAppointment.patientEmail,
                    ],
                    [
                      t(
                        "source"
                      ),
                      sourceLabel(
                        selectedAppointment.source
                      ),
                    ],
                    [
                      t(
                        "requestedDate"
                      ),
                      `${formatLongDate(
                        selectedAppointment.requestedDate
                      )}, ${shortTime(
                        selectedAppointment.requestedTime
                      )}`,
                    ],
                  ].map(
                    ([
                      label,
                      value,
                    ]) => (
                      <div
                        key={
                          label
                        }
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          {
                            label
                          }
                        </p>

                        <p className="mt-[3px] break-all text-sm text-gray-900">
                          {
                            value
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>

                {selectedAppointment.notes && (
                  <div className="mt-[13px] rounded-[13px] bg-gray-50 p-[13px]">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {t(
                        "notes"
                      )}
                    </p>

                    <p className="mt-[5px] whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {
                        selectedAppointment.notes
                      }
                    </p>
                  </div>
                )}

                {selectedAppointment.rescheduleReason && (
                  <div className="mt-[13px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px]">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                      {t(
                        "rescheduleReason"
                      )}
                    </p>

                    <p className="mt-[5px] whitespace-pre-wrap text-sm leading-6 text-blue-900">
                      {
                        selectedAppointment.rescheduleReason
                      }
                    </p>
                  </div>
                )}

                <StaffAppointmentActions
                  appointmentId={
                    selectedAppointment.id
                  }
                  currentStatus={
                    selectedAppointment.status
                  }
                  requestedDate={
                    selectedAppointment.requestedDate
                  }
                  requestedTime={
                    selectedAppointment.requestedTime
                  }
                  scheduledDate={
                    selectedAppointment.scheduledDate
                  }
                  scheduledTime={
                    selectedAppointment.scheduledTime
                  }
                  currentReason={
                    selectedAppointment.rescheduleReason
                  }
                  onUpdated={
                    onUpdated
                  }
                />

                <div className="mt-[13px]">
                  <Link
                    href={`/appointments/${selectedAppointment.id}/messages?locale=${locale}`}
                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                  >
                    {listT(
                      "messages"
                    )}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-[21px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-center">
                <div className="mx-auto flex h-[55px] w-[55px] items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                  ↗
                </div>

                <h3 className="mt-[13px] font-bold text-gray-900">
                  {t(
                    "selectTitle"
                  )}
                </h3>

                <p className="mt-[8px] text-sm leading-6 text-gray-600">
                  {t(
                    "selectDescription"
                  )}
                </p>
              </div>
            )}
          </aside>
        </div>
      )}

      <style jsx global>{`
        .staff-calendar .fc {
          font-family: inherit;
          color: #374151;
          font-size: 0.82rem;
        }

        .staff-calendar .fc-scrollgrid {
          border: 0;
        }

        .staff-calendar .fc-theme-standard td,
        .staff-calendar .fc-theme-standard th {
          border-color: #e5e7eb;
        }

        .staff-calendar .fc-col-header-cell {
          background: #f9fafb;
        }

        .staff-calendar .fc-col-header-cell-cushion,
        .staff-calendar .fc-daygrid-day-number {
          color: #374151;
          padding: 5px;
        }

        .staff-calendar .fc-day-today {
          background: rgba(3, 102, 97, 0.06) !important;
        }

        .staff-calendar .fc-event {
          cursor: pointer;
          border-radius: 5px;
          box-shadow: none;
        }

        .staff-calendar .fc-more-link {
          color: #036661;
          font-weight: 700;
        }

        .staff-calendar .fc-timegrid-slot-label-cushion {
          font-size: 0.68rem;
          color: #6b7280;
        }
      `}</style>
    </section>
  );
}
