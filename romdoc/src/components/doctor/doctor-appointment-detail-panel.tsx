"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  useLocale,
  useTranslations,
} from "next-intl";

import TranslatedAppointmentActions from "@/components/doctor/translated-appointment-actions";
import AppointmentTimeline, {
  type AppointmentTimelineCopy,
} from "@/components/appointments/appointment-timeline";
import DoctorPatientFolderManager from "@/components/doctor/doctor-patient-folder-manager";
import {
  getAppointmentStatusLabel,
} from "@/lib/appointments/appointment-status";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

export type DoctorAppointmentDetail = {
  id: string;
  patientProfileId: string | null;
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
  clinicName: string;
};

type Props = {
  appointment: DoctorAppointmentDetail;
  variant?: "inline" | "dialog";
  onClose?: () => void;
};

const INTL_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

const EVENT_KEYS = [
  "appointment_created",
  "confirmed",
  "rescheduled",
  "cancelled_by_patient",
  "cancelled_by_doctor",
  "cancelled_by_staff",
  "cancelled_by_admin",
  "cancelled_by_system",
  "completed",
  "marked_no_show",
  "schedule_changed",
  "notes_updated",
  "status_changed",
] as const;

const ROLE_KEYS = [
  "patient",
  "user",
  "doctor",
  "staff",
  "admin",
  "system",
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

function formatCreatedAt(
  date: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(date));
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-gray-900">
        {value}
      </dd>
    </div>
  );
}

export default function DoctorAppointmentDetailPanel({
  appointment,
  variant = "inline",
  onClose,
}: Props) {
  const locale = normalizeAppLocale(
    useLocale()
  );
  const t = useTranslations(
    "DoctorAppointmentOperations.detail"
  );
  const commonT = useTranslations(
    "DoctorAppointmentOperations.common"
  );
  const timelineT = useTranslations(
    "DoctorAppointmentOperations.timeline"
  );
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (variant !== "dialog") {
      return;
    }

    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () =>
      window.removeEventListener("keydown", onKeyDown);
  }, [onClose, variant]);

  const timelineCopy = useMemo<AppointmentTimelineCopy>(
    () => ({
      title: timelineT("title"),
      eventSingular: timelineT("eventSingular"),
      eventPlural: timelineT("eventPlural"),
      viewEvolution: timelineT("viewEvolution"),
      loading: timelineT("loading"),
      loadFailed: timelineT("loadFailed"),
      retry: timelineT("retry"),
      empty: timelineT("empty"),
      statusChange: timelineT("statusChange"),
      appointmentChange: timelineT("appointmentChange"),
      reason: timelineT("reason"),
      unknownEvent: timelineT("unknownEvent"),
      unknownRole: timelineT("unknownRole"),
      events: Object.fromEntries(
        EVENT_KEYS.map((key) => [
          key,
          timelineT(`events.${key}`),
        ])
      ),
      roles: Object.fromEntries(
        ROLE_KEYS.map((key) => [
          key,
          timelineT(`roles.${key}`),
        ])
      ),
    }),
    [timelineT]
  );

  const sourceLabel =
    appointment.source === "phone"
      ? commonT("sourcePhone")
      : appointment.source === "walk_in"
        ? commonT("sourceWalkIn")
        : appointment.source === "email"
          ? commonT("sourceEmail")
          : appointment.source === "other"
            ? commonT("sourceOther")
            : commonT("sourceOnline");

  const dateValue = (
    date: string,
    time: string | null
  ) =>
    `${formatDate(date, locale)}${
      time ? `, ${time.slice(0, 5)}` : ""
    }`;

  const content = (
    <div
      className={
        variant === "dialog"
          ? "max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
          : ""
      }
    >
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {t("title")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            {appointment.patientName}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t("createdAt", {
              date: formatCreatedAt(
                appointment.createdAt,
                locale
              ),
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            {sourceLabel}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${statusClasses(
              appointment.status
            )}`}
          >
            {getAppointmentStatusLabel(
              appointment.status,
              locale
            )}
          </span>

          {variant === "dialog" && onClose && (
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="romdoc-focus-ring ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            label={t("clinic")}
            value={appointment.clinicName}
          />
          <Detail
            label={t("requestedDate")}
            value={dateValue(
              appointment.requestedDate,
              appointment.requestedTime
            )}
          />
          {appointment.scheduledDate && (
            <Detail
              label={t("confirmedDate")}
              value={dateValue(
                appointment.scheduledDate,
                appointment.scheduledTime
              )}
            />
          )}
          <Detail
            label={t("phone")}
            value={appointment.patientPhone}
          />
          <Detail
            label={t("email")}
            value={appointment.patientEmail}
          />
          {appointment.notes && (
            <Detail
              label={t("notes")}
              value={appointment.notes}
            />
          )}
          {appointment.rescheduleReason && (
            <Detail
              label={t("rescheduleReason")}
              value={appointment.rescheduleReason}
            />
          )}
        </dl>

        <TranslatedAppointmentActions
          appointmentId={appointment.id}
          currentStatus={appointment.status}
          requestedDate={appointment.requestedDate}
          requestedTime={appointment.requestedTime}
          scheduledDate={appointment.scheduledDate}
          scheduledTime={appointment.scheduledTime}
          currentReason={appointment.rescheduleReason}
        />

        <AppointmentTimeline
          appointmentId={appointment.id}
          locale={locale}
          copy={timelineCopy}
        />

        <div className="mt-6 border-t border-gray-200 pt-5">
          <Link
            href={`/appointments/${appointment.id}/messages?locale=${locale}`}
            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
          >
            {t("messages")}
          </Link>
        </div>

        {appointment.patientProfileId ? (
          <DoctorPatientFolderManager
            appointmentId={appointment.id}
            appointmentStatus={appointment.status}
          />
        ) : (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t("folderUnavailable")}
          </div>
        )}
      </div>
    </div>
  );

  if (variant === "dialog") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("dialogLabel", {
          patient: appointment.patientName,
        })}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
        onMouseDown={(event) => {
          if (
            event.target === event.currentTarget
          ) {
            onClose?.();
          }
        }}
      >
        <div className="w-full max-w-4xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
