"use client";

import {
  FormEvent,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

type DoctorInvitationAcceptanceProps = {
  email: string;
  firstName: string;
  lastName: string;
  complimentaryMonths: number;
  personalMessage: string | null;
};

type AcceptanceResponse = {
  error?: string;
};

export default function DoctorInvitationAcceptance({
  email,
  firstName,
  lastName,
  complimentaryMonths,
  personalMessage,
}: DoctorInvitationAcceptanceProps) {
  const router =
    useRouter();

  const [password, setPassword] =
    useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");
  const [error, setError] =
    useState<string | null>(
      null
    );
  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    if (
      password.length < 10
    ) {
      setError(
        "Parola trebuie să conțină cel puțin 10 caractere."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Parolele nu coincid."
      );
      return;
    }

    setIsSubmitting(true);

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

      /*
       * Supabase may return `same_password` when the invited account
       * already has this password, for example after a repeated
       * submission or browser retry. The password is already valid,
       * so invitation acceptance must continue.
       */
      if (
        passwordError &&
        passwordError.code !==
          "same_password"
      ) {
        console.error(
          "Doctor invitation password update failed:",
          passwordError
        );

        throw new Error(
          "Parola nu a putut fi salvată."
        );
      }

      const response =
        await fetch(
          "/api/doctor-invitations/accept",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      const result =
        (await response.json()) as
          AcceptanceResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Invitația nu a putut fi acceptată."
        );
      }

      router.replace(
        "/doctor-dashboard"
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Invitația nu a putut fi acceptată."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-[#036661]">
        Invitație RomDoc
      </p>

      <h1 className="mt-2 text-3xl font-bold text-gray-950">
        Bun venit, Dr.{" "}
        {firstName}{" "}
        {lastName}
      </h1>

      <p className="mt-4 text-sm leading-6 text-gray-600">
        Invitația este asociată adresei{" "}
        <strong>
          {email}
        </strong>
        . După acceptare vei primi acces la funcțiile pentru medici timp de{" "}
        <strong>
          {complimentaryMonths} luni
        </strong>
        , fără plată Stripe în această perioadă.
      </p>

      {personalMessage ? (
        <div className="mt-6 rounded-2xl border border-[#036661]/20 bg-[#F0EEE9] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#036661]">
            Mesaj RomDoc
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
            {personalMessage}
          </p>
        </div>
      ) : null}

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-8 space-y-5"
      >
        <div>
          <label
            htmlFor="password"
            className="text-sm font-medium text-gray-900"
          >
            Creează parola
          </label>

          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={
              password
            }
            onChange={(
              event
            ) =>
              setPassword(
                event.target
                  .value
              )
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="text-sm font-medium text-gray-900"
          >
            Confirmă parola
          </label>

          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={
              confirmPassword
            }
            onChange={(
              event
            ) =>
              setConfirmPassword(
                event.target
                  .value
              )
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            isSubmitting
          }
          className="romdoc-focus-ring w-full rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Se activează contul..."
            : "Acceptă invitația și activează contul"}
        </button>
      </form>

      <p className="mt-5 text-xs leading-5 text-gray-500">
        Verificarea profesională este separată de accesul gratuit. Insigna „Medic verificat de RomDoc” se acordă numai după verificarea documentelor profesionale.
      </p>
    </div>
  );
}
