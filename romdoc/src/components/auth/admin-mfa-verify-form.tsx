"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type AdminMfaVerifyFormProps = {
  nextPath: string;
};

export default function AdminMfaVerifyForm({
  nextPath,
}: AdminMfaVerifyFormProps) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [code, setCode] =
    useState("");

  const [error, setError] =
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
            "Admin MFA factors lookup failed:",
            factorsError
          );

          setError(
            "Factorul MFA nu a putut fi verificat."
          );
          return;
        }

        const factor =
          factors.totp[0];

        if (!factor) {
          router.replace(
            `/mfa/admin/setup?next=${encodeURIComponent(
              nextPath
            )}`
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

        if (verifyError) {
          console.error(
            "Admin MFA challenge verification failed:",
            verifyError
          );

          setError(
            "Codul nu este valid sau a expirat. Introdu codul curent din Google Authenticator."
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
          Verificare administrator
        </p>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Introdu codul Google Authenticator
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Accesul la administrarea RomDoc necesită o sesiune MFA verificată.
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
            Cod de verificare
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
          loadingText="Se verifică..."
        >
          Continuă în administrare
        </Button>
      </form>
    </div>
  );
}
