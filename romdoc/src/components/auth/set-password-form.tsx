"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  useRouter,
} from "next/navigation";
import type {
  User,
} from "@supabase/supabase-js";

import Button from "@/components/ui/button";
import {
  createClient,
} from "@/lib/supabase/client";

function getSafeNextPath(
  value: string | null,
  fallback: string
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return fallback;
  }

  return value;
}

export default function SetPasswordForm() {
  const router =
    useRouter();

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<User | null>(null);

  const [
    isCheckingSession,
    setIsCheckingSession,
  ] =
    useState(true);

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
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [mode, setMode] =
    useState<
      "invite" | "recovery"
    >("invite");

  const [
    destination,
    setDestination,
  ] =
    useState(
      "/staff-dashboard"
    );

  useEffect(() => {
    const searchParams =
      new URLSearchParams(
        window.location.search
      );

    const requestedMode =
      searchParams.get("mode") ===
      "recovery"
        ? "recovery"
        : "invite";

    setMode(requestedMode);

    setDestination(
      getSafeNextPath(
        searchParams.get("next"),
        requestedMode ===
          "recovery"
          ? "/login"
          : "/staff-dashboard"
      )
    );

    const supabase =
      createClient();

    void supabase.auth
      .getUser()
      .then(({ data, error: userError }) => {
        if (
          userError ||
          !data.user
        ) {
          setError(
            "Linkul nu este valid sau a expirat. Solicită un link nou."
          );
          return;
        }

        setCurrentUser(
          data.user
        );
      })
      .catch((sessionError) => {
        console.error(
          "Set-password session lookup failed:",
          sessionError
        );

        setError(
          "Sesiunea nu a putut fi verificată. Solicită un link nou."
        );
      })
      .finally(() => {
        setIsCheckingSession(false);
      });
  }, []);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!currentUser) {
      setError(
        "Sesiunea nu este disponibilă. Solicită un link nou."
      );
      return;
    }

    if (
      password.length < 8
    ) {
      setError(
        "Parola trebuie să conțină cel puțin 8 caractere."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Parolele introduse nu coincid."
      );
      return;
    }

    setIsSaving(true);

    try {
      const supabase =
        createClient();

      const {
        error: updateError,
      } =
        await supabase.auth
          .updateUser({
            password,
            data: {
              ...currentUser.user_metadata,
              password_initialized:
                true,
            },
          });

      if (updateError) {
        throw updateError;
      }

      if (
        mode === "recovery"
      ) {
        setMessage(
          "Parola a fost actualizată."
        );

        await supabase.auth
          .signOut();

        router.replace(
          "/login?password_updated=1"
        );
        router.refresh();
        return;
      }

      setMessage(
        "Parola a fost creată. Vei fi redirecționat către contul tău."
      );

      router.replace(
        destination
      );
      router.refresh();
    } catch (
      updateError
    ) {
      console.error(
        "Password update failed:",
        updateError
      );

      setError(
        updateError instanceof Error
          ? updateError.message
          : "Parola nu a putut fi salvată."
      );
    } finally {
      setIsSaving(false);
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
          {mode === "recovery"
            ? "Alege o parolă nouă"
            : "Creează parola contului"}
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {mode === "recovery"
            ? "Introdu și confirmă noua parolă pentru contul tău."
            : "Invitația a fost confirmată. Creează acum parola pe care o vei folosi la autentificare."}
        </p>
      </header>

      {isCheckingSession ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-center text-sm text-gray-600">
          Se verifică linkul securizat...
        </div>
      ) : (
        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8 space-y-5"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Parolă nouă
            </span>

            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              disabled={
                isSaving ||
                !currentUser
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Minimum 8 caractere"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Confirmă parola
            </span>

            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={
                confirmPassword
              }
              disabled={
                isSaving ||
                !currentUser
              }
              onChange={(
                event
              ) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Repetă parola"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <p className="text-xs leading-5 text-gray-500">
            Folosește minimum 8 caractere și evită parolele utilizate pe alte servicii.
          </p>

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
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            disabled={
              !currentUser
            }
            isLoading={
              isSaving
            }
            loadingText="Se salvează..."
          >
            Salvează parola
          </Button>
        </form>
      )}

      {!isCheckingSession &&
        !currentUser && (
          <div className="mt-6 text-center">
            <Link
              href={
                mode === "recovery"
                  ? "/forgot-password"
                  : "/login"
              }
              className="text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              {mode === "recovery"
                ? "Solicită un link nou"
                : "Înapoi la autentificare"}
            </Link>
          </div>
        )}
    </div>
  );
}
