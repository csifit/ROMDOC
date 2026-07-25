import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadPlatformInvoicingData as loadBasePlatformInvoicingData,
  type PlatformBillingCurrency,
  type PlatformInvoiceAmountRow,
  type PlatformInvoicingData,
} from "@/lib/billing/platform-invoicing";

export const DEFAULT_PLATFORM_BILLING_CURRENCY: PlatformBillingCurrency = "EUR";

export type PlatformInvoicingDataWithCurrency = PlatformInvoicingData & {
  defaultCurrency: PlatformBillingCurrency;
};

function normalizeCurrency(value: unknown): PlatformBillingCurrency {
  return value === "RON" || value === "EUR"
    ? value
    : DEFAULT_PLATFORM_BILLING_CURRENCY;
}

export async function loadPlatformBillingCurrency(): Promise<PlatformBillingCurrency> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_billing_settings")
    .select("billing_currency")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Platform billing currency query failed:", error);
    return DEFAULT_PLATFORM_BILLING_CURRENCY;
  }

  return normalizeCurrency(data?.billing_currency);
}

function applyGlobalCurrency(
  row: PlatformInvoiceAmountRow,
  currency: PlatformBillingCurrency
): PlatformInvoiceAmountRow {
  return row.billingTermsSource === "global"
    ? {
        ...row,
        currency,
      }
    : row;
}

export async function normalizePlatformInvoicingCurrency(
  data: PlatformInvoicingData
): Promise<PlatformInvoicingDataWithCurrency> {
  const defaultCurrency = await loadPlatformBillingCurrency();
  const independentDoctors = data.independentDoctors.map((row) =>
    applyGlobalCurrency(row, defaultCurrency)
  );
  const clinicOrganizations = data.clinicOrganizations.map((row) =>
    applyGlobalCurrency(row, defaultCurrency)
  );

  return {
    ...data,
    defaultCurrency,
    independentDoctors,
    clinicOrganizations,
    rows: [...independentDoctors, ...clinicOrganizations],
  };
}

export async function loadPlatformInvoicingDataWithCurrency(
  parameters: Parameters<typeof loadBasePlatformInvoicingData>[0]
): Promise<PlatformInvoicingDataWithCurrency> {
  const data = await loadBasePlatformInvoicingData(parameters);
  return normalizePlatformInvoicingCurrency(data);
}
