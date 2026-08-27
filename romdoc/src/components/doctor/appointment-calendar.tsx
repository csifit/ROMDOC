"use client";

import deLocale from "@fullcalendar/core/locales/de";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import roLocale from "@fullcalendar/core/locales/ro";
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
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import TranslatedAppointmentActions from "@/components/doctor/translated-appointment-actions";
import AppointmentStatusBadge from "@/components/ui/appointment-status-badge";
import Button from "@/components/ui/button";
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_ORDER,
  getAppointmentStatusLabel,
  type AppointmentStatus,
} from "@/lib/appointments/appointment-status";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

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
  requestedTime:
    | string
    | null;
  scheduledDate:
    | string
    | null;
  scheduledTime:
    | string
    | null;
  calendarDate: string;
  calendarTime:
    | string
    | null;
  rescheduleReason:
    | string
    | null;
  status:
    AppointmentStatus;
  source: string;
  notes:
    | string
    | null;
};

type AppointmentCalendarProps = {
  appointments:
    DoctorCalendarAppointment[];
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

const FULL_CALENDAR_LOCALE = {
  ro:
    roLocale,
  en:
    enGbLocale,
  de:
    deLocale,
} as const;

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
    | null,
  fallback: string
) {
  return value
    ? value.slice(
        0,
        5
      )
    : fallback;
}

function timestamp(
  appointment:
    DoctorCalendarAppointment
) {
  return new Date(
    `${appointment.calendarDate}T${normalizeTime(
      appointment
        .calendarTime
    )}`
  ).getTime();
}

function isUpcoming(
  appointment:
    DoctorCalendarAppointment
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

function formatDate(
  value: string,
  locale:
    AppLocale
) {
  return new Intl.DateTimeFormat(
    DATE_LOCALE[
      locale
    ],
    {
      weekday:
        "long",
      day:
        "2-digit",
      month:
        "long",
      year:
        "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

function formatCompactDate(
  value: string,
  locale:
    AppLocale
) {
  return new Intl.DateTimeFormat(
    DATE_LOCALE[
      locale
    ],
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

export default function
AppointmentCalendar({
  appointments,
}: AppointmentCalendarProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorAppointmentOperations.calendar.component"
    );

  const commonT =
    useTranslations(
      "DoctorAppointmentOperations.common"
    );

  const detailT =
    useTranslations(
      "DoctorAppointmentOperations.detail"
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
        "calendar"
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

  useEffect(() => {
    const desktop =
      window.matchMedia(
        "(min-width: 768px)"
      ).matches;

    if (desktop) {
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
        groups.set(
          appointment
            .calendarDate,
          [
            ...(
              groups.get(
                appointment
                  .calendarDate
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
    }, [
      agendaAppointments,
    ]);

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
              APPOINTMENT_STATUS[
                appointment.status
              ];

            return {
              id:
                appointment.id,
              title:
                appointment
                  .patientName,
              start:
                `${appointment.calendarDate}T${normalizeTime(
                  appointment
                    .calendarTime
                )}`,
              backgroundColor:
                style
                  .calendarBackground,
              borderColor:
                style
                  .calendarBorder,
              textColor:
                style
                  .calendarText,
            };
          }
        ),
      [
        appointments,
      ]
    );

  function sourceLabel(
    source: string
  ) {
    return source ===
      "phone"
      ? commonT(
          "sourcePhone"
        )
      : source ===
          "walk_in"
        ? commonT(
            "sourceWalkIn"
          )
        : source ===
            "email"
          ? commonT(
              "sourceEmail"
            )
          : source ===
              "other"
            ? commonT(
                "sourceOther"
              )
            : commonT(
                "sourceOnline"
              );
  }

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
          eventInfo.event.id
      );

    if (!appointment) {
      return null;
    }

    return (
      <div className="min-w-0 px-[5px] py-[3px] text-xs">
        {eventInfo
          .timeText && (
          <span className="font-semibold">
            {
              eventInfo
                .timeText
            }
          </span>
        )}

        <span className="ml-[5px] truncate">
          {
            appointment
              .patientName
          }
        </span>
      </div>
    );
  }

  const modes:
    CalendarMode[] = [
      "agenda",
      "day",
      "week",
      "month",
    ];

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[13px] shadow-sm sm:p-[21px]">
      <div className="flex flex-col gap-[13px] border-b border-gray-200 pb-[13px] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {t(
              "view"
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

        <div
          className="romdoc-segmented-control grid-cols-4"
          aria-label={
            t(
              "chooseView"
            )
          }
        >
          {modes.map(
            (
              value
            ) => {
              const label =
                value ===
                "agenda"
                  ? t(
                      "agenda"
                    )
                  : value ===
                      "day"
                    ? t(
                        "day"
                      )
                    : value ===
                        "week"
                      ? t(
                          "weekShort"
                        )
                      : t(
                          "month"
                        );

              return (
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
                  className={`romdoc-segmented-button ${
                    mode ===
                    value
                      ? "bg-white text-[#036661] shadow-sm"
                      : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
                  }`}
                >
                  {label}
                </button>
              );
            }
          )}
        </div>
      </div>

      <div className="mt-[13px] flex flex-wrap gap-x-[13px] gap-y-[8px]">
        {APPOINTMENT_STATUS_ORDER.map(
          (
            status
          ) => (
            <div
              key={
                status
              }
              className="flex items-center gap-[5px] text-xs text-gray-600"
            >
              <span
                className={`h-[8px] w-[8px] rounded-full ${APPOINTMENT_STATUS[
                  status
                ].dotClassName}`}
              />

              <span>
                {
                  getAppointmentStatusLabel(
                    status,
                    locale
                  )
                }
              </span>
            </div>
          )
        )}
      </div>

      {appointments.length ===
      0 ? (
        <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-gray-50 p-[34px] text-center">
          <div className="mx-auto flex h-[55px] w-[55px] items-center justify-center rounded-full bg-white text-2xl shadow-sm">
            📅
          </div>

          <h3 className="mt-[13px] text-lg font-bold text-gray-900">
            {t(
              "emptyTitle"
            )}
          </h3>

          <p className="mx-auto mt-[8px] max-w-md text-sm leading-6 text-gray-600">
            {t(
              "emptyDescription"
            )}
          </p>
        </div>
      ) : (
        <div className="mt-[21px] grid gap-[21px] lg:grid-cols-[minmax(0,1.618fr)_minmax(320px,1fr)] lg:items-start">
          <div className="min-w-0">
            {mode ===
            "agenda" ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-[13px]">
                  <p className="text-sm text-gray-600">
                    {
                      agendaAppointments
                        .length
                    }{" "}
                    {agendaAppointments
                      .length ===
                    1
                      ? t(
                          "shownOne"
                        )
                      : t(
                          "shownMany"
                        )}
                  </p>

                  <div className="flex rounded-[13px] border border-gray-200 bg-white p-[3px]">
                    <button
                      type="button"
                      onClick={() =>
                        setAgendaFilter(
                          "upcoming"
                        )
                      }
                      className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[13px] py-[5px] text-sm font-semibold ${
                        agendaFilter ===
                        "upcoming"
                          ? "bg-[#036661] text-white"
                          : "text-gray-600 hover:bg-gray-50"
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
                      className={`romdoc-focus-ring min-h-[34px] rounded-[8px] px-[13px] py-[5px] text-sm font-semibold ${
                        agendaFilter ===
                        "all"
                          ? "bg-[#036661] text-white"
                          : "text-gray-600 hover:bg-gray-50"
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
                          <h3 className="sticky top-0 z-10 rounded-[8px] bg-gray-50 px-[13px] py-[8px] text-sm font-bold capitalize text-gray-700">
                            {formatDate(
                              date,
                              locale
                            )}
                          </h3>

                          <div className="mt-[5px] space-y-[5px]">
                            {dateAppointments.map(
                              (
                                appointment
                              ) => {
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
                                            appointment.calendarTime,
                                            commonT(
                                              "timeUnspecified"
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

                                            <p className="mt-[3px] truncate text-xs text-gray-500">
                                              {
                                                appointment.clinicName
                                              }
                                            </p>
                                          </div>

                                          <AppointmentStatusBadge
                                            status={
                                              appointment.status
                                            }
                                            locale={
                                              locale
                                            }
                                          />
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
                    <div className="rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-center">
                      <p className="font-semibold text-gray-900">
                        {t(
                          "noUpcoming"
                        )}
                      </p>

                      <p className="mt-[5px] text-sm text-gray-600">
                        {t(
                          "showAllHint"
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
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
                      aria-label={
                        t(
                          "previousPeriod"
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
                      aria-label={
                        t(
                          "nextPeriod"
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

                <div className="doctor-calendar overflow-x-auto rounded-[13px] border border-gray-200">
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
                      locale={
                        FULL_CALENDAR_LOCALE[
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
                      eventClick={(
                        clickInfo:
                          EventClickArg
                      ) =>
                        setSelectedAppointmentId(
                          clickInfo
                            .event
                            .id
                        )
                      }
                      eventContent={
                        renderEventContent
                      }
                      datesSet={(
                        dateInfo:
                          DatesSetArg
                      ) =>
                        setCalendarTitle(
                          dateInfo
                            .view
                            .title
                        )
                      }
                      height="auto"
                      nowIndicator
                      navLinks
                      dayMaxEvents
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
                  {t(
                    "swipeHint"
                  )}
                </p>
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
                        "selected"
                      )}
                    </p>

                    <h3 className="mt-[5px] truncate text-xl font-bold text-gray-900">
                      {
                        selectedAppointment
                          .patientName
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
                    aria-label={
                      t(
                        "close"
                      )
                    }
                    className="romdoc-focus-ring flex h-[34px] w-[34px] items-center justify-center rounded-full border border-gray-200 text-gray-500"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-[13px] flex flex-wrap items-center gap-[8px]">
                  <AppointmentStatusBadge
                    status={
                      selectedAppointment
                        .status
                    }
                    locale={
                      locale
                    }
                  />

                  <span className="text-sm text-gray-600">
                    {formatCompactDate(
                      selectedAppointment
                        .calendarDate,
                      locale
                    )}
                    ,{" "}
                    {shortTime(
                      selectedAppointment
                        .calendarTime,
                      commonT(
                        "timeUnspecified"
                      )
                    )}
                  </span>
                </div>

                <div className="mt-[21px] space-y-[13px]">
                  <Detail
                    label={
                      t(
                        "clinic"
                      )
                    }
                    value={
                      selectedAppointment
                        .clinicName
                    }
                  />

                  <Detail
                    label={
                      t(
                        "source"
                      )
                    }
                    value={
                      sourceLabel(
                        selectedAppointment
                          .source
                      )
                    }
                  />

                  <Detail
                    label={
                      t(
                        "requestedDate"
                      )
                    }
                    value={`${formatCompactDate(
                      selectedAppointment
                        .requestedDate,
                      locale
                    )}, ${shortTime(
                      selectedAppointment
                        .requestedTime,
                      commonT(
                        "timeUnspecified"
                      )
                    )}`}
                  />

                  {selectedAppointment
                    .scheduledDate && (
                    <Detail
                      label={
                        t(
                          "confirmedDate"
                        )
                      }
                      value={`${formatCompactDate(
                        selectedAppointment
                          .scheduledDate,
                        locale
                      )}, ${shortTime(
                        selectedAppointment
                          .scheduledTime,
                        commonT(
                          "timeUnspecified"
                        )
                      )}`}
                    />
                  )}

                  <ContactDetail
                    label={
                      t(
                        "phone"
                      )
                    }
                    value={
                      selectedAppointment
                        .patientPhone
                    }
                    href={`tel:${selectedAppointment.patientPhone.replace(
                      /\s+/g,
                      ""
                    )}`}
                  />

                  <ContactDetail
                    label={
                      t(
                        "email"
                      )
                    }
                    value={
                      selectedAppointment
                        .patientEmail
                    }
                    href={`mailto:${selectedAppointment.patientEmail}`}
                  />
                </div>

                {selectedAppointment
                  .notes && (
                  <InfoBox
                    label={
                      t(
                        "notes"
                      )
                    }
                    value={
                      selectedAppointment
                        .notes
                    }
                  />
                )}

                {selectedAppointment
                  .rescheduleReason && (
                  <InfoBox
                    label={
                      t(
                        "rescheduleReason"
                      )
                    }
                    value={
                      selectedAppointment
                        .rescheduleReason
                    }
                    blue
                  />
                )}

                <TranslatedAppointmentActions
                  appointmentId={
                    selectedAppointment
                      .id
                  }
                  currentStatus={
                    selectedAppointment
                      .status
                  }
                  requestedDate={
                    selectedAppointment
                      .requestedDate
                  }
                  requestedTime={
                    selectedAppointment
                      .requestedTime
                  }
                  scheduledDate={
                    selectedAppointment
                      .scheduledDate
                  }
                  scheduledTime={
                    selectedAppointment
                      .scheduledTime
                  }
                  currentReason={
                    selectedAppointment
                      .rescheduleReason
                  }
                />

                <div className="mt-[13px]">
                  <Link
                    href={`/appointments/${selectedAppointment.id}/messages?locale=${locale}`}
                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                  >
                    {detailT(
                      "messages"
                    )}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-[21px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-center">
                <p className="font-semibold text-gray-900">
                  {t(
                    "selected"
                  )}
                </p>

                <p className="mt-[5px] text-sm leading-6 text-gray-600">
                  {t(
                    "showAllHint"
                  )}
                </p>
              </div>
            )}
          </aside>
        </div>
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
    </section>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-[5px] text-sm leading-6 text-gray-900">
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
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <a
        href={
          href
        }
        className="romdoc-focus-ring mt-[5px] block break-all rounded-[5px] text-sm text-gray-900 underline-offset-4 hover:text-[#036661] hover:underline"
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
        {label}
      </p>

      <p
        className={`mt-[8px] whitespace-pre-wrap text-sm leading-6 ${
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
