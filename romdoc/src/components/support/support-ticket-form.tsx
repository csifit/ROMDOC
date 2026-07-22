"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useMemo,
  useState,
} from "react";

import type {
  SupportCategory,
  SupportRequesterType,
  SupportTicketFormCopy,
} from "@/lib/i18n/public-support";

type SupportTicketFormProps = {
  initialRequesterType?: SupportRequesterType;
  initialCategory?: SupportCategory;
  copy: SupportTicketFormCopy;
};

const REQUESTER_TYPES = new Set([
  "patient",
  "doctor",
  "clinic",
  "visitor",
]);

const CATEGORIES = new Set([
  "patient_support",
  "doctor_support",
  "profile_correction",
  "booking_problem",
  "privacy_request",
  "technical_problem",
  "other",
]);

function isValidRequesterType(
  value: string | undefined
): value is SupportRequesterType {
  return REQUESTER_TYPES.has(
    value ?? ""
  );
}

function isValidCategory(
  value: string | undefined
): value is SupportCategory {
  return CATEGORIES.has(
    value ?? ""
  );
}

export default function SupportTicketForm({
  initialRequesterType = "patient",
  initialCategory = "patient_support",
  copy,
}: SupportTicketFormProps) {
  const [requesterType, setRequesterType] =
    useState<SupportRequesterType>(
      isValidRequesterType(
        initialRequesterType
      )
        ? initialRequesterType
        : "patient"
    );

  const [category, setCategory] =
    useState<SupportCategory>(
      isValidCategory(
        initialCategory
      )
        ? initialCategory
        : "patient_support"
    );

  const [requesterName, setRequesterName] =
    useState("");
  const [requesterEmail, setRequesterEmail] =
    useState("");
  const [requesterPhone, setRequesterPhone] =
    useState("");
  const [subject, setSubject] =
    useState("");
  const [message, setMessage] =
    useState("");
  const [relatedUrl, setRelatedUrl] =
    useState("");
  const [appointmentId, setAppointmentId] =
    useState("");
  const [website, setWebsite] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [submitError, setSubmitError] =
    useState<string | null>(null);
  const [ticketId, setTicketId] =
    useState<string | null>(null);

  const selectedCategory = useMemo(
    () =>
      copy.categoryOptions.find(
        (option) =>
          option.value === category
      ),
    [category, copy.categoryOptions]
  );

  async function submitTicket(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSubmitError(null);
    setTicketId(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/support/tickets",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            requesterType,
            category,
            requesterName,
            requesterEmail,
            requesterPhone,
            subject,
            message,
            relatedUrl,
            appointmentId,
            website,
          }),
        }
      );

      const result =
        (await response.json()) as {
          success?: boolean;
          ticketId?: string;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          result.error ??
            copy.errorFallback
        );
      }

      setTicketId(
        result.ticketId ?? null
      );
      setRequesterPhone("");
      setSubject("");
      setMessage("");
      setRelatedUrl("");
      setAppointmentId("");
      setWebsite("");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : copy.errorFallback
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submitTicket}
      className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          {copy.eyebrow}
        </p>

        <h2 className="mt-3 text-2xl font-bold text-gray-900">
          {copy.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {copy.description}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        {copy.warning}
      </div>

      {ticketId ? (
        <div
          aria-live="polite"
          className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900"
        >
          {copy.successPrefix}{" "}
          <strong>{ticketId}</strong>.
        </div>
      ) : null}

      {submitError ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          {submitError}
        </div>
      ) : null}

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setWebsite(
            event.target.value
          )
        }
        className="hidden"
        aria-hidden="true"
      />

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            {copy.requesterLabel}
          </span>

          <select
            value={requesterType}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setRequesterType(
                event.target
                  .value as SupportRequesterType
              )
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          >
            {copy.requesterOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            {copy.categoryLabel}
          </span>

          <select
            value={category}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setCategory(
                event.target
                  .value as SupportCategory
              )
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          >
            {copy.categoryOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          {selectedCategory ? (
            <span className="mt-2 block text-xs leading-5 text-gray-500">
              {selectedCategory.hint}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            {copy.nameLabel}
          </span>

          <input
            type="text"
            value={requesterName}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setRequesterName(
                event.target.value
              )
            }
            required
            minLength={2}
            maxLength={120}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            {copy.emailLabel}
          </span>

          <input
            type="email"
            value={requesterEmail}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setRequesterEmail(
                event.target.value
              )
            }
            required
            maxLength={180}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            {copy.phoneLabel}{" "}
            <span className="font-normal text-gray-500">
              {copy.optionalLabel}
            </span>
          </span>

          <input
            type="tel"
            value={requesterPhone}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setRequesterPhone(
                event.target.value
              )
            }
            maxLength={40}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            {copy.appointmentIdLabel}{" "}
            <span className="font-normal text-gray-500">
              {copy.optionalLabel}
            </span>
          </span>

          <input
            type="text"
            value={appointmentId}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setAppointmentId(
                event.target.value
              )
            }
            placeholder={
              copy.appointmentPlaceholder
            }
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-gray-700">
          {copy.subjectLabel}
        </span>

        <input
          type="text"
          value={subject}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setSubject(
              event.target.value
            )
          }
          required
          minLength={4}
          maxLength={180}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-gray-700">
          {copy.relatedUrlLabel}{" "}
          <span className="font-normal text-gray-500">
            {copy.optionalLabel}
          </span>
        </span>

        <input
          type="url"
          value={relatedUrl}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setRelatedUrl(
              event.target.value
            )
          }
          placeholder={
            copy.relatedUrlPlaceholder
          }
          maxLength={600}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-gray-700">
          {copy.messageLabel}
        </span>

        <textarea
          value={message}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            setMessage(
              event.target.value
            )
          }
          required
          minLength={10}
          maxLength={4000}
          rows={7}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
        />

        <span className="mt-2 block text-xs text-gray-500">
          {copy.messageHint}
        </span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="romdoc-button romdoc-button-primary mt-7 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? copy.submittingLabel
          : copy.submitLabel}
      </button>
    </form>
  );
}
