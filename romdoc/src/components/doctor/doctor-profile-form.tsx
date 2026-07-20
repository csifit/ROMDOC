"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import {
  useRouter,
} from "next/navigation";

import Button from "@/components/ui/button";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type DoctorProfileFormProps = {
  initialPhone: string;
  initialEmail: string;

  initialYearsExperience:
    | number
    | null;

  initialConsultationPrice:
    | number
    | null;

  initialTitleRo: string;
  initialBiographyRo: string;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  partialSuccess?: boolean;
};

export default function DoctorProfileForm({
  initialPhone,
  initialEmail,
  initialYearsExperience,
  initialConsultationPrice,
  initialTitleRo,
  initialBiographyRo,
}: DoctorProfileFormProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorConfiguration.profileForm"
    );

  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    phone,
    setPhone,
  ] =
    useState(
      initialPhone
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      initialEmail
    );

  const [
    yearsExperience,
    setYearsExperience,
  ] =
    useState(
      initialYearsExperience
        ?.toString() ??
        ""
    );

  const [
    consultationPrice,
    setConsultationPrice,
  ] =
    useState(
      initialConsultationPrice
        ?.toString() ??
        ""
    );

  const [
    titleRo,
    setTitleRo,
  ] =
    useState(
      initialTitleRo
    );

  const [
    biographyRo,
    setBiographyRo,
  ] =
    useState(
      initialBiographyRo
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

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage(
      null
    );

    setError(
      null
    );

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/profile",
              {
                method:
                  "PATCH",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    phone:
                      phone.trim() ||
                      null,

                    email:
                      email.trim() ||
                      null,

                    yearsExperience:
                      yearsExperience
                        .trim()
                        ? Number(
                            yearsExperience
                          )
                        : null,

                    consultationPrice:
                      consultationPrice
                        .trim()
                        ? Number(
                            consultationPrice
                          )
                        : null,

                    titleRo:
                      titleRo.trim() ||
                      null,

                    biographyRo:
                      biographyRo
                        .trim() ||
                      null,
                  }),
              }
            );

          const result =
            (await response.json()) as
              ApiResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              locale ===
                "ro" &&
              result.error
                ? result.error
                : t(
                    "saveError"
                  )
            );
          }

          setMessage(
            t(
              "saved"
            )
          );

          router.refresh();
        } catch (
          submitError
        ) {
          setError(
            submitError instanceof
              Error
              ? submitError.message
              : t(
                  "saveError"
                )
          );
        }
      }
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t(
            "title"
          )}
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t(
              "phone"
            )}
          </span>

          <input
            type="tel"
            value={
              phone
            }
            onChange={(
              event
            ) =>
              setPhone(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            placeholder="+40 700 000 000"
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t(
              "email"
            )}
          </span>

          <input
            type="email"
            value={
              email
            }
            onChange={(
              event
            ) =>
              setEmail(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            placeholder="doctor@example.com"
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t(
              "years"
            )}
          </span>

          <input
            type="number"
            min="0"
            max="80"
            step="1"
            value={
              yearsExperience
            }
            onChange={(
              event
            ) =>
              setYearsExperience(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t(
              "consultationPrice"
            )}
          </span>

          <div className="mt-2 flex">
            <input
              type="number"
              min="0"
              max="100000"
              step="0.01"
              value={
                consultationPrice
              }
              onChange={(
                event
              ) =>
                setConsultationPrice(
                  event.target
                    .value
                )
              }
              disabled={
                isPending
              }
              className="min-w-0 flex-1 rounded-l-xl border border-r-0 border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
            />

            <span className="flex items-center rounded-r-xl border border-gray-300 bg-gray-50 px-4 text-sm font-medium text-gray-600">
              RON
            </span>
          </div>
        </label>
      </div>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t(
              "romanianTitle"
            )}
          </span>

          <input
            type="text"
            value={
              titleRo
            }
            onChange={(
              event
            ) =>
              setTitleRo(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            maxLength={
              200
            }
            placeholder={t(
              "romanianTitlePlaceholder"
            )}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t(
              "romanianBiography"
            )}
          </span>

          <textarea
            value={
              biographyRo
            }
            onChange={(
              event
            ) =>
              setBiographyRo(
                event.target
                  .value
              )
            }
            disabled={
              isPending
            }
            maxLength={
              10000
            }
            rows={
              8
            }
            placeholder={t(
              "romanianBiographyPlaceholder"
            )}
            className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
          />

          <span className="mt-1 block text-right text-xs text-gray-500">
            {
              biographyRo.length
            }{" "}
            / 10000
          </span>
        </label>
      </div>

      {message && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          type="submit"
          disabled={
            isPending
          }
        >
          {isPending
            ? t(
                "saving"
              )
            : t(
                "save"
              )}
        </Button>
      </div>
    </form>
  );
}
