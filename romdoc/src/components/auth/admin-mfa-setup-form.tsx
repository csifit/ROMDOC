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
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";
import {
  createClient,
} from "@/lib/supabase/client";

type AdminMfaSetupFormProps = {
  nextPath: string;
};

type EnrollmentState = {
  factorId: string;
  qrCode: string;
  secret: string;
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

export default function AdminMfaSetupForm({
  nextPath,
}: AdminMfaSetupFormProps) {
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
    enrollment,
    setEnrollment,
  ] =
    useState<
      EnrollmentState | null
    >(
      null
    );

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

  const friendlyName =
    t(
      `roles.${role}.setupFriendlyName`
    );

  useEffect(
    () => {
      let cancelled =
        false;

      async function begin() {
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
          cancelled
        ) {
          return;
        }

        if (
          factorsError
        ) {
          console.error(
            "MFA factors lookup failed:",
            factorsError
          );

          setError(
            t(
              "factorsUnavailable"
            )
          );

          return;
        }

        if (
          factors.totp.length >
          0
        ) {
          router.replace(
            `/mfa/admin/verify?next=${encodeURIComponent(nextPath)}`
          );

          return;
        }

        const {
          data,
          error:
            enrollError,
        } =
          await supabase.auth.mfa
            .enroll({
              factorType:
                "totp",
              friendlyName,
            });

        if (
          cancelled
        ) {
          return;
        }

        if (
          enrollError ||
          !data
        ) {
          console.error(
            "MFA enrollment failed:",
            enrollError
          );

          setError(
            enrollError
              ?.message ??
            t(
              "setupUnavailable"
            )
          );

          return;
        }

        setEnrollment({
          factorId:
            data.id,
          qrCode:
            data.totp
              .qr_code,
          secret:
            data.totp
              .secret,
        });
      }

      void begin();

      return () => {
        cancelled =
          true;
      };
    },
    [
      friendlyName,
      nextPath,
      router,
      t,
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

    if (
      !enrollment
    ) {
      setError(
        t(
          "setupNotReady"
        )
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
            "MFA enrollment verification failed:",
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
    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          {t(
            `roles.${role}.setupEyebrow`
          )}
        </p>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          {t(
            "setupPageTitle"
          )}
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            `roles.${role}.setupDescription`
          )}
        </p>
      </header>

      {!enrollment &&
        !error && (
        <div className="mt-7 rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-center text-sm text-gray-600">
          {t(
            "generatingQr"
          )}
        </div>
      )}

      {enrollment && (
        <>
          <ol className="mt-7 space-y-2.5 text-sm leading-6 text-gray-700">
            <li>
              <strong>
                1.
              </strong>{" "}
              {t(
                "stepOne"
              )}
            </li>

            <li>
              <strong>
                2.
              </strong>{" "}
              {t(
                "stepTwo"
              )}
            </li>

            <li>
              <strong>
                3.
              </strong>{" "}
              {t(
                "stepThree"
              )}
            </li>
          </ol>

          <div className="mt-5 flex justify-center">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              {/* Supabase returns an image-compatible QR-code data URI. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  enrollment.qrCode
                }
                alt={
                  t(
                    `roles.${role}.setupQrAlt`
                  )
                }
                width={
                  220
                }
                height={
                  220
                }
                className="h-[220px] w-[220px]"
              />
            </div>
          </div>

          <details className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-800">
              {t(
                "cannotScanQr"
              )}
            </summary>

            <p className="mt-3 text-sm text-gray-600">
              {t(
                "manualKey"
              )}
            </p>

            <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-xs text-gray-900">
              {
                enrollment.secret
              }
            </code>
          </details>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-6 space-y-5"
          >
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {t(
                  "authenticatorCode"
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
                `roles.${role}.setupButton`
              )}
            </Button>
          </form>
        </>
      )}

      {!enrollment &&
        error && (
        <div
          role="alert"
          className="mt-7 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {
            error
          }
        </div>
      )}
    </div>
  );
}
