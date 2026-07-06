"use client";

import Button from "@/components/ui/button";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin from "@fullcalendar/interaction";
import roLocale from "@fullcalendar/core/locales/ro";
import type {
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import AppointmentActions from "@/components/admin/appointment-actions";

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show";

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

const statusColors: Record<
  AppointmentStatus,
  {
    background: string;
    border: string;
    text: string;
    label: string;
  }
> = {
  pending: {
    background: "#F59E0B",
    border: "#D97706",
    text: "#111827",
    label: "În așteptare",
  },

  confirmed: {
    background: "#16A34A",
    border: "#15803D",
    text: "#FFFFFF",
    label: "Confirmată",
  },

  rescheduled: {
    background: "#2563EB",
    border: "#1D4ED8",
    text: "#FFFFFF",
    label: "Reprogramată",
  },

  completed: {
    background: "#6B7280",
    border: "#4B5563",
    text: "#FFFFFF",
    label: "Finalizată",
  },

  cancelled: {
    background: "#DC2626",
    border: "#B91C1C",
    text: "#FFFFFF",
    label: "Anulată",
  },

  no_show: {
    background: "#7C2D12",
    border: "#9A3412",
    text: "#FFFFFF",
    label: "Neprezentare",
  },
};

function normalizeTime(time: string | null) {
  if (!time) {
    return "09:00:00";
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  if (/^\d{2}:\d{2}$/.test(time)) {
    return `${time}:00`;
  }

  return "09:00:00";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatTime(time: string | null) {
  return time
    ? time.slice(0, 5)
    : "Ora nespecificată";
}

function getSourceLabel(source: string) {
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

export default function AppointmentCalendar({
  appointments,
}: AppointmentCalendarProps) {
  const [
    selectedAppointmentId,
    setSelectedAppointmentId,
  ] = useState<string | null>(null);

  const selectedAppointment = useMemo(() => {
    if (!selectedAppointmentId) {
      return null;
    }

    return (
      appointments.find(
        (appointment) =>
          appointment.id === selectedAppointmentId
      ) ?? null
    );
  }, [appointments, selectedAppointmentId]);

  const events = useMemo<EventInput[]>(() => {
    return appointments.map((appointment) => {
      const colors =
        statusColors[appointment.status];

      return {
        id: appointment.id,
        title: appointment.patientName,
        start: `${
          appointment.calendarDate
        }T${normalizeTime(
          appointment.calendarTime
        )}`,
        backgroundColor: colors.background,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: {
          appointmentId: appointment.id,
          status: appointment.status,
        },
      };
    });
  }, [appointments]);

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
      ) ?? null;

    if (!appointment) {
      return null;
    }

    if (
      eventInfo.view.type ===
      "multiMonthYear"
    ) {
      return (
        <span
          title={
            statusColors[
              appointment.status
            ].label
          }
          className="block h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor:
              statusColors[
                appointment.status
              ].background,
          }}
        />
      );
    }

    return (
      <div className="min-w-0 px-1 py-0.5 text-xs">
        {eventInfo.timeText && (
          <span className="font-semibold">
            {eventInfo.timeText}
          </span>
        )}

        <span className="ml-1 truncate">
          {appointment.patientName}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap gap-3">
          {(
            Object.entries(
              statusColors
            ) as Array<
              [
                AppointmentStatus,
                (typeof statusColors)[AppointmentStatus],
              ]
            >
          ).map(([status, colors]) => (
            <div
              key={status}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    colors.background,
                }}
              />

              <span>{colors.label}</span>
            </div>
          ))}
        </div>

        <div className="doctor-calendar overflow-x-auto">
          <div className="min-w-[720px]">
            <FullCalendar
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                multiMonthPlugin,
                interactionPlugin,
              ]}
              locale={roLocale}
              initialView="dayGridMonth"
              events={events}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="auto"
              nowIndicator
              navLinks
              dayMaxEvents
              weekends
              firstDay={1}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              slotDuration="00:30:00"
              allDaySlot={false}
              eventDisplay="block"
              displayEventEnd={false}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right:
                  "timeGridDay,timeGridWeek,dayGridMonth,multiMonthYear",
              }}
              buttonText={{
                today: "Astăzi",
                day: "Zi",
                week: "Săptămână",
                month: "Lună",
                year: "An",
              }}
              views={{
                timeGridDay: {
                  buttonText: "Zi",
                },

                timeGridWeek: {
                  buttonText: "Săptămână",
                },

                dayGridMonth: {
                  buttonText: "Lună",
                },

                multiMonthYear: {
                  buttonText: "An",
                  multiMonthMaxColumns: 3,
                  multiMonthMinWidth: 260,
                },
              }}
            />
          </div>
        </div>
      </section>

      {selectedAppointment && (
        <section
          id={`calendar-appointment-${selectedAppointment.id}`}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Programare selectată
              </p>

              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                {selectedAppointment.patientName}
              </h2>
            </div>

            <Button
              type="button"
              onClick={() =>
                setSelectedAppointmentId(
                  null
                )
              }
              variant="secondary"
              size="sm"
              className="w-fit"
            >
              Închide
            </Button>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      statusColors[
                        selectedAppointment
                          .status
                      ].background,
                  }}
                />

                <span className="font-medium text-gray-900">
                  {
                    statusColors[
                      selectedAppointment
                        .status
                    ].label
                  }
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Data din calendar
              </p>

              <p className="mt-1 text-gray-900">
                {formatDate(
                  selectedAppointment.calendarDate
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ora
              </p>

              <p className="mt-1 text-gray-900">
                {formatTime(
                  selectedAppointment.calendarTime
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Clinica
              </p>

              <p className="mt-1 text-gray-900">
                {
                  selectedAppointment.clinicName
                }
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Telefon
              </p>

              <a
                href={`tel:${selectedAppointment.patientPhone.replace(
                  /\s+/g,
                  ""
                )}`}
                className="mt-1 block text-gray-900 underline-offset-4 hover:underline"
              >
                {
                  selectedAppointment.patientPhone
                }
              </a>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                E-mail
              </p>

              <a
                href={`mailto:${selectedAppointment.patientEmail}`}
                className="mt-1 block break-all text-gray-900 underline-offset-4 hover:underline"
              >
                {
                  selectedAppointment.patientEmail
                }
              </a>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Sursa
              </p>

              <p className="mt-1 text-gray-900">
                {getSourceLabel(
                  selectedAppointment.source
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Data solicitată
              </p>

              <p className="mt-1 text-gray-900">
                {formatDate(
                  selectedAppointment.requestedDate
                )}

                {selectedAppointment.requestedTime
                  ? `, ${formatTime(
                      selectedAppointment.requestedTime
                    )}`
                  : ""}
              </p>
            </div>

            {selectedAppointment.scheduledDate && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Data confirmată
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {formatDate(
                    selectedAppointment.scheduledDate
                  )}

                  {selectedAppointment.scheduledTime
                    ? `, ${formatTime(
                        selectedAppointment.scheduledTime
                      )}`
                    : ""}
                </p>
              </div>
            )}
          </div>

          {selectedAppointment.notes && (
            <div className="mt-6 rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Observații
              </p>

              <p className="mt-2 whitespace-pre-wrap text-gray-700">
                {selectedAppointment.notes}
              </p>
            </div>
          )}

          {selectedAppointment.rescheduleReason && (
            <div className="mt-4 rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Motivul reprogramării
              </p>

              <p className="mt-2 whitespace-pre-wrap text-blue-900">
                {
                  selectedAppointment.rescheduleReason
                }
              </p>
            </div>
          )}

          <AppointmentActions
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
          />
        </section>
      )}

      <style jsx global>{`
        .doctor-calendar .fc {
          font-family: inherit;
        }

        .doctor-calendar .fc-toolbar {
          gap: 12px;
          flex-wrap: wrap;
        }

        .doctor-calendar .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
        }

        .doctor-calendar .fc-button {
          border-radius: 0.75rem;
          border-color: #d1d5db;
          background-color: #ffffff;
          color: #374151;
          box-shadow: none;
          text-transform: none;
        }

        .doctor-calendar .fc-button:hover {
          border-color: #9ca3af;
          background-color: #f9fafb;
          color: #111827;
        }

        .doctor-calendar
          .fc-button-primary:not(
            :disabled
          ).fc-button-active,
        .doctor-calendar
          .fc-button-primary:not(
            :disabled
          ):active {
          border-color: #d97757;
          background-color: #d97757;
          color: #ffffff;
        }

        .doctor-calendar .fc-button:focus {
          box-shadow: 0 0 0 3px
            rgba(217, 119, 87, 0.2);
        }

        .doctor-calendar
          .fc-col-header-cell-cushion,
        .doctor-calendar
          .fc-daygrid-day-number {
          color: #374151;
        }

        .doctor-calendar .fc-event {
          cursor: pointer;
          border-radius: 0.375rem;
        }

        .doctor-calendar .fc-multimonth {
          border: 0;
        }

        .doctor-calendar
          .fc-multimonth-month {
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
        }
      `}</style>
    </div>
  );
}
