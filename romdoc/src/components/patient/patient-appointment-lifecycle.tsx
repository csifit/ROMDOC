"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import AppointmentTimeline from "@/components/appointments/appointment-timeline";

type PatientAppointmentLifecycleProps = {
  appointmentId: string;
  status: string;
  appointmentDate: string;
  appointmentTime: string | null;
};

type ApiResponse = {
  error?: string;
};

export default function PatientAppointmentLifecycle({
  appointmentId,
  status,
  appointmentDate,
  appointmentTime,
}: PatientAppointmentLifecycleProps) {
  const router =
    useRouter();

  const [
    isCancelling,
    setIsCancelling,
  ] =
    useState(false);

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    showCancellation,
    setShowCancellation,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const canCancel =
    useMemo(() => {
      if (
        ![
          "pending",
          "confirmed",
          "rescheduled",
        ].includes(
          status
        )
      ) {
        return false;
      }

      if (
        !appointmentDate ||
        !appointmentTime
      ) {
        return false;
      }

      const start =
        new Date(
          `${appointmentDate}T${appointmentTime.slice(
            0,
            5
          )}:00`
        );

      return (
        !Number.isNaN(
          start.getTime()
        ) &&
        start.getTime() >
          Date.now()
      );
    }, [
      appointmentDate,
      appointmentTime,
      status,
    ]);

  async function cancelAppointment() {
    if (
      !canCancel ||
      isCancelling
    ) {
      return;
    }

    setIsCancelling(
      true
    );

    setMessage(
      ""
    );

    setError(
      ""
    );

    try {
      const response =
        await fetch(
          `/api/patient/appointments/${appointmentId}`,
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                reason:
                  reason.trim() ||
                  null,
              }),
          }
        );

      const payload =
        (await response.json()) as
          ApiResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          payload.error ??
            "Programarea nu a putut fi anulată."
        );
      }

      setMessage(
        "Programarea a fost anulată."
      );

      setShowCancellation(
        false
      );

      setReason(
        ""
      );

      router.refresh();
    } catch (
      cancelError
    ) {
      setError(
        cancelError instanceof
          Error
          ? cancelError.message
          : "Programarea nu a putut fi anulată."
      );
    } finally {
      setIsCancelling(
        false
      );
    }
  }

  return (
    <div className="mt-[21px] border-t border-gray-200 pt-[21px]">
      {canCancel && (
        <div>
          <button
            type="button"
            onClick={() =>
              setShowCancellation(
                (
                  current
                ) =>
                  !current
              )
            }
            className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] border border-red-300 px-[13px] py-[8px] text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Anulează programarea
          </button>
        </div>
      )}

      {showCancellation &&
        canCancel && (
          <div className="mt-[13px] rounded-[21px] border border-red-200 bg-red-50 p-[21px]">
            <label
              htmlFor={`cancellation-reason-${appointmentId}`}
              className="text-sm font-semibold text-red-900"
            >
              Motivul anulării — opțional
            </label>

            <textarea
              id={`cancellation-reason-${appointmentId}`}
              value={
                reason
              }
              onChange={(
                event
              ) =>
                setReason(
                  event.target.value
                )
              }
              maxLength={
                1000
              }
              rows={3}
              className="romdoc-focus-ring mt-[8px] block w-full rounded-[13px] border border-red-200 bg-white px-[13px] py-[13px] text-sm text-gray-900"
              placeholder="Poți transmite un motiv scurt clinicii."
            />

            <p className="mt-[5px] text-xs text-red-700">
              {
                reason.length
              }{" "}
              / 1000
            </p>

            <div className="mt-[13px] flex flex-wrap gap-[8px]">
              <button
                type="button"
                onClick={() =>
                  void cancelAppointment()
                }
                disabled={
                  isCancelling
                }
                className="romdoc-focus-ring inline-flex min-h-[55px] items-center rounded-[13px] bg-red-700 px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
              >
                {isCancelling
                  ? "Se anulează..."
                  : "Confirmă anularea"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCancellation(
                    false
                  );

                  setReason(
                    ""
                  );

                  setError(
                    ""
                  );
                }}
                disabled={
                  isCancelling
                }
                className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700"
              >
                Renunță
              </button>
            </div>
          </div>
        )}

      {message && (
        <div
          role="status"
          className="mt-[13px] rounded-[13px] border border-emerald-200 bg-emerald-50 px-[13px] py-[13px] text-sm text-emerald-800"
        >
          {
            message
          }
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-800"
        >
          {
            error
          }
        </div>
      )}

      <AppointmentTimeline
        appointmentId={
          appointmentId
        }
      />
    </div>
  );
}
