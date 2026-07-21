import { type NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_BILLING_HISTORY_CODES } from "@/lib/api/platform-operator-billing-history-codes";
import {
  getPlatformMonthRange,
  type PlatformBillingCurrency,
  type PlatformInvoiceClientType,
} from "@/lib/billing/platform-invoicing";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const CLIENT_TYPES = new Set<PlatformInvoiceClientType>([
  "independent_doctor",
  "clinic_organization",
]);
const CURRENCIES = new Set<PlatformBillingCurrency>(["RON", "EUR"]);

type InvoiceBody = {
  clientType?: unknown;
  clientId?: unknown;
  billingPeriodStart?: unknown;
  billingPeriodEnd?: unknown;
  invoiceNumber?: unknown;
  issuedOn?: unknown;
  estimatedAmount?: unknown;
  amount?: unknown;
  currency?: unknown;
  notes?: unknown;
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function failure(code: string, error: string, status: number) {
  return json({ code, error }, status);
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function amount(value: unknown, nullable = false) {
  if (nullable && (value === null || value === undefined || value === "")) {
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

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maximumLength) : null;
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

export async function POST(request: NextRequest): Promise<Response> {
  const access = await requireClinicInvoiceAccess();
  if (!access.ok) {
    return failure(
      access.code,
      access.status === 401
        ? "Trebuie să fii autentificat."
        : "Este necesară permisiunea Facturare.",
      access.status
    );
  }

  let body: InvoiceBody;
  try {
    body = (await request.json()) as InvoiceBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const clientType = body.clientType;
  const clientId = body.clientId;
  const billingPeriodStart = validDate(body.billingPeriodStart);
  const billingPeriodEnd = validDate(body.billingPeriodEnd);
  const issuedOn = validDate(body.issuedOn);
  const invoiceNumber = cleanText(body.invoiceNumber, 100);
  const estimatedAmount = amount(body.estimatedAmount, true);
  const finalAmount = amount(body.amount);
  const currency = body.currency;

  if (
    typeof clientType !== "string" ||
    !CLIENT_TYPES.has(clientType as PlatformInvoiceClientType) ||
    typeof clientId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(clientId) ||
    !billingPeriodStart ||
    !billingPeriodEnd ||
    billingPeriodEnd < billingPeriodStart ||
    !issuedOn ||
    !invoiceNumber ||
    estimatedAmount === undefined ||
    finalAmount === undefined ||
    typeof currency !== "string" ||
    !CURRENCIES.has(currency as PlatformBillingCurrency)
  ) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidInvoice,
      "Datele facturii nu sunt valide.",
      400
    );
  }

  const currentMonthStart = getPlatformMonthRange(undefined, "current").startDate;
  if (billingPeriodEnd >= currentMonthStart) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.currentMonthInvoiceBlocked,
      "Luna curentă nu poate fi facturată încă.",
      409
    );
  }

  const normalizedClientType = clientType as PlatformInvoiceClientType;
  if (!(await clientExists(normalizedClientType, clientId))) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.clientNotFound,
      "Clientul nu a fost găsit.",
      404
    );
  }

  const admin = createAdminClient();
  const targetColumn =
    normalizedClientType === "independent_doctor"
      ? "doctor_id"
      : "clinic_organization_id";

  const [periodResult, numberResult] = await Promise.all([
    admin
      .from("client_billing_invoice_records")
      .select("id, invoice_number")
      .eq("client_type", normalizedClientType)
      .eq(targetColumn, clientId)
      .lte("billing_period_start", billingPeriodEnd)
      .gte("billing_period_end", billingPeriodStart)
      .limit(1),
    admin
      .from("client_billing_invoice_records")
      .select("id, invoice_number")
      .ilike("invoice_number", invoiceNumber)
      .limit(1),
  ]);

  if (periodResult.error || numberResult.error) {
    console.error(
      "Client invoice duplicate check failed:",
      periodResult.error ?? numberResult.error
    );
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invoiceSaveFailed,
      "Factura nu a putut fi verificată.",
      500
    );
  }

  if ((periodResult.data ?? []).length > 0) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.duplicateInvoice,
      "Există deja o factură pentru acest client și această perioadă.",
      409
    );
  }

  if ((numberResult.data ?? []).length > 0) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invoiceNumberExists,
      "Numărul facturii există deja.",
      409
    );
  }

  const { data, error } = await admin
    .from("client_billing_invoice_records")
    .insert({
      client_type: normalizedClientType,
      doctor_id:
        normalizedClientType === "independent_doctor" ? clientId : null,
      clinic_organization_id:
        normalizedClientType === "clinic_organization" ? clientId : null,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      invoice_number: invoiceNumber,
      issued_on: issuedOn,
      estimated_amount: estimatedAmount,
      amount: finalAmount,
      currency: currency as PlatformBillingCurrency,
      status: "invoiced",
      notes: cleanText(body.notes, 2000),
      created_by_profile_id: access.actor.profileId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Client billing invoice insert failed:", error);
    const conflict = error.code === "23505";
    return failure(
      conflict
        ? PLATFORM_OPERATOR_BILLING_HISTORY_CODES.duplicateInvoice
        : PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invoiceSaveFailed,
      conflict
        ? "Există deja o factură pentru client, perioadă sau număr."
        : "Factura nu a putut fi salvată.",
      conflict ? 409 : 500
    );
  }

  return json(
    {
      code: PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invoiceSaved,
      message: "Factura a fost înregistrată.",
      id: data.id,
    },
    201
  );
}
