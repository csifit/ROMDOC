"use client";

import {
  type FormEvent,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import Button from "@/components/ui/button";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

export type AppointmentActionsCopy = {
  terminalError: string;
  updateError: string;
  updated: string;
  emailFailed: (
    message: string
  ) => string;
  invalidDateTime: string;
  confirmComplete: string;
  confirmNoShow: string;
  selectDateTime: string;
  differentSlot: string;
  reasonRequired: string;
  confirmCancel: string;
  closed: string;
  title: string;
  description: string;
  confirming: string;
  confirm: string;
  saving: string;
  complete: string;
  reschedule: string;
  noShow: string;
  cancel: string;
  rescheduleTitle: string;
  rescheduleDescription: string;
  close: string;
  newDate: string;
  newTime: string;
  rescheduleReason: string;
  reschedulePlaceholder: string;
  saveReschedule: string;
  dismiss: string;
  cancelTitle: string;
  cancelDescription: string;
  cancellationReason: string;
  optional: string;
  cancelling: string;
  confirmCancellation: string;
};

type AppointmentActionsProps = {
  appointmentId: string;
  currentStatus: string;
  requestedDate: string;
  requestedTime: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  currentReason: string | null;
  locale?: AppLocale;
  copy?: AppointmentActionsCopy;
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

const DEFAULT_COPY:
  AppointmentActionsCopy = {
    terminalError:
      "Această programare este într-o stare finală și nu mai poate fi modificată.",
    updateError:
      "Programarea nu a putut fi actualizată.",
    updated:
      "Programarea a fost actualizată.",
    emailFailed:
      (message) =>
        `${message} E-mailul pacientului nu a putut fi trimis.`,
    invalidDateTime:
      "Programarea nu are încă o dată și o oră valide.",
    confirmComplete:
      "Marchezi această programare ca finalizată?",
    confirmNoShow:
      "Confirmi că pacientul nu s-a prezentat?",
    selectDateTime:
      "Selectează data și ora programării.",
    differentSlot:
      "Pentru reprogramare trebuie să alegi o dată sau o oră diferită.",
    reasonRequired:
      "Adaugă motivul reprogramării.",
    confirmCancel:
      "Sigur dorești să anulezi această programare?",
    closed:
      "Programarea este închisă și nu mai poate fi modificată.",
    title:
      "Acțiuni rapide",
    description:
      "Folosește acțiunile frecvente fără a deschide un formular mare.",
    confirming:
      "Se confirmă...",
    confirm:
      "Confirmă",
    saving:
      "Se salvează...",
    complete:
      "Finalizată",
    reschedule:
      "Reprogramează",
    noShow:
      "Neprezentare",
    cancel:
      "Anulează",
    rescheduleTitle:
      "Reprogramează programarea",
    rescheduleDescription:
      "Alege noua dată și oră și explică motivul modificării.",
    close:
      "Închide",
    newDate:
      "Data nouă",
    newTime:
      "Ora nouă",
    rescheduleReason:
      "Motivul reprogramării",
    reschedulePlaceholder:
      "Explică pe scurt motivul reprogramării.",
    saveReschedule:
      "Salvează reprogramarea",
    dismiss:
      "Renunță",
    cancelTitle:
      "Anulează programarea",
    cancelDescription:
      "Pacientul va fi informat despre anulare.",
    cancellationReason:
      "Motivul anulării",
    optional:
      "Opțional",
    cancelling:
      "Se anulează...",
    confirmCancellation:
      "Confirmă anularea",
  };

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
    scheduledTime?.slice(
      0,
      5
    ) ??
    requestedTime?.slice(
      0,
      5
    ) ??
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
  locale = "ro",
  copy = DEFAULT_COPY,
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
  ] = useState<
    LifecycleAction | null
  >(null);

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
    setCancellationReason("");
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
        copy.terminalError
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

      if (
        !response.ok
      ) {
        throw new Error(
          locale === "ro" &&
          result.error
            ? result.error
            : copy.updateError
        );
      }

      const baseMessage =
        locale === "ro" &&
        result.message
          ? result.message
          : copy.updated;

      setMessage(
        result.emailSent ===
          false
          ? copy.emailFailed(
              baseMessage
            )
          : baseMessage
      );

      closeForms();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : copy.updateError
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
        copy.invalidDateTime
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
    if (
      !window.confirm(
        copy.confirmComplete
      )
    ) {
      return;
    }

    await updateAppointment({
      action:
        "complete",
    });
  }

  async function markNoShow() {
    if (
      !window.confirm(
        copy.confirmNoShow
      )
    ) {
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
        copy.selectDateTime
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
      date ===
        originalDate &&
      time ===
        originalTime
    ) {
      setErrorMessage(
        copy.differentSlot
      );
      return;
    }

    if (
      rescheduleReason
        .trim()
        .length < 3
    ) {
      setErrorMessage(
        copy.reasonRequired
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
        rescheduleReason
          .trim(),
    });
  }

  async function submitCancellation(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !window.confirm(
        copy.confirmCancel
      )
    ) {
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
        {copy.closed}
      </div>
    );
  }

  return (
    <section className="mt-6 border-t border-gray-200 pt-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {copy.title}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {copy.description}
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
                ? copy.confirming
                : copy.confirm}
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
                ? copy.saving
                : copy.complete}
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
            {copy.reschedule}
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
                ? copy.saving
                : copy.noShow}
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
            {copy.cancel}
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
                {
                  copy.rescheduleTitle
                }
              </h4>

              <p className="mt-1 text-sm text-blue-800">
                {
                  copy.rescheduleDescription
                }
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeForms
              }
              className="romdoc-focus-ring w-fit rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-white"
            >
              {copy.close}
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="block text-sm font-medium text-blue-950">
                {copy.newDate}
              </span>

              <input
                type="date"
                min={today}
                value={date}
                onChange={(
                  event
                ) =>
                  setDate(
                    event.target
                      .value
                  )
                }
                required
                className="romdoc-input mt-2"
              />
            </label>

            <label>
              <span className="block text-sm font-medium text-blue-950">
                {copy.newTime}
              </span>

              <input
                type="time"
                value={time}
                onChange={(
                  event
                ) =>
                  setTime(
                    event.target
                      .value
                  )
                }
                required
                className="romdoc-input mt-2"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="block text-sm font-medium text-blue-950">
              {
                copy.rescheduleReason
              }
            </span>

            <textarea
              rows={3}
              maxLength={
                2000
              }
              value={
                rescheduleReason
              }
              onChange={(
                event
              ) =>
                setRescheduleReason(
                  event.target
                    .value
                )
              }
              placeholder={
                copy.reschedulePlaceholder
              }
              required
              className="romdoc-textarea mt-2"
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
                ? copy.saving
                : copy.saveReschedule}
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
              {copy.dismiss}
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
                {
                  copy.cancelTitle
                }
              </h4>

              <p className="mt-1 text-sm text-red-800">
                {
                  copy.cancelDescription
                }
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeForms
              }
              className="romdoc-focus-ring w-fit rounded-lg px-3 py-2 text-sm font-semibold text-red-800 hover:bg-white"
            >
              {copy.close}
            </button>
          </div>

          <label className="mt-4 block">
            <span className="block text-sm font-medium text-red-950">
              {
                copy.cancellationReason
              }
            </span>

            <textarea
              rows={3}
              maxLength={
                2000
              }
              value={
                cancellationReason
              }
              onChange={(
                event
              ) =>
                setCancellationReason(
                  event.target
                    .value
                )
              }
              placeholder={
                copy.optional
              }
              className="romdoc-textarea mt-2"
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
                ? copy.cancelling
                : copy.confirmCancellation}
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
              {copy.dismiss}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
