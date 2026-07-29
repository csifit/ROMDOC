import { type NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_BILLING_CODES } from "@/lib/api/platform-operator-billing-codes";
import { requirePlatformOperatorAal2Api } from "@/lib/auth/require-platform-operator-aal2-api";
import type { PlatformBillingCurrency } from "@/lib/billing/platform-invoicing";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const CURRENCIES = new Set<PlatformBillingCurrency>(["EUR", "RON"]);
const DEFAULT_CURRENCY: PlatformBillingCurrency = "EUR";

type BillingSettingsBody = {
  subscriptionPriceRon?: unknown;
  smsPriceRon?: unknown;
  vatRate?: unknown;
  billingCurrency?: unknown;
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function normalizeMoney(value: unknown, maximum = 100000) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > maximum) return null;
  return Math.round(parsed * 100) / 100;
}

function normalizeVat(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return null;
  return Math.round(parsed * 1000000) / 1000000;
}

function normalizeCurrency(value: unknown): PlatformBillingCurrency | null {
  return typeof value === "string" &&
    CURRENCIES.has(value as PlatformBillingCurrency)
    ? (value as PlatformBillingCurrency)
    : null;
}

async function requireAccountingPermission(
  role: "admin" | "manager",
  profileId: string
) {
  if (role === "admin") return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("manager_permissions")
    .select("profile_id")
    .eq("profile_id", profileId)
    .eq("permission_key", "accounting")
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    console.error("Billing settings permission query failed:", error);
  }

  if (data) return null;

  return json(
    {
      code: PLATFORM_OPERATOR_BILLING_CODES.accountingRequired,
      error: "Permisiunea Facturare este necesară.",
    },
    403
  );
}

export async function GET(): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const permissionError = await requireAccountingPermission(
    authorization.role,
    authorization.profileId
  );
  if (permissionError) return permissionError;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_billing_settings")
    .select(
      "clinic_doctor_monthly_price_ron, sms_unit_price_ron, vat_rate, billing_currency, updated_at, updated_by_profile_id"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Billing settings load failed:", error);
    return json(
      {
        code: PLATFORM_OPERATOR_BILLING_CODES.settingsLoadFailed,
        error: "Prețurile nu au putut fi încărcate.",
      },
      500
    );
  }

  return json({
    code: PLATFORM_OPERATOR_BILLING_CODES.settingsLoaded,
    settings: {
      subscriptionPriceRon: Number(
        data?.clinic_doctor_monthly_price_ron ?? 20
      ),
      smsPriceRon: Number(data?.sms_unit_price_ron ?? 0.1),
      vatRate: Number(data?.vat_rate ?? 0.21),
      billingCurrency:
        data?.billing_currency === "RON" || data?.billing_currency === "EUR"
          ? data.billing_currency
          : DEFAULT_CURRENCY,
      updatedAt: data?.updated_at ?? null,
      updatedByProfileId: data?.updated_by_profile_id ?? null,
      canEdit: true,
    },
  });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const permissionError = await requireAccountingPermission(
    authorization.role,
    authorization.profileId
  );
  if (permissionError) return permissionError;

  let body: BillingSettingsBody;
  try {
    body = (await request.json()) as BillingSettingsBody;
  } catch {
    return json(
      {
        code: PLATFORM_OPERATOR_BILLING_CODES.invalidJson,
        error: "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const subscriptionPriceRon = normalizeMoney(body.subscriptionPriceRon);
  const smsPriceRon = normalizeMoney(body.smsPriceRon, 1000);
  const vatRate = normalizeVat(body.vatRate);
  const billingCurrency = normalizeCurrency(body.billingCurrency);

  if (
    subscriptionPriceRon === null ||
    smsPriceRon === null ||
    vatRate === null ||
    billingCurrency === null
  ) {
    return json(
      {
        code: PLATFORM_OPERATOR_BILLING_CODES.invalidPrices,
        error: "Prețurile sau moneda introduse nu sunt valide.",
      },
      400
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_billing_settings")
    .upsert(
      {
        id: 1,
        clinic_doctor_monthly_price_ron: subscriptionPriceRon,
        sms_unit_price_ron: smsPriceRon,
        vat_rate: vatRate,
        billing_currency: billingCurrency,
        updated_at: new Date().toISOString(),
        updated_by_profile_id: authorization.profileId,
      },
      { onConflict: "id" }
    )
    .select(
      "clinic_doctor_monthly_price_ron, sms_unit_price_ron, vat_rate, billing_currency, updated_at, updated_by_profile_id"
    )
    .single();

  if (error) {
    console.error("Billing settings save failed:", error);
    return json(
      {
        code: PLATFORM_OPERATOR_BILLING_CODES.settingsSaveFailed,
        error: "Prețurile nu au putut fi salvate.",
      },
      500
    );
  }

  return json({
    code: PLATFORM_OPERATOR_BILLING_CODES.settingsSaved,
    message: "Prețurile au fost actualizate.",
    settings: {
      subscriptionPriceRon: Number(data.clinic_doctor_monthly_price_ron),
      smsPriceRon: Number(data.sms_unit_price_ron),
      vatRate: Number(data.vat_rate),
      billingCurrency:
        data.billing_currency === "RON" ? "RON" : DEFAULT_CURRENCY,
      updatedAt: data.updated_at,
      updatedByProfileId: data.updated_by_profile_id,
      canEdit: true,
    },
  });
}
