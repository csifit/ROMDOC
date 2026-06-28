"use client";

import { useMemo } from "react";
import type {
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import roLocale from "@fullcalendar/core/locales/ro";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";

export type StaffWeeklyAppointment = {
  id: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  date: string;
  time: string;
  status: string;
};

type StaffAppointmentsWeeklyCalendarProps = {
  appointments:
    StaffWeeklyAppointment[];
};

type StatusPresentation = {
  label: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const STATUS_PRESENTATION: Record<
  string,
  StatusPresentation
> = {
  pending: {
    label: "În așteptare",
    backgroundColor: "#F59E0B",
    borderColor: "#D97706",
    textColor: "#111827",
  },
  confirmed: {
    label: "Confirmată",
    backgroundColor: "#16A34A",
    borderColor: "#15803D",
    textColor: "#FFFFFF",
  },
  rescheduled: {
    label: "Reprogramată",
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
    textColor: "#FFFFFF",
  },
  cancelled: {
    label: "Anulată",
    backgroundColor: "#DC2626",
    borderColor: "#B91C1C",
    textColor: "#FFFFFF",
  },
  completed: {
    label: "Finalizată",
    backgroundColor: "#6B7280",
    borderColor: "#4B5563",
    textColor: "#FFFFFF",
  },
  no_show: {
    label: "Neprezentare",
    backgroundColor: "#EA580C",
    borderColor: "#C2410C",
    textColor: "#FFFFFF",
  },
};

const LEGEND_STATUSES = [
  "pending",
  "confirmed",
  "rescheduled",
  "cancelled",
  "completed",
  "no_show",
];

function normalizeTime(
  time: string
) {
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

function getStatusPresentation(
  status: string
) {
  return (
    STATUS_PRESENTATION[
      status
    ] ??
    STATUS_PRESENTATION.pending
  );
}

export default function StaffAppointmentsWeeklyCalendar({
  appointments,
}: StaffAppointmentsWeeklyCalendarProps) {
  const events =
    useMemo<EventInput[]>(
      () =>
        appointments.map(
          (appointment) => {
            const presentation =
              getStatusPresentation(
                appointment.status
              );

            return {
              id:
                appointment.id,
              title:
                appointment.patientName,
              start:
                `${appointment.date}T${normalizeTime(
                  appointment.time
                )}`,
              backgroundColor:
                presentation.backgroundColor,
              borderColor:
                presentation.borderColor,
              textColor:
                presentation.textColor,
              extendedProps: {
                doctorName:
                  appointment.doctorName,
                clinicName:
                  appointment.clinicName,
                status:
                  appointment.status,
                statusLabel:
                  presentation.label,
              },
            };
          }
        ),
      [appointments]
    );

  function renderEventContent(
    eventInfo:
      EventContentArg
  ) {
    const doctorName =
      eventInfo.event.extendedProps
        .doctorName as string;

    const clinicName =
      eventInfo.event.extendedProps
        .clinicName as string;

    const statusLabel =
      eventInfo.event.extendedProps
        .statusLabel as string;

    return (
      <div
        className="min-w-0 px-1 py-0.5 text-xs"
        title={`${eventInfo.event.title} — ${doctorName} — ${clinicName} — ${statusLabel}`}
      >
        <div className="flex min-w-0 items-center gap-1">
          {eventInfo.timeText && (
            <span className="shrink-0 font-semibold">
              {eventInfo.timeText}
            </span>
          )}

          <span className="truncate font-semibold">
            {eventInfo.event.title}
          </span>
        </div>

        <span className="block truncate opacity-90">
          {doctorName}
        </span>

        <span className="block truncate opacity-90">
          {statusLabel}
        </span>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">
          Calendarul programărilor
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Calendarul afișează toate programările pentru medicii și clinicile unde ai o atribuire activă.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2 rounded-xl bg-gray-50 p-3">
        {LEGEND_STATUSES.map(
          (status) => {
            const presentation =
              getStatusPresentation(
                status
              );

            return (
              <div
                key={status}
                className="flex items-center gap-2 text-xs font-medium text-gray-700"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      presentation.backgroundColor,
                  }}
                />

                <span>
                  {
                    presentation.label
                  }
                </span>
              </div>
            );
          }
        )}
      </div>

      {appointments.length ===
      0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center text-gray-600">
          Nu există încă programări de afișat în calendar.
        </div>
      ) : (
        <div className="doctor-calendar overflow-x-auto">
          <div className="min-w-[840px]">
            <FullCalendar
              plugins={[
                timeGridPlugin,
                interactionPlugin,
              ]}
              locale={
                roLocale
              }
              initialView="timeGridWeek"
              events={events}
              eventContent={
                renderEventContent
              }
              height="auto"
              nowIndicator
              navLinks
              weekends
              firstDay={1}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              slotDuration="00:30:00"
              defaultTimedEventDuration="00:30:00"
              forceEventDuration
              allDaySlot={false}
              eventDisplay="block"
              displayEventEnd={
                false
              }
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              slotLabelFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              headerToolbar={{
                left:
                  "prev,next today",
                center:
                  "title",
                right:
                  "timeGridWeek",
              }}
              buttonText={{
                today:
                  "Astăzi",
                week:
                  "Săptămână",
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
