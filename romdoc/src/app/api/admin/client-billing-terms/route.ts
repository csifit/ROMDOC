import { type NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_BILLING_HISTORY_CODES } from "@/lib/api/platform-operator-billing-history-codes";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import type {
  PlatformBillingCurrency,
  PlatformInvoiceClientType,
  PlatformVatTreatment,
  PlatformVatValidationStatus,
} from "@/lib/billing/platform-invoicing";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const CLIENT_TYPES = new Set<PlatformInvoiceClientType>([
  "independent_doctor",
  "clinic_organization",
]);
const CURRENCIES = new Set<PlatformBillingCurrency>(["RON", "EUR"]);
const VAT_TREATMENTS = new Set<PlatformVatTreatment>([
  "domestic",
  "reverse_charge",
  "outside_scope",
  "exempt",
  "custom",
]);
const VAT_VALIDATION_STATUSES = new Set<PlatformVatValidationStatus>([
  "not_checked",
  "valid",
  "invalid",
  "unavailable",
]);

type TermsBody = {
  clientType?: unknown;
  clientId?: unknown;
  subscriptionUnitPrice?: unknown;
  currency?: unknown;
  vatRate?: unknown;
  vatTreatment?: unknown;
  vatReason?: unknown;
  vatNumber?: unknown;
  vatValidatedAt?: unknown;
  vatValidationStatus?: unknown;
  effectiveFrom?: unknown;
  effectiveUntil?: unknown;
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function failure(code: string, error: string, status: number) {
  return json({ code, error }, status);
}

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maximumLength);
}

function optionalNumber(value: unknown, maximum = 9999999999.9999) {
  if (value === null || value === undefined || value === "") return null;

  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(numeric) || numeric < 0 || numeric > maximum) {
    return undefined;
  }

  return Math.round(numeric * 10000) / 10000;
}

function optionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

function parseTarget(body: TermsBody) {
  const clientType = body.clientType;
  const clientId = body.clientId;

  if (
    typeof clientType !== "string" ||
    !CLIENT_TYPES.has(clientType as PlatformInvoiceClientType) ||
    typeof clientId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(clientId)
  ) {
    return null;
  }

  return {
    clientType: clientType as PlatformInvoiceClientType,
    clientId,
  };
}

async function requireAdmin() {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return { response: authorization.response };

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Numai Administratorul poate modifica prețurile clientului."
  );

  return adminOnly
    ? { response: adminOnly }
    : { response: null, profileId: authorization.profileId };
}

async function clientExists(
  clientType: PlatformInvoiceClientType,
  clientId: string
) {
  const admin = createAdminClient();

  if (clientType === "independent_doctor") {
    const { data, error } = await admin
      .from("doctors")
      .select("id")
      .eq("id", clientId)
      .eq("account_type", "independent")
      .maybeSingle();

    return !error && Boolean(data);
  }

  const { data, error } = await admin
    .from("clinic_organizations")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const access = await requireAdmin();
  if (access.response) return access.response;

  let body: TermsBody;

  try {
    body = (await request.json()) as TermsBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const target = parseTarget(body);

  if (!target) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidClient,
      "Clientul selectat nu este valid.",
      400
    );
  }

  if (!(await clientExists(target.clientType, target.clientId))) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.clientNotFound,
      "Clientul nu a fost găsit.",
      404
    );
  }

  const subscriptionUnitPrice = optionalNumber(body.subscriptionUnitPrice);
  const vatRate = optionalNumber(body.vatRate, 1);
  const effectiveFrom = optionalDate(body.effectiveFrom);
  const effectiveUntil = optionalDate(body.effectiveUntil);
  const currency = body.currency;
  const vatTreatment = body.vatTreatment;
  const validationStatus = body.vatValidationStatus;
  const validatedDate = optionalDate(body.vatValidatedAt);

  if (
    subscriptionUnitPrice === undefined ||
    vatRate === undefined ||
    effectiveFrom === undefined ||
    effectiveUntil === undefined ||
    validatedDate === undefined ||
    typeof currency !== "string" ||
    !CURRENCIES.has(currency as PlatformBillingCurrency) ||
    typeof vatTreatment !== "string" ||
    !VAT_TREATMENTS.has(vatTreatment as PlatformVatTreatment) ||
    (validationStatus !== null &&
      validationStatus !== undefined &&
      validationStatus !== "" &&
      (typeof validationStatus !== "string" ||
        !VAT_VALIDATION_STATUSES.has(
          validationStatus as PlatformVatValidationStatus
        ))) ||
    (effectiveFrom && effectiveUntil && effectiveUntil < effectiveFrom)
  ) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidTerms,
      "Datele de preț sau TVA nu sunt valide.",
      400
    );
  }

  const admin = createAdminClient();
  const targetColumn =
    target.clientType === "independent_doctor"
      ? "doctor_id"
      : "clinic_organization_id";

  const { data: existing, error: lookupError } = await admin
    .from("client_billing_terms")
    .select("id")
    .eq(targetColumn, target.clientId)
    .maybeSingle();

  if (lookupError) {
    console.error("Client billing terms lookup failed:", lookupError);
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.termsSaveFailed,
      "Prețurile clientului nu au putut fi salvate.",
      500
    );
  }

  const payload = {
    client_type: target.clientType,
    doctor_id:
      target.clientType === "independent_doctor" ? target.clientId : null,
    clinic_organization_id:
      target.clientType === "clinic_organization" ? target.clientId : null,
    subscription_unit_price: subscriptionUnitPrice,
    currency: currency as PlatformBillingCurrency,
    vat_rate: vatRate,
    vat_treatment: vatTreatment as PlatformVatTreatment,
    vat_reason: cleanText(body.vatReason, 1000),
    vat_number: cleanText(body.vatNumber, 100),
    vat_validated_at: validatedDate
      ? `${validatedDate}T00:00:00.000Z`
      : null,
    vat_validation_status:
      typeof validationStatus === "string" && validationStatus
        ? (validationStatus as PlatformVatValidationStatus)
        : null,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    updated_by_profile_id: access.profileId,
  };

  const query = existing
    ? admin
        .from("client_billing_terms")
        .update(payload)
        .eq("id", existing.id)
    : admin.from("client_billing_terms").insert({
        ...payload,
        created_by_profile_id: access.profileId,
      });

  const { data, error } = await query.select("id").single();

  if (error) {
    console.error("Client billing terms save failed:", error);
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.termsSaveFailed,
      "Prețurile clientului nu au putut fi salvate.",
      500
    );
  }

  return json({
    code: PLATFORM_OPERATOR_BILLING_HISTORY_CODES.termsSaved,
    message: "Prețurile clientului au fost salvate.",
    id: data.id,
  });
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const access = await requireAdmin();
  if (access.response) return access.response;

  let body: TermsBody;

  try {
    body = (await request.json()) as TermsBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const target = parseTarget(body);

  if (!target) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidClient,
      "Clientul selectat nu este valid.",
      400
    );
  }

  const admin = createAdminClient();
  const targetColumn =
    target.clientType === "independent_doctor"
      ? "doctor_id"
      : "clinic_organization_id";

  const { error } = await admin
    .from("client_billing_terms")
    .delete()
    .eq(targetColumn, target.clientId);

  if (error) {
    console.error("Client billing terms reset failed:", error);
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.termsSaveFailed,
      "Prețurile clientului nu au putut fi resetate.",
      500
    );
  }

  return json({
    code: PLATFORM_OPERATOR_BILLING_HISTORY_CODES.termsReset,
    message: "Prețurile personalizate au fost eliminate.",
  });
}
