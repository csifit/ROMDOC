import { type NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_BILLING_HISTORY_CODES } from "@/lib/api/platform-operator-billing-history-codes";
import {
  getPlatformMonthRange,
  loadPlatformInvoicingData,
  shiftPlatformBillingMonth,
} from "@/lib/billing/platform-invoicing";
import { buildPlatformBillingUsageXlsx } from "@/lib/billing/export-platform-billing-xlsx";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const access = await requireClinicInvoiceAccess();
  if (!access.ok) {
    return NextResponse.json(
      {
        code: access.code,
        error:
          access.status === 401
            ? "Trebuie să fii autentificat."
            : "Este necesară permisiunea Facturare.",
      },
      { status: access.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const current = getPlatformMonthRange(undefined, "current");
  const previousMonth = shiftPlatformBillingMonth(current.currentMonth, -1);
  const requestedMonth = request.nextUrl.searchParams.get("month") ?? previousMonth;

  if (requestedMonth !== previousMonth) {
    return NextResponse.json(
      {
        code: PLATFORM_OPERATOR_BILLING_HISTORY_CODES.exportMonthInvalid,
        error: "Exportul este disponibil numai pentru luna precedentă.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const storedLocale = await getStoredAppLocale();
  const locale = normalizeAppLocale(
    request.nextUrl.searchParams.get("locale") ?? storedLocale
  );

  try {
    const data = await loadPlatformInvoicingData({
      locale,
      month: requestedMonth,
      fallback: "previous",
    });
    const buffer = await buildPlatformBillingUsageXlsx({ data, locale });
    const filename = `romdoc-usage-${requestedMonth}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Billing XLSX export failed:", error);
    return NextResponse.json(
      {
        code: PLATFORM_OPERATOR_BILLING_HISTORY_CODES.exportFailed,
        error: "Fișierul XLSX nu a putut fi generat.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
