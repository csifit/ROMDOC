"use client";

import {
  useState,
  useTransition,
} from "react";
import Button from "@/components/ui/button";

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
          (await response.json()) as PortalResponse;

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
          portalError instanceof Error
            ? portalError.message
            : "Portalul nu a putut fi deschis."
        );
      }
    });
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        isLoading={isPending}
        loadingText="Se deschide..."
        onClick={openPortal}
      >
        Administrează abonamentul
      </Button>

      {error && (
        <p className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}