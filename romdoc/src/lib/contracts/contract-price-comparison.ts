export type ContractPriceField =
  | "subscriptionUnitPrice"
  | "smsUnitPrice"
  | "currency"
  | "vatRate";

export type ContractPriceTerms = {
  subscriptionUnitPrice?: number | null;
  smsUnitPrice?: number | null;
  currency?: "RON" | "EUR" | null;
  vatRate?: number | null;
};

export type EffectiveOperationalPriceTerms = {
  subscriptionUnitPrice: number | null;
  smsUnitPrice: number | null;
  currency: "RON" | "EUR";
  vatRate: number | null;
  source: "client_override" | "global";
  comparisonDate: string;
  overrideApplies: boolean;
  overrideId: string | null;
  overrideUpdatedAt: string | null;
  overrideEffectiveFrom: string | null;
  overrideEffectiveUntil: string | null;
};

export type ContractPriceDifference = {
  field: ContractPriceField;
  accepted: number | string | null;
  operational: number | string | null;
};

export type ContractPriceComparisonStatus =
  | "needs_update"
  | "ready_to_confirm";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstDefined(
  source: Record<string, unknown>,
  camelCaseKey: string,
  snakeCaseKey: string
) {
  if (Object.prototype.hasOwnProperty.call(source, camelCaseKey)) {
    return source[camelCaseKey];
  }
  if (Object.prototype.hasOwnProperty.call(source, snakeCaseKey)) {
    return source[snakeCaseKey];
  }
  return undefined;
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}

function optionalCurrency(
  value: unknown
): "RON" | "EUR" | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return undefined;
  const normalized = String(value).trim().toUpperCase();
  return normalized === "RON" || normalized === "EUR"
    ? normalized
    : undefined;
}

function equalNumber(
  first: number | null,
  second: number | null,
  decimals: number
) {
  if (first === null || second === null) return first === second;
  const factor = 10 ** decimals;
  return Math.round(first * factor) === Math.round(second * factor);
}

function isDateInRange(
  comparisonDate: string,
  effectiveFrom: string | null,
  effectiveUntil: string | null
) {
  return (
    (!effectiveFrom || effectiveFrom <= comparisonDate) &&
    (!effectiveUntil || effectiveUntil >= comparisonDate)
  );
}

export function normalizeAcceptedContractPriceTerms(
  value: unknown
): ContractPriceTerms {
  const source = objectValue(value);
  const subscriptionUnitPrice = optionalNumber(
    firstDefined(source, "subscriptionUnitPrice", "subscription_unit_price")
  );
  const smsUnitPrice = optionalNumber(
    firstDefined(source, "smsUnitPrice", "sms_unit_price")
  );
  const currency = optionalCurrency(
    firstDefined(source, "currency", "currency")
  );
  const vatRate = optionalNumber(
    firstDefined(source, "vatRate", "vat_rate")
  );

  const normalized: ContractPriceTerms = {};
  if (subscriptionUnitPrice !== undefined) {
    normalized.subscriptionUnitPrice = subscriptionUnitPrice;
  }
  if (smsUnitPrice !== undefined) normalized.smsUnitPrice = smsUnitPrice;
  if (currency !== undefined) normalized.currency = currency;
  if (vatRate !== undefined && vatRate !== null && vatRate <= 1) {
    normalized.vatRate = vatRate;
  }
  return normalized;
}

export function hasAcceptedContractPriceTerms(
  terms: ContractPriceTerms
) {
  return Object.keys(terms).length > 0;
}

export function createEffectiveOperationalPriceTerms(input: {
  comparisonDate: string;
  globalSubscriptionUnitPrice: number | null;
  globalSmsUnitPrice: number | null;
  globalCurrency: "RON" | "EUR";
  globalVatRate: number | null;
  override:
    | {
        id: string;
        subscriptionUnitPrice: number | null;
        smsUnitPrice: number | null;
        currency: "RON" | "EUR";
        vatRate: number | null;
        effectiveFrom: string | null;
        effectiveUntil: string | null;
        updatedAt: string | null;
      }
    | null;
}): EffectiveOperationalPriceTerms {
  const override = input.override;
  const overrideApplies = Boolean(
    override &&
      isDateInRange(
        input.comparisonDate,
        override.effectiveFrom,
        override.effectiveUntil
      )
  );

  return {
    subscriptionUnitPrice: overrideApplies
      ? override?.subscriptionUnitPrice ?? input.globalSubscriptionUnitPrice
      : input.globalSubscriptionUnitPrice,
    smsUnitPrice: overrideApplies
      ? override?.smsUnitPrice ?? input.globalSmsUnitPrice
      : input.globalSmsUnitPrice,
    currency: overrideApplies
      ? override?.currency ?? input.globalCurrency
      : input.globalCurrency,
    vatRate: overrideApplies
      ? override?.vatRate ?? input.globalVatRate
      : input.globalVatRate,
    source: overrideApplies ? "client_override" : "global",
    comparisonDate: input.comparisonDate,
    overrideApplies,
    overrideId: override?.id ?? null,
    overrideUpdatedAt: override?.updatedAt ?? null,
    overrideEffectiveFrom: override?.effectiveFrom ?? null,
    overrideEffectiveUntil: override?.effectiveUntil ?? null,
  };
}

export function compareContractAndOperationalPrices(
  accepted: ContractPriceTerms,
  operational: EffectiveOperationalPriceTerms
): ContractPriceDifference[] {
  const differences: ContractPriceDifference[] = [];

  if (
    accepted.subscriptionUnitPrice !== undefined &&
    !equalNumber(
      accepted.subscriptionUnitPrice,
      operational.subscriptionUnitPrice,
      4
    )
  ) {
    differences.push({
      field: "subscriptionUnitPrice",
      accepted: accepted.subscriptionUnitPrice,
      operational: operational.subscriptionUnitPrice,
    });
  }

  if (
    accepted.smsUnitPrice !== undefined &&
    !equalNumber(accepted.smsUnitPrice, operational.smsUnitPrice, 4)
  ) {
    differences.push({
      field: "smsUnitPrice",
      accepted: accepted.smsUnitPrice,
      operational: operational.smsUnitPrice,
    });
  }

  if (
    accepted.currency !== undefined &&
    accepted.currency !== operational.currency
  ) {
    differences.push({
      field: "currency",
      accepted: accepted.currency,
      operational: operational.currency,
    });
  }

  if (
    accepted.vatRate !== undefined &&
    !equalNumber(accepted.vatRate, operational.vatRate, 6)
  ) {
    differences.push({
      field: "vatRate",
      accepted: accepted.vatRate,
      operational: operational.vatRate,
    });
  }

  return differences;
}
