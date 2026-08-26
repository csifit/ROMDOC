import "server-only";

const NON_NEGATIVE_PRICE_KEYS = [
  "subscriptionUnitPrice",
  "subscription_unit_price",
] as const;

const RETIRED_SMS_PRICE_KEYS = [
  "smsUnitPrice",
  "sms_unit_price",
] as const;

const VAT_KEYS = [
  "vatRate",
  "vat_rate",
] as const;

export function validateAdminContractCommercialTerms(
  value: unknown
):
  | {
      value: Record<string, unknown>;
      error: null;
    }
  | {
      value: null;
      error: string;
    } {
  if (
    value === null ||
    value === undefined
  ) {
    return {
      value: {},
      error: null,
    };
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {
      value: null,
      error:
        "Condițiile comerciale trebuie să fie un obiect valid.",
    };
  }

  const terms = {
    ...(value as Record<string, unknown>),
  };

  // SMS is included in the RomDoc subscription/package.
  // Strip retired per-SMS price keys even if an older browser or direct
  // API request still submits them.
  for (const key of RETIRED_SMS_PRICE_KEYS) {
    delete terms[key];
  }

  for (
    const key of
    NON_NEGATIVE_PRICE_KEYS
  ) {
    if (!(key in terms)) continue;

    const numeric =
      Number(terms[key]);

    if (
      !Number.isFinite(numeric) ||
      numeric < 0
    ) {
      return {
        value: null,
        error:
          "Tarifele contractuale trebuie să fie numere pozitive sau zero.",
      };
    }

    terms[key] = numeric;
  }

  for (const key of VAT_KEYS) {
    if (!(key in terms)) continue;

    const numeric =
      Number(terms[key]);

    if (
      !Number.isFinite(numeric) ||
      numeric < 0 ||
      numeric > 1
    ) {
      return {
        value: null,
        error:
          "Cota TVA contractuală trebuie să fie între 0 și 1.",
      };
    }

    terms[key] = numeric;
  }

  if ("currency" in terms) {
    if (
      terms.currency !== "RON" &&
      terms.currency !== "EUR"
    ) {
      return {
        value: null,
        error:
          "Moneda contractuală trebuie să fie RON sau EUR.",
      };
    }
  }

  return {
    value: terms,
    error: null,
  };
}
