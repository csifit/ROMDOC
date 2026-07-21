"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocale } from "next-intl";

import type { PlatformOperatorDoctorApiPayload } from "@/lib/api/platform-operator-doctor-codes";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformDoctorApiMessage,
  getPlatformOperatorDoctors,
} from "@/lib/i18n/platform-operator-doctors";

type InviteDoctorDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function InviteDoctorDialog({
  open,
  onClose,
  onCreated,
}: InviteDoctorDialogProps) {
  const appLocale = normalizeAppLocale(useLocale());
  const copy = getPlatformOperatorDoctors(appLocale);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [invitationLocale, setInvitationLocale] =
    useState<"ro" | "en">(appLocale === "en" ? "en" : "ro");
  const [complimentaryMonths, setComplimentaryMonths] = useState(12);
  const [personalMessage, setPersonalMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setInvitationLocale(appLocale === "en" ? "en" : "ro");

    const firstFocusable =
      dialogRef.current?.querySelector<HTMLInputElement>(
        "input, select, textarea, button"
      );

    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [appLocale, onClose, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/admin/doctors/invitations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            locale: invitationLocale,
            complimentaryMonths,
            personalMessage,
          }),
        }
      );

      const result =
        (await response.json()) as PlatformOperatorDoctorApiPayload;

      if (!response.ok) {
        throw new Error(
          getPlatformDoctorApiMessage(
            appLocale,
            result.code,
            result.error ?? copy.invitations.states.sendFailed
          )
        );
      }

      setFirstName("");
      setLastName("");
      setEmail("");
      setInvitationLocale(appLocale === "en" ? "en" : "ro");
      setComplimentaryMonths(12);
      setPersonalMessage("");
      onCreated();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : copy.invitations.states.sendFailed
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-[13px] py-[21px]"
      role="presentation"
      onMouseDown={(event: { target: EventTarget | null; currentTarget: EventTarget | null }) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-doctor-title"
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-[21px] bg-white p-[21px] shadow-2xl sm:p-[34px]"
      >
        <div className="flex items-start justify-between gap-[13px]">
          <div>
            <p className="text-sm font-semibold text-[#036661]">
              {copy.invitations.dialog.eyebrow}
            </p>

            <h2
              id="invite-doctor-title"
              className="mt-[8px] text-2xl font-bold text-gray-950"
            >
              {copy.invitations.dialog.title}
            </h2>

            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {copy.invitations.dialog.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="romdoc-focus-ring rounded-[8px] px-[13px] py-[8px] text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            {copy.common.close}
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-[21px] space-y-[21px]"
        >
          <div className="grid gap-[13px] sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-gray-900">
                {copy.invitations.dialog.firstName}
              </span>
              <input
                required
                maxLength={120}
                value={firstName}
                onChange={(event: { target: { value: string } }) =>
                  setFirstName(event.target.value)
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-gray-900">
                {copy.invitations.dialog.lastName}
              </span>
              <input
                required
                maxLength={120}
                value={lastName}
                onChange={(event: { target: { value: string } }) =>
                  setLastName(event.target.value)
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
              />
            </label>
          </div>

          <label>
            <span className="text-sm font-medium text-gray-900">
              {copy.invitations.dialog.email}
            </span>
            <input
              type="email"
              required
              maxLength={320}
              value={email}
              onChange={(event: { target: { value: string } }) =>
                setEmail(event.target.value)
              }
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
            />
          </label>

          <div className="grid gap-[13px] sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-gray-900">
                {copy.invitations.dialog.invitationLanguage}
              </span>
              <select
                value={invitationLocale}
                onChange={(event: { target: { value: string } }) =>
                  setInvitationLocale(
                    event.target.value === "en" ? "en" : "ro"
                  )
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="ro">
                  {copy.common.languageRomanian}
                </option>
                <option value="en">
                  {copy.common.languageEnglish}
                </option>
              </select>
              <span className="mt-[5px] block text-xs text-gray-500">
                {copy.invitations.dialog.languageNote}
              </span>
            </label>

            <label>
              <span className="text-sm font-medium text-gray-900">
                {copy.invitations.dialog.freeAccess}
              </span>
              <select
                value={complimentaryMonths}
                onChange={(event: { target: { value: string } }) =>
                  setComplimentaryMonths(Number(event.target.value))
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                {[3, 6, 12, 18, 24].map((months) => (
                  <option key={months} value={months}>
                    {months}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span className="flex items-center justify-between gap-[13px] text-sm font-medium text-gray-900">
              <span>{copy.invitations.dialog.personalMessage}</span>
              <span className="text-xs font-normal text-gray-500">
                {personalMessage.length}/1000
              </span>
            </span>
            <textarea
              rows={6}
              maxLength={1000}
              value={personalMessage}
              onChange={(event: { target: { value: string } }) =>
                setPersonalMessage(event.target.value)
              }
              placeholder={
                copy.invitations.dialog.messagePlaceholder
              }
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
            />
            <span className="mt-[5px] block text-xs leading-5 text-gray-500">
              {copy.invitations.dialog.plainText}
            </span>
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-[13px] border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-[13px] sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[21px] py-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {copy.invitations.dialog.cancel}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="romdoc-focus-ring rounded-[13px] bg-[#036661] px-[21px] py-[13px] font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? copy.invitations.dialog.sending
                : copy.invitations.dialog.send}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
