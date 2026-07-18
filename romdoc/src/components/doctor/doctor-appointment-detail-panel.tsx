"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
} from "react";

import AppointmentActions from "@/components/admin/appointment-actions";
import AppointmentTimeline from "@/components/appointments/appointment-timeline";
import DoctorPatientFolderManager from "@/components/doctor/doctor-patient-folder-manager";

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
  variant?:
    | "inline"
    | "dialog";
  onClose?: () => void;
};

function statusLabel(
  status: string
) {
  const labels: Record<
    string,
    string
  > = {
    pending:
      "În așteptare",
    confirmed:
      "Confirmată",
    rescheduled:
      "Reprogramată",
    cancelled:
      "Anulată",
    completed:
      "Finalizată",
    no_show:
      "Neprezentare",
  };

  return (
    labels[status] ??
    status
  );
}

function statusClasses(
  status: string
) {
  const classes: Record<
    string,
    string
  > = {
    confirmed:
      "bg-green-100 text-green-800",
    rescheduled:
      "bg-blue-100 text-blue-800",
    cancelled:
      "bg-red-100 text-red-800",
    completed:
      "bg-gray-200 text-gray-800",
    no_show:
      "bg-orange-100 text-orange-900",
    pending:
      "bg-amber-100 text-amber-800",
  };

  return (
    classes[status] ??
    classes.pending
  );
}

function sourceLabel(
  source: string
) {
  const labels: Record<
    string,
    string
  > = {
    phone:
      "Telefon",
    walk_in:
      "Direct la clinică",
    email:
      "E-mail",
    other:
      "Altă sursă",
  };

  return (
    labels[source] ??
    "Cerere online"
  );
}

function formatDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day:
        "2-digit",
      month:
        "2-digit",
      year:
        "numeric",
    }
  ).format(
    new Date(
      `${date}T12:00:00`
    )
  );
}

function formatCreatedAt(
  date: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
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
  ).format(
    new Date(date)
  );
}

export default function DoctorAppointmentDetailPanel({
  appointment,
  variant = "inline",
  onClose,
}: Props) {
  const closeRef =
    useRef<HTMLButtonElement | null>(
      null
    );

  useEffect(() => {
    if (
      variant !==
      "dialog"
    ) {
      return;
    }

    closeRef.current?.focus();

    function onKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose?.();
      }
    }

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
  }, [
    onClose,
    variant,
  ]);

  const content = (
    <div
      className={
        variant ===
        "dialog"
          ? "max-h-[90vh] overflow-y-auto rounded-[21px] bg-white shadow-2xl"
          : ""
      }
    >
      <div className="flex flex-col justify-between gap-[13px] border-b border-gray-200 p-[21px] sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Detalii programare
          </p>

          <h2 className="mt-[5px] text-xl font-semibold text-gray-900">
            {
              appointment.patientName
            }
          </h2>

          <p className="mt-[5px] text-sm text-gray-500">
            Creată la{" "}
            {formatCreatedAt(
              appointment.createdAt
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[8px]">
          <span className="rounded-full bg-gray-100 px-[13px] py-[5px] text-sm font-medium text-gray-700">
            {sourceLabel(
              appointment.source
            )}
          </span>

          <span
            className={`rounded-full px-[13px] py-[5px] text-sm font-medium ${statusClasses(
              appointment.status
            )}`}
          >
            {statusLabel(
              appointment.status
            )}
          </span>

          {variant ===
            "dialog" &&
            onClose && (
              <button
                ref={
                  closeRef
                }
                type="button"
                onClick={
                  onClose
                }
                aria-label="Închide detaliile programării"
                className="romdoc-focus-ring ml-[5px] inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            )}
        </div>
      </div>

      <div className="p-[21px]">
        <div className="grid gap-[21px] sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            label="Clinica"
            value={
              appointment.clinicName
            }
          />

          <Detail
            label="Data solicitată"
            value={`${formatDate(
              appointment.requestedDate
            )}${
              appointment.requestedTime
                ? `, ${appointment.requestedTime.slice(
                    0,
                    5
                  )}`
                : ""
            }`}
          />

          {appointment.scheduledDate && (
            <Detail
              label="Data confirmată"
              value={`${formatDate(
                appointment.scheduledDate
              )}${
                appointment.scheduledTime
                  ? `, ${appointment.scheduledTime.slice(
                      0,
                      5
                    )}`
                  : ""
              }`}
              strong
            />
          )}

          <Contact
            label="Telefon"
            href={`tel:${appointment.patientPhone.replace(
              /\s+/g,
              ""
            )}`}
            value={
              appointment.patientPhone
            }
          />

          <Contact
            label="E-mail"
            href={`mailto:${appointment.patientEmail}`}
            value={
              appointment.patientEmail
            }
          />
        </div>

        {appointment.notes && (
          <InfoBox
            label="Observații"
            value={
              appointment.notes
            }
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

        <AppointmentActions
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
        />

        <AppointmentTimeline
          appointmentId={
            appointment.id
          }
        />

        <div className="mt-[21px] border-t border-gray-200 pt-[21px]">
          <Link
            href={`/appointments/${appointment.id}/messages`}
            className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 hover:border-[#036661] hover:text-[#036661]"
          >
            Mesaje și fișiere
          </Link>
        </div>

        {appointment.patientProfileId ? (
          <DoctorPatientFolderManager
            appointmentId={
              appointment.id
            }
            appointmentStatus={
              appointment.status
            }
          />
        ) : (
          <div className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm text-amber-900">
            Dosarul medical este disponibil numai pentru programările asociate unui cont de pacient.
          </div>
        )}
      </div>
    </div>
  );

  if (
    variant ===
    "dialog"
  ) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Programare pentru ${appointment.patientName}`}
        className="fixed inset-0 z-[80] flex items-center justify-center p-[13px] sm:p-[21px]"
      >
        <button
          type="button"
          aria-label="Închide detaliile programării"
          onClick={
            onClose
          }
          className="absolute inset-0 bg-black/45"
        />

        <div className="relative z-10 w-full max-w-4xl">
          {
            content
          }
        </div>
      </div>
    );
  }

  return content;
}

function Detail({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {
          label
        }
      </p>

      <p
        className={`mt-[5px] text-gray-900 ${
          strong
            ? "font-medium"
            : ""
        }`}
      >
        {
          value
        }
      </p>
    </div>
  );
}

function Contact({
  label,
  href,
  value,
}: {
  label: string;
  href: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {
          label
        }
      </p>

      <a
        href={
          href
        }
        className="romdoc-focus-ring mt-[5px] block break-all rounded-[5px] text-gray-900 underline-offset-4 hover:underline"
      >
        {
          value
        }
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
          ? "bg-blue-50"
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
        {
          label
        }
      </p>

      <p
        className={`mt-[8px] whitespace-pre-wrap ${
          blue
            ? "text-blue-900"
            : "text-gray-700"
        }`}
      >
        {
          value
        }
      </p>
    </div>
  );
}
