"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useState,
} from "react";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type CheckoutResponse = {
  url?: string;
  error?: string;
};

export default function DoctorSmsBillingPaymentButton() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorConfiguration.smsPayment"
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  async function startPayment() {
    if (
      isLoading
    ) {
      return;
    }

    setIsLoading(
      true
    );

    setError(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/doctor/sms-billing/checkout",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "pay_unpaid_sms_balance",
              }),
          }
        );

      const payload =
        (await response.json()) as
          CheckoutResponse;

      if (
        !response.ok ||
        !payload.url
      ) {
        throw new Error(
          locale ===
            "ro" &&
          payload.error
            ? payload.error
            : t(
                "error"
              )
        );
      }

      window.location.href =
        payload.url;
    } catch (
      paymentError
    ) {
      setError(
        paymentError instanceof
          Error
          ? paymentError.message
          : t(
              "error"
            )
      );

      setIsLoading(
        false
      );
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={
          startPayment
        }
        disabled={
          isLoading
        }
        className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading
          ? t(
              "opening"
            )
          : t(
              "pay"
            )}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
