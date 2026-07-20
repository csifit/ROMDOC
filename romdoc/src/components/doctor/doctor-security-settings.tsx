"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";
import {
  createClient,
} from "@/lib/supabase/client";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type TotpFactor = {
  id: string;
  status: "verified";

  friendly_name?:
    string;

  created_at?:
    string;

  updated_at?:
    string;
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
  | "disabling"
  | "error";

const DATE_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro:
      "ro-RO",
    en:
      "en-GB",
    de:
      "de-DE",
  };

export default function DoctorSecuritySettings() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorConfiguration.security"
    );

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
    useState<
      TotpFactor | null
    >(
      null
    );

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
    useState(
      ""
    );

  const [
    disableConfirmed,
    setDisableConfirmed,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const loadStatus =
    useCallback(
      async () => {
        setError(
          null
        );

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
            t(
              "statusError"
            )
          );

          setViewState(
            "error"
          );

          return;
        }

        const activeFactor =
          data.totp[0] ??
          null;

        if (
          activeFactor
        ) {
          setVerifiedFactor(
            activeFactor as
              TotpFactor
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
      },
      [
        t,
      ]
    );

  useEffect(() => {
    void loadStatus();
  }, [
    loadStatus,
  ]);

  function beginEnrollment() {
    setError(
      null
    );

    setMessage(
      null
    );

    setCode(
      ""
    );

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
            t(
              "enrollError"
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

    setError(
      null
    );

    setMessage(
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
          "codeRequired"
        )
      );

      return;
    }

    if (
      !enrollment
    ) {
      setError(
        t(
          "enrollmentUnavailable"
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
                enrollment
                  .factorId,

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
            t(
              "invalidCode"
            )
          );

          return;
        }

        setMessage(
          t(
            "enabledMessage"
          )
        );

        setCode(
          ""
        );

        setEnrollment(
          null
        );

        await loadStatus();
      }
    );
  }

  function cancelEnrollment() {
    setError(
      null
    );

    setMessage(
      null
    );

    setCode(
      ""
    );

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
                  enrollment
                    .factorId,
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

  function beginDisable() {
    setError(
      null
    );

    setMessage(
      null
    );

    setCode(
      ""
    );

    setDisableConfirmed(
      false
    );

    setViewState(
      "disabling"
    );
  }

  function cancelDisable() {
    setError(
      null
    );

    setMessage(
      null
    );

    setCode(
      ""
    );

    setDisableConfirmed(
      false
    );

    setViewState(
      "enabled"
    );
  }

  function disableMfa(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

    setMessage(
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
          "currentCodeRequired"
        )
      );

      return;
    }

    if (
      !disableConfirmed
    ) {
      setError(
        t(
          "disableConfirmRequired"
        )
      );

      return;
    }

    if (
      !verifiedFactor
    ) {
      setError(
        t(
          "factorUnavailable"
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
                verifiedFactor.id,

              code:
                normalizedCode,
            });

        if (
          verifyError
        ) {
          setError(
            t(
              "invalidCode"
            )
          );

          return;
        }

        const {
          error:
            unenrollError,
        } =
          await supabase.auth.mfa
            .unenroll({
              factorId:
                verifiedFactor.id,
            });

        if (
          unenrollError
        ) {
          console.error(
            "Doctor MFA unenroll failed:",
            unenrollError
          );

          setError(
            t(
              "disableError"
            )
          );

          return;
        }

        setVerifiedFactor(
          null
        );

        setCode(
          ""
        );

        setDisableConfirmed(
          false
        );

        setMessage(
          t(
            "disabledMessage"
          )
        );

        setViewState(
          "disabled"
        );
      }
    );
  }

  if (
    viewState ===
    "loading"
  ) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-6 text-sm text-gray-600">
        {t(
          "checking"
        )}
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
          {t(
            "retry"
          )}
        </Button>
      </div>
    );
  }

  if (
    viewState ===
      "enabled" &&
    verifiedFactor
  ) {
    const dateValue =
      verifiedFactor
        .updated_at ??
      verifiedFactor
        .created_at;

    const enabledAt =
      dateValue
        ? new Intl
            .DateTimeFormat(
              DATE_LOCALE[
                locale
              ],
              {
                dateStyle:
                  "medium",

                timeStyle:
                  "short",
              }
            )
            .format(
              new Date(
                dateValue
              )
            )
        : null;

    return (
      <section className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-bold text-green-900">
          {t(
            "enabledTitle"
          )}
        </h2>

        <p className="mt-2 text-sm leading-6 text-green-800">
          {t(
            "enabledDescription"
          )}
        </p>

        {enabledAt && (
          <p className="mt-3 text-xs text-green-700">
            {t(
              "verifiedAt",
              {
                date:
                  enabledAt,
              }
            )}
          </p>
        )}

        {message && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-green-300 bg-white px-4 py-3 text-sm text-green-900"
          >
            {message}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-green-200 bg-white px-4 py-4 text-sm leading-6 text-gray-700">
          {t(
            "disableInfo"
          )}
        </div>

        <button
          type="button"
          onClick={
            beginDisable
          }
          className="mt-5 rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          {t(
            "disable"
          )}
        </button>
      </section>
    );
  }

  if (
    viewState ===
      "disabling" &&
    verifiedFactor
  ) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-xl font-bold text-red-900">
          {t(
            "disableTitle"
          )}
        </h2>

        <p className="mt-3 text-sm leading-6 text-red-800">
          {t(
            "disableDescription"
          )}
        </p>

        <form
          onSubmit={
            disableMfa
          }
          className="mt-6 space-y-5"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-800">
              {t(
                "currentCode"
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
                event
              ) =>
                setCode(
                  event.target
                    .value
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
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-xl tracking-[0.35em]"
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-white p-4">
            <input
              type="checkbox"
              checked={
                disableConfirmed
              }
              disabled={
                isPending
              }
              onChange={(
                event
              ) =>
                setDisableConfirmed(
                  event.target
                    .checked
                )
              }
              className="mt-1 h-4 w-4"
            />

            <span className="text-sm leading-6 text-gray-700">
              {t(
                "disableAcknowledgement"
              )}
            </span>
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={
                isPending
              }
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending
                ? t(
                    "disabling"
                  )
                : t(
                    "confirmDisable"
                  )}
            </button>

            <button
              type="button"
              disabled={
                isPending
              }
              onClick={
                cancelDisable
              }
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700"
            >
              {t(
                "cancel"
              )}
            </button>
          </div>
        </form>
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
          {t(
            "connectTitle"
          )}
        </h2>

        <ol className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
          {[
            t(
              "step1"
            ),
            t(
              "step2"
            ),
            t(
              "step3"
            ),
            t(
              "step4"
            ),
          ].map(
            (
              step,
              index
            ) => (
              <li
                key={
                  step
                }
              >
                <strong>
                  {index +
                    1}.
                </strong>{" "}
                {step}
              </li>
            )
          )}
        </ol>

        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                enrollment
                  .qrCode
              }
              alt={t(
                "qrAlt"
              )}
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

        <details className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-800">
            {t(
              "cannotScan"
            )}
          </summary>

          <p className="mt-3 text-sm text-gray-600">
            {t(
              "manualSecret"
            )}
          </p>

          <code className="mt-2 block break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-900">
            {
              enrollment.secret
            }
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
              {t(
                "code"
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
                event
              ) =>
                setCode(
                  event.target
                    .value
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
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-xl tracking-[0.35em]"
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
              loadingText={t(
                "verifying"
              )}
            >
              {t(
                "activate"
              )}
            </Button>

            <button
              type="button"
              disabled={
                isPending
              }
              onClick={
                cancelEnrollment
              }
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700"
            >
              {t(
                "cancel"
              )}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
      <h2 className="text-lg font-bold text-gray-900">
        {t(
          "disabledTitle"
        )}
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        {t(
          "disabledDescription"
        )}
      </p>

      <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
        <li>
          •{" "}
          {t(
            "benefit1"
          )}
        </li>

        <li>
          •{" "}
          {t(
            "benefit2"
          )}
        </li>

        <li>
          •{" "}
          {t(
            "benefit3"
          )}
        </li>
      </ul>

      {message && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <Button
        type="button"
        onClick={
          beginEnrollment
        }
        isLoading={
          isPending
        }
        loadingText={t(
          "preparing"
        )}
        className="mt-6"
      >
        {t(
          "activate"
        )}
      </Button>
    </section>
  );
}
