"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import roLocale from "@fullcalendar/core/locales/ro";
import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";

import AppointmentActions from "@/components/admin/appointment-actions";
import Button from "@/components/ui/button";

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show";

type CalendarMode =
  | "agenda"
  | "day"
  | "week"
  | "month";

export type DoctorCalendarAppointment = {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  clinicName: string;

  requestedDate: string;
  requestedTime: string | null;

  scheduledDate: string | null;
  scheduledTime: string | null;

  calendarDate: string;
  calendarTime: string | null;

  rescheduleReason: string | null;
  status: AppointmentStatus;
  source: string;
  notes: string | null;
};

type AppointmentCalendarProps = {
  appointments: DoctorCalendarAppointment[];
};

type StatusStyle = {
  label: string;
  dotClassName: string;
  badgeClassName: string;
  eventBackground: string;
  eventBorder: string;
  eventText: string;
};

const statusStyles: Record<
  AppointmentStatus,
  StatusStyle
> = {
  pending: {
    label: "În așteptare",
    dotClassName: "bg-amber-500",
    badgeClassName:
      "border-amber-200 bg-amber-50 text-amber-800",
    eventBackground: "#F59E0B",
    eventBorder: "#D97706",
    eventText: "#111827",
  },

  confirmed: {
    label: "Confirmată",
    dotClassName: "bg-green-600",
    badgeClassName:
      "border-green-200 bg-green-50 text-green-800",
    eventBackground: "#16A34A",
    eventBorder: "#15803D",
    eventText: "#FFFFFF",
  },

  rescheduled: {
    label: "Reprogramată",
    dotClassName: "bg-blue-600",
    badgeClassName:
      "border-blue-200 bg-blue-50 text-blue-800",
    eventBackground: "#2563EB",
    eventBorder: "#1D4ED8",
    eventText: "#FFFFFF",
  },

  completed: {
    label: "Finalizată",
    dotClassName: "bg-gray-500",
    badgeClassName:
      "border-gray-200 bg-gray-100 text-gray-700",
    eventBackground: "#6B7280",
    eventBorder: "#4B5563",
    eventText: "#FFFFFF",
  },

  cancelled: {
    label: "Anulată",
    dotClassName: "bg-red-600",
    badgeClassName:
      "border-red-200 bg-red-50 text-red-800",
    eventBackground: "#DC2626",
    eventBorder: "#B91C1C",
    eventText: "#FFFFFF",
  },

  no_show: {
    label: "Neprezentare",
    dotClassName: "bg-orange-700",
    badgeClassName:
      "border-orange-200 bg-orange-50 text-orange-900",
    eventBackground: "#C2410C",
    eventBorder: "#9A3412",
    eventText: "#FFFFFF",
  },
};

const calendarViewByMode: Record<
  Exclude<CalendarMode, "agenda">,
  string
> = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
};

function normalizeTime(
  time: string | null
) {
  if (!time) {
    return "09:00:00";
  }

  if (
    /^\d{2}:\d{2}:\d{2}$/.test(
      time
    )
  ) {
    return time;
  }

  if (
    /^\d{2}:\d{2}$/.test(
      time
    )
  ) {
    return `${time}:00`;
  }

  return "09:00:00";
}

function formatDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${date}T12:00:00`
    )
  );
}

function formatCompactDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(
      `${date}T12:00:00`
    )
  );
}

function formatTime(
  time: string | null
) {
  return time
    ? time.slice(
        0,
        5
      )
    : "Ora nespecificată";
}

function getSourceLabel(
  source: string
) {
  switch (
    source
  ) {
    case "phone":
      return "Telefon";

    case "walk_in":
      return "Direct la clinică";

    case "email":
      return "E-mail";

    case "other":
      return "Altă sursă";

    default:
      return "Cerere online";
  }
}

function toTimestamp(
  appointment: DoctorCalendarAppointment
) {
  return new Date(
    `${appointment.calendarDate}T${normalizeTime(
      appointment.calendarTime
    )}`
  ).getTime();
}

function isUpcoming(
  appointment: DoctorCalendarAppointment
) {
  return (
    toTimestamp(
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

export default function AppointmentCalendar({
  appointments,
}: AppointmentCalendarProps) {
  const calendarRef =
    useRef<FullCalendar | null>(
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
      "upcoming" | "all"
    >(
      "upcoming"
    );

  const [
    calendarTitle,
    setCalendarTitle,
  ] =
    useState(
      "Calendar"
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

  useEffect(() => {
    const desktop =
      window.matchMedia(
        "(min-width: 768px)"
      ).matches;

    if (
      desktop
    ) {
      setMode(
        "month"
      );
    }
  }, []);

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
            toTimestamp(
              first
            ) -
            toTimestamp(
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

  const selectedAppointment =
    useMemo(() => {
      if (
        !selectedAppointmentId
      ) {
        return null;
      }

      return (
        appointments.find(
          (
            appointment
          ) =>
            appointment.id ===
            selectedAppointmentId
        ) ??
        null
      );
    }, [
      appointments,
      selectedAppointmentId,
    ]);

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
              statusStyles[
                appointment.status
              ];

            return {
              id:
                appointment.id,
              title:
                appointment.patientName,
              start:
                `${appointment.calendarDate}T${normalizeTime(
                  appointment.calendarTime
                )}`,
              backgroundColor:
                style.eventBackground,
              borderColor:
                style.eventBorder,
              textColor:
                style.eventText,
              extendedProps: {
                appointmentId:
                  appointment.id,
                status:
                  appointment.status,
              },
            };
          }
        ),
      [
        appointments,
      ]
    );

  const groupedAgenda =
    useMemo(() => {
      const groups =
        new Map<
          string,
          DoctorCalendarAppointment[]
        >();

      for (
        const appointment of
        agendaAppointments
      ) {
        const current =
          groups.get(
            appointment.calendarDate
          ) ??
          [];

        current.push(
          appointment
        );

        groups.set(
          appointment.calendarDate,
          current
        );
      }

      return Array.from(
        groups.entries()
      );
    }, [
      agendaAppointments,
    ]);

  function selectMode(
    nextMode: CalendarMode
  ) {
    setMode(
      nextMode
    );
  }

  function moveCalendar(
    direction:
      | "previous"
      | "today"
      | "next"
  ) {
    const api =
      calendarRef.current?.getApi();

    if (
      !api
    ) {
      return;
    }

    if (
      direction ===
      "previous"
    ) {
      api.prev();
      return;
    }

    if (
      direction ===
      "next"
    ) {
      api.next();
      return;
    }

    api.today();
  }

  function handleDatesSet(
    dateInfo: DatesSetArg
  ) {
    setCalendarTitle(
      dateInfo.view.title
    );
  }

  function handleEventClick(
    clickInfo: EventClickArg
  ) {
    setSelectedAppointmentId(
      clickInfo.event.id
    );
  }

  function renderEventContent(
    eventInfo: EventContentArg
  ) {
    const appointment =
      appointments.find(
        (
          item
        ) =>
          item.id ===
          eventInfo.event.id
      ) ??
      null;

    if (
      !appointment
    ) {
      return null;
    }

    return (
      <div className="min-w-0 px-[5px] py-[3px] text-xs">
        {eventInfo.timeText && (
          <span className="font-semibold">
            {
              eventInfo.timeText
            }
          </span>
        )}

        <span className="ml-[5px] truncate">
          {
            appointment.patientName
          }
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-[21px]">
      <section className="rounded-[21px] border border-gray-200 bg-white p-[13px] shadow-sm sm:p-[21px]">
        <div className="flex flex-col gap-[13px] border-b border-gray-200 pb-[13px] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#036661]">
              Vizualizare
            </p>

            <h2 className="mt-[5px] text-xl font-bold text-gray-900">
              {mode ===
              "agenda"
                ? "Agenda programărilor"
                : calendarTitle}
            </h2>
          </div>

          <div
            className="grid grid-cols-4 gap-[5px] rounded-[13px] bg-gray-100 p-[5px]"
            aria-label="Alege vizualizarea calendarului"
          >
            {(
              [
                [
                  "agenda",
                  "Agenda",
                ],
                [
                  "day",
                  "Zi",
                ],
                [
                  "week",
                  "Săpt.",
                ],
                [
                  "month",
                  "Lună",
                ],
              ] as Array<
                [
                  CalendarMode,
                  string,
                ]
              >
            ).map(
              ([
                value,
                label,
              ]) => (
                <button
                  key={
                    value
                  }
                  type="button"
                  onClick={() =>
                    selectMode(
                      value
                    )
                  }
                  aria-pressed={
                    mode ===
                    value
                  }
                  className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[8px] py-[5px] text-sm font-semibold transition ${
                    mode ===
                    value
                      ? "bg-white text-[#036661] shadow-sm"
                      : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
                  }`}
                >
                  {
                    label
                  }
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-[13px] flex flex-wrap gap-x-[13px] gap-y-[8px]">
          {(
            Object.entries(
              statusStyles
            ) as Array<
              [
                AppointmentStatus,
                StatusStyle,
              ]
            >
          ).map(
            ([
              status,
              style,
            ]) => (
              <div
                key={
                  status
                }
                className="flex items-center gap-[5px] text-xs text-gray-600"
              >
                <span
                  className={`h-[8px] w-[8px] rounded-full ${style.dotClassName}`}
                />

                <span>
                  {
                    style.label
                  }
                </span>
              </div>
            )
          )}
        </div>

        {appointments.length ===
        0 ? (
          <EmptyState />
        ) : mode ===
          "agenda" ? (
          <div className="mt-[21px]">
            <div className="flex flex-wrap items-center justify-between gap-[13px]">
              <p className="text-sm text-gray-600">
                {
                  agendaAppointments.length
                }{" "}
                {agendaAppointments.length ===
                1
                  ? "programare afișată"
                  : "programări afișate"}
              </p>

              <div className="flex rounded-[13px] border border-gray-200 bg-white p-[3px]">
                <button
                  type="button"
                  onClick={() =>
                    setAgendaFilter(
                      "upcoming"
                    )
                  }
                  aria-pressed={
                    agendaFilter ===
                    "upcoming"
                  }
                  className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[13px] py-[5px] text-sm font-semibold ${
                    agendaFilter ===
                    "upcoming"
                      ? "bg-[#036661] text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Viitoare
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAgendaFilter(
                      "all"
                    )
                  }
                  aria-pressed={
                    agendaFilter ===
                    "all"
                  }
                  className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[13px] py-[5px] text-sm font-semibold ${
                    agendaFilter ===
                    "all"
                      ? "bg-[#036661] text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Toate
                </button>
              </div>
            </div>

            {groupedAgenda.length >
            0 ? (
              <div className="mt-[21px] space-y-[21px]">
                {groupedAgenda.map(
                  ([
                    date,
                    dateAppointments,
                  ]) => (
                    <section
                      key={
                        date
                      }
                    >
                      <div className="sticky top-[8px] z-10 rounded-[13px] border border-gray-200 bg-white/95 px-[13px] py-[8px] backdrop-blur">
                        <h3 className="text-sm font-bold capitalize text-gray-900">
                          {formatDate(
                            date
                          )}
                        </h3>
                      </div>

                      <div className="mt-[8px] space-y-[8px]">
                        {dateAppointments.map(
                          (
                            appointment
                          ) => (
                            <AgendaCard
                              key={
                                appointment.id
                              }
                              appointment={
                                appointment
                              }
                              onOpen={() =>
                                setSelectedAppointmentId(
                                  appointment.id
                                )
                              }
                            />
                          )
                        )}
                      </div>
                    </section>
                  )
                )}
              </div>
            ) : (
              <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-center">
                <p className="font-semibold text-gray-900">
                  Nu există programări viitoare.
                </p>

                <p className="mt-[5px] text-sm text-gray-600">
                  Selectează „Toate” pentru a vedea istoricul.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-[21px]">
            <div className="mb-[13px] flex flex-wrap items-center justify-between gap-[13px]">
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
                  aria-label="Perioada anterioară"
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
                  Astăzi
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
                  aria-label="Perioada următoare"
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

            <div className="doctor-calendar overflow-x-auto rounded-[13px] border border-gray-200">
              <div
                className={
                  mode ===
                  "week"
                    ? "min-w-[760px]"
                    : mode ===
                        "day"
                      ? "min-w-[420px]"
                      : "min-w-[680px]"
                }
              >
                <FullCalendar
                  key={
                    mode
                  }
                  ref={
                    calendarRef
                  }
                  plugins={[
                    dayGridPlugin,
                    timeGridPlugin,
                    interactionPlugin,
                  ]}
                  locale={
                    roLocale
                  }
                  initialView={calendarViewByMode[mode as Exclude<CalendarMode, "agenda">]}
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
                  navLinks
                  dayMaxEvents={
                    true
                  }
                  weekends
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

            <p className="mt-[8px] text-xs text-gray-500 md:hidden">
              Pentru calendarul săptămânal poți glisa orizontal. Agenda rămâne vizualizarea recomandată pe telefon.
            </p>
          </div>
        )}
      </section>

      {selectedAppointment && (
        <AppointmentDetails
          appointment={
            selectedAppointment
          }
          onClose={() =>
            setSelectedAppointmentId(
              null
            )
          }
        />
      )}

      <style jsx global>{`
        .doctor-calendar .fc {
          font-family: inherit;
          color: #374151;
        }

        .doctor-calendar .fc-scrollgrid {
          border: 0;
        }

        .doctor-calendar .fc-theme-standard td,
        .doctor-calendar .fc-theme-standard th {
          border-color: #e5e7eb;
        }

        .doctor-calendar .fc-col-header-cell {
          background: #f9fafb;
        }

        .doctor-calendar .fc-col-header-cell-cushion,
        .doctor-calendar .fc-daygrid-day-number {
          color: #374151;
          padding: 8px;
        }

        .doctor-calendar .fc-day-today {
          background: rgba(3, 102, 97, 0.06) !important;
        }

        .doctor-calendar .fc-event {
          cursor: pointer;
          border-radius: 8px;
          box-shadow: none;
        }

        .doctor-calendar .fc-more-link {
          color: #036661;
          font-weight: 700;
        }

        .doctor-calendar .fc-timegrid-slot-label-cushion {
          font-size: 0.75rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

function AgendaCard({
  appointment,
  onOpen,
}: {
  appointment: DoctorCalendarAppointment;
  onOpen: () => void;
}) {
  const style =
    statusStyles[
      appointment.status
    ];

  return (
    <button
      type="button"
      onClick={
        onOpen
      }
      className="romdoc-focus-ring block w-full rounded-[13px] border border-gray-200 bg-white p-[13px] text-left transition hover:border-[#036661]/40 hover:shadow-sm"
    >
      <div className="flex items-start gap-[13px]">
        <div className="w-[55px] shrink-0 rounded-[13px] bg-gray-50 px-[8px] py-[13px] text-center">
          <p className="text-lg font-bold text-gray-900">
            {formatTime(
              appointment.calendarTime
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

              <p className="mt-[5px] truncate text-sm text-gray-600">
                {
                  appointment.clinicName
                }
              </p>
            </div>

            <span
              className={`inline-flex min-h-[34px] items-center rounded-full border px-[13px] py-[5px] text-xs font-semibold ${style.badgeClassName}`}
            >
              {
                style.label
              }
            </span>
          </div>

          <div className="mt-[8px] flex flex-wrap gap-x-[13px] gap-y-[5px] text-xs text-gray-500">
            <span>
              {getSourceLabel(
                appointment.source
              )}
            </span>

            <span>
              {appointment.patientPhone}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-gray-50 p-[34px] text-center">
      <div className="mx-auto flex h-[55px] w-[55px] items-center justify-center rounded-full bg-white text-2xl shadow-sm">
        📅
      </div>

      <h3 className="mt-[13px] text-lg font-bold text-gray-900">
        Nu există încă programări
      </h3>

      <p className="mx-auto mt-[8px] max-w-md text-sm leading-6 text-gray-600">
        Programările online și cele introduse manual vor apărea aici în ordine cronologică.
      </p>
    </div>
  );
}

function AppointmentDetails({
  appointment,
  onClose,
}: {
  appointment: DoctorCalendarAppointment;
  onClose: () => void;
}) {
  const style =
    statusStyles[
      appointment.status
    ];

  return (
    <section
      id={`calendar-appointment-${appointment.id}`}
      className="scroll-mt-[89px] rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm"
    >
      <div className="flex flex-col justify-between gap-[13px] sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Programare selectată
          </p>

          <h2 className="mt-[5px] text-2xl font-bold text-gray-900">
            {
              appointment.patientName
            }
          </h2>

          <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
            <span
              className={`inline-flex min-h-[34px] items-center rounded-full border px-[13px] py-[5px] text-xs font-semibold ${style.badgeClassName}`}
            >
              {
                style.label
              }
            </span>

            <span className="text-sm text-gray-500">
              {formatCompactDate(
                appointment.calendarDate
              )}
              ,{" "}
              {formatTime(
                appointment.calendarTime
              )}
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={
            onClose
          }
          variant="secondary"
          size="sm"
          className="w-fit"
        >
          Închide
        </Button>
      </div>

      <div className="mt-[21px] grid gap-[21px] sm:grid-cols-2 lg:grid-cols-3">
        <Detail
          label="Clinica"
          value={
            appointment.clinicName
          }
        />

        <Detail
          label="Sursa"
          value={getSourceLabel(
            appointment.source
          )}
        />

        <Detail
          label="Data solicitată"
          value={`${formatCompactDate(
            appointment.requestedDate
          )}${
            appointment.requestedTime
              ? `, ${formatTime(
                  appointment.requestedTime
                )}`
              : ""
          }`}
        />

        {appointment.scheduledDate && (
          <Detail
            label="Data confirmată"
            value={`${formatCompactDate(
              appointment.scheduledDate
            )}${
              appointment.scheduledTime
                ? `, ${formatTime(
                    appointment.scheduledTime
                  )}`
                : ""
            }`}
            strong
          />
        )}

        <ContactDetail
          label="Telefon"
          value={
            appointment.patientPhone
          }
          href={`tel:${appointment.patientPhone.replace(
            /\s+/g,
            ""
          )}`}
        />

        <ContactDetail
          label="E-mail"
          value={
            appointment.patientEmail
          }
          href={`mailto:${appointment.patientEmail}`}
        />
      </div>

      {appointment.notes && (
        <InfoBox
          label="Observații"
          value={
            appointment.notes
          }
        />
      )}

      {appointment.rescheduleReason && (
        <InfoBox
          label="Motivul reprogramării"
          value={
            appointment.rescheduleReason
          }
          blue
        />
      )}

      <AppointmentActions
        appointmentId={
          appointment.id
        }
        currentStatus={
          appointment.status
        }
        requestedDate={
          appointment.requestedDate
        }
        requestedTime={
          appointment.requestedTime
        }
        scheduledDate={
          appointment.scheduledDate
        }
        scheduledTime={
          appointment.scheduledTime
        }
        currentReason={
          appointment.rescheduleReason
        }
      />
    </section>
  );
}

function Detail({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {
          label
        }
      </p>

      <p
        className={`mt-[5px] text-gray-900 ${
          strong
            ? "font-semibold"
            : ""
        }`}
      >
        {
          value
        }
      </p>
    </div>
  );
}

function ContactDetail({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {
          label
        }
      </p>

      <a
        href={
          href
        }
        className="romdoc-focus-ring mt-[5px] block break-all rounded-[5px] text-gray-900 underline-offset-4 hover:text-[#036661] hover:underline"
      >
        {
          value
        }
      </a>
    </div>
  );
}

function InfoBox({
  label,
  value,
  blue = false,
}: {
  label: string;
  value: string;
  blue?: boolean;
}) {
  return (
    <div
      className={`mt-[21px] rounded-[13px] p-[13px] ${
        blue
          ? "border border-blue-200 bg-blue-50"
          : "bg-gray-50"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          blue
            ? "text-blue-700"
            : "text-gray-500"
        }`}
      >
        {
          label
        }
      </p>

      <p
        className={`mt-[8px] whitespace-pre-wrap text-sm leading-6 ${
          blue
            ? "text-blue-900"
            : "text-gray-700"
        }`}
      >
        {
          value
        }
      </p>
    </div>
  );
}
