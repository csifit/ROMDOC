"use client";

import { useMemo, useState } from "react";

import AppointmentActions, {
  type AppointmentActionsCopy,
} from "@/components/admin/appointment-actions";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformOperatorBilling,
  interpolatePlatformBillingCopy,
  PLATFORM_OPERATOR_BILLING_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-billing";

export type AdminAppointmentListItem = {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  requestedDate: string;
  requestedTime: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  rescheduleReason: string | null;
  notes: string | null;
  source: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  doctorName: string;
  clinicName: string;
};

type AdminAppointmentsAccordionProps = {
  appointments: AdminAppointmentListItem[];
  locale: AppLocale;
};

function statusClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-green-200 bg-green-50 text-green-800";
    case "rescheduled":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-800";
    case "completed":
      return "border-gray-300 bg-gray-100 text-gray-800";
    case "no_show":
      return "border-orange-200 bg-orange-50 text-orange-900";
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function normalizeDatePart(value: string, maximumLength: number) {
  return value.replace(/\D/g, "").slice(0, maximumLength);
}

function effectiveDate(appointment: AdminAppointmentListItem) {
  return appointment.scheduledDate ?? appointment.requestedDate;
}

function effectiveTime(appointment: AdminAppointmentListItem) {
  return appointment.scheduledTime ?? appointment.requestedTime;
}

export default function AdminAppointmentsAccordion({
  appointments,
  locale,
}: AdminAppointmentsAccordionProps) {
  const copy = getPlatformOperatorBilling(locale);
  const localeTag = PLATFORM_OPERATOR_BILLING_LOCALE_TAGS[locale];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(null);

  const statusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return copy.appointments.statuses.confirmed;
      case "rescheduled":
        return copy.appointments.statuses.rescheduled;
      case "cancelled":
        return copy.appointments.statuses.cancelled;
      case "completed":
        return copy.appointments.statuses.completed;
      case "no_show":
        return copy.appointments.statuses.noShow;
      default:
        return copy.appointments.statuses.pending;
    }
  };

  const sourceLabel = (source: string) => {
    switch (source) {
      case "phone":
        return copy.appointments.sources.phone;
      case "walk_in":
        return copy.appointments.sources.walkIn;
      case "email":
        return copy.appointments.sources.email;
      case "other":
        return copy.appointments.sources.other;
      default:
        return copy.appointments.sources.online;
    }
  };

  const dateLabel = (date: string) =>
    new Intl.DateTimeFormat(localeTag, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));

  const dateTimeLabel = (date: string) =>
    new Intl.DateTimeFormat(localeTag, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }).format(new Date(date));

  const actionCopy: AppointmentActionsCopy = {
    terminalError: copy.appointments.actions.terminalError,
    updateError: copy.appointments.actions.updateError,
    updated: copy.appointments.actions.updated,
    emailFailed: (message) =>
      interpolatePlatformBillingCopy(copy.appointments.actions.emailFailed, {
        message,
      }),
    invalidDateTime: copy.appointments.actions.invalidDateTime,
    confirmComplete: copy.appointments.actions.confirmComplete,
    confirmNoShow: copy.appointments.actions.confirmNoShow,
    selectDateTime: copy.appointments.actions.selectDateTime,
    differentSlot: copy.appointments.actions.differentSlot,
    reasonRequired: copy.appointments.actions.reasonRequired,
    confirmCancel: copy.appointments.actions.confirmCancel,
    closed: copy.appointments.actions.closed,
    title: copy.appointments.actions.title,
    description: copy.appointments.actions.description,
    confirming: copy.appointments.actions.confirming,
    confirm: copy.appointments.actions.confirm,
    saving: copy.appointments.actions.saving,
    complete: copy.appointments.actions.complete,
    reschedule: copy.appointments.actions.reschedule,
    noShow: copy.appointments.actions.noShow,
    cancel: copy.appointments.actions.cancel,
    rescheduleTitle: copy.appointments.actions.rescheduleTitle,
    rescheduleDescription: copy.appointments.actions.rescheduleDescription,
    close: copy.appointments.actions.close,
    newDate: copy.appointments.actions.newDate,
    newTime: copy.appointments.actions.newTime,
    rescheduleReason: copy.appointments.actions.rescheduleReason,
    reschedulePlaceholder: copy.appointments.actions.reschedulePlaceholder,
    saveReschedule: copy.appointments.actions.saveReschedule,
    dismiss: copy.appointments.actions.dismiss,
    cancelTitle: copy.appointments.actions.cancelTitle,
    cancelDescription: copy.appointments.actions.cancelDescription,
    cancellationReason: copy.appointments.actions.cancellationReason,
    optional: copy.appointments.actions.optional,
    cancelling: copy.appointments.actions.cancelling,
    confirmCancellation: copy.appointments.actions.confirmCancellation,
  };

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase(locale);

    return appointments.filter((appointment) => {
      if (statusFilter !== "all" && appointment.status !== statusFilter) {
        return false;
      }
      if (sourceFilter !== "all" && appointment.source !== sourceFilter) {
        return false;
      }

      const [appointmentYear, appointmentMonth, appointmentDay] =
        effectiveDate(appointment).split("-");
      const normalizedDay = dayFilter ? dayFilter.padStart(2, "0") : "";
      const normalizedMonth = monthFilter ? monthFilter.padStart(2, "0") : "";

      if (normalizedDay && appointmentDay !== normalizedDay) return false;
      if (normalizedMonth && appointmentMonth !== normalizedMonth) return false;
      if (yearFilter && !appointmentYear.startsWith(yearFilter)) return false;
      if (!normalizedSearch) return true;

      return [
        appointment.patientName,
        appointment.patientEmail,
        appointment.patientPhone,
        appointment.doctorName,
        appointment.clinicName,
        appointment.notes ?? "",
        appointment.rescheduleReason ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(normalizedSearch);
    });
  }, [
    appointments,
    dayFilter,
    locale,
    monthFilter,
    searchTerm,
    sourceFilter,
    statusFilter,
    yearFilter,
  ]);

  const filtersActive = Boolean(
    searchTerm ||
      statusFilter !== "all" ||
      sourceFilter !== "all" ||
      dayFilter ||
      monthFilter ||
      yearFilter
  );

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setSourceFilter("all");
    setDayFilter("");
    setMonthFilter("");
    setYearFilter("");
    setOpenAppointmentId(null);
  }

  return (
    <div className="space-y-[34px]">
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {copy.appointments.filtersTitle}
            </h2>
            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {copy.appointments.filtersDescription}
            </p>
          </div>
          {filtersActive ? (
            <button
              type="button"
              onClick={resetFilters}
              className="romdoc-focus-ring w-fit rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {copy.appointments.reset}
            </button>
          ) : null}
        </div>

        <div className="mt-[21px] grid gap-[13px] lg:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)]">
          <label>
            <span className="text-sm font-semibold text-gray-700">
              {copy.common.search}
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setOpenAppointmentId(null);
              }}
              placeholder={copy.appointments.searchPlaceholder}
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-gray-700">
              {copy.appointments.status}
            </span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setOpenAppointmentId(null);
              }}
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm"
            >
              <option value="all">{copy.appointments.allStatuses}</option>
              <option value="pending">{copy.appointments.statuses.pending}</option>
              <option value="confirmed">{copy.appointments.statuses.confirmed}</option>
              <option value="rescheduled">{copy.appointments.statuses.rescheduled}</option>
              <option value="cancelled">{copy.appointments.statuses.cancelled}</option>
              <option value="completed">{copy.appointments.statuses.completed}</option>
              <option value="no_show">{copy.appointments.statuses.noShow}</option>
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-gray-700">
              {copy.appointments.source}
            </span>
            <select
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value);
                setOpenAppointmentId(null);
              }}
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm"
            >
              <option value="all">{copy.appointments.allSources}</option>
              <option value="online">{copy.appointments.sources.online}</option>
              <option value="phone">{copy.appointments.sources.phone}</option>
              <option value="walk_in">{copy.appointments.sources.walkIn}</option>
              <option value="email">{copy.appointments.sources.email}</option>
              <option value="other">{copy.appointments.sources.other}</option>
            </select>
          </label>
        </div>

        <fieldset className="mt-[21px]">
          <legend className="text-sm font-semibold text-gray-700">
            {copy.appointments.date}
          </legend>
          <div className="mt-[8px] grid max-w-md grid-cols-[1fr_auto_1fr_auto_1.4fr] items-center gap-[8px]">
            <input
              type="text"
              inputMode="numeric"
              aria-label={copy.appointments.day}
              placeholder="DD"
              value={dayFilter}
              onChange={(event) => {
                setDayFilter(normalizeDatePart(event.target.value, 2));
                setOpenAppointmentId(null);
              }}
              className="romdoc-focus-ring min-w-0 rounded-[13px] border border-gray-300 px-[8px] py-[13px] text-center text-sm"
            />
            <span className="text-gray-400">:</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label={copy.appointments.month}
              placeholder="MM"
              value={monthFilter}
              onChange={(event) => {
                setMonthFilter(normalizeDatePart(event.target.value, 2));
                setOpenAppointmentId(null);
              }}
              className="romdoc-focus-ring min-w-0 rounded-[13px] border border-gray-300 px-[8px] py-[13px] text-center text-sm"
            />
            <span className="text-gray-400">:</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label={copy.appointments.year}
              placeholder="YYYY"
              value={yearFilter}
              onChange={(event) => {
                setYearFilter(normalizeDatePart(event.target.value, 4));
                setOpenAppointmentId(null);
              }}
              className="romdoc-focus-ring min-w-0 rounded-[13px] border border-gray-300 px-[8px] py-[13px] text-center text-sm"
            />
          </div>
        </fieldset>
      </section>

      <section>
        <div className="flex items-end justify-between gap-[13px]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {copy.appointments.listTitle}
            </h2>
            <p className="mt-[5px] text-sm text-gray-500">
              {interpolatePlatformBillingCopy(copy.appointments.showing, {
                filtered: filteredAppointments.length,
                total: appointments.length,
              })}
            </p>
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="mt-[21px] rounded-[21px] border border-dashed border-gray-300 bg-white p-[34px] text-center text-sm text-gray-600">
            {copy.appointments.empty}
          </div>
        ) : (
          <div className="mt-[21px] space-y-[13px]">
            {filteredAppointments.map((appointment) => {
              const open = openAppointmentId === appointment.id;
              const appointmentDate = effectiveDate(appointment);
              const appointmentTime = effectiveTime(appointment)?.slice(0, 5);

              return (
                <article
                  key={appointment.id}
                  className="overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenAppointmentId(open ? null : appointment.id)
                    }
                    className="romdoc-focus-ring flex w-full flex-col gap-[13px] p-[21px] text-left md:flex-row md:items-center md:justify-between"
                    aria-expanded={open}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-[8px]">
                        <h3 className="truncate text-lg font-bold text-gray-900">
                          {appointment.patientName}
                        </h3>
                        <span
                          className={`rounded-full border px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                            appointment.status
                          )}`}
                        >
                          {statusLabel(appointment.status)}
                        </span>
                      </div>
                      <p className="mt-[5px] text-sm text-gray-600">
                        {appointment.doctorName} · {appointment.clinicName}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-bold text-gray-900">
                        {dateLabel(appointmentDate)}
                        {appointmentTime ? ` · ${appointmentTime}` : ""}
                      </p>
                      <p className="mt-[5px] text-xs text-gray-500">
                        {sourceLabel(appointment.source)}
                      </p>
                    </div>
                  </button>

                  {open ? (
                    <div className="border-t border-gray-200 bg-gray-50/60 p-[21px]">
                      <dl className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          [copy.appointments.patient, appointment.patientName],
                          [copy.appointments.contact, `${appointment.patientEmail} · ${appointment.patientPhone}`],
                          [copy.appointments.doctor, appointment.doctorName],
                          [copy.appointments.clinic, appointment.clinicName],
                          [copy.appointments.requested, `${dateLabel(appointment.requestedDate)}${appointment.requestedTime ? ` · ${appointment.requestedTime.slice(0, 5)}` : ""}`],
                          [copy.appointments.scheduled, appointment.scheduledDate ? `${dateLabel(appointment.scheduledDate)}${appointment.scheduledTime ? ` · ${appointment.scheduledTime.slice(0, 5)}` : ""}` : copy.common.none],
                          [copy.appointments.created, dateTimeLabel(appointment.createdAt)],
                          [copy.appointments.updated, dateTimeLabel(appointment.updatedAt)],
                        ].map(([label, value]) => (
                          <div key={String(label)}>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {label}
                            </dt>
                            <dd className="mt-[5px] break-words text-sm font-medium text-gray-900">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-[21px] grid gap-[13px] lg:grid-cols-2">
                        <div className="rounded-[13px] border border-gray-200 bg-white p-[13px]">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {copy.appointments.notes}
                          </p>
                          <p className="mt-[8px] text-sm leading-6 text-gray-700">
                            {appointment.notes || copy.appointments.noNotes}
                          </p>
                        </div>
                        <div className="rounded-[13px] border border-gray-200 bg-white p-[13px]">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {copy.appointments.rescheduleReason}
                          </p>
                          <p className="mt-[8px] text-sm leading-6 text-gray-700">
                            {appointment.rescheduleReason || copy.common.none}
                          </p>
                        </div>
                      </div>

                      <AppointmentActions
                        appointmentId={appointment.id}
                        currentStatus={appointment.status}
                        requestedDate={appointment.requestedDate}
                        requestedTime={appointment.requestedTime}
                        scheduledDate={appointment.scheduledDate}
                        scheduledTime={appointment.scheduledTime}
                        currentReason={appointment.rescheduleReason}
                        locale={locale}
                        copy={actionCopy}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
