"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type InviteDoctorDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

type ApiResult = {
  error?: string;
  message?: string;
};

export default function InviteDoctorDialog({
  open,
  onClose,
  onCreated,
}: InviteDoctorDialogProps) {
  const dialogRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [firstName, setFirstName] =
    useState("");
  const [lastName, setLastName] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [locale, setLocale] =
    useState<"ro" | "en">(
      "ro"
    );
  const [
    complimentaryMonths,
    setComplimentaryMonths,
  ] = useState(12);
  const [
    personalMessage,
    setPersonalMessage,
  ] = useState("");
  const [error, setError] =
    useState<string | null>(
      null
    );
  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const firstFocusable =
      dialogRef.current?.querySelector<
        HTMLInputElement
      >(
        "input, select, textarea, button"
      );

    firstFocusable?.focus();

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, onClose]);

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
      const response =
        await fetch(
          "/api/admin/doctors/invitations",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              firstName,
              lastName,
              email,
              locale,
              complimentaryMonths,
              personalMessage,
            }),
          }
        );

      const result =
        (await response.json()) as
          ApiResult;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Invitația nu a putut fi trimisă."
        );
      }

      setFirstName("");
      setLastName("");
      setEmail("");
      setLocale("ro");
      setComplimentaryMonths(
        12
      );
      setPersonalMessage("");

      onCreated();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Invitația nu a putut fi trimisă."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 py-8"
      role="presentation"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-doctor-title"
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#036661]">
              Administrare
            </p>

            <h2
              id="invite-doctor-title"
              className="mt-2 text-2xl font-bold text-gray-950"
            >
              Invită un medic
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Medicul va primi un e-mail securizat și acces gratuit pentru perioada selectată.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="romdoc-focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            Închide
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-7 space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="invite-first-name"
                className="text-sm font-medium text-gray-900"
              >
                Prenume
              </label>

              <input
                id="invite-first-name"
                required
                maxLength={120}
                value={
                  firstName
                }
                onChange={(
                  event
                ) =>
                  setFirstName(
                    event.target
                      .value
                  )
                }
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="invite-last-name"
                className="text-sm font-medium text-gray-900"
              >
                Nume
              </label>

              <input
                id="invite-last-name"
                required
                maxLength={120}
                value={
                  lastName
                }
                onChange={(
                  event
                ) =>
                  setLastName(
                    event.target
                      .value
                  )
                }
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="invite-email"
              className="text-sm font-medium text-gray-900"
            >
              E-mail
            </label>

            <input
              id="invite-email"
              type="email"
              required
              maxLength={320}
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target
                    .value
                )
              }
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="invite-locale"
                className="text-sm font-medium text-gray-900"
              >
                Limba invitației
              </label>

              <select
                id="invite-locale"
                value={locale}
                onChange={(
                  event
                ) =>
                  setLocale(
                    event.target
                      .value ===
                      "en"
                      ? "en"
                      : "ro"
                  )
                }
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              >
                <option value="ro">
                  Română
                </option>
                <option value="en">
                  English
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="invite-months"
                className="text-sm font-medium text-gray-900"
              >
                Acces gratuit
              </label>

              <select
                id="invite-months"
                value={
                  complimentaryMonths
                }
                onChange={(
                  event
                ) =>
                  setComplimentaryMonths(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              >
                <option value={3}>
                  3 luni
                </option>
                <option value={6}>
                  6 luni
                </option>
                <option value={12}>
                  12 luni
                </option>
                <option value={18}>
                  18 luni
                </option>
                <option value={24}>
                  24 luni
                </option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="invite-message"
                className="text-sm font-medium text-gray-900"
              >
                Mesaj personalizat
              </label>

              <span className="text-xs text-gray-500">
                {
                  personalMessage.length
                }
                /1000
              </span>
            </div>

            <textarea
              id="invite-message"
              rows={6}
              maxLength={1000}
              value={
                personalMessage
              }
              onChange={(
                event
              ) =>
                setPersonalMessage(
                  event.target
                    .value
                )
              }
              placeholder="Exemplu: Dorim să vă invităm să vă alăturați platformei RomDoc..."
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Mesajul acceptă numai text simplu. Nu introduce HTML.
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={
                isSubmitting
              }
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Anulează
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Se trimite..."
                : "Trimite invitația"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
