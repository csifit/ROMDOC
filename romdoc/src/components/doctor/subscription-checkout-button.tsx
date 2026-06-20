"use client";

import {
  useState,
  useTransition,
} from "react";

type CheckoutResponse = {
  url?: string;
  error?: string;
};

export default function SubscriptionCheckoutButton() {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [error, setError] =
    useState<string | null>(
      null
    );

  function startCheckout() {
    setError(null);

    startTransition(async () => {
      try {
        const response =
          await fetch(
            "/api/stripe/create-checkout-session",
            {
              method: "POST",
            }
          );

        const result =
          (await response.json()) as CheckoutResponse;

        if (
          !response.ok ||
          !result.url
        ) {
          throw new Error(
            result.error ??
              "Pagina de plată nu a putut fi deschisă."
          );
        }

        window.location.assign(
          result.url
        );
      } catch (checkoutError) {
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : "Pagina de plată nu a putut fi deschisă."
        );
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={startCheckout}
        className="w-full rounded-xl bg-[#D97757] px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Se deschide pagina de plată..."
          : "Activează abonamentul"}
      </button>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}
    </div>
  );
}