"use client";

import {
  useLocale,
} from "next-intl";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";

type BillingInterval =
  | "monthly"
  | "yearly";

type SetupResponse = {
  url?: string;
  error?: string;
};

type ComplimentarySubscriptionSetupProps = {
  complimentaryEndsAt: string;
  monthlyPrice:
    | string
    | null;
  yearlyPrice:
    | string
    | null;
};

type Copy = {
  title: string;
  description: string;
  monthly: string;
  yearly: string;
  firstBilling: string;
  finalPriceNote: string;
  button: string;
  opening: string;
  genericError: string;
};

const COPY: Record<
  "ro" | "en" | "de",
  Copy
> = {
  ro: {
    title:
      "Configurează abonamentul viitor",
    description:
      "Alege planul. Stripe va salva metoda de plată acum, dar nu va începe facturarea până la sfârșitul perioadei gratuite.",
    monthly: "Lunar",
    yearly: "Anual",
    firstBilling:
      "Prima perioadă de facturare începe după",
    finalPriceNote:
      "Stripe va afișa suma finală și taxele aplicabile înainte de confirmare.",
    button:
      "Configurează plata în Stripe",
    opening:
      "Se deschide Stripe...",
    genericError:
      "Configurarea Stripe nu a putut fi pornită.",
  },
  en: {
    title:
      "Set up the future subscription",
    description:
      "Choose a plan. Stripe will save the payment method now, but billing will not begin until the complimentary period ends.",
    monthly: "Monthly",
    yearly: "Yearly",
    firstBilling:
      "The first billing period begins after",
    finalPriceNote:
      "Stripe will show the final amount and any applicable taxes before confirmation.",
    button:
      "Set up payment in Stripe",
    opening:
      "Opening Stripe...",
    genericError:
      "Stripe setup could not be started.",
  },
  de: {
    title:
      "Zukünftiges Abonnement einrichten",
    description:
      "Wähle einen Plan. Stripe speichert die Zahlungsmethode jetzt, beginnt die Abrechnung aber erst nach Ende des kostenlosen Zeitraums.",
    monthly: "Monatlich",
    yearly: "Jährlich",
    firstBilling:
      "Die erste Abrechnungsperiode beginnt nach",
    finalPriceNote:
      "Stripe zeigt den Endbetrag und die anwendbaren Steuern vor der Bestätigung an.",
    button:
      "Zahlung in Stripe einrichten",
    opening:
      "Stripe wird geöffnet...",
    genericError:
      "Die Stripe-Einrichtung konnte nicht gestartet werden.",
  },
};

function getCopy(
  locale: string
) {
  if (
    locale === "en" ||
    locale === "de"
  ) {
    return COPY[locale];
  }

  return COPY.ro;
}

function getDateLocale(
  locale: string
) {
  if (locale === "en") {
    return "en-GB";
  }

  if (locale === "de") {
    return "de-DE";
  }

  return "ro-RO";
}

export default function ComplimentarySubscriptionSetup({
  complimentaryEndsAt,
  monthlyPrice,
  yearlyPrice,
}: ComplimentarySubscriptionSetupProps) {
  const locale =
    useLocale();
  const copy =
    getCopy(locale);

  const [
    billingInterval,
    setBillingInterval,
  ] =
    useState<BillingInterval>(
      "monthly"
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    document.cookie =
      `NEXT_LOCALE=${encodeURIComponent(
        locale
      )}; ` +
      "Path=/; Max-Age=31536000; SameSite=Lax";
  }, [locale]);

  const endDate =
    useMemo(
      () =>
        new Intl.DateTimeFormat(
          getDateLocale(locale),
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone:
              "Europe/Bucharest",
          }
        ).format(
          new Date(
            complimentaryEndsAt
          )
        ),
      [
        complimentaryEndsAt,
        locale,
      ]
    );

  function startSetup() {
    setError(null);

    startTransition(async () => {
      try {
        const response =
          await fetch(
            "/api/stripe/complimentary-subscription-checkout",
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
            SetupResponse;

        if (
          !response.ok ||
          !result.url
        ) {
          throw new Error(
            result.error ||
              copy.genericError
          );
        }

        window.location.assign(
          result.url
        );
      } catch (
        setupError
      ) {
        setError(
          setupError instanceof Error
            ? setupError.message
            : copy.genericError
        );
      }
    });
  }

  return (
    <div className="rounded-[21px] border border-[#036661]/20 bg-white p-5">
      <p className="font-semibold text-gray-900">
        {copy.title}
      </p>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        {copy.description}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          aria-pressed={
            billingInterval ===
            "monthly"
          }
          onClick={() =>
            setBillingInterval(
              "monthly"
            )
          }
          className={[
            "rounded-[13px] border px-4 py-3 text-sm font-semibold transition",
            billingInterval ===
            "monthly"
              ? "border-[#036661] bg-[#036661] text-white"
              : "border-gray-200 bg-white text-gray-800 hover:border-[#036661]",
          ].join(" ")}
        >
          {copy.monthly}
          {monthlyPrice
            ? ` · ${monthlyPrice}`
            : ""}
        </button>

        <button
          type="button"
          aria-pressed={
            billingInterval ===
            "yearly"
          }
          onClick={() =>
            setBillingInterval(
              "yearly"
            )
          }
          className={[
            "rounded-[13px] border px-4 py-3 text-sm font-semibold transition",
            billingInterval ===
            "yearly"
              ? "border-[#036661] bg-[#036661] text-white"
              : "border-gray-200 bg-white text-gray-800 hover:border-[#036661]",
          ].join(" ")}
        >
          {copy.yearly}
          {yearlyPrice
            ? ` · ${yearlyPrice}`
            : ""}
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-gray-500">
        {copy.finalPriceNote}
      </p>

      <p className="mt-4 text-sm leading-6 text-gray-600">
        {copy.firstBilling}{" "}
        <strong className="text-gray-900">
          {endDate}
        </strong>
        .
      </p>

      <div className="mt-5">
        <Button
          type="button"
          variant="primary"
          isLoading={isPending}
          loadingText={
            copy.opening
          }
          onClick={startSetup}
        >
          {copy.button}
        </Button>
      </div>

      {error && (
        <p className="mt-4 text-sm leading-6 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
