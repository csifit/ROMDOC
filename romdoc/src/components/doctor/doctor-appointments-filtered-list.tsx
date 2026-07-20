"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useLocale,
  useTranslations,
} from "next-intl";

import DoctorAppointmentDetailPanel, {
  type DoctorAppointmentDetail,
} from "@/components/doctor/doctor-appointment-detail-panel";
import {
  getAppointmentStatusLabel,
} from "@/lib/appointments/appointment-status";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

export type DoctorAppointmentListItem =
  DoctorAppointmentDetail;

type DoctorAppointmentsFilteredListProps = {
  appointments: DoctorAppointmentListItem[];
};

const INTL_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

const STATUS_VALUES = [
  "confirmed",
  "pending",
  "rescheduled",
  "cancelled",
  "completed",
  "no_show",
] as const;

function statusClasses(status: string) {
  switch (status) {
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

function formatDate(
  date: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(`${date}T12:00:00`)
  );
}

function normalizeDatePart(
  value: string,
  maximumLength: number
) {
  return value
    .replace(/\D/g, "")
    .slice(0, maximumLength);
}

function effectiveDate(
  appointment: DoctorAppointmentListItem
) {
  return (
    appointment.scheduledDate ??
    appointment.requestedDate
  );
}

function effectiveTime(
  appointment: DoctorAppointmentListItem
) {
  return (
    appointment.scheduledTime ??
    appointment.requestedTime
  );
}

export default function DoctorAppointmentsFilteredList({
  appointments,
}: DoctorAppointmentsFilteredListProps) {
  const locale = normalizeAppLocale(
    useLocale()
  );
  const t = useTranslations(
    "DoctorAppointmentOperations.appointments.list"
  );

  const [statusFilter, setStatusFilter] =
    useState("all");
  const [dayFilter, setDayFilter] =
    useState("");
  const [monthFilter, setMonthFilter] =
    useState("");
  const [yearFilter, setYearFilter] =
    useState("");
  const [openAppointmentId, setOpenAppointmentId] =
    useState<string | null>(null);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (
          statusFilter !== "all" &&
          appointment.status !== statusFilter
        ) {
          return false;
        }

        const [year, month, day] =
          effectiveDate(appointment).split("-");
        const normalizedDay = dayFilter
          ? dayFilter.padStart(2, "0")
          : "";
        const normalizedMonth = monthFilter
          ? monthFilter.padStart(2, "0")
          : "";

        return !(
          (normalizedDay && day !== normalizedDay) ||
          (normalizedMonth && month !== normalizedMonth) ||
          (yearFilter && !year.startsWith(yearFilter))
        );
      }),
    [
      appointments,
      dayFilter,
      monthFilter,
      statusFilter,
      yearFilter,
    ]
  );

  const filtersAreActive =
    statusFilter !== "all" ||
    dayFilter !== "" ||
    monthFilter !== "" ||
    yearFilter !== "";

  function resetFilters() {
    setStatusFilter("all");
    setDayFilter("");
    setMonthFilter("");
    setYearFilter("");
    setOpenAppointmentId(null);
  }

  return (
    <section>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {filteredAppointments.length === 1
              ? t("shownOne")
              : t("shownMany", {
                  count: filteredAppointments.length,
                })}
            {filtersAreActive && (
              <> {t("ofTotal", {total: appointments.length})}</>
            )}
          </p>
        </div>

        {filtersAreActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>

      <div className="mb-5 grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_minmax(260px,1.4fr)]">
        <label className="block">
          <span className="romdoc-label">
            {t("filterStatus")}
          </span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setOpenAppointmentId(null);
            }}
            className="romdoc-select mt-2"
          >
            <option value="all">
              {t("allStatuses")}
            </option>
            {STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {getAppointmentStatusLabel(status, locale)}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="romdoc-label">
            {t("date")}
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input
              value={dayFilter}
              onChange={(event) => {
                setDayFilter(
                  normalizeDatePart(event.target.value, 2)
                );
                setOpenAppointmentId(null);
              }}
              inputMode="numeric"
              aria-label={t("dayAria")}
              placeholder="DD"
              className="romdoc-input"
            />
            <input
              value={monthFilter}
              onChange={(event) => {
                setMonthFilter(
                  normalizeDatePart(event.target.value, 2)
                );
                setOpenAppointmentId(null);
              }}
              inputMode="numeric"
              aria-label={t("monthAria")}
              placeholder="MM"
              className="romdoc-input"
            />
            <input
              value={yearFilter}
              onChange={(event) => {
                setYearFilter(
                  normalizeDatePart(event.target.value, 4)
                );
                setOpenAppointmentId(null);
              }}
              inputMode="numeric"
              aria-label={t("yearAria")}
              placeholder="YYYY"
              className="romdoc-input"
            />
          </div>
          <p className="romdoc-help-text mt-2">
            {t("dateHelp")}
          </p>
        </fieldset>
      </div>

      {filteredAppointments.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[170px_1fr_1fr_150px_36px] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
            <span>{t("dateTime")}</span>
            <span>{t("patient")}</span>
            <span>{t("clinic")}</span>
            <span>{t("status")}</span>
            <span />
          </div>

          {filteredAppointments.map((appointment) => {
            const open = openAppointmentId === appointment.id;
            const time = effectiveTime(appointment);

            return (
              <article
                key={appointment.id}
                className="border-b border-gray-200 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenAppointmentId(
                      open ? null : appointment.id
                    )
                  }
                  aria-expanded={open}
                  className="romdoc-focus-ring grid w-full gap-3 px-5 py-4 text-left hover:bg-gray-50 md:grid-cols-[170px_1fr_1fr_150px_36px] md:items-center md:gap-4"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(effectiveDate(appointment), locale)}
                    {time ? ` · ${time.slice(0, 5)}` : ""}
                  </span>
                  <span>
                    <span className="block font-semibold text-gray-900">
                      {appointment.patientName}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {appointment.patientPhone}
                    </span>
                  </span>
                  <span className="text-sm text-gray-700">
                    {appointment.clinicName}
                  </span>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                      appointment.status
                    )}`}
                  >
                    {getAppointmentStatusLabel(
                      appointment.status,
                      locale
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`text-center text-gray-400 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  >
                    ˅
                  </span>
                </button>

                {open && (
                  <DoctorAppointmentDetailPanel
                    appointment={appointment}
                  />
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-gray-600">
          {appointments.length === 0
            ? t("empty")
            : t("noMatches")}
        </div>
      )}
    </section>
  );
}
