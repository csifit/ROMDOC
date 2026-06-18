"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type AppointmentActionsProps = {
  appointmentId: string;
  currentStatus: string;
  requestedDate: string;
  requestedTime: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  currentReason: string | null;
};

type AppointmentUpdateStatus =
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled";

type AppointmentUpdateResponse = {
  success?: boolean;
  error?: string;
};

export default function AppointmentActions({
  appointmentId,
  currentStatus,
  requestedDate,
  requestedTime,
  scheduledDate,
  scheduledTime,
  currentReason,
}: AppointmentActionsProps) {
  const router = useRouter();

  const [date, setDate] = useState(
    scheduledDate ?? requestedDate
  );

  const [time, setTime] = useState(
    scheduledTime?.slice(0, 5) ??
      requestedTime?.slice(0, 5) ??
      ""
  );

  const [reason, setReason] = useState(
    currentReason ?? ""
  );

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const today = new Date()
    .toISOString()
    .split("T")[0];

  async function updateAppointment(
    status: AppointmentUpdateStatus
  ) {
    setMessage("");
    setErrorMessage("");

    if (
      (status === "confirmed" ||
        status === "rescheduled") &&
      (!date || !time)
    ) {
      setErrorMessage(
        "Selectează data și ora programării."
      );

      return;
    }

    if (
      status === "rescheduled" &&
      reason.trim().length < 3
    ) {
      setErrorMessage(
        "Adaugă motivul reprogramării."
      );

      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/appointments",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appointmentId,
            status,
            scheduledDate:
              status === "confirmed" ||
              status === "rescheduled"
                ? date
                : null,
            scheduledTime:
              status === "confirmed" ||
              status === "rescheduled"
                ? time
                : null,
            rescheduleReason:
              status === "rescheduled"
                ? reason.trim()
                : null,
          }),
        }
      );

      const result =
        (await response.json()) as AppointmentUpdateResponse;

      if (!response.ok) {
        setErrorMessage(
          result.error ??
            "Programarea nu a putut fi actualizată."
        );

        return;
      }

      const successMessages: Record<
        AppointmentUpdateStatus,
        string
      > = {
        confirmed:
          "Programarea a fost confirmată.",
        rescheduled:
          "Programarea a fost reprogramată.",
        completed:
          "Programarea a fost marcată ca finalizată.",
        cancelled:
          "Programarea a fost anulată.",
      };

      setMessage(successMessages[status]);
      router.refresh();
    } catch (error) {
      console.error(
        "Appointment update request failed:",
        error
      );

      setErrorMessage(
        "Nu s-a putut comunica cu serverul. Încearcă din nou."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const originalDate =
      scheduledDate ?? requestedDate;

    const originalTime =
      scheduledTime?.slice(0, 5) ??
      requestedTime?.slice(0, 5) ??
      "";

    const appointmentSlotChanged =
      date !== originalDate ||
      time !== originalTime;

    updateAppointment(
      appointmentSlotChanged
        ? "rescheduled"
        : "confirmed"
    );
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Gestionare programare
      </h3>

      <form
        onSubmit={handleSubmit}
        className="mt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`scheduled-date-${appointmentId}`}
              className="block text-sm font-medium text-gray-700"
            >
              Data confirmată
            </label>

            <input
              id={`scheduled-date-${appointmentId}`}
              type="date"
              min={today}
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              required
              disabled={isSaving}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor={`scheduled-time-${appointmentId}`}
              className="block text-sm font-medium text-gray-700"
            >
              Ora confirmată
            </label>

            <input
              id={`scheduled-time-${appointmentId}`}
              type="time"
              value={time}
              onChange={(event) =>
                setTime(event.target.value)
              }
              required
              disabled={isSaving}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor={`reschedule-reason-${appointmentId}`}
            className="block text-sm font-medium text-gray-700"
          >
            Motivul reprogramării
          </label>

          <textarea
            id={`reschedule-reason-${appointmentId}`}
            rows={3}
            value={reason}
            onChange={(event) =>
              setReason(event.target.value)
            }
            disabled={isSaving}
            placeholder="Completează acest câmp dacă modifici data sau ora solicitată."
            className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {message}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-[#D97757] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Se salvează..."
              : currentStatus === "pending"
                ? "Confirmă programarea"
                : "Salvează data și ora"}
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              updateAppointment("completed")
            }
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Marchează finalizată
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              updateAppointment("cancelled")
            }
            className="rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Anulează
          </button>
        </div>
      </form>
    </div>
  );
}