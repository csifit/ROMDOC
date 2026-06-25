"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  initialMessage?: string | null;
};

function getSafeNextPath() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "/dashboard";
  }

  const searchParams =
    new URLSearchParams(
      window.location.search
    );

  const nextPath =
    searchParams.get("next");

  if (
    !nextPath ||
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//")
  ) {
    return "/dashboard";
  }

  return nextPath;
}

export default function LoginForm({
  initialMessage = null,
}: LoginFormProps) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      initialMessage
    );

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setMessage(null);

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

    if (!password) {
      setError(
        "Introdu parola."
      );
      return;
    }

    startTransition(
      async () => {
        try {
          const supabase =
            createClient();

          const {
            error:
              loginError,
          } =
            await supabase.auth
              .signInWithPassword({
                email:
                  normalizedEmail,
                password,
              });

          if (loginError) {
            switch (
              loginError.message
                .toLowerCase()
            ) {
              case "invalid login credentials":
                setError(
                  "Adresa de e-mail sau parola este incorectă."
                );
                return;

              case "email not confirmed":
                setError(
                  "Adresa de e-mail nu a fost confirmată."
                );
                return;

              default:
                setError(
                  loginError.message
                );
                return;
            }
          }

          const destination =
            getSafeNextPath();

          const {
            data: factors,
            error:
              factorsError,
          } =
            await supabase.auth.mfa
              .listFactors();

          if (factorsError) {
            console.error(
              "Login MFA factor lookup failed:",
              factorsError
            );

            setError(
              "Starea autentificării în doi pași nu a putut fi verificată."
            );
            return;
          }

          if (
            factors.totp.length >
            0
          ) {
            router.replace(
              `/mfa/verify?next=${encodeURIComponent(
                destination
              )}`
            );
            router.refresh();
            return;
          }

          router.replace(
            destination
          );
          router.refresh();
        } catch (
          submitError
        ) {
          console.error(
            "Login failed:",
            submitError
          );

          setError(
            "Autentificarea nu a putut fi finalizată. Încearcă din nou."
          );
        }
      }
    );
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
          Autentificare
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Introdu adresa de e-mail și parola pentru a accesa contul.
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
              isPending
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

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Parolă
          </span>

          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            disabled={
              isPending
            }
            onChange={(
              event
            ) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="Parola contului"
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

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

        <Button
          type="submit"
          fullWidth
          isLoading={
            isPending
          }
          loadingText="Se autentifică..."
        >
          Autentificare
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Nu ai încă un cont?{" "}

        <Link
          href="/register"
          className="romdoc-link underline-offset-4 hover:underline"
        >
          Creează cont
        </Link>
      </div>
    </div>
  );
}
