"use client";

import {
  useState,
  useTransition,
} from "react";

type PortalResponse = {
  url?: string;
  error?: string;
};

export default function ManageSubscriptionButton() {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [error, setError] =
    useState<string | null>(
      null
    );

  function openPortal() {
    setError(null);

    startTransition(async () => {
      try {
        const response =
          await fetch(
            "/api/stripe/customer-portal",
            {
              method: "POST",
            }
          );

        const result =
          (await response.json()) as
            PortalResponse;

        if (
          !response.ok ||
          !result.url
        ) {
          throw new Error(
            result.error ??
              "Portalul nu a putut fi deschis."
          );
        }

        window.location.assign(
          result.url
        );
      } catch (portalError) {
        setError(
          portalError instanceof
            Error
            ? portalError.message
            : "Portalul nu a putut fi deschis."
        );
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={openPortal}
        className="rounded-xl border border-[#036661] bg-white px-5 py-3 text-sm font-semibold text-[#036661] transition-colors hover:border-[#ff2800] hover:bg-[#ff2800] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Se deschide portalul..."
          : "Administrează sau schimbă planul"}
      </button>

      <p className="mt-2 max-w-md text-xs leading-5 text-gray-500">
        Poți schimba planul lunar sau anual, metoda de plată și
        setările de facturare în portalul securizat Stripe.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}