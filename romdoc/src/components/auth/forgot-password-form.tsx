"use client";

import Link from "next/link";
import {
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useState,
} from "react";

import Button from "@/components/ui/button";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/client";

type ForgotPasswordFormProps = {
  locale: AppLocale;
  nextPath: string;
};

export default function
ForgotPasswordForm({
  locale,
  nextPath,
}: ForgotPasswordFormProps) {
  const t =
    useTranslations(
      "PasswordReset.forgot"
    );

  const [email, setEmail] =
    useState("");

  const [isSending, setIsSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const loginParameters =
    new URLSearchParams({
      locale,
    });

  if (nextPath !== "/login") {
    loginParameters.set(
      "next",
      nextPath
    );
  }

  const loginHref =
    `/login?${loginParameters.toString()}`;

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
        t("emailRequired")
      );
      return;
    }

    setIsSending(true);
    setError("");
    setMessage("");

    try {
      const supabase =
        createClient();

      const redirectUrl =
        new URL(
          "/set-password",
          window.location.origin
        );

      redirectUrl.searchParams.set(
        "mode",
        "recovery"
      );

      redirectUrl.searchParams.set(
        "locale",
        locale
      );

      redirectUrl.searchParams.set(
        "next",
        nextPath
      );

      const {
        error: resetError,
      } =
        await supabase.auth
          .resetPasswordForEmail(
            normalizedEmail,
            {
              redirectTo:
                redirectUrl.toString(),
            }
          );

      if (resetError) {
        console.error(
          "Password recovery request failed:",
          resetError
        );
      }

      setMessage(
        t("securityMessage")
      );
    } catch (requestError) {
      console.error(
        "Password recovery failed:",
        requestError
      );

      setMessage(
        t("securityMessage")
      );
    } finally {
      setIsSending(false);
    }
  }

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
          {t("title")}
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {t("description")}
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
            {t("emailLabel")}
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
            placeholder={
              t(
                "emailPlaceholder"
              )
            }
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
          loadingText={
            t("sending")
          }
        >
          {t("submit")}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href={loginHref}
          className="text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}
