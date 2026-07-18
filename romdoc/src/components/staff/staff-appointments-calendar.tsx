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

import StaffAppointmentActions from "@/components/staff/staff-appointment-actions";
import type {
  StaffAppointmentListItem,
} from "@/components/staff/staff-appointments-filtered-list";
import Button from "@/components/ui/button";

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
  label: string;
  dotClassName: string;
  badgeClassName: string;
  eventBackground: string;
  eventBorder: string;
  eventText: string;
};

type Props = {
  appointments: StaffAppointmentListItem[];
  onUpdated: () => void | Promise<void>;
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
  CalendarMode,
  string
> = {
  agenda: "timeGridWeek",
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
};

function isAppointmentStatus(
  status: string
): status is AppointmentStatus {
  return [
    "pending",
    "confirmed",
    "rescheduled",
    "completed",
    "cancelled",
    "no_show",
  ].includes(status);
}

function getStatusStyle(
  status: string
) {
  return isAppointmentStatus(status)
    ? statusStyles[status]
    : statusStyles.pending;
}

function getEffectiveDate(
  appointment: StaffAppointmentListItem
) {
  return (
    appointment.scheduledDate ??
    appointment.requestedDate
  );
}

function getEffectiveTime(
  appointment: StaffAppointmentListItem
) {
  return (
    appointment.scheduledTime ??
    appointment.requestedTime
  );
}

function normalizeTime(
  value: string | null
) {
  if (!value) {
    return "09:00:00";
  }

  if (
    /^\d{2}:\d{2}:\d{2}$/.test(value)
  ) {
    return value;
  }

  if (
    /^\d{2}:\d{2}$/.test(value)
  ) {
    return `${value}:00`;
  }

  return "09:00:00";
}

function formatTime(
  value: string | null
) {
  return value
    ? value.slice(0, 5)
    : "—";
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(`${value}T12:00:00`)
  );
}

function formatLongDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(`${value}T12:00:00`)
  );
}

function getSourceLabel(
  source: string | null
) {
  switch (source) {
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
  appointment: StaffAppointmentListItem
) {
  return new Date(
    `${getEffectiveDate(
      appointment
    )}T${normalizeTime(
      getEffectiveTime(appointment)
    )}`
  ).getTime();
}

function isUpcoming(
  appointment: StaffAppointmentListItem
) {
  return (
    toTimestamp(appointment) >= Date.now() &&
    ![
      "cancelled",
      "completed",
      "no_show",
    ].includes(appointment.status)
  );
}

export default function StaffAppointmentsCalendar({
  appointments,
  onUpdated,
}: Props) {
  const calendarRef =
    useRef<FullCalendar | null>(null);

  const [mode, setMode] =
    useState<CalendarMode>("agenda");

  const [
    agendaFilter,
    setAgendaFilter,
  ] = useState<"upcoming" | "all">(
    "upcoming"
  );

  const [
    calendarTitle,
    setCalendarTitle,
  ] = useState("Calendar");

  const [
    selectedAppointmentId,
    setSelectedAppointmentId,
  ] = useState<string | null>(null);

  useEffect(() => {
    if (
      window.matchMedia(
        "(min-width: 1024px)"
      ).matches
    ) {
      setMode("week");
    }
  }, []);

  useEffect(() => {
    if (
      selectedAppointmentId &&
      !appointments.some(
        (appointment) =>
          appointment.id ===
          selectedAppointmentId
      )
    ) {
      setSelectedAppointmentId(null);
    }
  }, [
    appointments,
    selectedAppointmentId,
  ]);

  const sortedAppointments =
    useMemo(
      () =>
        [...appointments].sort(
          (first, second) =>
            toTimestamp(first) -
            toTimestamp(second)
        ),
      [appointments]
    );

  const agendaAppointments =
    useMemo(
      () =>
        agendaFilter === "upcoming"
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
    useMemo(() => {
      const groups = new Map<
        string,
        StaffAppointmentListItem[]
      >();

      for (
        const appointment of
        agendaAppointments
      ) {
        const date =
          getEffectiveDate(appointment);

        groups.set(date, [
          ...(groups.get(date) ?? []),
          appointment,
        ]);
      }

      return Array.from(groups.entries());
    }, [agendaAppointments]);

  const selectedAppointment =
    useMemo(
      () =>
        appointments.find(
          (appointment) =>
            appointment.id ===
            selectedAppointmentId
        ) ?? null,
      [
        appointments,
        selectedAppointmentId,
      ]
    );

  const events = useMemo<EventInput[]>(
    () =>
      appointments.map((appointment) => {
        const style =
          getStatusStyle(
            appointment.status
          );

        return {
          id: appointment.id,
          title: appointment.patientName,
          start: `${getEffectiveDate(
            appointment
          )}T${normalizeTime(
            getEffectiveTime(appointment)
          )}`,
          backgroundColor:
            style.eventBackground,
          borderColor:
            style.eventBorder,
          textColor:
            style.eventText,
        };
      }),
    [appointments]
  );

  function moveCalendar(
    direction:
      | "previous"
      | "today"
      | "next"
  ) {
    const api =
      calendarRef.current?.getApi();

    if (!api) {
      return;
    }

    if (direction === "previous") {
      api.prev();
    } else if (direction === "next") {
      api.next();
    } else {
      api.today();
    }
  }

  function handleDatesSet(
    dateInfo: DatesSetArg
  ) {
    setCalendarTitle(dateInfo.view.title);
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
        (item) =>
          item.id === eventInfo.event.id
      );

    if (!appointment) {
      return null;
    }

    return (
      <div className="min-w-0 px-[5px] py-[3px] text-[11px] leading-4">
        <div className="truncate font-semibold">
          {eventInfo.timeText && (
            <span>
              {eventInfo.timeText}{" "}
            </span>
          )}
          {appointment.patientName}
        </div>

        <div className="truncate opacity-90">
          {appointment.doctorName}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[13px] shadow-sm sm:p-[21px]">
      <div className="flex flex-col gap-[13px] border-b border-gray-200 pb-[13px] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            Calendar operațional
          </p>

          <h2 className="mt-[5px] text-xl font-bold text-gray-900">
            {mode === "agenda"
              ? "Agenda programărilor"
              : calendarTitle}
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-[5px] rounded-[13px] bg-gray-100 p-[5px]">
          {(
            [
              ["agenda", "Agenda"],
              ["day", "Zi"],
              ["week", "Săpt."],
              ["month", "Lună"],
            ] as Array<
              [CalendarMode, string]
            >
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[8px] py-[5px] text-xs font-semibold transition ${
                mode === value
                  ? "bg-white text-[#036661] shadow-sm"
                  : "text-gray-600 hover:bg-white/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-[13px] flex flex-wrap gap-x-[13px] gap-y-[8px]">
        {(
          Object.entries(statusStyles) as Array<
            [AppointmentStatus, StatusStyle]
          >
        ).map(([status, style]) => (
          <div
            key={status}
            className="flex items-center gap-[5px] text-[11px] text-gray-600"
          >
            <span
              className={`h-[8px] w-[8px] rounded-full ${style.dotClassName}`}
            />
            <span>{style.label}</span>
          </div>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-center text-sm text-gray-600">
          Nu există încă programări.
        </div>
      ) : (
        <div className="mt-[21px] grid gap-[21px] lg:grid-cols-[minmax(0,1.618fr)_minmax(320px,1fr)] lg:items-start">
          <div className="min-w-0">
            {mode === "agenda" ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-[8px]">
                  <p className="text-sm text-gray-600">
                    {agendaAppointments.length}{" "}
                    {agendaAppointments.length === 1
                      ? "programare"
                      : "programări"}
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
                      Viitoare
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAgendaFilter("all")
                      }
                      className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[13px] py-[5px] text-xs font-semibold ${
                        agendaFilter === "all"
                          ? "bg-[#036661] text-white"
                          : "text-gray-600"
                      }`}
                    >
                      Toate
                    </button>
                  </div>
                </div>

                <div className="mt-[13px] max-h-[610px] space-y-[13px] overflow-y-auto pr-[5px]">
                  {groupedAgenda.length > 0 ? (
                    groupedAgenda.map(
                      ([
                        date,
                        dateAppointments,
                      ]) => (
                        <div key={date}>
                          <h3 className="sticky top-0 z-10 rounded-[8px] bg-gray-50 px-[13px] py-[8px] text-xs font-bold capitalize text-gray-700">
                            {formatDate(date)}
                          </h3>

                          <div className="mt-[5px] space-y-[5px]">
                            {dateAppointments.map(
                              (appointment) => {
                                const style =
                                  getStatusStyle(
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
                                    className={`romdoc-focus-ring block w-full rounded-[13px] border p-[13px] text-left transition ${
                                      selected
                                        ? "border-[#036661] bg-[#036661]/5 shadow-sm"
                                        : "border-gray-200 bg-white hover:border-[#036661]/40"
                                    }`}
                                  >
                                    <div className="flex items-start gap-[13px]">
                                      <div className="w-[55px] shrink-0 rounded-[8px] bg-gray-50 px-[5px] py-[8px] text-center">
                                        <p className="font-bold text-gray-900">
                                          {formatTime(
                                            getEffectiveTime(
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
                                            className={`inline-flex min-h-[21px] items-center rounded-full border px-[8px] py-[3px] text-[11px] font-semibold ${style.badgeClassName}`}
                                          >
                                            {style.label}
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
                      Nu există programări viitoare.
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
                        moveCalendar("today")
                      }
                    >
                      Astăzi
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        moveCalendar("next")
                      }
                    >
                      →
                    </Button>
                  </div>

                  <p className="text-sm font-semibold capitalize text-gray-900">
                    {calendarTitle}
                  </p>
                </div>

                <div className="staff-calendar overflow-x-auto rounded-[13px] border border-gray-200">
                  <div
                    className={
                      mode === "week"
                        ? "min-w-[690px]"
                        : mode === "day"
                          ? "min-w-[390px]"
                          : "min-w-[610px]"
                    }
                  >
                    <FullCalendar
                      key={mode}
                      ref={calendarRef}
                      plugins={[
                        dayGridPlugin,
                        timeGridPlugin,
                        interactionPlugin,
                      ]}
                      locale={roLocale}
                      initialView={calendarViewByMode[mode]}
                      headerToolbar={false}
                      events={events}
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
                      firstDay={1}
                      slotMinTime="06:00:00"
                      slotMaxTime="22:00:00"
                      slotDuration="00:30:00"
                      allDaySlot={false}
                      eventDisplay="block"
                      displayEventEnd={false}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-[21px]">
            {selectedAppointment ? (
              <AppointmentDetailPanel
                appointment={
                  selectedAppointment
                }
                onUpdated={onUpdated}
                onClose={() =>
                  setSelectedAppointmentId(
                    null
                  )
                }
              />
            ) : (
              <div className="rounded-[21px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-center">
                <div className="mx-auto flex h-[55px] w-[55px] items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                  ↗
                </div>

                <h3 className="mt-[13px] font-bold text-gray-900">
                  Selectează o programare
                </h3>

                <p className="mt-[8px] text-sm leading-6 text-gray-600">
                  Detaliile și acțiunile vor apărea aici, fără să părăsești calendarul.
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

function AppointmentDetailPanel({
  appointment,
  onUpdated,
  onClose,
}: {
  appointment: StaffAppointmentListItem;
  onUpdated: () => void | Promise<void>;
  onClose: () => void;
}) {
  const style =
    getStatusStyle(
      appointment.status
    );

  const effectiveDate =
    getEffectiveDate(appointment);

  const effectiveTime =
    getEffectiveTime(appointment);

  return (
    <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <div className="flex items-start justify-between gap-[13px]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#036661]">
            Detalii programare
          </p>

          <h3 className="mt-[5px] truncate text-xl font-bold text-gray-900">
            {appointment.patientName}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Închide detaliile"
          className="romdoc-focus-ring flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
        >
          ×
        </button>
      </div>

      <div className="mt-[13px] flex flex-wrap items-center gap-[8px]">
        <span
          className={`inline-flex min-h-[34px] items-center rounded-full border px-[13px] py-[5px] text-xs font-semibold ${style.badgeClassName}`}
        >
          {style.label}
        </span>

        <span className="text-sm text-gray-600">
          {formatLongDate(effectiveDate)},{" "}
          {formatTime(effectiveTime)}
        </span>
      </div>

      <div className="mt-[21px] space-y-[13px]">
        <Detail
          label="Medic"
          value={appointment.doctorName}
        />

        <Detail
          label="Clinică"
          value={appointment.clinicName}
        />

        <div className="grid gap-[13px] sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          <ContactDetail
            label="Telefon"
            value={appointment.patientPhone}
            href={`tel:${appointment.patientPhone.replace(
              /\s+/g,
              ""
            )}`}
          />

          <ContactDetail
            label="E-mail"
            value={appointment.patientEmail}
            href={`mailto:${appointment.patientEmail}`}
          />
        </div>

        <Detail
          label="Sursă"
          value={getSourceLabel(
            appointment.source
          )}
        />

        <Detail
          label="Data solicitată"
          value={`${formatLongDate(
            appointment.requestedDate
          )}, ${formatTime(
            appointment.requestedTime
          )}`}
        />
      </div>

      {appointment.notes && (
        <InfoBox
          label="Observații"
          value={appointment.notes}
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

      <StaffAppointmentActions
        appointmentId={appointment.id}
        currentStatus={appointment.status}
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
        onUpdated={onUpdated}
      />
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-[3px] text-sm text-gray-900">
        {value}
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <a
        href={href}
        className="romdoc-focus-ring mt-[3px] block break-all rounded-[5px] text-sm text-[#036661] underline-offset-4 hover:underline"
      >
        {value}
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
      className={`mt-[13px] rounded-[13px] p-[13px] ${
        blue
          ? "border border-blue-200 bg-blue-50"
          : "bg-gray-50"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-wide ${
          blue
            ? "text-blue-700"
            : "text-gray-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-[5px] whitespace-pre-wrap text-sm leading-6 ${
          blue
            ? "text-blue-900"
            : "text-gray-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
