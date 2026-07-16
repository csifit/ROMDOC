export type ClinicInvoiceStatus =
  | "draft"
  | "invoiced"
  | "paid";

export type ClinicInvoiceOrganization = {
  id: string;
  name: string;
  companyName: string | null;
  taxId: string | null;
  billingEmail: string | null;
};

export type ClinicInvoiceRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  companyName: string | null;
  taxId: string | null;
  billingEmail: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoiceNumber: string;
  issuedOn: string;
  estimatedAmountRon: number | null;
  amountRon: number;
  status: ClinicInvoiceStatus;
  paidOn: string | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClinicInvoiceActor =
  | { profileId: string; role: "admin" }
  | { profileId: string; role: "manager" };

export function isClinicInvoiceStatus(
  value: unknown
): value is ClinicInvoiceStatus {
  return value === "draft" || value === "invoiced" || value === "paid";
}

export function normalizeInvoiceNumber(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= 100
    ? normalized
    : null;
}

export function normalizeOptionalText(
  value: unknown,
  maximumLength: number
) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximumLength) return null;

  return normalized;
}

export function normalizeDateValue(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return value;
}

export function normalizeRonAmount(
  value: unknown,
  options?: { nullable?: boolean }
) {
  if (
    options?.nullable &&
    (value === null || value === undefined || value === "")
  ) {
    return null;
  }

  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 9999999999.99) {
    return undefined;
  }

  return Math.round(numeric * 100) / 100;
}
