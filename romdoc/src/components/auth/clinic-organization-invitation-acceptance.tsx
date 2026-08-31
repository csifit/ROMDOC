"use client";

import {
  type FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

type Locale =
  | "ro"
  | "en"
  | "de";

type Props = {
  organizationName: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: Locale;
  trialMonths: number;
  personalMessage: string | null;
};

type AcceptanceResponse = {
  error?: string;
};

const COPY = {
  ro: {
    eyebrow:
      "Invitație RomDoc",
    title:
      "Activează contul organizației",
    greeting:
      "Bună ziua",
    invitation:
      "Ați fost invitat(ă) să activați contul RomDoc pentru",
    email:
      "Invitația este asociată adresei",
    trial:
      "Perioada de test începe numai după acceptarea acestei invitații și va dura",
    months:
      "luni",
    message:
      "Mesaj RomDoc",
    password:
      "Creează parola",
    confirmPassword:
      "Confirmă parola",
    passwordLength:
      "Parola trebuie să conțină cel puțin 10 caractere.",
    passwordMismatch:
      "Parolele nu coincid.",
    passwordSaveFailed:
      "Parola nu a putut fi salvată.",
    acceptanceFailed:
      "Invitația nu a putut fi acceptată.",
    submitting:
      "Se activează organizația...",
    submit:
      "Acceptă invitația și activează organizația",
    note:
      "După activare veți fi administratorul principal al organizației în RomDoc și veți putea continua configurarea locațiilor, medicilor și datelor de facturare.",
  },
  en: {
    eyebrow:
      "RomDoc invitation",
    title:
      "Activate the organisation account",
    greeting:
      "Hello",
    invitation:
      "You have been invited to activate the RomDoc account for",
    email:
      "The invitation is associated with",
    trial:
      "The trial starts only after you accept this invitation and will last",
    months:
      "months",
    message:
      "RomDoc message",
    password:
      "Create password",
    confirmPassword:
      "Confirm password",
    passwordLength:
      "The password must contain at least 10 characters.",
    passwordMismatch:
      "The passwords do not match.",
    passwordSaveFailed:
      "The password could not be saved.",
    acceptanceFailed:
      "The invitation could not be accepted.",
    submitting:
      "Activating organisation...",
    submit:
      "Accept invitation and activate organisation",
    note:
      "After activation you will be the primary organisation manager in RomDoc and can continue configuring locations, doctors and billing details.",
  },
  de: {
    eyebrow:
      "RomDoc-Einladung",
    title:
      "Organisationskonto aktivieren",
    greeting:
      "Guten Tag",
    invitation:
      "Sie wurden eingeladen, das RomDoc-Konto zu aktivieren für",
    email:
      "Die Einladung ist mit folgender Adresse verknüpft",
    trial:
      "Die Testphase beginnt erst nach Annahme dieser Einladung und dauert",
    months:
      "Monate",
    message:
      "RomDoc-Nachricht",
    password:
      "Passwort erstellen",
    confirmPassword:
      "Passwort bestätigen",
    passwordLength:
      "Das Passwort muss mindestens 10 Zeichen enthalten.",
    passwordMismatch:
      "Die Passwörter stimmen nicht überein.",
    passwordSaveFailed:
      "Das Passwort konnte nicht gespeichert werden.",
    acceptanceFailed:
      "Die Einladung konnte nicht angenommen werden.",
    submitting:
      "Organisation wird aktiviert...",
    submit:
      "Einladung annehmen und Organisation aktivieren",
    note:
      "Nach der Aktivierung sind Sie der primäre Organisationsmanager in RomDoc und können Standorte, Ärzte und Rechnungsdaten weiter konfigurieren.",
  },
} as const;

export default function ClinicOrganizationInvitationAcceptance({
  organizationName,
  email,
  firstName,
  lastName,
  locale,
  trialMonths,
  personalMessage,
}: Props) {
  const router =
    useRouter();

  const copy =
    COPY[
      locale
    ];

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    if (
      password.length <
      10
    ) {
      setError(
        copy.passwordLength
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        copy.passwordMismatch
      );
      return;
    }

    setIsSubmitting(
      true
    );

    try {
      const supabase =
        createClient();

      const {
        error:
          passwordError,
      } =
        await supabase.auth
          .updateUser({
            password,
          });

      if (
        passwordError &&
        passwordError.code !==
          "same_password"
      ) {
        console.error(
          "Clinic Organisation invitation password update failed:",
          passwordError
        );

        throw new Error(
          copy.passwordSaveFailed
        );
      }

      const response =
        await fetch(
          "/api/clinic-organization-invitations/accept",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      const result =
        (await response.json()) as
          AcceptanceResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            copy.acceptanceFailed
        );
      }

      router.replace(
        "/clinic-manager-dashboard"
      );

      router.refresh();
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : copy.acceptanceFailed
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <p className="text-sm font-semibold text-[#036661]">
        {copy.eyebrow}
      </p>

      <h1 className="mt-[8px] text-3xl font-bold text-gray-950">
        {copy.title}
      </h1>

      <p className="mt-[13px] text-sm leading-6 text-gray-600">
        {copy.greeting},{" "}
        <strong>
          {firstName}{" "}
          {lastName}
        </strong>
        .{" "}
        {copy.invitation}{" "}
        <strong>
          {organizationName}
        </strong>
        .
      </p>

      <div className="mt-[21px] rounded-[13px] border border-[#036661]/20 bg-[#F0EEE9] p-[13px] text-sm leading-6 text-gray-700">
        <p>
          {copy.email}{" "}
          <strong>
            {email}
          </strong>
          .
        </p>

        <p className="mt-[8px]">
          {copy.trial}{" "}
          <strong>
            {trialMonths}{" "}
            {copy.months}
          </strong>
          .
        </p>
      </div>

      {personalMessage ? (
        <div className="mt-[21px] rounded-[13px] border border-gray-200 bg-white p-[13px]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#036661]">
            {copy.message}
          </p>

          <p className="mt-[8px] whitespace-pre-wrap text-sm leading-6 text-gray-800">
            {personalMessage}
          </p>
        </div>
      ) : null}

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-[21px] space-y-[21px]"
      >
        <div>
          <label
            htmlFor="clinic-organization-password"
            className="text-sm font-medium text-gray-900"
          >
            {copy.password}
          </label>

          <input
            id="clinic-organization-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={
              10
            }
            value={
              password
            }
            onChange={(
              event
            ) =>
              setPassword(
                event
                  .target
                  .value
              )
            }
            className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-gray-950"
          />
        </div>

        <div>
          <label
            htmlFor="clinic-organization-confirm-password"
            className="text-sm font-medium text-gray-900"
          >
            {
              copy.confirmPassword
            }
          </label>

          <input
            id="clinic-organization-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={
              10
            }
            value={
              confirmPassword
            }
            onChange={(
              event
            ) =>
              setConfirmPassword(
                event
                  .target
                  .value
              )
            }
            className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-gray-950"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-[13px] border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            isSubmitting
          }
          className="romdoc-focus-ring w-full rounded-[13px] bg-[#036661] px-[21px] py-[13px] font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? copy.submitting
            : copy.submit}
        </button>
      </form>

      <p className="mt-[21px] text-xs leading-5 text-gray-500">
        {copy.note}
      </p>
    </div>
  );
}
