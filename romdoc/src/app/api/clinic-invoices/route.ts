import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";
import {
  isClinicInvoiceStatus,
  normalizeDateValue,
  normalizeInvoiceNumber,
  normalizeOptionalText,
  normalizeRonAmount,
} from "@/lib/invoices/clinic-invoices";

export const runtime = "nodejs";

type CreateInvoiceBody = {
  organizationId?: unknown;
  billingPeriodStart?: unknown;
  billingPeriodEnd?: unknown;
  invoiceNumber?: unknown;
  issuedOn?: unknown;
  estimatedAmountRon?: unknown;
  amountRon?: unknown;
  status?: unknown;
  notes?: unknown;
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

export async function POST(
  request: NextRequest
): Promise<Response> {
  const access = await requireClinicInvoiceAccess();

  if (!access.ok) {
    return accessError(access.status, access.code);
  }

  let body: CreateInvoiceBody;

  try {
    body = (await request.json()) as CreateInvoiceBody;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const organizationId =
    typeof body.organizationId === "string" &&
    /^[0-9a-f-]{36}$/i.test(body.organizationId)
      ? body.organizationId
      : null;

  const billingPeriodStart = normalizeDateValue(body.billingPeriodStart);
  const billingPeriodEnd = normalizeDateValue(body.billingPeriodEnd);
  const invoiceNumber = normalizeInvoiceNumber(body.invoiceNumber);
  const issuedOn = normalizeDateValue(body.issuedOn);
  const estimatedAmountRon = normalizeRonAmount(body.estimatedAmountRon, {
    nullable: true,
  });
  const amountRon = normalizeRonAmount(body.amountRon);
  const status = isClinicInvoiceStatus(body.status)
    ? body.status
    : "invoiced";
  const notes = normalizeOptionalText(body.notes, 2000);

  if (
    !organizationId ||
    !billingPeriodStart ||
    !billingPeriodEnd ||
    !invoiceNumber ||
    !issuedOn ||
    estimatedAmountRon === undefined ||
    amountRon === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "Completează corect organizația, perioada, numărul, data și suma facturii.",
      },
      { status: 400 }
    );
  }

  if (billingPeriodEnd < billingPeriodStart) {
    return NextResponse.json(
      {
        error:
          "Sfârșitul perioadei nu poate fi înaintea începutului.",
      },
      { status: 400 }
    );
  }

  if (status === "paid") {
    return NextResponse.json(
      {
        error:
          "O factură nouă nu poate fi creată direct ca plătită.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: organization, error: organizationError } = await admin
    .from("clinic_organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    return NextResponse.json(
      { error: "Organizația clinică nu a fost găsită." },
      { status: 404 }
    );
  }

  const { data: invoice, error: insertError } = await admin
    .from("clinic_invoices")
    .insert({
      organization_id: organizationId,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      invoice_number: invoiceNumber,
      issued_on: issuedOn,
      estimated_amount_ron: estimatedAmountRon,
      amount_ron: amountRon,
      status,
      notes,
      created_by_profile_id: access.actor.profileId,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Există deja o factură cu acest număr pentru organizație și perioadă.",
        },
        { status: 409 }
      );
    }

    console.error("Clinic invoice creation failed:", insertError);

    return NextResponse.json(
      { error: "Factura nu a putut fi salvată." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { id: invoice.id },
    { status: 201 }
  );
}
