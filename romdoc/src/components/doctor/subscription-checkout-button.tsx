"use client";

import {
  useState,
  useTransition,
} from "react";

type BillingInterval =
  | "monthly"
  | "yearly";

type CheckoutResponse = {
  url?: string;
  error?: string;
};

type SubscriptionCheckoutButtonProps = {
  defaultBillingInterval?:
    BillingInterval;
};

function formatPrice(
  value: number
) {
  return new Intl.NumberFormat(
    "ro-RO",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

export default function SubscriptionCheckoutButton({
  defaultBillingInterval =
    "monthly",
}: SubscriptionCheckoutButtonProps) {
  const [
    billingInterval,
    setBillingInterval,
  ] =
    useState<BillingInterval>(
      defaultBillingInterval
    );

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [error, setError] =
    useState<string | null>(
      null
    );

  const monthlyPrice =
    Number(
      process.env
        .NEXT_PUBLIC_DOCTOR_MONTHLY_PRICE_RON ??
        "50"
    );

  const yearlyPriceValue =
    process.env
      .NEXT_PUBLIC_DOCTOR_YEARLY_PRICE_RON;

  const yearlyPrice =
    yearlyPriceValue
      ? Number(yearlyPriceValue)
      : null;

  const yearlyMonthlyEquivalent =
    yearlyPrice !== null &&
    Number.isFinite(
      yearlyPrice
    )
      ? yearlyPrice / 12
      : null;

  const yearlySaving =
    yearlyPrice !== null &&
    Number.isFinite(
      yearlyPrice
    ) &&
    Number.isFinite(
      monthlyPrice
    )
      ? monthlyPrice * 12 -
        yearlyPrice
      : null;

  function startCheckout() {
    setError(null);

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

              body:
                JSON.stringify({
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
      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            setBillingInterval(
              "monthly"
            )
          }
          className={`rounded-2xl border p-5 text-left transition ${
            billingInterval ===
            "monthly"
              ? "border-[#036661] bg-[#036661]/5 ring-2 ring-[#036661]/15"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Plan lunar
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formatPrice(
                  monthlyPrice
                )}{" "}
                RON
              </p>

              <p className="mt-1 text-sm text-gray-500">
                pe lună + TVA
              </p>
            </div>

            <span
              aria-hidden="true"
              className={`mt-1 h-5 w-5 rounded-full border-2 ${
                billingInterval ===
                "monthly"
                  ? "border-[#036661] bg-[#036661] shadow-[inset_0_0_0_4px_white]"
                  : "border-gray-300 bg-white"
              }`}
            />
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            Facturare lunară și flexibilitate maximă.
          </p>
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            setBillingInterval(
              "yearly"
            )
          }
          className={`rounded-2xl border p-5 text-left transition ${
            billingInterval ===
            "yearly"
              ? "border-[#036661] bg-[#036661]/5 ring-2 ring-[#036661]/15"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  Plan anual
                </p>

                {yearlySaving !==
                  null &&
                  yearlySaving >
                    0 && (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                      Economisești{" "}
                      {formatPrice(
                        yearlySaving
                      )}{" "}
                      RON
                    </span>
                  )}
              </div>

              {yearlyPrice !==
                null &&
              Number.isFinite(
                yearlyPrice
              ) ? (
                <>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {formatPrice(
                      yearlyPrice
                    )}{" "}
                    RON
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    pe an + TVA
                  </p>
                </>
              ) : (
                <p className="mt-2 text-lg font-bold text-gray-900">
                  Facturare anuală
                </p>
              )}
            </div>

            <span
              aria-hidden="true"
              className={`mt-1 h-5 w-5 rounded-full border-2 ${
                billingInterval ===
                "yearly"
                  ? "border-[#036661] bg-[#036661] shadow-[inset_0_0_0_4px_white]"
                  : "border-gray-300 bg-white"
              }`}
            />
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            {yearlyMonthlyEquivalent !==
              null
              ? `Echivalent cu aproximativ ${formatPrice(
                  yearlyMonthlyEquivalent
                )} RON pe lună.`
              : "O singură plată pentru 12 luni de acces."}
          </p>
        </button>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={startCheckout}
        className="mt-5 w-full rounded-xl bg-[#036661] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Se deschide pagina de plată..."
          : billingInterval ===
              "yearly"
            ? "Continuă cu planul anual"
            : "Continuă cu planul lunar"}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-gray-500">
        Plata și facturarea sunt procesate securizat de Stripe.
      </p>

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