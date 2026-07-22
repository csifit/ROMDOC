"use client";

import type {
  User,
} from "@supabase/supabase-js";
import Link from "next/link";
import {
  useTranslations,
} from "next-intl";
import {
  useRouter,
} from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import Button from "@/components/ui/button";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/client";

type SetPasswordMode =
  | "invite"
  | "recovery";

type SetPasswordFormProps = {
  locale: AppLocale;
  mode: SetPasswordMode;
  destination: string;
};

export default function
SetPasswordForm({
  locale,
  mode,
  destination,
}: SetPasswordFormProps) {
  const t =
    useTranslations(
      "PasswordReset.set"
    );

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

  useEffect(() => {
    const supabase =
      createClient();

    void supabase.auth
      .getUser()
      .then(({
        data,
        error: userError,
      }) => {
        if (
          userError ||
          !data.user
        ) {
          setError(
            t("invalidLink")
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
          t(
            "sessionVerificationFailed"
          )
        );
      })
      .finally(() => {
        setIsCheckingSession(
          false
        );
      });
  }, [t]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!currentUser) {
      setError(
        t("sessionUnavailable")
      );
      return;
    }

    if (
      password.length < 8
    ) {
      setError(
        t("passwordMinLength")
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        t("passwordMismatch")
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
              ...currentUser
                .user_metadata,
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
          t("passwordUpdated")
        );

        await supabase.auth
          .signOut();

        const loginParameters =
          new URLSearchParams({
            password_updated:
              "1",
            locale,
          });

        if (
          destination !==
          "/login"
        ) {
          loginParameters.set(
            "next",
            destination
          );
        }

        router.replace(
          `/login?${loginParameters.toString()}`
        );

        router.refresh();
        return;
      }

      setMessage(
        t("passwordCreated")
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
        t("passwordSaveFailed")
      );
    } finally {
      setIsSaving(false);
    }
  }

  const retryParameters =
    new URLSearchParams({
      locale,
      next: destination,
    });

  const retryHref =
    mode === "recovery"
      ? `/forgot-password?${retryParameters.toString()}`
      : `/login?locale=${locale}`;

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <header className="text-center">
        <Link
          href={`/${locale}`}
          className="inline-block text-3xl font-bold text-gray-900"
        >
          RomDoc
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          {mode === "recovery"
            ? t("recoveryTitle")
            : t("inviteTitle")}
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {mode === "recovery"
            ? t(
                "recoveryDescription"
              )
            : t(
                "inviteDescription"
              )}
        </p>
      </header>

      {isCheckingSession ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-center text-sm text-gray-600">
          {t("checkingLink")}
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
              {t(
                "newPasswordLabel"
              )}
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
              placeholder={
                t(
                  "newPasswordPlaceholder"
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "confirmPasswordLabel"
              )}
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
              placeholder={
                t(
                  "confirmPasswordPlaceholder"
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <p className="text-xs leading-5 text-gray-500">
            {t(
              "passwordGuidance"
            )}
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
            loadingText={
              t("saving")
            }
          >
            {t("savePassword")}
          </Button>
        </form>
      )}

      {!isCheckingSession &&
        !currentUser && (
          <div className="mt-6 text-center">
            <Link
              href={retryHref}
              className="text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              {mode ===
              "recovery"
                ? t(
                    "requestNewLink"
                  )
                : t(
                    "backToLogin"
                  )}
            </Link>
          </div>
        )}
    </div>
  );
}
