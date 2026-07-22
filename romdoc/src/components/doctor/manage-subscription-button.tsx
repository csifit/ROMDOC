"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useEffect,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";

type PortalResponse = {
  url?: string;
  error?: string;
};

export default function ManageSubscriptionButton() {
  const locale = useLocale();
  const t = useTranslations(
    "DoctorApplication.manage"
  );

  const [isPending, startTransition] =
    useTransition();
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    document.cookie =
      `NEXT_LOCALE=${encodeURIComponent(locale)}; ` +
      "Path=/; Max-Age=31536000; SameSite=Lax";
  }, [locale]);

  function openPortal() {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(
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
          console.error(
            "Stripe customer portal failed:",
            result.error
          );

          throw new Error(
            t("genericError")
          );
        }

        window.location.assign(
          result.url
        );
      } catch (portalError) {
        setError(
          portalError instanceof Error
            ? portalError.message
            : t("genericError")
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
        loadingText={t("opening")}
        onClick={openPortal}
      >
        {t("button")}
      </Button>

      {error && (
        <p className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
