"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import roLocale from "@fullcalendar/core/locales/ro";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import deLocale from "@fullcalendar/core/locales/de";
import type {
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";

import DoctorAppointmentDetailPanel, {
  type DoctorAppointmentDetail,
} from "@/components/doctor/doctor-appointment-detail-panel";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

export type ConfirmedWeeklyAppointment =
  DoctorAppointmentDetail;

type Props = {
  appointments: ConfirmedWeeklyAppointment[];
};

const FULL_CALENDAR_LOCALE = {
  ro: roLocale,
  en: enGbLocale,
  de: deLocale,
} as const;

function normalizeTime(time: string) {
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  if (/^\d{2}:\d{2}$/.test(time)) {
    return `${time}:00`;
  }

  return "09:00:00";
}

function effectiveDate(
  appointment: ConfirmedWeeklyAppointment
) {
  return (
    appointment.scheduledDate ??
    appointment.requestedDate
  );
}

function effectiveTime(
  appointment: ConfirmedWeeklyAppointment
) {
  return (
    appointment.scheduledTime ??
    appointment.requestedTime ??
    "09:00"
  );
}

export default function ConfirmedAppointmentsWeeklyCalendar({
  appointments,
}: Props) {
  const locale = normalizeAppLocale(
    useLocale()
  );
  const t = useTranslations(
    "DoctorAppointmentOperations.appointments.weekly"
  );

  const [selectedAppointment, setSelectedAppointment] =
    useState<ConfirmedWeeklyAppointment | null>(null);

  const appointmentById = useMemo(
    () =>
      new Map(
        appointments.map((appointment) => [
          appointment.id,
          appointment,
        ])
      ),
    [appointments]
  );

  const events = useMemo<EventInput[]>(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id,
        title: appointment.patientName,
        start: `${effectiveDate(appointment)}T${normalizeTime(
          effectiveTime(appointment)
        )}`,
        backgroundColor: "#16A34A",
        borderColor: "#15803D",
        textColor: "#FFFFFF",
        extendedProps: {
          clinicName: appointment.clinicName,
        },
      })),
    [appointments]
  );

  function renderEventContent(eventInfo: EventContentArg) {
    return (
      <div
        className="min-w-0 px-1 py-0.5 text-xs"
        title={`${eventInfo.event.title} — ${
          eventInfo.event.extendedProps.clinicName as string
        }`}
      >
        {eventInfo.timeText && (
          <span className="font-semibold">
            {eventInfo.timeText}
          </span>
        )}

        <span className="ml-1 truncate">
          {eventInfo.event.title}
        </span>
      </div>
    );
  }

  function handleEventClick(eventInfo: EventClickArg) {
    const appointment =
      appointmentById.get(eventInfo.event.id);

    if (appointment) {
      setSelectedAppointment(appointment);
    }
  }

  return (
    <>
      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t("title")}
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              {t("description")}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="h-3 w-3 rounded-full bg-green-600" />
            <span>
              {appointments.length === 1
                ? t("one")
                : t("many", {
                    count: appointments.length,
                  })}
            </span>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center text-gray-600">
            {t("empty")}
          </div>
        ) : (
          <div className="doctor-calendar overflow-x-auto">
            <div className="min-w-[840px]">
              <FullCalendar
                plugins={[
                  timeGridPlugin,
                  interactionPlugin,
                ]}
                locale={FULL_CALENDAR_LOCALE[locale]}
                initialView="timeGridWeek"
                events={events}
                eventContent={renderEventContent}
                eventClick={handleEventClick}
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
                displayEventEnd={false}
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
                  left: "prev,next today",
                  center: "title",
                  right: "timeGridWeek",
                }}
                buttonText={{
                  today: t("today"),
                  week: t("week"),
                }}
              />
            </div>
          </div>
        )}
      </section>

      {selectedAppointment && (
        <DoctorAppointmentDetailPanel
          appointment={selectedAppointment}
          variant="dialog"
          onClose={() =>
            setSelectedAppointment(null)
          }
        />
      )}
    </>
  );
}
