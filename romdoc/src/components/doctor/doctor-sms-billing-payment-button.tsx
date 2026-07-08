"use client";

import { useState } from "react";

type DoctorSmsBillingPaymentButtonProps = {
  billingPeriodId: string;
};

type CheckoutResponse = {
  url?: string;
  error?: string;
};

export default function DoctorSmsBillingPaymentButton({
  billingPeriodId,
}: DoctorSmsBillingPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function startPayment() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/doctor/sms-billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingPeriodId,
        }),
      });

      const payload = (await response.json()) as CheckoutResponse;

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error ?? "Procesul de plată nu a putut fi pornit."
        );
      }

      window.location.href = payload.url;
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Procesul de plată nu a putut fi pornit."
      );
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startPayment}
        disabled={isLoading}
        className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Se deschide Stripe..." : "Plătește acum"}
      </button>

      {error ? (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
