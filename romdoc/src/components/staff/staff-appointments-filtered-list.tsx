"use client";

import Link from "next/link";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useMemo,
  useState,
} from "react";

import StaffAppointmentActions from "@/components/staff/staff-appointment-actions";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show";

export type StaffAppointmentListItem = {
  id: string;
  doctorId: string;
  clinicId: string;

  patientProfileId:
    | string
    | null;

  patientName: string;
  patientEmail: string;
  patientPhone: string;
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

  durationMinutes:
    | number
    | null;

  rescheduleReason:
    | string
    | null;

  notes:
    | string
    | null;

  source:
    | string
    | null;

  status: string;
  createdAt: string;
  doctorName: string;
  clinicName: string;
};

type Props = {
  appointments:
    StaffAppointmentListItem[];

  onUpdated:
    () =>
      void |
      Promise<void>;
};

const FOLDER_STATUSES =
  new Set([
    "confirmed",
    "rescheduled",
    "completed",
  ]);

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

function statusClasses(
  status:
    string
) {
  switch (
    status
  ) {
    case "confirmed":
      return "bg-green-100 text-green-800";

    case "rescheduled":
      return "bg-blue-100 text-blue-800";

    case "cancelled":
      return "bg-red-100 text-red-800";

    case "completed":
      return "bg-gray-200 text-gray-800";

    case "no_show":
      return "bg-orange-100 text-orange-900";

    default:
      return "bg-amber-100 text-amber-800";
  }
}

function normalizeDatePart(
  value:
    string,
  maximumLength:
    number
) {
  return value
    .replace(
      /\D/g,
      ""
    )
    .slice(
      0,
      maximumLength
    );
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

export default function StaffAppointmentsFilteredList({
  appointments,
  onUpdated,
}: Props) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "StaffOperationalDashboard.list"
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      "all"
    );

  const [
    dayFilter,
    setDayFilter,
  ] =
    useState(
      ""
    );

  const [
    monthFilter,
    setMonthFilter,
  ] =
    useState(
      ""
    );

  const [
    yearFilter,
    setYearFilter,
  ] =
    useState(
      ""
    );

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState(
      ""
    );

  const [
    openAppointmentId,
    setOpenAppointmentId,
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
      [
        "pending",
        "confirmed",
        "rescheduled",
        "cancelled",
        "completed",
        "no_show",
      ].includes(
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
    date:
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
            "2-digit",

          year:
            "numeric",
        }
      )
      .format(
        new Date(
          `${date}T12:00:00`
        )
      );
  }

  function formatCreatedAt(
    date:
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
            "2-digit",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      )
      .format(
        new Date(
          date
        )
      );
  }

  const filteredAppointments =
    useMemo(
      () => {
        const normalizedSearch =
          searchTerm
            .trim()
            .toLocaleLowerCase(
              DATE_LOCALE[
                locale
              ]
            );

        return appointments.filter(
          (
            appointment
          ) => {
            if (
              statusFilter !==
                "all" &&
              appointment.status !==
                statusFilter
            ) {
              return false;
            }

            if (
              normalizedSearch
            ) {
              const searchableText =
                [
                  appointment.patientName,
                  appointment.patientEmail,
                  appointment.patientPhone,
                  appointment.doctorName,
                  appointment.clinicName,
                  appointment.notes ??
                    "",
                  appointment
                    .rescheduleReason ??
                    "",
                ]
                  .join(
                    " "
                  )
                  .toLocaleLowerCase(
                    DATE_LOCALE[
                      locale
                    ]
                  );

              if (
                !searchableText.includes(
                  normalizedSearch
                )
              ) {
                return false;
              }
            }

            const [
              appointmentYear,
              appointmentMonth,
              appointmentDay,
            ] =
              effectiveDate(
                appointment
              ).split(
                "-"
              );

            const normalizedDay =
              dayFilter
                ? dayFilter.padStart(
                    2,
                    "0"
                  )
                : "";

            const normalizedMonth =
              monthFilter
                ? monthFilter.padStart(
                    2,
                    "0"
                  )
                : "";

            if (
              normalizedDay &&
              appointmentDay !==
                normalizedDay
            ) {
              return false;
            }

            if (
              normalizedMonth &&
              appointmentMonth !==
                normalizedMonth
            ) {
              return false;
            }

            if (
              yearFilter &&
              !appointmentYear.startsWith(
                yearFilter
              )
            ) {
              return false;
            }

            return true;
          }
        );
      },
      [
        appointments,
        dayFilter,
        locale,
        monthFilter,
        searchTerm,
        statusFilter,
        yearFilter,
      ]
    );

  const filtersAreActive =
    statusFilter !==
      "all" ||
    dayFilter !==
      "" ||
    monthFilter !==
      "" ||
    yearFilter !==
      "" ||
    searchTerm.trim() !==
      "";

  function resetFilters() {
    setStatusFilter(
      "all"
    );

    setDayFilter(
      ""
    );

    setMonthFilter(
      ""
    );

    setYearFilter(
      ""
    );

    setSearchTerm(
      ""
    );

    setOpenAppointmentId(
      null
    );
  }

  const statusOptions:
    AppointmentStatus[] =
    [
      "confirmed",
      "pending",
      "rescheduled",
      "cancelled",
      "completed",
      "no_show",
    ];

  return (
    <section>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t(
              "title"
            )}
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            {t(
              "displayedCount",
              {
                count:
                  filteredAppointments.length,
              }
            )}

            {filtersAreActive &&
              t(
                "ofTotal",
                {
                  total:
                    appointments.length,
                }
              )}
          </p>
        </div>

        {filtersAreActive && (
          <button
            type="button"
            onClick={
              resetFilters
            }
            className="w-fit rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#036661] hover:text-[#036661]"
          >
            {t(
              "clearFilters"
            )}
          </button>
        )}
      </div>

      <div className="mb-5 grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:grid-cols-3">
        <label className="block xl:col-span-3">
          <span className="text-sm font-semibold text-gray-700">
            {t(
              "search"
            )}
          </span>

          <input
            type="search"
            value={
              searchTerm
            }
            onChange={(
              event
            ) => {
              setSearchTerm(
                event.target
                  .value
              );

              setOpenAppointmentId(
                null
              );
            }}
            placeholder={t(
              "searchPlaceholder"
            )}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            {t(
              "statusFilter"
            )}
          </span>

          <select
            value={
              statusFilter
            }
            onChange={(
              event
            ) => {
              setStatusFilter(
                event.target
                  .value
              );

              setOpenAppointmentId(
                null
              );
            }}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
          >
            <option value="all">
              {t(
                "allStatuses"
              )}
            </option>

            {statusOptions.map(
              (
                option
              ) => (
                <option
                  key={
                    option
                  }
                  value={
                    option
                  }
                >
                  {statusLabel(
                    option
                  )}
                </option>
              )
            )}
          </select>
        </label>

        <fieldset className="xl:col-span-2">
          <legend className="text-sm font-semibold text-gray-700">
            {t(
              "appointmentDate"
            )}
          </legend>

          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.4fr)] items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              aria-label={t(
                "dayAria"
              )}
              placeholder="DD"
              value={
                dayFilter
              }
              onChange={(
                event
              ) => {
                setDayFilter(
                  normalizeDatePart(
                    event.target
                      .value,
                    2
                  )
                );

                setOpenAppointmentId(
                  null
                );
              }}
              className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 text-center text-gray-900"
            />

            <span className="font-bold text-gray-400">
              :
            </span>

            <input
              type="text"
              inputMode="numeric"
              aria-label={t(
                "monthAria"
              )}
              placeholder="MM"
              value={
                monthFilter
              }
              onChange={(
                event
              ) => {
                setMonthFilter(
                  normalizeDatePart(
                    event.target
                      .value,
                    2
                  )
                );

                setOpenAppointmentId(
                  null
                );
              }}
              className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 text-center text-gray-900"
            />

            <span className="font-bold text-gray-400">
              :
            </span>

            <input
              type="text"
              inputMode="numeric"
              aria-label={t(
                "yearAria"
              )}
              placeholder="YYYY"
              value={
                yearFilter
              }
              onChange={(
                event
              ) => {
                setYearFilter(
                  normalizeDatePart(
                    event.target
                      .value,
                    4
                  )
                );

                setOpenAppointmentId(
                  null
                );
              }}
              className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 text-center text-gray-900"
            />
          </div>

          <p className="mt-2 text-xs text-gray-500">
            {t(
              "dateHelp"
            )}
          </p>
        </fieldset>
      </div>

      {filteredAppointments.length >
      0 ? (
        <div className="space-y-3">
          <div className="hidden min-w-[1040px] grid-cols-[145px_minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(160px,1fr)_135px_40px] gap-4 px-5 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
            <span>
              {t(
                "dateTime"
              )}
            </span>

            <span>
              {t(
                "patient"
              )}
            </span>

            <span>
              {t(
                "doctor"
              )}
            </span>

            <span>
              {t(
                "clinic"
              )}
            </span>

            <span>
              {t(
                "status"
              )}
            </span>

            <span className="sr-only">
              {t(
                "expand"
              )}
            </span>
          </div>

          {filteredAppointments.map(
            (
              appointment
            ) => {
              const isOpen =
                openAppointmentId ===
                appointment.id;

              const appointmentDate =
                effectiveDate(
                  appointment
                );

              const appointmentTime =
                effectiveTime(
                  appointment
                );

              const canOpenFolder =
                Boolean(
                  appointment
                    .patientProfileId
                ) &&
                FOLDER_STATUSES.has(
                  appointment.status
                );

              return (
                <article
                  key={
                    appointment.id
                  }
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="overflow-x-auto">
                    <button
                      type="button"
                      aria-expanded={
                        isOpen
                      }
                      onClick={() =>
                        setOpenAppointmentId(
                          isOpen
                            ? null
                            : appointment.id
                        )
                      }
                      className="grid min-w-[1040px] w-full grid-cols-[145px_minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(160px,1fr)_135px_40px] items-center gap-4 px-5 py-4 text-left hover:bg-gray-50"
                    >
                      <span className="font-semibold text-gray-900">
                        {formatDate(
                          appointmentDate
                        )}

                        {appointmentTime
                          ? `, ${appointmentTime.slice(
                              0,
                              5
                            )}`
                          : ""}
                      </span>

                      <span className="truncate font-medium text-gray-900">
                        {
                          appointment.patientName
                        }
                      </span>

                      <span className="truncate text-gray-700">
                        {
                          appointment.doctorName
                        }
                      </span>

                      <span className="truncate text-gray-700">
                        {
                          appointment.clinicName
                        }
                      </span>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${statusClasses(
                          appointment.status
                        )}`}
                      >
                        {statusLabel(
                          appointment.status
                        )}
                      </span>

                      <span
                        aria-hidden="true"
                        className={`justify-self-end text-gray-500 transition-transform ${
                          isOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      >
                        ⌄
                      </span>
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-200 px-5 py-6">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            {t(
                              "details"
                            )}
                          </p>

                          <h3 className="mt-1 text-xl font-semibold text-gray-900">
                            {
                              appointment.patientName
                            }
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {t(
                              "createdAt",
                              {
                                date:
                                  formatCreatedAt(
                                    appointment.createdAt
                                  ),
                              }
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                            {sourceLabel(
                              appointment.source
                            )}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${statusClasses(
                              appointment.status
                            )}`}
                          >
                            {statusLabel(
                              appointment.status
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          [
                            t(
                              "doctor"
                            ),
                            appointment.doctorName,
                          ],
                          [
                            t(
                              "clinic"
                            ),
                            appointment.clinicName,
                          ],
                          [
                            t(
                              "requestedDate"
                            ),
                            `${formatDate(
                              appointment.requestedDate
                            )}${
                              appointment.requestedTime
                                ? `, ${appointment.requestedTime.slice(
                                    0,
                                    5
                                  )}`
                                : ""
                            }`,
                          ],
                          [
                            t(
                              "phone"
                            ),
                            appointment.patientPhone,
                          ],
                          [
                            t(
                              "email"
                            ),
                            appointment.patientEmail,
                          ],
                          [
                            t(
                              "duration"
                            ),
                            appointment.durationMinutes
                              ? t(
                                  "minutes",
                                  {
                                    count:
                                      appointment.durationMinutes,
                                  }
                                )
                              : "—",
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
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {
                                  label
                                }
                              </p>

                              <p className="mt-1 break-all text-gray-900">
                                {
                                  value
                                }
                              </p>
                            </div>
                          )
                        )}

                        {appointment.scheduledDate && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t(
                                "confirmedDate"
                              )}
                            </p>

                            <p className="mt-1 font-medium text-gray-900">
                              {formatDate(
                                appointment.scheduledDate
                              )}

                              {appointment.scheduledTime
                                ? `, ${appointment.scheduledTime.slice(
                                    0,
                                    5
                                  )}`
                                : ""}
                            </p>
                          </div>
                        )}
                      </div>

                      {appointment.notes && (
                        <div className="mt-6 rounded-xl bg-gray-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {t(
                              "notes"
                            )}
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-gray-700">
                            {
                              appointment.notes
                            }
                          </p>
                        </div>
                      )}

                      {appointment.rescheduleReason && (
                        <div className="mt-4 rounded-xl bg-blue-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                            {t(
                              "rescheduleReason"
                            )}
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-blue-900">
                            {
                              appointment.rescheduleReason
                            }
                          </p>
                        </div>
                      )}

                      <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-5">
                        <Link
                          href={`/appointments/${appointment.id}/messages`}
                          className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                        >
                          {t(
                            "messages"
                          )}
                        </Link>

                        {canOpenFolder ? (
                          <Link
                            href={`/medical-folder/${appointment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="romdoc-button romdoc-button-primary romdoc-button-sm"
                          >
                            {t(
                              "medicalFolder"
                            )}
                          </Link>
                        ) : (
                          <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
                            {t(
                              "folderUnavailable"
                            )}
                          </span>
                        )}
                      </div>

                      <StaffAppointmentActions
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
                        onUpdated={
                          onUpdated
                        }
                      />
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">
          {appointments.length ===
          0
            ? t(
                "emptyAssignments"
              )
            : t(
                "emptyFilters"
              )}
        </div>
      )}
    </section>
  );
}
