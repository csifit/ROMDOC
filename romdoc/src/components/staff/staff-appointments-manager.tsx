"use client";

import Button from "@/components/ui/button";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type Translation = {
  locale: string;
  name?: string;
  title?: string;
};

type DoctorRelation = {
  id: string;
  slug: string;
  doctor_translations:
    | Translation[]
    | null;
};

type ClinicRelation = {
  id: string;
  slug: string;
  formatted_address:
    | string
    | null;

  clinic_translations:
    | Translation[]
    | null;
};

type Appointment = {
  id: string;
  doctor_id: string;
  clinic_id: string;

  patient_name: string;
  patient_email: string;
  patient_phone: string;

  requested_date: string;
  requested_time:
    | string
    | null;

  scheduled_date:
    | string
    | null;

  scheduled_time:
    | string
    | null;

  duration_minutes:
    | number
    | null;

  status: string;

  notes:
    | string
    | null;

  reschedule_reason:
    | string
    | null;

  source:
    | string
    | null;

  created_at: string;

  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;

  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type StaffAppointmentsResponse = {
  appointments?: Appointment[];
  message?: string;
  error?: string;
};

function getFirstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
) {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getClinicName(
  appointment: Appointment
) {
  const clinic =
    getFirstRelation(
      appointment.clinics
    );

  return (
    clinic?.clinic_translations
      ?.find(
        (translation) =>
          translation.locale === "ro"
      )?.name ??
    clinic?.clinic_translations?.[0]
      ?.name ??
    clinic?.slug ??
    "Clinică"
  );
}

function getDoctorName(
  appointment: Appointment
) {
  const doctor =
    getFirstRelation(
      appointment.doctors
    );

  if (!doctor) {
    return "Medic";
  }

  return doctor.slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "pending":
      return "În așteptare";

    case "confirmed":
      return "Confirmată";

    case "rescheduled":
      return "Reprogramată";

    case "completed":
      return "Finalizată";

    case "cancelled":
      return "Anulată";

    default:
      return status;
  }
}

function getStatusClasses(
  status: string
) {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800";

    case "rescheduled":
      return "bg-blue-100 text-blue-800";

    case "completed":
      return "bg-gray-200 text-gray-800";

    case "cancelled":
      return "bg-red-100 text-red-800";

    default:
      return "bg-amber-100 text-amber-900";
  }
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

function formatTime(
  value:
    | string
    | null
) {
  return value
    ? value.slice(0, 5)
    : "—";
}

export default function StaffAppointmentsManager() {
  const [
    appointments,
    setAppointments,
  ] = useState<
    Appointment[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    savingAppointmentId,
    setSavingAppointmentId,
  ] = useState<string | null>(
    null
  );

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadAppointments =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/staff/appointments",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            StaffAppointmentsResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Programările nu au putut fi încărcate."
          );
        }

        setAppointments(
          result.appointments ??
            []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Programările nu au putut fi încărcate."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  async function updateAppointment(
    appointment: Appointment,
    action:
      | "confirm"
      | "reschedule"
      | "complete"
      | "cancel"
  ) {
    setError(null);
    setSuccess(null);

    let scheduledDate =
      appointment.scheduled_date ??
      appointment.requested_date;

    let scheduledTime =
      appointment.scheduled_time
        ?.slice(0, 5) ??
      appointment.requested_time
        ?.slice(0, 5) ??
      "";

    let reason = "";

    if (
      action === "confirm" ||
      action === "reschedule"
    ) {
      const enteredDate =
        window.prompt(
          "Data programării (AAAA-LL-ZZ):",
          scheduledDate
        );

      if (!enteredDate) {
        return;
      }

      const enteredTime =
        window.prompt(
          "Ora programării (HH:MM):",
          scheduledTime
        );

      if (!enteredTime) {
        return;
      }

      scheduledDate =
        enteredDate.trim();

      scheduledTime =
        enteredTime.trim();
    }

    if (
      action === "reschedule"
    ) {
      const enteredReason =
        window.prompt(
          "Motivul reprogramării:"
        );

      if (!enteredReason) {
        return;
      }

      reason =
        enteredReason.trim();
    }

    setSavingAppointmentId(
      appointment.id
    );

    try {
      const response =
        await fetch(
          "/api/staff/appointments",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                appointmentId:
                  appointment.id,

                action,

                scheduledDate,

                scheduledTime,

                reason,
              }),
          }
        );

      const result =
        (await response.json()) as
          StaffAppointmentsResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Programarea nu a putut fi actualizată."
        );
      }

      setSuccess(
        result.message ??
          "Programarea a fost actualizată."
      );

      await loadAppointments();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Programarea nu a putut fi actualizată."
      );
    } finally {
      setSavingAppointmentId(
        null
      );
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-gray-600">
          Se încarcă programările...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-[#9A4F35]">
          Personal
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Programările medicului
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Ai acces numai la programările
          medicului și clinicii pentru care ai
          fost autorizat.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {appointments.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600 shadow-sm">
          Nu există programări disponibile
          pentru atribuirea ta.
        </section>
      ) : (
        <div className="space-y-5">
          {appointments.map(
            (appointment) => {
              const isSaving =
                savingAppointmentId ===
                appointment.id;

              const date =
                appointment
                  .scheduled_date ??
                appointment
                  .requested_date;

              const time =
                appointment
                  .scheduled_time ??
                appointment
                  .requested_time;

              return (
                <article
                  key={
                    appointment.id
                  }
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {
                          appointment.patient_name
                        }
                      </h2>

                      <p className="mt-1 text-sm text-gray-600">
                        {getDoctorName(
                          appointment
                        )}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {getClinicName(
                          appointment
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        appointment.status
                      )}`}
                    >
                      {getStatusLabel(
                        appointment.status
                      )}
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="font-medium text-gray-500">
                        Data
                      </dt>

                      <dd className="mt-1 text-gray-900">
                        {formatDate(
                          date
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-gray-500">
                        Ora
                      </dt>

                      <dd className="mt-1 text-gray-900">
                        {formatTime(
                          time
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-gray-500">
                        Telefon
                      </dt>

                      <dd className="mt-1 text-gray-900">
                        {
                          appointment.patient_phone
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-gray-500">
                        E-mail
                      </dt>

                      <dd className="mt-1 break-all text-gray-900">
                        {
                          appointment.patient_email
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-gray-500">
                        Durată
                      </dt>

                      <dd className="mt-1 text-gray-900">
                        {appointment.duration_minutes
                          ? `${appointment.duration_minutes} minute`
                          : "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-gray-500">
                        Sursă
                      </dt>

                      <dd className="mt-1 text-gray-900">
                        {appointment.source ??
                          "—"}
                      </dd>
                    </div>
                  </dl>

                  {appointment.notes && (
                    <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                      <span className="font-semibold">
                        Observații:
                      </span>{" "}
                      {appointment.notes}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      disabled={
                        isSaving
                      }
                      onClick={() =>
                        updateAppointment(
                          appointment,
                          "confirm"
                        )
                      }
            size="sm"
                    >
                      Confirmă
                    </Button>

                    <Button
                      type="button"
                      disabled={
                        isSaving
                      }
                      onClick={() =>
                        updateAppointment(
                          appointment,
                          "reschedule"
                        )
                      }
            size="sm"
                    >
                      Reprogramează
                    </Button>

                    <Button
                      type="button"
                      disabled={
                        isSaving
                      }
                      onClick={() =>
                        updateAppointment(
                          appointment,
                          "complete"
                        )
                      }
            variant="secondary"
            size="sm"
                    >
                      Finalizează
                    </Button>

                    <Button
                      type="button"
                      disabled={
                        isSaving
                      }
                      onClick={() =>
                        updateAppointment(
                          appointment,
                          "cancel"
                        )
                      }
            variant="danger-outline"
            size="sm"
                    >
                      Anulează
                    </Button>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}