"use client";

import {
  type FormEvent,
  useState,
} from "react";
import Link from "next/link";

import Button from "@/components/ui/button";
import {
  createClient,
} from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] =
    useState("");

  const [isSending, setIsSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Introdu adresa de e-mail."
      );
      return;
    }

    setIsSending(true);
    setError("");
    setMessage("");

    try {
      const supabase =
        createClient();

      const nextPath =
        "/set-password?mode=recovery&next=/login";

      const redirectTo =
        `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
          nextPath
        )}`;

      const {
        error: resetError,
      } =
        await supabase.auth
          .resetPasswordForEmail(
            normalizedEmail,
            {
              redirectTo,
            }
          );

      if (resetError) {
        console.error(
          "Password recovery request failed:",
          resetError
        );
      }

      setMessage(
        "Dacă există un cont asociat acestei adrese, vei primi un e-mail cu linkul pentru alegerea unei parole noi."
      );
    } catch (requestError) {
      console.error(
        "Password recovery failed:",
        requestError
      );

      setMessage(
        "Dacă există un cont asociat acestei adrese, vei primi un e-mail cu linkul pentru alegerea unei parole noi."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <header className="text-center">
        <Link
          href="/"
          className="inline-block text-3xl font-bold text-gray-900"
        >
          RomDoc
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Resetarea parolei
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Introdu adresa contului. Îți vom trimite un link securizat pentru alegerea unei parole noi.
        </p>
      </header>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-8 space-y-5"
      >
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            E-mail
          </span>

          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            disabled={
              isSending
            }
            onChange={(
              event
            ) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="nume@example.com"
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        {message && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800"
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

        <Button
          type="submit"
          fullWidth
          isLoading={
            isSending
          }
          loadingText="Se trimite..."
        >
          Trimite linkul de resetare
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
        >
          Înapoi la autentificare
        </Link>
      </div>
    </div>
  );
}
