"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Button from "@/components/ui/button";

type StaffAppointmentActionsProps = {
  appointmentId: string;
  currentStatus: string;
  requestedDate: string;
  requestedTime: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  currentReason: string | null;
  onUpdated: () => void | Promise<void>;
};

type LifecycleResponse = {
  success?: boolean;
  message?: string;
  emailSent?: boolean | null;
  error?: string;
};

type LifecycleAction =
  | "confirm"
  | "reschedule"
  | "cancel"
  | "complete"
  | "no_show";

export default function StaffAppointmentActions({
  appointmentId,
  currentStatus,
  requestedDate,
  requestedTime,
  scheduledDate,
  scheduledTime,
  currentReason,
  onUpdated,
}: StaffAppointmentActionsProps) {
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

  useEffect(() => {
    const timerId = window.setTimeout(() => {
    setDate(
      scheduledDate ?? requestedDate
    );

    setTime(
      scheduledTime?.slice(0, 5) ??
        requestedTime?.slice(0, 5) ??
        ""
    );

    setReason(currentReason ?? "");
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    currentReason,
    requestedDate,
    requestedTime,
    scheduledDate,
    scheduledTime,
  ]);

  const terminalStatus = [
    "cancelled",
    "completed",
    "no_show",
  ].includes(currentStatus);

  const today =
    new Date().toISOString().split("T")[0];

  async function updateAppointment(
    action: LifecycleAction
  ) {
    setMessage("");
    setErrorMessage("");

    if (terminalStatus) {
      setErrorMessage(
        "AceastÄƒ programare este Ã®ntr-o stare finalÄƒ È™i nu mai poate fi modificatÄƒ."
      );
      return;
    }

    if (
      (
        action === "confirm" ||
        action === "reschedule"
      ) &&
      (!date || !time)
    ) {
      setErrorMessage(
        "SelecteazÄƒ data È™i ora programÄƒrii."
      );
      return;
    }

    if (
      action === "reschedule" &&
      reason.trim().length < 3
    ) {
      setErrorMessage(
        "AdaugÄƒ motivul reprogramÄƒrii."
      );
      return;
    }

    let transitionReason =
      reason.trim();

    if (
      action === "cancel" ||
      action === "complete" ||
      action === "no_show"
    ) {
      const label =
        action === "cancel"
          ? "Motivul anulÄƒrii â€” opÈ›ional:"
          : action === "complete"
            ? "NotÄƒ operaÈ›ionalÄƒ â€” opÈ›ional:"
            : "NotÄƒ despre neprezentare â€” opÈ›ional:";

      const enteredReason =
        window.prompt(label, "");

      if (enteredReason === null) {
        return;
      }

      transitionReason =
        enteredReason.trim();
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/appointments/lifecycle",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            appointmentId,
            action,
            scheduledDate:
              action === "confirm" ||
              action === "reschedule"
                ? date
                : null,
            scheduledTime:
              action === "confirm" ||
              action === "reschedule"
                ? time
                : null,
            reason:
              transitionReason || null,
          }),
        }
      );

      const result =
        (await response.json()) as
          LifecycleResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Programarea nu a putut fi actualizatÄƒ."
        );
      }

      setMessage(
        result.emailSent === false
          ? `${result.message ?? "Programarea a fost actualizatÄƒ."} E-mailul pacientului nu a putut fi trimis.`
          : result.message ??
              "Programarea a fost actualizatÄƒ."
      );

      await onUpdated();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Programarea nu a putut fi actualizatÄƒ."
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

    const slotChanged =
      date !== originalDate ||
      time !== originalTime;

    void updateAppointment(
      slotChanged
        ? "reschedule"
        : "confirm"
    );
  }

  if (terminalStatus) {
    return (
      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        Programarea este Ã®nchisÄƒ È™i nu mai poate fi modificatÄƒ.
      </div>
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
              htmlFor={`staff-scheduled-date-${appointmentId}`}
              className="block text-sm font-medium text-gray-700"
            >
              Data confirmatÄƒ
            </label>

            <input
              id={`staff-scheduled-date-${appointmentId}`}
              type="date"
              min={today}
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              required
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor={`staff-scheduled-time-${appointmentId}`}
              className="block text-sm font-medium text-gray-700"
            >
              Ora confirmatÄƒ
            </label>

            <input
              id={`staff-scheduled-time-${appointmentId}`}
              type="time"
              value={time}
              onChange={(event) =>
                setTime(event.target.value)
              }
              required
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
            />
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor={`staff-reschedule-reason-${appointmentId}`}
            className="block text-sm font-medium text-gray-700"
          >
            Motivul reprogramÄƒrii
          </label>

          <textarea
            id={`staff-reschedule-reason-${appointmentId}`}
            rows={3}
            maxLength={2000}
            value={reason}
            onChange={(event) =>
              setReason(event.target.value)
            }
            placeholder="CompleteazÄƒ acest cÃ¢mp dacÄƒ modifici data sau ora."
            className="romdoc-focus-ring mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
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
          <Button
            type="submit"
            disabled={isSaving}
          >
            {isSaving
              ? "Se salveazÄƒ..."
              : currentStatus === "pending"
                ? "ConfirmÄƒ programarea"
                : "SalveazÄƒ data È™i ora"}
          </Button>

          <Button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void updateAppointment(
                "complete"
              )
            }
            variant="secondary"
          >
            MarcheazÄƒ finalizatÄƒ
          </Button>

          <Button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void updateAppointment(
                "no_show"
              )
            }
            variant="secondary"
          >
            MarcheazÄƒ neprezentare
          </Button>

          <Button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void updateAppointment(
                "cancel"
              )
            }
            variant="danger-outline"
          >
            AnuleazÄƒ
          </Button>
        </div>
      </form>
    </div>
  );
}

