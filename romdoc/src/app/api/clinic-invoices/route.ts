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

  const [
    periodConflictResult,
    invoiceNumbersResult,
  ] = await Promise.all([
    admin
      .from("clinic_invoices")
      .select(
        "id, invoice_number, status, issued_on, amount_ron"
      )
      .eq("organization_id", organizationId)
      .in("status", ["invoiced", "paid"])
      .lte(
        "billing_period_start",
        billingPeriodEnd
      )
      .gte(
        "billing_period_end",
        billingPeriodStart
      )
      .limit(5),

    admin
      .from("clinic_invoices")
      .select(
        "id, invoice_number, organization_id, status"
      ),
  ]);

  if (
    periodConflictResult.error ||
    invoiceNumbersResult.error
  ) {
    console.error(
      "Clinic invoice duplicate check failed:",
      periodConflictResult.error ??
        invoiceNumbersResult.error
    );

    return NextResponse.json(
      {
        error:
          "Factura nu a putut fi verificată pentru duplicate.",
      },
      { status: 500 }
    );
  }

  const periodConflicts =
    periodConflictResult.data ?? [];

  if (periodConflicts.length > 0) {
    return NextResponse.json(
      {
        error:
          "Această organizație are deja o factură facturată sau plătită pentru perioada selectată.",
        code:
          "organization_period_already_processed",
        conflicts:
          periodConflicts,
      },
      { status: 409 }
    );
  }

  const normalizedInvoiceNumber =
    invoiceNumber
      .trim()
      .toLocaleLowerCase("ro-RO");

  const duplicateNumber =
    (
      invoiceNumbersResult.data ??
      []
    ).find(
      (existingInvoice) =>
        existingInvoice.invoice_number
          .trim()
          .toLocaleLowerCase("ro-RO") ===
        normalizedInvoiceNumber
    );

  if (duplicateNumber) {
    return NextResponse.json(
      {
        error:
          "Numărul de factură SAGA există deja în RomDoc.",
        code:
          "invoice_number_already_exists",
        conflict:
          duplicateNumber,
      },
      { status: 409 }
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
