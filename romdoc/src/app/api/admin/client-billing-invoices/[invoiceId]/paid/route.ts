import { type NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_BILLING_HISTORY_CODES } from "@/lib/api/platform-operator-billing-history-codes";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type RouteContext = {
  params: Promise<{ invoiceId: string }>;
};

type PaymentBody = {
  paidOn?: unknown;
  paymentReference?: unknown;
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

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
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

  const { invoiceId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invoiceNotFound,
      "Factura nu a fost găsită.",
      404
    );
  }

  let body: PaymentBody;
  try {
    body = (await request.json()) as PaymentBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const paidOn = validDate(body.paidOn);
  const paymentReference =
    typeof body.paymentReference === "string"
      ? body.paymentReference.trim().slice(0, 200) || null
      : null;

  if (!paidOn) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidPayment,
      "Data plății nu este validă.",
      400
    );
  }

  const admin = createAdminClient();
  const { data: invoice, error: lookupError } = await admin
    .from("client_billing_invoice_records")
    .select("id, status, issued_on")
    .eq("id", invoiceId)
    .maybeSingle();

  if (lookupError || !invoice) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invoiceNotFound,
      "Factura nu a fost găsită.",
      404
    );
  }

  if (invoice.status === "paid") {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invoiceAlreadyPaid,
      "Factura este deja plătită.",
      409
    );
  }

  if (paidOn < invoice.issued_on) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invalidPayment,
      "Data plății nu poate fi înaintea datei emiterii.",
      400
    );
  }

  const { data, error } = await admin
    .from("client_billing_invoice_records")
    .update({
      status: "paid",
      paid_on: paidOn,
      payment_reference: paymentReference,
      marked_paid_by_profile_id: access.actor.profileId,
    })
    .eq("id", invoiceId)
    .eq("status", "invoiced")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Client invoice payment update failed:", error);
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.paymentSaveFailed,
      "Plata nu a putut fi confirmată.",
      500
    );
  }

  if (!data) {
    return failure(
      PLATFORM_OPERATOR_BILLING_HISTORY_CODES.invoiceAlreadyPaid,
      "Factura a fost modificată între timp. Reîncarcă pagina.",
      409
    );
  }

  return json({
    code: PLATFORM_OPERATOR_BILLING_HISTORY_CODES.paymentSaved,
    message: "Plata a fost confirmată.",
  });
}
