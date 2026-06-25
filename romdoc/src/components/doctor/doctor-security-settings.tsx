"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type TotpFactor = {
  id: string;
  status: "verified";
  friendly_name?: string;
  created_at?: string;
  updated_at?: string;
};

type EnrollmentState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type ViewState =
  | "loading"
  | "disabled"
  | "enrolling"
  | "enabled"
  | "error";

function formatDate(
  value:
    | string
    | undefined
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

export default function DoctorSecuritySettings() {
  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    viewState,
    setViewState,
  ] =
    useState<ViewState>(
      "loading"
    );

  const [
    verifiedFactor,
    setVerifiedFactor,
  ] =
    useState<TotpFactor | null>(
      null
    );

  const [
    enrollment,
    setEnrollment,
  ] =
    useState<EnrollmentState | null>(
      null
    );

  const [code, setCode] =
    useState("");

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [message, setMessage] =
    useState<string | null>(
      null
    );

  const loadStatus =
    useCallback(async () => {
      setError(null);

      const supabase =
        createClient();

      const {
        data,
        error:
          factorsError,
      } =
        await supabase.auth.mfa
          .listFactors();

      if (
        factorsError
      ) {
        console.error(
          "Doctor MFA factor lookup failed:",
          factorsError
        );

        setError(
          "Starea autentificării în doi pași nu a putut fi verificată."
        );
        setViewState(
          "error"
        );
        return;
      }

      /*
       * Supabase listFactors() returns enabled/verified factors.
       * An unverified factor is available only from the immediate
       * enroll() response and is tracked separately in enrollment state.
       */
      const activeFactor =
        data.totp[0] ?? null;

      if (activeFactor) {
        setVerifiedFactor(
          activeFactor
        );
        setEnrollment(
          null
        );
        setViewState(
          "enabled"
        );
        return;
      }

      setVerifiedFactor(
        null
      );

      setViewState(
        "disabled"
      );
    }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  function beginEnrollment() {
    setError(null);
    setMessage(null);
    setCode("");

    startTransition(
      async () => {
        const supabase =
          createClient();

        const {
          data,
          error:
            enrollError,
        } =
          await supabase.auth.mfa
            .enroll({
              factorType:
                "totp",
              friendlyName:
                "RomDoc Google Authenticator",
            });

        if (
          enrollError ||
          !data
        ) {
          console.error(
            "Doctor MFA enrollment failed:",
            enrollError
          );

          setError(
            enrollError?.message ??
              "Configurarea Google Authenticator nu a putut fi începută."
          );
          return;
        }

        setEnrollment({
          factorId:
            data.id,
          qrCode:
            data.totp.qr_code,
          secret:
            data.totp.secret,
        });

        setViewState(
          "enrolling"
        );
      }
    );
  }

  function verifyEnrollment(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setMessage(null);

    const normalizedCode =
      code
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          6
        );

    if (
      !/^\d{6}$/.test(
        normalizedCode
      )
    ) {
      setError(
        "Introdu codul de 6 cifre din Google Authenticator."
      );
      return;
    }

    if (!enrollment) {
      setError(
        "Configurarea Google Authenticator nu este disponibilă."
      );
      return;
    }

    startTransition(
      async () => {
        const supabase =
          createClient();

        const {
          error:
            verifyError,
        } =
          await supabase.auth.mfa
            .challengeAndVerify({
              factorId:
                enrollment.factorId,
              code:
                normalizedCode,
            });

        if (
          verifyError
        ) {
          console.error(
            "Doctor MFA verification failed:",
            verifyError
          );

          setError(
            "Codul nu este valid sau a expirat. Introdu codul curent din Google Authenticator."
          );
          return;
        }

        setMessage(
          "Google Authenticator a fost activat pentru contul tău."
        );

        setCode("");
        setEnrollment(
          null
        );

        await loadStatus();
      }
    );
  }

  function cancelEnrollment() {
    setError(null);
    setMessage(null);
    setCode("");

    startTransition(
      async () => {
        if (
          enrollment
        ) {
          const supabase =
            createClient();

          const {
            error:
              unenrollError,
          } =
            await supabase.auth.mfa
              .unenroll({
                factorId:
                  enrollment.factorId,
              });

          if (
            unenrollError
          ) {
            console.error(
              "MFA enrollment cancellation failed:",
              unenrollError
            );
          }
        }

        setEnrollment(
          null
        );

        await loadStatus();
      }
    );
  }

  if (
    viewState ===
    "loading"
  ) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-6 text-sm text-gray-600">
        Se verifică setările de securitate...
      </div>
    );
  }

  if (
    viewState ===
    "error"
  ) {
    return (
      <div className="space-y-4">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
        >
          {error}
        </div>

        <Button
          type="button"
          onClick={() =>
            void loadStatus()
          }
        >
          Încearcă din nou
        </Button>
      </div>
    );
  }

  if (
    viewState ===
    "enabled" &&
    verifiedFactor
  ) {
    const enabledAt =
      formatDate(
        verifiedFactor.updated_at ??
          verifiedFactor.created_at
      );

    return (
      <section className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5 12 4 4L19 6"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-bold text-green-900">
              Google Authenticator este activ
            </h2>

            <p className="mt-2 text-sm leading-6 text-green-800">
              Contul are un factor TOTP verificat. În pasul 66E-2C,
              viitoarele autentificări vor solicita codul generat de
              Google Authenticator.
            </p>

            {enabledAt && (
              <p className="mt-3 text-xs text-green-700">
                Factor verificat: {enabledAt}
              </p>
            )}
          </div>
        </div>

        {message && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-green-300 bg-white px-4 py-3 text-sm text-green-900"
          >
            {message}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-green-200 bg-white px-4 py-4 text-sm leading-6 text-gray-700">
          Dezactivarea și înlocuirea dispozitivului vor fi adăugate
          separat, cu reverificare AAL2, pentru a evita eliminarea
          accidentală sau abuzivă a protecției.
        </div>
      </section>
    );
  }

  if (
    viewState ===
    "enrolling" &&
    enrollment
  ) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
        <h2 className="text-xl font-bold text-gray-900">
          Conectează Google Authenticator
        </h2>

        <ol className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
          <li>
            <strong>1.</strong>{" "}
            Deschide Google Authenticator pe telefon.
          </li>
          <li>
            <strong>2.</strong>{" "}
            Apasă „+” și alege scanarea unui cod QR.
          </li>
          <li>
            <strong>3.</strong>{" "}
            Scanează codul de mai jos.
          </li>
          <li>
            <strong>4.</strong>{" "}
            Introdu codul curent de 6 cifre.
          </li>
        </ol>

        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {/* Supabase returns the QR code as an image-compatible data URI. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                enrollment.qrCode
              }
              alt="Cod QR pentru Google Authenticator"
              width={220}
              height={220}
              className="h-[220px] w-[220px]"
            />
          </div>
        </div>

        <details className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-800">
            Nu poți scana codul QR?
          </summary>

          <p className="mt-3 text-sm text-gray-600">
            Adaugă manual această cheie în Google Authenticator:
          </p>

          <code className="mt-2 block break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-900">
            {enrollment.secret}
          </code>
        </details>

        <form
          onSubmit={
            verifyEnrollment
          }
          className="mt-6 space-y-5"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Cod Google Authenticator
            </span>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              isLoading={
                isPending
              }
              loadingText="Se verifică..."
            >
              Activează Google Authenticator
            </Button>

            <button
              type="button"
              disabled={
                isPending
              }
              onClick={
                cancelEnrollment
              }
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Anulează
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3 5 6v5c0 4.5 2.8 8.1 7 10 4.2-1.9 7-5.5 7-10V6l-7-3Z"
            />

            <path
              strokeLinecap="round"
              d="M9.5 12h5M12 9.5v5"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">
            Google Authenticator nu este activ
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Activarea este opțională. Poți continua să folosești
            platforma fără MFA până la activare.
          </p>

          <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
            <li>
              • reduce riscul accesului neautorizat dacă parola este compromisă;
            </li>
            <li>
              • codurile sunt generate local pe telefon;
            </li>
            <li>
              • RomDoc nu stochează codurile de 6 cifre sau secretul TOTP în tabelele aplicației.
            </li>
          </ul>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <div className="mt-6">
            <Button
              type="button"
              onClick={
                beginEnrollment
              }
              isLoading={
                isPending
              }
              loadingText="Se pregătește..."
            >
              Activează Google Authenticator
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
