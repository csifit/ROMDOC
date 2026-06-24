"use client";

import {
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

const plans: Array<{
  interval: BillingInterval;
  title: string;
  price: string;
  description: string;
  buttonLabel: string;
}> = [
  {
    interval: "monthly",
    title: "Abonament lunar",
    price: "60 RON + TVA / lună",
    description:
      "Facturare lunară recurentă. Poți administra abonamentul ulterior din portalul Stripe.",
    buttonLabel:
      "Activează abonamentul lunar",
  },
  {
    interval: "yearly",
    title: "Abonament anual",
    price: "600 RON + TVA / an",
    description:
      "Facturare anuală recurentă, cu un cost mai avantajos decât plata lunară.",
    buttonLabel:
      "Activează abonamentul anual",
  },
];

export default function
SubscriptionCheckoutButton() {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    selectedInterval,
    setSelectedInterval,
  ] =
    useState<BillingInterval | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(null);

  function startCheckout(
    billingInterval:
      BillingInterval
  ) {
    setError(null);
    setSelectedInterval(
      billingInterval
    );

    startTransition(async () => {
      try {
        const response =
          await fetch(
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
          throw new Error(
            result.error ??
              "Pagina de plată nu a putut fi deschisă."
          );
        }

        window.location.assign(
          result.url
        );
      } catch (checkoutError) {
        setSelectedInterval(null);

        setError(
          checkoutError instanceof
            Error
            ? checkoutError.message
            : "Pagina de plată nu a putut fi deschisă."
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
                  loadingText="Se deschide pagina de plată..."
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
