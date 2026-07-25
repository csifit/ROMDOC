import { type NextRequest, NextResponse } from "next/server";

import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  buildClinicManagerReportPdf,
  buildClinicManagerReportXlsx,
  type ClinicManagerOperationalReport,
} from "@/lib/clinic-manager/clinic-manager-report-export";
import { getRequestAppLocale } from "@/lib/i18n/request-app-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODES = {
  authenticationRequired: "authentication_required",
  clinicManagerRequired: "clinic_manager_required",
  activeManagerRequired: "active_manager_required",
  organizationAccessDenied: "organization_access_denied",
  invalidOrganization: "invalid_organization",
  invalidMonth: "invalid_month",
  invalidClinic: "invalid_clinic",
  invalidDoctor: "invalid_doctor",
  invalidFormat: "invalid_export_format",
  reportLoadFailed: "report_load_failed",
  exportFailed: "report_export_failed",
} as const;

type ErrorCode = (typeof CODES)[keyof typeof CODES];
type ExportFormat = "xlsx" | "pdf";

type MembershipRow = {
  organization_id: string;
  created_at: string;
};

const COPY: Record<AppLocale, Record<ErrorCode, string>> = {
  ro: {
    authentication_required: "Trebuie să fii autentificat.",
    clinic_manager_required:
      "Doar un Clinic Manager poate exporta rapoartele organizației.",
    active_manager_required: "Contul Clinic Manager trebuie să fie activ.",
    organization_access_denied:
      "Nu ai acces la organizația solicitată pentru acest raport.",
    invalid_organization: "Organizația selectată nu este validă.",
    invalid_month: "Luna selectată nu este validă.",
    invalid_clinic: "Locația clinicii selectate nu este validă.",
    invalid_doctor: "Medicul selectat nu este valid.",
    invalid_export_format: "Formatul de export selectat nu este valid.",
    report_load_failed: "Raportul nu a putut fi încărcat.",
    report_export_failed: "Fișierul raportului nu a putut fi generat.",
  },
  en: {
    authentication_required: "You must be signed in.",
    clinic_manager_required:
      "Only a Clinic Manager can export organisation reports.",
    active_manager_required: "The Clinic Manager account must be active.",
    organization_access_denied:
      "You do not have access to the requested organisation for this report.",
    invalid_organization: "The selected organisation is invalid.",
    invalid_month: "The selected month is invalid.",
    invalid_clinic: "The selected clinic location is invalid.",
    invalid_doctor: "The selected Doctor is invalid.",
    invalid_export_format: "The selected export format is invalid.",
    report_load_failed: "The report could not be loaded.",
    report_export_failed: "The report file could not be generated.",
  },
  de: {
    authentication_required: "Sie müssen angemeldet sein.",
    clinic_manager_required:
      "Nur ein Klinikmanager kann Organisationsberichte exportieren.",
    active_manager_required: "Das Klinikmanager-Konto muss aktiv sein.",
    organization_access_denied:
      "Sie haben für diesen Bericht keinen Zugriff auf die angeforderte Organisation.",
    invalid_organization: "Die ausgewählte Organisation ist ungültig.",
    invalid_month: "Der ausgewählte Monat ist ungültig.",
    invalid_clinic: "Der ausgewählte Klinikstandort ist ungültig.",
    invalid_doctor: "Der ausgewählte Arzt ist ungültig.",
    invalid_export_format: "Das ausgewählte Exportformat ist ungültig.",
    report_load_failed: "Der Bericht konnte nicht geladen werden.",
    report_export_failed: "Die Berichtsdatei konnte nicht erstellt werden.",
  },
};

function errorResponse(locale: AppLocale, code: ErrorCode, status: number) {
  return NextResponse.json(
    {
      success: false,
      code,
      error: COPY[locale][code],
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function optionalUuid(value: string | null) {
  if (!value) return null;

  const normalized = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized
  )
    ? normalized
    : undefined;
}

function optionalMonth(value: string | null) {
  if (!value) return null;

  const normalized = value.trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(normalized)
    ? `${normalized}-01`
    : undefined;
}

function parseFormat(value: string | null): ExportFormat | null {
  return value === "xlsx" || value === "pdf" ? value : null;
}

function mapRpcError(message: string) {
  if (
    message.includes("authentication_required") ||
    message.includes("active_profile_required")
  ) {
    return {
      code: CODES.authenticationRequired,
      status: 401,
    } as const;
  }

  if (message.includes("clinic_manager_access_required")) {
    return {
      code: CODES.clinicManagerRequired,
      status: 403,
    } as const;
  }

  if (
    message.includes("organization_access_required") ||
    message.includes("organization_not_found") ||
    message.includes("organization_required")
  ) {
    return {
      code: CODES.organizationAccessDenied,
      status: 403,
    } as const;
  }

  if (message.includes("clinic_not_in_organization")) {
    return {
      code: CODES.invalidClinic,
      status: 400,
    } as const;
  }

  if (message.includes("doctor_not_in_organization")) {
    return {
      code: CODES.invalidDoctor,
      status: 400,
    } as const;
  }

  return {
    code: CODES.reportLoadFailed,
    status: 500,
  } as const;
}

function safeFileName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "organization"
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const locale = getRequestAppLocale(request);
  const searchParams = request.nextUrl.searchParams;
  const format = parseFormat(searchParams.get("format"));

  if (!format) {
    return errorResponse(locale, CODES.invalidFormat, 400);
  }

  const requestedOrganizationId = optionalUuid(
    searchParams.get("organizationId")
  );
  const requestedMonth = optionalMonth(searchParams.get("month"));
  const requestedClinicId = optionalUuid(searchParams.get("clinicId"));
  const requestedDoctorId = optionalUuid(searchParams.get("doctorId"));

  if (requestedOrganizationId === undefined) {
    return errorResponse(locale, CODES.invalidOrganization, 400);
  }

  if (requestedMonth === undefined) {
    return errorResponse(locale, CODES.invalidMonth, 400);
  }

  if (requestedClinicId === undefined) {
    return errorResponse(locale, CODES.invalidClinic, 400);
  }

  if (requestedDoctorId === undefined) {
    return errorResponse(locale, CODES.invalidDoctor, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorResponse(locale, CODES.authenticationRequired, 401);
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "clinic_manager") {
    return errorResponse(locale, CODES.clinicManagerRequired, 403);
  }

  if (profile.account_status !== "active") {
    return errorResponse(locale, CODES.activeManagerRequired, 403);
  }

  let membershipQuery = admin
    .from("clinic_organization_members")
    .select("organization_id, created_at")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  if (requestedOrganizationId) {
    membershipQuery = membershipQuery.eq(
      "organization_id",
      requestedOrganizationId
    );
  }

  const { data: membershipData, error: membershipError } =
    await membershipQuery.maybeSingle();
  const membership = membershipData as MembershipRow | null;

  if (membershipError || !membership) {
    return errorResponse(locale, CODES.organizationAccessDenied, 403);
  }

  const { data, error } = await supabase.rpc(
    "get_clinic_manager_operational_report",
    {
      target_organization_id: membership.organization_id,
      target_month: requestedMonth,
      target_clinic_id: requestedClinicId,
      target_doctor_id: requestedDoctorId,
    }
  );

  if (error || !data) {
    console.error("Clinic Manager report export RPC failed:", error);
    const mapped = mapRpcError(error?.message ?? "");
    return errorResponse(locale, mapped.code, mapped.status);
  }

  const report = data as ClinicManagerOperationalReport;

  try {
    const buffer =
      format === "xlsx"
        ? await buildClinicManagerReportXlsx({ report, locale })
        : await buildClinicManagerReportPdf({ report, locale });
    const extension = format === "xlsx" ? "xlsx" : "pdf";
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
    const filename = `romdoc-report-${report.period.month}-${safeFileName(
      report.organization.name
    )}.${extension}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (exportError) {
    console.error("Clinic Manager report export failed:", exportError);
    return errorResponse(locale, CODES.exportFailed, 500);
  }
}
