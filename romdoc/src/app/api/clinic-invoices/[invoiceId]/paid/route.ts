import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";
import {
  normalizeDateValue,
  normalizeOptionalText,
} from "@/lib/invoices/clinic-invoices";

export const runtime = "nodejs";

type MarkPaidBody = {
  paidOn?: unknown;
  paymentReference?: unknown;
};

type RouteContext = {
  params: Promise<{
    invoiceId: string;
  }>;
};

function accessError(
  status: 401 | 403,
  code: string
) {
  return NextResponse.json(
    {
      error:
        status === 401
          ? "Trebuie să fii autentificat."
          : "Nu ai acces la facturarea clinicilor.",
      code,
    },
    { status }
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const access = await requireClinicInvoiceAccess();

  if (!access.ok) {
    return accessError(access.status, access.code);
  }

  const { invoiceId } = await context.params;

  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) {
    return NextResponse.json(
      { error: "Identificatorul facturii nu este valid." },
      { status: 400 }
    );
  }

  let body: MarkPaidBody;

  try {
    body = (await request.json()) as MarkPaidBody;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const paidOn = normalizeDateValue(body.paidOn);
  const paymentReference = normalizeOptionalText(
    body.paymentReference,
    200
  );

  if (!paidOn) {
    return NextResponse.json(
      { error: "Selectează o dată validă a plății." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: existingInvoice, error: lookupError } = await admin
    .from("clinic_invoices")
    .select("id, status, issued_on")
    .eq("id", invoiceId)
    .maybeSingle();

  if (lookupError || !existingInvoice) {
    return NextResponse.json(
      { error: "Factura nu a fost găsită." },
      { status: 404 }
    );
  }

  if (existingInvoice.status === "paid") {
    return NextResponse.json(
      { error: "Factura este deja marcată ca plătită." },
      { status: 409 }
    );
  }

  if (existingInvoice.status !== "invoiced") {
    return NextResponse.json(
      {
        error:
          "Numai o factură emisă poate fi marcată ca plătită.",
      },
      { status: 409 }
    );
  }

  if (paidOn < existingInvoice.issued_on) {
    return NextResponse.json(
      {
        error:
          "Data plății nu poate fi înaintea datei emiterii.",
      },
      { status: 400 }
    );
  }

  const { data: updatedInvoice, error: updateError } = await admin
    .from("clinic_invoices")
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

  if (updateError) {
    console.error(
      "Clinic invoice payment confirmation failed:",
      updateError
    );

    return NextResponse.json(
      { error: "Plata nu a putut fi confirmată." },
      { status: 500 }
    );
  }

  if (!updatedInvoice) {
    return NextResponse.json(
      {
        error:
          "Factura a fost modificată între timp. Reîncarcă pagina.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
