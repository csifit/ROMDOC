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

type BillingInterval =
  | "monthly"
  | "yearly";

type CheckoutResponse = {
  url?: string;
  error?: string;
};

type SubscriptionCheckoutButtonProps = {
  monthlyPrice: string;
  yearlyPrice: string;
};

export default function SubscriptionCheckoutButton({
  monthlyPrice,
  yearlyPrice,
}: SubscriptionCheckoutButtonProps) {
  const locale = useLocale();
  const t = useTranslations(
    "DoctorApplication.checkout"
  );

  const [isPending, startTransition] =
    useTransition();
  const [selectedInterval, setSelectedInterval] =
    useState<BillingInterval | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    document.cookie =
      `NEXT_LOCALE=${encodeURIComponent(locale)}; ` +
      "Path=/; Max-Age=31536000; SameSite=Lax";
  }, [locale]);

  const plans: Array<{
    interval: BillingInterval;
    title: string;
    price: string;
    description: string;
    buttonLabel: string;
  }> = [
    {
      interval: "monthly",
      title: t("monthlyTitle"),
      price: t("monthlyPrice", {
        price: monthlyPrice,
      }),
      description: t(
        "monthlyDescription"
      ),
      buttonLabel: t("monthlyButton"),
    },
    {
      interval: "yearly",
      title: t("yearlyTitle"),
      price: t("yearlyPrice", {
        price: yearlyPrice,
      }),
      description: t(
        "yearlyDescription"
      ),
      buttonLabel: t("yearlyButton"),
    },
  ];

  function startCheckout(
    billingInterval: BillingInterval
  ) {
    setError(null);
    setSelectedInterval(
      billingInterval
    );

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/stripe/create-checkout-session",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              billingInterval,
            }),
          }
        );

        const result =
          (await response.json()) as
            CheckoutResponse;

        if (
          !response.ok ||
          !result.url
        ) {
          console.error(
            "Stripe checkout session failed:",
            result.error
          );

          throw new Error(
            t("genericError")
          );
        }

        window.location.assign(
          result.url
        );
      } catch (checkoutError) {
        setSelectedInterval(null);

        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : t("genericError")
        );
      }
    });
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isThisPlanPending =
            isPending &&
            selectedInterval ===
              plan.interval;

          return (
            <article
              key={plan.interval}
              className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-bold text-gray-900">
                {plan.title}
              </h3>

              <p className="mt-2 text-xl font-bold text-[#036661]">
                {plan.price}
              </p>

              <p className="mt-3 flex-1 text-sm leading-6 text-gray-600">
                {plan.description}
              </p>

              <div className="mt-5">
                <Button
                  type="button"
                  fullWidth
                  isLoading={
                    isThisPlanPending
                  }
                  loadingText={t(
                    "openingCheckout"
                  )}
                  disabled={
                    isPending &&
                    !isThisPlanPending
                  }
                  onClick={() =>
                    startCheckout(
                      plan.interval
                    )
                  }
                >
                  {plan.buttonLabel}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

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
