"use client";

import Link from "next/link";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type ClosureResponse = {
  success?: boolean;
  requestedAt?:
    | string
    | null;
  message?: string;
  error?: string;
};

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

function formatDate(
  value: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      dateStyle: "long",
      timeStyle: "short",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(
    new Date(value)
  );
}

function getPrivacyHref(
  locale: AppLocale
) {
  if (locale === "en") {
    return "/en/privacy-policy";
  }

  if (locale === "de") {
    return "/de/datenschutz";
  }

  return "/ro/confidentialitate";
}

export default function PatientAccountSettings() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientPages.account"
    );

  const [
    requestedAt,
    setRequestedAt,
  ] = useState<
    string | null
  >(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const privacyHref =
    getPrivacyHref(
      locale
    );

  const loadStatus =
    useCallback(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/patient/account-closure",
              {
                method:
                  "GET",
                cache:
                  "no-store",
              }
            );

          const payload =
            (await response.json()) as
              ClosureResponse;

          if (!response.ok) {
            throw new Error(
              locale === "ro" &&
              payload.error
                ? payload.error
                : t(
                    "statusLoadError"
                  )
            );
          }

          setRequestedAt(
            payload.requestedAt ??
              null
          );
        } catch (loadError) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : t(
                  "statusLoadError"
                )
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        locale,
        t,
      ]
    );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function requestClosure() {
    const confirmed =
      window.confirm(
        t(
          "requestConfirm"
        )
      );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/patient/account-closure",
          {
            method:
              "POST",
          }
        );

      const payload =
        (await response.json()) as
          ClosureResponse;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : t(
                "requestError"
              )
        );
      }

      setRequestedAt(
        payload.requestedAt ??
          new Date().toISOString()
      );

      setMessage(
        locale === "ro" &&
        payload.message
          ? payload.message
          : t(
              "requestSuccess"
            )
      );
    } catch (requestError) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : t(
              "requestError"
            )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelRequest() {
    const confirmed =
      window.confirm(
        t(
          "cancelConfirm"
        )
      );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/patient/account-closure",
          {
            method:
              "DELETE",
          }
        );

      const payload =
        (await response.json()) as
          ClosureResponse;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : t(
                "cancelError"
              )
        );
      }

      setRequestedAt(null);

      setMessage(
        locale === "ro" &&
        payload.message
          ? payload.message
          : t(
              "cancelSuccess"
            )
      );
    } catch (cancelError) {
      setError(
        cancelError instanceof
          Error
          ? cancelError.message
          : t(
              "cancelError"
            )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-[21px]">
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          {t(
            "eyebrow"
          )}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold tracking-tight text-gray-900">
          {t(
            "title"
          )}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>

        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "retention"
          )}{" "}
          <Link
            href={privacyHref}
            className="romdoc-focus-ring rounded-sm font-semibold text-[#036661] underline underline-offset-4"
          >
            {t(
              "privacyPolicy"
            )}
          </Link>
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-900"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-[13px] border border-green-200 bg-green-50 px-[13px] py-[13px] text-sm text-green-900"
        >
          {message}
        </div>
      )}

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <h2 className="text-xl font-bold text-gray-900">
          {t(
            "closureTitle"
          )}
        </h2>

        {isLoading ? (
          <p className="mt-[13px] text-sm text-gray-600">
            {t(
              "loading"
            )}
          </p>
        ) : requestedAt ? (
          <>
            <div className="mt-[21px] rounded-[21px] border border-amber-200 bg-amber-50 p-[21px]">
              <p className="font-semibold text-amber-950">
                {t(
                  "requested"
                )}
              </p>

              <p className="mt-[8px] text-sm text-amber-900">
                {t(
                  "requestedAt",
                  {
                    date:
                      formatDate(
                        requestedAt,
                        locale
                      ),
                  }
                )}
              </p>

              <p className="mt-[8px] text-sm text-amber-900">
                {t(
                  "activeUntilBlocked"
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={
                cancelRequest
              }
              disabled={
                isSubmitting
              }
              className="romdoc-focus-ring mt-[21px] inline-flex min-h-[55px] items-center justify-center rounded-[13px] border border-gray-300 bg-white px-[21px] py-[13px] text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? t(
                    "processing"
                  )
                : t(
                    "cancelRequest"
                  )}
            </button>
          </>
        ) : (
          <>
            <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
              {t(
                "explanation"
              )}
            </p>

            <button
              type="button"
              onClick={
                requestClosure
              }
              disabled={
                isSubmitting
              }
              className="romdoc-focus-ring mt-[21px] inline-flex min-h-[55px] items-center justify-center rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? t(
                    "sending"
                  )
                : t(
                    "requestClosure"
                  )}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
