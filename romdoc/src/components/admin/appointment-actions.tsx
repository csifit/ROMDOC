"use client";

import {
  FormEvent,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import Button from "@/components/ui/button";

type AppointmentActionsProps = {
  appointmentId: string;
  currentStatus: string;
  requestedDate: string;
  requestedTime: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  currentReason: string | null;
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

type OpenForm =
  | "reschedule"
  | "cancel"
  | null;

function getDefaultDate({
  scheduledDate,
  requestedDate,
}: {
  scheduledDate: string | null;
  requestedDate: string;
}) {
  return (
    scheduledDate ??
    requestedDate
  );
}

function getDefaultTime({
  scheduledTime,
  requestedTime,
}: {
  scheduledTime: string | null;
  requestedTime: string | null;
}) {
  return (
    scheduledTime?.slice(0, 5) ??
    requestedTime?.slice(0, 5) ??
    ""
  );
}

export default function AppointmentActions({
  appointmentId,
  currentStatus,
  requestedDate,
  requestedTime,
  scheduledDate,
  scheduledTime,
  currentReason,
}: AppointmentActionsProps) {
  const router =
    useRouter();

  const [
    date,
    setDate,
  ] = useState(
    getDefaultDate({
      scheduledDate,
      requestedDate,
    })
  );

  const [
    time,
    setTime,
  ] = useState(
    getDefaultTime({
      scheduledTime,
      requestedTime,
    })
  );

  const [
    rescheduleReason,
    setRescheduleReason,
  ] = useState(
    currentReason ?? ""
  );

  const [
    cancellationReason,
    setCancellationReason,
  ] = useState("");

  const [
    openForm,
    setOpenForm,
  ] = useState<OpenForm>(
    null
  );

  const [
    activeAction,
    setActiveAction,
  ] =
    useState<LifecycleAction | null>(
      null
    );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const terminalStatus = [
    "cancelled",
    "completed",
    "no_show",
  ].includes(
    currentStatus
  );

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const isSaving =
    activeAction !== null;

  function resetMessages() {
    setMessage("");
    setErrorMessage("");
  }

  function closeForms() {
    setOpenForm(null);
    setCancellationReason(
      ""
    );
  }

  async function updateAppointment({
    action,
    reason = null,
    actionDate = null,
    actionTime = null,
  }: {
    action: LifecycleAction;
    reason?: string | null;
    actionDate?: string | null;
    actionTime?: string | null;
  }) {
    resetMessages();

    if (
      terminalStatus
    ) {
      setErrorMessage(
        "Această programare este într-o stare finală și nu mai poate fi modificată."
      );

      return;
    }

    setActiveAction(
      action
    );

    try {
      const response =
        await fetch(
          "/api/appointments/lifecycle",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                appointmentId,
                action,
                scheduledDate:
                  actionDate,
                scheduledTime:
                  actionTime,
                reason:
                  reason || null,
              }),
          }
        );

      const result =
        (await response.json()) as
          LifecycleResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Programarea nu a putut fi actualizată."
        );
      }

      setMessage(
        result.emailSent ===
          false
          ? `${result.message ?? "Programarea a fost actualizată."} E-mailul pacientului nu a putut fi trimis.`
          : result.message ??
              "Programarea a fost actualizată."
      );

      closeForms();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Programarea nu a putut fi actualizată."
      );
    } finally {
      setActiveAction(
        null
      );
    }
  }

  async function confirmAppointment() {
    if (
      !date ||
      !time
    ) {
      setErrorMessage(
        "Programarea nu are încă o dată și o oră valide."
      );

      return;
    }

    await updateAppointment({
      action:
        "confirm",
      actionDate:
        date,
      actionTime:
        time,
    });
  }

  async function completeAppointment() {
    const confirmed =
      window.confirm(
        "Marchezi această programare ca finalizată?"
      );

    if (!confirmed) {
      return;
    }

    await updateAppointment({
      action:
        "complete",
    });
  }

  async function markNoShow() {
    const confirmed =
      window.confirm(
        "Confirmi că pacientul nu s-a prezentat?"
      );

    if (!confirmed) {
      return;
    }

    await updateAppointment({
      action:
        "no_show",
    });
  }

  async function submitReschedule(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    resetMessages();

    if (
      !date ||
      !time
    ) {
      setErrorMessage(
        "Selectează data și ora programării."
      );

      return;
    }

    const originalDate =
      getDefaultDate({
        scheduledDate,
        requestedDate,
      });

    const originalTime =
      getDefaultTime({
        scheduledTime,
        requestedTime,
      });

    if (
      date === originalDate &&
      time === originalTime
    ) {
      setErrorMessage(
        "Pentru reprogramare trebuie să alegi o dată sau o oră diferită."
      );

      return;
    }

    if (
      rescheduleReason
        .trim()
        .length < 3
    ) {
      setErrorMessage(
        "Adaugă motivul reprogramării."
      );

      return;
    }

    await updateAppointment({
      action:
        "reschedule",
      actionDate:
        date,
      actionTime:
        time,
      reason:
        rescheduleReason.trim(),
    });
  }

  async function submitCancellation(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const confirmed =
      window.confirm(
        "Sigur dorești să anulezi această programare?"
      );

    if (!confirmed) {
      return;
    }

    await updateAppointment({
      action:
        "cancel",
      reason:
        cancellationReason
          .trim() ||
        null,
    });
  }

  if (
    terminalStatus
  ) {
    return (
      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        Programarea este închisă și nu mai poate fi modificată.
      </div>
    );
  }

  return (
    <section className="mt-6 border-t border-gray-200 pt-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Acțiuni rapide
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Folosește acțiunile frecvente fără a deschide un formular mare.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentStatus ===
            "pending" && (
            <Button
              type="button"
              disabled={
                isSaving
              }
              onClick={() =>
                void confirmAppointment()
              }
            >
              {activeAction ===
              "confirm"
                ? "Se confirmă..."
                : "Confirmă"}
            </Button>
          )}

          {[
            "confirmed",
            "rescheduled",
          ].includes(
            currentStatus
          ) && (
            <Button
              type="button"
              disabled={
                isSaving
              }
              onClick={() =>
                void completeAppointment()
              }
            >
              {activeAction ===
              "complete"
                ? "Se salvează..."
                : "Finalizată"}
            </Button>
          )}

          <Button
            type="button"
            disabled={
              isSaving
            }
            variant="secondary"
            onClick={() => {
              resetMessages();
              setOpenForm(
                openForm ===
                  "reschedule"
                  ? null
                  : "reschedule"
              );
            }}
          >
            Reprogramează
          </Button>

          {[
            "confirmed",
            "rescheduled",
          ].includes(
            currentStatus
          ) && (
            <Button
              type="button"
              disabled={
                isSaving
              }
              variant="secondary"
              onClick={() =>
                void markNoShow()
              }
            >
              {activeAction ===
              "no_show"
                ? "Se salvează..."
                : "Neprezentare"}
            </Button>
          )}

          <Button
            type="button"
            disabled={
              isSaving
            }
            variant="danger-outline"
            onClick={() => {
              resetMessages();
              setOpenForm(
                openForm ===
                  "cancel"
                  ? null
                  : "cancel"
              );
            }}
          >
            Anulează
          </Button>
        </div>
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

      {openForm ===
        "reschedule" && (
        <form
          onSubmit={
            submitReschedule
          }
          className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h4 className="font-semibold text-blue-950">
                Reprogramează
              </h4>

              <p className="mt-1 text-sm text-blue-800">
                Alege noua dată și oră și explică motivul schimbării.
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeForms
              }
              className="romdoc-focus-ring w-fit rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-white"
            >
              Închide
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="block text-sm font-medium text-blue-950">
                Data nouă
              </span>

              <input
                type="date"
                min={today}
                value={
                  date
                }
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
                required
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900"
              />
            </label>

            <label>
              <span className="block text-sm font-medium text-blue-950">
                Ora nouă
              </span>

              <input
                type="time"
                value={
                  time
                }
                onChange={(event) =>
                  setTime(
                    event.target.value
                  )
                }
                required
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="block text-sm font-medium text-blue-950">
              Motivul reprogramării
            </span>

            <textarea
              rows={3}
              maxLength={2000}
              value={
                rescheduleReason
              }
              onChange={(event) =>
                setRescheduleReason(
                  event.target.value
                )
              }
              placeholder="Exemplu: medicul nu este disponibil la ora stabilită."
              required
              className="romdoc-focus-ring mt-2 w-full resize-y rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={
                isSaving
              }
            >
              {activeAction ===
              "reschedule"
                ? "Se salvează..."
                : "Salvează reprogramarea"}
            </Button>

            <Button
              type="button"
              disabled={
                isSaving
              }
              variant="secondary"
              onClick={
                closeForms
              }
            >
              Renunță
            </Button>
          </div>
        </form>
      )}

      {openForm ===
        "cancel" && (
        <form
          onSubmit={
            submitCancellation
          }
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h4 className="font-semibold text-red-950">
                Anulează programarea
              </h4>

              <p className="mt-1 text-sm text-red-800">
                Motivul este opțional. Vei confirma anularea înainte de salvare.
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeForms
              }
              className="romdoc-focus-ring w-fit rounded-lg px-3 py-2 text-sm font-semibold text-red-800 hover:bg-white"
            >
              Închide
            </button>
          </div>

          <label className="mt-4 block">
            <span className="block text-sm font-medium text-red-950">
              Motivul anulării
            </span>

            <textarea
              rows={3}
              maxLength={2000}
              value={
                cancellationReason
              }
              onChange={(event) =>
                setCancellationReason(
                  event.target.value
                )
              }
              placeholder="Opțional"
              className="romdoc-focus-ring mt-2 w-full resize-y rounded-xl border border-red-200 bg-white px-4 py-3 text-gray-900"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={
                isSaving
              }
              variant="danger-outline"
            >
              {activeAction ===
              "cancel"
                ? "Se anulează..."
                : "Confirmă anularea"}
            </Button>

            <Button
              type="button"
              disabled={
                isSaving
              }
              variant="secondary"
              onClick={
                closeForms
              }
            >
              Renunță
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
