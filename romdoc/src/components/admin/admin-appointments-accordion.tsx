"use client";

import { useMemo, useState } from "react";
import AppointmentActions from "@/components/admin/appointment-actions";

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
};

const STATUS_OPTIONS = [
  { value: "pending", label: "În așteptare" },
  { value: "confirmed", label: "Confirmată" },
  { value: "rescheduled", label: "Reprogramată" },
  { value: "cancelled", label: "Anulată" },
  { value: "completed", label: "Finalizată" },
  { value: "no_show", label: "Neprezentare" },
];

const SOURCE_OPTIONS = [
  { value: "online", label: "Cerere online" },
  { value: "phone", label: "Telefon" },
  { value: "walk_in", label: "Direct la clinică" },
  { value: "email", label: "E-mail" },
  { value: "other", label: "Altă sursă" },
];

function getStatusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "Confirmată";
    case "rescheduled":
      return "Reprogramată";
    case "cancelled":
      return "Anulată";
    case "completed":
      return "Finalizată";
    case "no_show":
      return "Neprezentare";
    default:
      return "În așteptare";
  }
}

function getStatusClasses(status: string) {
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatCreatedAt(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function normalizeDatePart(value: string, maximumLength: number) {
  return value.replace(/\D/g, "").slice(0, maximumLength);
}

function getEffectiveDate(appointment: AdminAppointmentListItem) {
  return appointment.scheduledDate ?? appointment.requestedDate;
}

function getEffectiveTime(appointment: AdminAppointmentListItem) {
  return appointment.scheduledTime ?? appointment.requestedTime;
}

export default function AdminAppointmentsAccordion({
  appointments,
}: AdminAppointmentsAccordionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(
    null
  );

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return appointments.filter((appointment) => {
      if (statusFilter !== "all" && appointment.status !== statusFilter) {
        return false;
      }

      if (sourceFilter !== "all" && appointment.source !== sourceFilter) {
        return false;
      }

      const effectiveDate = getEffectiveDate(appointment);
      const [appointmentYear, appointmentMonth, appointmentDay] =
        effectiveDate.split("-");

      const normalizedDay =
        dayFilter.length > 0 ? dayFilter.padStart(2, "0") : "";

      const normalizedMonth =
        monthFilter.length > 0 ? monthFilter.padStart(2, "0") : "";

      if (normalizedDay && appointmentDay !== normalizedDay) {
        return false;
      }

      if (normalizedMonth && appointmentMonth !== normalizedMonth) {
        return false;
      }

      if (yearFilter && !appointmentYear.startsWith(yearFilter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        appointment.patientName,
        appointment.patientEmail,
        appointment.patientPhone,
        appointment.doctorName,
        appointment.clinicName,
        appointment.notes ?? "",
        appointment.rescheduleReason ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [
    appointments,
    dayFilter,
    monthFilter,
    searchTerm,
    sourceFilter,
    statusFilter,
    yearFilter,
  ]);

  const filtersAreActive =
    searchTerm !== "" ||
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    dayFilter !== "" ||
    monthFilter !== "" ||
    yearFilter !== "";

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
    <section className="mt-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Căutare și filtre
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Caută după pacient, e-mail, telefon, medic, clinică sau observații.
            </p>
          </div>

          {filtersAreActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="w-fit rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#036661] hover:text-[#036661]"
            >
              Șterge filtrele
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Căutare
            </span>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setOpenAppointmentId(null);
              }}
              placeholder="Nume, e-mail, telefon, medic, clinică..."
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Status
            </span>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setOpenAppointmentId(null);
              }}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            >
              <option value="all">Toate statusurile</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Sursă
            </span>

            <select
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value);
                setOpenAppointmentId(null);
              }}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            >
              <option value="all">Toate sursele</option>
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-gray-700">
            Data programării
          </legend>

          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.4fr)] items-center gap-2 sm:max-w-md">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Ziua programării"
              placeholder="DD"
              value={dayFilter}
              onChange={(event) => {
                setDayFilter(normalizeDatePart(event.target.value, 2));
                setOpenAppointmentId(null);
              }}
              className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 text-center text-gray-900 outline-none transition-colors focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />

            <span aria-hidden="true" className="font-bold text-gray-400">
              :
            </span>

            <input
              type="text"
              inputMode="numeric"
              aria-label="Luna programării"
              placeholder="MM"
              value={monthFilter}
              onChange={(event) => {
                setMonthFilter(normalizeDatePart(event.target.value, 2));
                setOpenAppointmentId(null);
              }}
              className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 text-center text-gray-900 outline-none transition-colors focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />

            <span aria-hidden="true" className="font-bold text-gray-400">
              :
            </span>

            <input
              type="text"
              inputMode="numeric"
              aria-label="Anul programării"
              placeholder="YYYY"
              value={yearFilter}
              onChange={(event) => {
                setYearFilter(normalizeDatePart(event.target.value, 4));
                setOpenAppointmentId(null);
              }}
              className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 text-center text-gray-900 outline-none transition-colors focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </div>
        </fieldset>
      </div>

      <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Lista programărilor
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            {filteredAppointments.length === 1
              ? "1 programare afișată"
              : `${filteredAppointments.length} programări afișate`}
            {filtersAreActive && <span> din {appointments.length}</span>}
          </p>
        </div>
      </div>

      {filteredAppointments.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div className="hidden min-w-[960px] grid-cols-[145px_minmax(170px,1fr)_minmax(170px,1fr)_minmax(160px,1fr)_130px_40px] gap-4 px-5 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
            <span>Data și ora</span>
            <span>Pacient</span>
            <span>Medic</span>
            <span>Clinică</span>
            <span>Status</span>
            <span className="sr-only">Extinde</span>
          </div>

          {filteredAppointments.map((appointment) => {
            const isOpen = openAppointmentId === appointment.id;
            const effectiveDate = getEffectiveDate(appointment);
            const effectiveTime = getEffectiveTime(appointment);

            return (
              <article
                key={appointment.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="overflow-x-auto">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`admin-appointment-details-${appointment.id}`}
                    onClick={() => {
                      setOpenAppointmentId(isOpen ? null : appointment.id);
                    }}
                    className="grid min-w-[960px] w-full grid-cols-[145px_minmax(170px,1fr)_minmax(170px,1fr)_minmax(160px,1fr)_130px_40px] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#036661]"
                  >
                    <span className="font-semibold text-gray-900">
                      {formatDate(effectiveDate)}
                      {effectiveTime ? `, ${effectiveTime.slice(0, 5)}` : ""}
                    </span>

                    <span>
                      <span className="block truncate font-medium text-gray-900">
                        {appointment.patientName}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {appointment.patientEmail}
                      </span>
                    </span>

                    <span className="truncate text-gray-700">
                      {appointment.doctorName}
                    </span>

                    <span className="truncate text-gray-700">
                      {appointment.clinicName}
                    </span>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClasses(
                        appointment.status
                      )}`}
                    >
                      {getStatusLabel(appointment.status)}
                    </span>

                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className={`h-5 w-5 justify-self-end text-gray-500 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      <path
                        d="m5 7.5 5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                {isOpen && (
                  <div
                    id={`admin-appointment-details-${appointment.id}`}
                    className="border-t border-gray-200 px-5 py-6"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Detalii programare
                        </p>

                        <h3 className="mt-1 text-xl font-semibold text-gray-900">
                          {appointment.patientName}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          Creată la {formatCreatedAt(appointment.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                          {getSourceLabel(appointment.source)}
                        </span>

                        <span
                          className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClasses(
                            appointment.status
                          )}`}
                        >
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Medic
                        </p>
                        <p className="mt-1 text-gray-900">
                          {appointment.doctorName}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Clinica
                        </p>
                        <p className="mt-1 text-gray-900">
                          {appointment.clinicName}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Data solicitată
                        </p>
                        <p className="mt-1 text-gray-900">
                          {formatDate(appointment.requestedDate)}
                          {appointment.requestedTime
                            ? `, ${appointment.requestedTime.slice(0, 5)}`
                            : ""}
                        </p>
                      </div>

                      {appointment.scheduledDate && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Data confirmată
                          </p>
                          <p className="mt-1 font-medium text-gray-900">
                            {formatDate(appointment.scheduledDate)}
                            {appointment.scheduledTime
                              ? `, ${appointment.scheduledTime.slice(0, 5)}`
                              : ""}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Telefon
                        </p>
                        <a
                          href={`tel:${appointment.patientPhone.replace(/\s+/g, "")}`}
                          className="mt-1 block text-gray-900 underline-offset-4 hover:underline"
                        >
                          {appointment.patientPhone}
                        </a>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          E-mail
                        </p>
                        <a
                          href={`mailto:${appointment.patientEmail}`}
                          className="mt-1 block break-all text-gray-900 underline-offset-4 hover:underline"
                        >
                          {appointment.patientEmail}
                        </a>
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="mt-6 rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Observații
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-gray-700">
                          {appointment.notes}
                        </p>
                      </div>
                    )}

                    {appointment.rescheduleReason && (
                      <div className="mt-4 rounded-xl bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Motivul reprogramării
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-blue-900">
                          {appointment.rescheduleReason}
                        </p>
                      </div>
                    )}

                    <AppointmentActions
                      appointmentId={appointment.id}
                      currentStatus={appointment.status}
                      requestedDate={appointment.requestedDate}
                      requestedTime={appointment.requestedTime}
                      scheduledDate={appointment.scheduledDate}
                      scheduledTime={appointment.scheduledTime}
                      currentReason={appointment.rescheduleReason}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">
          {appointments.length === 0
            ? "Nu există încă programări."
            : "Nu există programări care corespund filtrelor selectate."}
        </div>
      )}
    </section>
  );
}
