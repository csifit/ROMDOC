"use client";

import {
  useState,
  useTransition,
} from "react";
import Button from "@/components/ui/button";

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
      <Button
        type="button"
        fullWidth
        isLoading={isPending}
        loadingText="Se deschide pagina de plată..."
        onClick={startCheckout}
      >
        Activează abonamentul
      </Button>

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