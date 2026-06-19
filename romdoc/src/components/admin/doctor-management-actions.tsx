"use client";

import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
} from "react";

type DoctorStatus =
  | "pending"
  | "active"
  | "suspended"
  | "rejected";

type DoctorManagementActionsProps = {
  doctorId: string;
  currentStatus: string;
  currentProfileId: string | null;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
};

function normalizeStatus(
  status: string
): DoctorStatus {
  if (
    status === "active" ||
    status === "suspended" ||
    status === "rejected"
  ) {
    return status;
  }

  return "pending";
}

export default function DoctorManagementActions({
  doctorId,
  currentStatus,
  currentProfileId,
}: DoctorManagementActionsProps) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [status, setStatus] =
    useState<DoctorStatus>(
      normalizeStatus(currentStatus)
    );

  const [profileId, setProfileId] =
    useState(currentProfileId ?? "");

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function sendUpdate(
    body: Record<string, unknown>
  ) {
    setMessage(null);
    setError(null);

    const response = await fetch(
      "/api/admin/doctors",
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          doctorId,
          ...body,
        }),
      }
    );

    const result =
      (await response.json()) as ApiResponse;

    if (!response.ok) {
      throw new Error(
        result.error ??
          "Modificarea nu a putut fi salvată."
      );
    }

    return result;
  }

  function handleStatusUpdate() {
    startTransition(async () => {
      try {
        await sendUpdate({
          action: "update_status",
          status,
        });

        setMessage(
          "Starea medicului a fost actualizată."
        );

        router.refresh();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Starea nu a putut fi actualizată."
        );
      }
    });
  }

  function handleAssignOwner() {
    const normalizedProfileId =
      profileId.trim();

    if (!normalizedProfileId) {
      setError(
        "Introdu UUID-ul profilului care va deține contul medicului."
      );

      return;
    }

    startTransition(async () => {
      try {
        await sendUpdate({
          action: "assign_owner",
          profileId:
            normalizedProfileId,
        });

        setMessage(
          "Profilul a fost asociat medicului."
        );

        router.refresh();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Profilul nu a putut fi asociat."
        );
      }
    });
  }

  function handleRemoveOwner() {
    const confirmed = window.confirm(
      "Sigur dorești să elimini asocierea dintre medic și contul autentificat?"
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await sendUpdate({
          action: "remove_owner",
        });

        setProfileId("");

        setMessage(
          "Asocierea contului a fost eliminată."
        );

        router.refresh();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Asocierea nu a putut fi eliminată."
        );
      }
    });
  }

  return (
    <div className="mt-6 space-y-5 border-t border-gray-200 pt-6">
      <div>
        <h3 className="font-semibold text-gray-900">
          Starea profilului
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          Controlează dacă profilul medicului poate fi utilizat în platformă.
        </p>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as DoctorStatus
              )
            }
            disabled={isPending}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60 sm:max-w-xs"
          >
            <option value="pending">
              În așteptare
            </option>

            <option value="active">
              Activ
            </option>

            <option value="suspended">
              Suspendat
            </option>

            <option value="rejected">
              Respins
            </option>
          </select>

          <button
            type="button"
            onClick={handleStatusUpdate}
            disabled={
              isPending ||
              status === currentStatus
            }
            className="rounded-xl bg-[#D97757] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvează starea
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-4">
        <h3 className="font-semibold text-gray-900">
          Contul medicului
        </h3>

        <p className="mt-1 text-sm leading-6 text-gray-600">
          Introdu UUID-ul unui profil cu rolul{" "}
          <strong>doctor</strong>. Un profil poate
          aparține unui singur medic.
        </p>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-700">
            Profile UUID
          </span>

          <input
            type="text"
            value={profileId}
            onChange={(event) =>
              setProfileId(
                event.target.value
              )
            }
            disabled={isPending}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            spellCheck={false}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-mono text-sm text-gray-900 outline-none transition focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAssignOwner}
            disabled={isPending}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {currentProfileId
              ? "Actualizează asocierea"
              : "Asociază profilul"}
          </button>

          {currentProfileId && (
            <button
              type="button"
              onClick={handleRemoveOwner}
              disabled={isPending}
              className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Elimină asocierea
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}
    </div>
  );
}