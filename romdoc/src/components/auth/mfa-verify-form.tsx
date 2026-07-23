"use client";

import {
  useRouter,
} from "next/navigation";
import {
  type FormEvent,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/client";

type MfaVerifyFormProps = {
  locale: AppLocale;
  nextPath: string;
};

type MfaVerifyCopy = {
  eyebrow: string;
  title: string;
  description: string;
  codeLabel: string;
  invalidCode: string;
  factorLookupFailed: string;
  missingFactor: string;
  verificationFailed: string;
  loading: string;
  submit: string;
};

const COPY:
  Record<
    AppLocale,
    MfaVerifyCopy
  > = {
    ro: {
      eyebrow:
        "Verificare în doi pași",
      title:
        "Introdu codul Google Authenticator",
      description:
        "Acest cont are autentificarea în doi pași activată.",
      codeLabel:
        "Cod de verificare",
      invalidCode:
        "Introdu codul de 6 cifre din Google Authenticator.",
      factorLookupFailed:
        "Factorul MFA nu a putut fi verificat.",
      missingFactor:
        "Contul nu are un factor Google Authenticator activ.",
      verificationFailed:
        "Codul nu este valid sau a expirat. Introdu codul curent din Google Authenticator.",
      loading:
        "Se verifică...",
      submit:
        "Continuă",
    },
    en: {
      eyebrow:
        "Two-step verification",
      title:
        "Enter your Google Authenticator code",
      description:
        "Two-step verification is enabled for this account.",
      codeLabel:
        "Verification code",
      invalidCode:
        "Enter the 6-digit code from Google Authenticator.",
      factorLookupFailed:
        "The MFA factor could not be verified.",
      missingFactor:
        "This account does not have an active Google Authenticator factor.",
      verificationFailed:
        "The code is invalid or has expired. Enter the current code from Google Authenticator.",
      loading:
        "Verifying...",
      submit:
        "Continue",
    },
    de: {
      eyebrow:
        "Bestätigung in zwei Schritten",
      title:
        "Google-Authenticator-Code eingeben",
      description:
        "Für dieses Konto ist die Bestätigung in zwei Schritten aktiviert.",
      codeLabel:
        "Bestätigungscode",
      invalidCode:
        "Gib den 6-stelligen Code aus Google Authenticator ein.",
      factorLookupFailed:
        "Der MFA-Faktor konnte nicht überprüft werden.",
      missingFactor:
        "Für dieses Konto ist kein aktiver Google-Authenticator-Faktor eingerichtet.",
      verificationFailed:
        "Der Code ist ungültig oder abgelaufen. Gib den aktuellen Code aus Google Authenticator ein.",
      loading:
        "Wird überprüft...",
      submit:
        "Weiter",
    },
  };

export default function
MfaVerifyForm({
  locale,
  nextPath,
}: MfaVerifyFormProps) {
  const router =
    useRouter();

  const copy =
    COPY[locale];

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    code,
    setCode,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    const normalizedCode =
      code
        .replace(/\D/g, "")
        .slice(0, 6);

    if (
      !/^\d{6}$/.test(
        normalizedCode
      )
    ) {
      setError(
        copy.invalidCode
      );
      return;
    }

    startTransition(
      async () => {
        const supabase =
          createClient();

        const {
          data: factors,
          error:
            factorsError,
        } =
          await supabase.auth.mfa
            .listFactors();

        if (factorsError) {
          console.error(
            "MFA factor lookup failed:",
            factorsError
          );

          setError(
            copy.factorLookupFailed
          );
          return;
        }

        const factor =
          factors.totp[0];

        if (!factor) {
          setError(
            copy.missingFactor
          );
          return;
        }

        const {
          error:
            verificationError,
        } =
          await supabase.auth.mfa
            .challengeAndVerify({
              factorId:
                factor.id,
              code:
                normalizedCode,
            });

        if (
          verificationError
        ) {
          console.error(
            "MFA verification failed:",
            verificationError
          );

          setError(
            copy.verificationFailed
          );
          return;
        }

        router.replace(
          nextPath
        );

        router.refresh();
      }
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          {copy.eyebrow}
        </p>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          {copy.title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {copy.description}
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
            {copy.codeLabel}
          </span>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            value={code}
            disabled={
              isPending
            }
            onChange={(
              event
            ) =>
              setCode(
                event.target.value
                  .replace(
                    /\D/g,
                    ""
                  )
                  .slice(
                    0,
                    6
                  )
              )
            }
            placeholder="123456"
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-xl tracking-[0.35em] text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

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
          loadingText={
            copy.loading
          }
        >
          {copy.submit}
        </Button>
      </form>
    </div>
  );
}
