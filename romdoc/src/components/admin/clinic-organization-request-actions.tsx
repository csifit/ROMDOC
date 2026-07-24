"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type Props = {
  organizationId: string;
  organizationName: string;
  locale: AppLocale;
};

type ApiResponse = {
  message?: string;
  error?: string;
};

const COPY = {
  ro: {
    comment:
      "Comentariu administrativ",
    optional:
      "Opțional",
    placeholder:
      "Notă internă sau motivul respingerii",
    approve:
      "Aprobă",
    reject:
      "Respinge",
    saving:
      "Se salvează...",
    genericError:
      "Cererea nu a putut fi actualizată.",
    rejectConfirm:
      "Respingi cererea pentru contul organizației „{name}”?",
  },
  en: {
    comment:
      "Administrative comment",
    optional:
      "Optional",
    placeholder:
      "Internal note or rejection reason",
    approve:
      "Approve",
    reject:
      "Reject",
    saving:
      "Saving...",
    genericError:
      "The request could not be updated.",
    rejectConfirm:
      "Reject the account request for “{name}”?",
  },
  de: {
    comment:
      "Administrativer Kommentar",
    optional:
      "Optional",
    placeholder:
      "Interne Notiz oder Ablehnungsgrund",
    approve:
      "Genehmigen",
    reject:
      "Ablehnen",
    saving:
      "Wird gespeichert...",
    genericError:
      "Der Antrag konnte nicht aktualisiert werden.",
    rejectConfirm:
      "Den Kontoantrag für „{name}“ ablehnen?",
  },
} satisfies
  Record<
    AppLocale,
    Record<string, string>
  >;

export default function
ClinicOrganizationRequestActions({
  organizationId,
  organizationName,
  locale,
}: Props) {
  const router =
    useRouter();

  const copy =
    COPY[locale];

  const [
    comment,
    setComment,
  ] =
    useState("");

  const [
    activeAction,
    setActiveAction,
  ] =
    useState<
      | "approve"
      | "reject"
      | null
    >(
      null
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  async function submit(
    action:
      | "approve"
      | "reject"
  ) {
    if (
      action ===
        "reject" &&
      !window.confirm(
        copy.rejectConfirm
          .replace(
            "{name}",
            organizationName
          )
      )
    ) {
      return;
    }

    setActiveAction(
      action
    );

    setError(
      ""
    );

    setMessage(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/admin/clinic-organization-requests",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                organizationId,
                action,
                comment:
                  comment.trim() ||
                  null,
                locale,
              }),
          }
        );

      const result =
        (await response
          .json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            copy.genericError
        );
      }

      setMessage(
        result.message ??
          ""
      );

      router.refresh();
    } catch (
      actionError
    ) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : copy.genericError
      );
    } finally {
      setActiveAction(
        null
      );
    }
  }

  const isSaving =
    activeAction !==
    null;

  return (
    <div className="mt-[13px] border-t border-gray-200 pt-[13px]">
      <label className="block">
        <span className="text-xs font-semibold text-gray-700">
          {copy.comment}
          {" "}
          <span className="font-normal text-gray-500">
            ({copy.optional})
          </span>
        </span>

        <textarea
          rows={2}
          maxLength={2000}
          value={
            comment
          }
          disabled={
            isSaving
          }
          onChange={(
            event
          ) =>
            setComment(
              event.target
                .value
            )
          }
          placeholder={
            copy.placeholder
          }
          className="romdoc-focus-ring mt-[8px] w-full rounded-[8px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm text-gray-900 disabled:bg-gray-100"
        />
      </label>

      <div className="mt-[8px] flex flex-wrap gap-[8px]">
        <button
          type="button"
          disabled={
            isSaving
          }
          onClick={() =>
            void submit(
              "approve"
            )
          }
          className="romdoc-focus-ring min-h-[40px] rounded-[8px] bg-[#036661] px-[13px] py-[8px] text-sm font-semibold text-white hover:bg-[#02534f] disabled:cursor-wait disabled:opacity-60"
        >
          {activeAction ===
          "approve"
            ? copy.saving
            : copy.approve}
        </button>

        <button
          type="button"
          disabled={
            isSaving
          }
          onClick={() =>
            void submit(
              "reject"
            )
          }
          className="romdoc-focus-ring min-h-[40px] rounded-[8px] border border-red-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
        >
          {activeAction ===
          "reject"
            ? copy.saving
            : copy.reject}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-[8px] text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="mt-[8px] text-sm font-semibold text-green-700"
        >
          {message}
        </p>
      )}
    </div>
  );
}
