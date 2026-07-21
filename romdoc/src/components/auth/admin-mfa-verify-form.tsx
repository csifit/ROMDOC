"use client";

import {
  useTranslations,
} from "next-intl";
import {
  useRouter,
} from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";
import {
  createClient,
} from "@/lib/supabase/client";

type AdminMfaVerifyFormProps = {
  nextPath: string;
};

type MfaRole =
  | "admin"
  | "manager"
  | "clinicManager";

function getMfaRole(
  nextPath: string
): MfaRole {
  if (
    nextPath.startsWith(
      "/clinic-manager-dashboard"
    )
  ) {
    return "clinicManager";
  }

  if (
    nextPath.startsWith(
      "/manager-dashboard"
    )
  ) {
    return "manager";
  }

  return "admin";
}

export default function AdminMfaVerifyForm({
  nextPath,
}: AdminMfaVerifyFormProps) {
  const t =
    useTranslations(
      "PlatformOperatorFoundation.mfa"
    );

  const router =
    useRouter();

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
    useState<
      string | null
    >(
      null
    );

  const role =
    useMemo(
      () =>
        getMfaRole(
          nextPath
        ),
      [
        nextPath,
      ]
    );

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

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
        t(
          "invalidSixDigitCode"
        )
      );

      return;
    }

    startTransition(
      async () => {
        const supabase =
          createClient();

        const {
          data:
            factors,
          error:
            factorsError,
        } =
          await supabase.auth.mfa
            .listFactors();

        if (
          factorsError
        ) {
          console.error(
            "MFA factors lookup failed:",
            factorsError
          );

          setError(
            t(
              "factorUnavailable"
            )
          );

          return;
        }

        const factor =
          factors.totp[0];

        if (
          !factor
        ) {
          router.replace(
            `/mfa/admin/setup?next=${encodeURIComponent(nextPath)}`
          );

          return;
        }

        const {
          error:
            verifyError,
        } =
          await supabase.auth.mfa
            .challengeAndVerify({
              factorId:
                factor.id,
              code:
                normalizedCode,
            });

        if (
          verifyError
        ) {
          console.error(
            "MFA challenge verification failed:",
            verifyError
          );

          setError(
            t(
              "invalidOrExpired"
            )
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
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          {t(
            `roles.${role}.verifyEyebrow`
          )}
        </p>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          {t(
            "verifyPageTitle"
          )}
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            `roles.${role}.verifyDescription`
          )}
        </p>
      </header>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-7 space-y-5"
      >
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t(
              "verificationCode"
            )}
          </span>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={
              6
            }
            required
            autoFocus
            value={
              code
            }
            disabled={
              isPending
            }
            onChange={(
              event:
                ChangeEvent<HTMLInputElement>
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
            {
              error
            }
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          isLoading={
            isPending
          }
          loadingText={
            t(
              "verifying"
            )
          }
        >
          {t(
            `roles.${role}.verifyButton`
          )}
        </Button>
      </form>
    </div>
  );
}
