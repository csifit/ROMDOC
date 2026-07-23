"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";

type Props = {
  relationshipId: string;
  doctorName: string;
  currentStatus: string;
  pauseReason: string | null;
  pausedAt: string | null;
  locale: AppLocale;
  disabled?: boolean;
};

type ApiResponse = {
  message?: string;
  error?: string;
};

const DATE_LOCALE = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
} as const;

const COPY = {
  ro: {
    suspend: "Suspendă medicul",
    reactivate: "Reactivează medicul",
    title: "Suspendare în organizație",
    description:
      "Suspendarea oprește relația operațională cu această organizație. Contul și profilul RomDoc al medicului nu sunt șterse și nu sunt suspendate global.",
    comment: "Comentariu",
    optional: "Opțional",
    placeholder: "Motiv intern pentru suspendare",
    cancel: "Renunță",
    confirm: "Confirmă suspendarea",
    saving: "Se salvează...",
    lastSuspension: "Ultima suspendare",
    reason: "Comentariu",
    genericError: "Acțiunea nu a putut fi finalizată.",
    confirmReactivate: "Reactivezi acest medic în organizație?",
  },
  en: {
    suspend: "Suspend Doctor",
    reactivate: "Reactivate Doctor",
    title: "Organisation suspension",
    description:
      "Suspension stops the operational relationship with this organisation. The Doctor's RomDoc account and profile are not deleted or globally suspended.",
    comment: "Comment",
    optional: "Optional",
    placeholder: "Internal reason for suspension",
    cancel: "Cancel",
    confirm: "Confirm suspension",
    saving: "Saving...",
    lastSuspension: "Last suspension",
    reason: "Comment",
    genericError: "The action could not be completed.",
    confirmReactivate: "Reactivate this Doctor in the organisation?",
  },
  de: {
    suspend: "Arzt sperren",
    reactivate: "Arzt reaktivieren",
    title: "Sperrung in der Organisation",
    description:
      "Die Sperrung beendet die operative Beziehung zu dieser Organisation. Das RomDoc-Konto und das Profil des Arztes werden nicht gelöscht oder global gesperrt.",
    comment: "Kommentar",
    optional: "Optional",
    placeholder: "Interner Grund für die Sperrung",
    cancel: "Abbrechen",
    confirm: "Sperrung bestätigen",
    saving: "Wird gespeichert...",
    lastSuspension: "Letzte Sperrung",
    reason: "Kommentar",
    genericError: "Die Aktion konnte nicht abgeschlossen werden.",
    confirmReactivate:
      "Diesen Arzt in der Organisation reaktivieren?",
  },
} satisfies Record<AppLocale, Record<string, string>>;

export default function DoctorCoverageSuspensionControl({
  relationshipId,
  doctorName,
  currentStatus,
  pauseReason,
  pausedAt,
  locale,
  disabled = false,
}: Props) {
  const router = useRouter();
  const copy = COPY[locale];

  const [formOpen, setFormOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isSuspended = currentStatus === "paused";

  function formatDate(value: string | null) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function updateCoverage(
    action: "suspend" | "reactivate"
  ) {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/clinic-manager/doctor-coverage",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            relationshipId,
            action,
            comment: action === "suspend" ? comment : null,
            locale,
          }),
        }
      );

      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(result.error ?? copy.genericError);
      }

      setSuccess(result.message ?? "");
      setFormOpen(false);
      setComment("");
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : copy.genericError
      );
    } finally {
      setIsSaving(false);
    }
  }

  function submitSuspend(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void updateCoverage("suspend");
  }

  function reactivate() {
    if (!window.confirm(copy.confirmReactivate)) {
      return;
    }

    void updateCoverage("reactivate");
  }

  if (disabled) {
    return null;
  }

  return (
    <div className="mt-[8px]">
      {isSuspended ? (
        <div className="rounded-[8px] border border-orange-200 bg-orange-50 p-[8px] text-xs text-orange-900">
          <p className="font-semibold">
            {copy.lastSuspension}: {formatDate(pausedAt)}
          </p>
          {pauseReason && (
            <p className="mt-[5px]">
              {copy.reason}: {pauseReason}
            </p>
          )}
          <button
            type="button"
            disabled={isSaving}
            onClick={reactivate}
            className="romdoc-focus-ring mt-[8px] rounded-[8px] border border-green-300 bg-white px-[8px] py-[5px] font-semibold text-green-800 hover:bg-green-50 disabled:opacity-60"
          >
            {isSaving ? copy.saving : copy.reactivate}
          </button>
        </div>
      ) : formOpen ? (
        <form
          onSubmit={submitSuspend}
          className="rounded-[8px] border border-red-200 bg-red-50 p-[8px] text-xs text-red-900"
        >
          <p className="font-semibold">
            {copy.title}: {doctorName}
          </p>
          <p className="mt-[5px] leading-5">
            {copy.description}
          </p>

          <label className="mt-[8px] block">
            <span className="font-semibold">
              {copy.comment}{" "}
              <span className="font-normal text-red-700">
                ({copy.optional})
              </span>
            </span>
            <textarea
              rows={3}
              maxLength={1000}
              value={comment}
              disabled={isSaving}
              onChange={(event) => setComment(event.target.value)}
              placeholder={copy.placeholder}
              className="romdoc-focus-ring mt-[5px] w-full rounded-[8px] border border-red-200 bg-white px-[8px] py-[8px] text-gray-900"
            />
          </label>

          <div className="mt-[8px] flex flex-wrap gap-[8px]">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setFormOpen(false)}
              className="romdoc-focus-ring rounded-[8px] border border-gray-300 bg-white px-[8px] py-[5px] font-semibold text-gray-700"
            >
              {copy.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="romdoc-focus-ring rounded-[8px] bg-red-700 px-[8px] py-[5px] font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? copy.saving : copy.confirm}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="romdoc-focus-ring rounded-[8px] border border-red-200 px-[8px] py-[5px] text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          {copy.suspend}
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="mt-[5px] text-xs font-semibold text-red-700"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-[5px] text-xs font-semibold text-green-700"
        >
          {success}
        </p>
      )}
    </div>
  );
}
