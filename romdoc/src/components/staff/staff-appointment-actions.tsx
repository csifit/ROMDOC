"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import Button from "@/components/ui/button";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type StaffAppointmentActionsProps = {
  appointmentId: string;
  currentStatus: string;
  requestedDate: string;

  requestedTime:
    | string
    | null;

  scheduledDate:
    | string
    | null;

  scheduledTime:
    | string
    | null;

  currentReason:
    | string
    | null;

  onUpdated:
    () =>
      void |
      Promise<void>;
};

type LifecycleResponse = {
  success?: boolean;
  message?: string;

  emailSent?:
    | boolean
    | null;

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
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "StaffOperationalDashboard.actions"
    );

  const [
    date,
    setDate,
  ] =
    useState(
      scheduledDate ??
      requestedDate
    );

  const [
    time,
    setTime,
  ] =
    useState(
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

  const [
    reason,
    setReason,
  ] =
    useState(
      currentReason ??
      ""
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(
      false
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );

  useEffect(() => {
    setDate(
      scheduledDate ??
      requestedDate
    );

    setTime(
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

    setReason(
      currentReason ??
      ""
    );
  }, [
    currentReason,
    requestedDate,
    requestedTime,
    scheduledDate,
    scheduledTime,
  ]);

  const terminalStatus =
    [
      "cancelled",
      "completed",
      "no_show",
    ].includes(
      currentStatus
    );

  const today =
    new Date()
      .toISOString()
      .split(
        "T"
      )[0];

  async function updateAppointment(
    action:
      LifecycleAction
  ) {
    setMessage(
      ""
    );

    setErrorMessage(
      ""
    );

    if (
      terminalStatus
    ) {
      setErrorMessage(
        t(
          "terminalError"
        )
      );

      return;
    }

    if (
      (
        action ===
          "confirm" ||
        action ===
          "reschedule"
      ) &&
      (
        !date ||
        !time
      )
    ) {
      setErrorMessage(
        t(
          "dateTimeRequired"
        )
      );

      return;
    }

    if (
      action ===
        "reschedule" &&
      reason.trim()
        .length < 3
    ) {
      setErrorMessage(
        t(
          "reasonRequired"
        )
      );

      return;
    }

    let transitionReason =
      reason.trim();

    if (
      action ===
        "cancel" ||
      action ===
        "complete" ||
      action ===
        "no_show"
    ) {
      const promptKey =
        action ===
        "cancel"
          ? "cancelPrompt"
          : action ===
              "complete"
            ? "completePrompt"
            : "noShowPrompt";

      const enteredReason =
        window.prompt(
          t(
            promptKey
          ),
          ""
        );

      if (
        enteredReason ===
        null
      ) {
        return;
      }

      transitionReason =
        enteredReason.trim();
    }

    setIsSaving(
      true
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
                  action ===
                    "confirm" ||
                  action ===
                    "reschedule"
                    ? date
                    : null,

                scheduledTime:
                  action ===
                    "confirm" ||
                  action ===
                    "reschedule"
                    ? time
                    : null,

                reason:
                  transitionReason ||
                  null,
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
          locale ===
            "ro" &&
          result.error
            ? result.error
            : t(
                "updateError"
              )
        );
      }

      const localizedSuccess =
        t(
          `success.${action}`
        );

      const baseMessage =
        locale ===
          "ro" &&
        result.message
          ? result.message
          : localizedSuccess;

      setMessage(
        result.emailSent ===
          false
          ? `${baseMessage} ${t(
              "emailWarning"
            )}`
          : baseMessage
      );

      await onUpdated();
    } catch (
      updateError
    ) {
      setErrorMessage(
        updateError instanceof
          Error
          ? updateError.message
          : t(
              "updateError"
            )
      );
    } finally {
      setIsSaving(
        false
      );
    }
  }

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const originalDate =
      scheduledDate ??
      requestedDate;

    const originalTime =
      scheduledTime?.slice(
        0,
        5
      ) ??
      requestedTime?.slice(
        0,
        5
      ) ??
      "";

    const slotChanged =
      date !==
        originalDate ||
      time !==
        originalTime;

    void updateAppointment(
      slotChanged
        ? "reschedule"
        : "confirm"
    );
  }

  if (
    terminalStatus
  ) {
    return (
      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        {t(
          "closed"
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900">
        {t(
          "title"
        )}
      </h3>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="block text-sm font-medium text-gray-700">
              {t(
                "confirmedDate"
              )}
            </span>

            <input
              type="date"
              min={
                today
              }
              value={
                date
              }
              onChange={(
                event
              ) =>
                setDate(
                  event.target
                    .value
                )
              }
              required
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
            />
          </label>

          <label>
            <span className="block text-sm font-medium text-gray-700">
              {t(
                "confirmedTime"
              )}
            </span>

            <input
              type="time"
              value={
                time
              }
              onChange={(
                event
              ) =>
                setTime(
                  event.target
                    .value
                )
              }
              required
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="block text-sm font-medium text-gray-700">
            {t(
              "rescheduleReason"
            )}
          </span>

          <textarea
            rows={
              3
            }
            maxLength={
              2000
            }
            value={
              reason
            }
            onChange={(
              event
            ) =>
              setReason(
                event.target
                  .value
              )
            }
            placeholder={t(
              "reasonPlaceholder"
            )}
            className="romdoc-focus-ring mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
          />
        </label>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {
              errorMessage
            }
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
            disabled={
              isSaving
            }
          >
            {isSaving
              ? t(
                  "saving"
                )
              : currentStatus ===
                  "pending"
                ? t(
                    "confirm"
                  )
                : t(
                    "saveDateTime"
                  )}
          </Button>

          <Button
            type="button"
            disabled={
              isSaving
            }
            onClick={() =>
              void updateAppointment(
                "complete"
              )
            }
            variant="secondary"
          >
            {t(
              "complete"
            )}
          </Button>

          <Button
            type="button"
            disabled={
              isSaving
            }
            onClick={() =>
              void updateAppointment(
                "no_show"
              )
            }
            variant="secondary"
          >
            {t(
              "noShow"
            )}
          </Button>

          <Button
            type="button"
            disabled={
              isSaving
            }
            onClick={() =>
              void updateAppointment(
                "cancel"
              )
            }
            variant="danger-outline"
          >
            {t(
              "cancel"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
