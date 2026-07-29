import { type NextRequest, NextResponse } from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import type { PlatformBillingCurrency } from "@/lib/billing/platform-invoicing";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const DEFAULT_SMS_UNIT_COST_MINOR = 10;
const DEFAULT_SMS_CURRENCY: PlatformBillingCurrency = "EUR";

type SmsPatchBody = {
  action?: unknown;
  smsEnabled?: unknown;
  confirmationSmsEnabled?: unknown;
  reminder24hSmsEnabled?: unknown;
  doctorId?: unknown;
  invoiceReference?: unknown;
  billingPeriodId?: unknown;
};

type DoctorRow = {
  id: string;
  slug: string;
  profile_id: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type SmsLogRow = {
  doctor_id: string | null;
  event: string | null;
  status: string | null;
  invoice_status: string | null;
  unit_cost_minor: number | null;
  currency: string | null;
  created_at: string;
};

type SmsBillingPeriodRow = {
  id: string;
  doctor_id: string;
  profile_id: string;
  period_start: string;
  period_end: string;
  sms_count: number;
  net_amount_minor: number;
  vat_amount_minor: number;
  gross_amount_minor: number;
  currency: string;
  payment_status: string;
  paid_at: string | null;
  saga_invoice_status: string;
  saga_invoice_reference: string | null;
  saga_invoice_issued_at: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function boolFromUnknown(value: unknown) {
  return value === true;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function currentSmsUnitCostMinor(value: unknown) {
  const price = Number(value);
  return Number.isFinite(price) && price >= 0
    ? Math.round(price * 100)
    : DEFAULT_SMS_UNIT_COST_MINOR;
}

function normalizeCurrency(value: unknown): PlatformBillingCurrency {
  return value === "RON" || value === "EUR"
    ? value
    : DEFAULT_SMS_CURRENCY;
}

async function requireSmsBillingCapability(
  role: "admin" | "manager",
  profileId: string
) {
  if (role === "admin") return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("manager_permissions")
    .select("id")
    .eq("profile_id", profileId)
    .eq("permission_key", "accounting")
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Accounting permission lookup failed:", error);
  }

  if (data) return null;

  return json(
    {
      code: "accounting_permission_required",
      error:
        "Numai administratorii și managerii cu permisiune de contabilitate pot accesa facturarea SMS.",
    },
    403
  );
}

export async function GET(): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const permissionError = await requireSmsBillingCapability(
    authorization.role,
    authorization.profileId
  );
  if (permissionError) return permissionError;

  const admin = createAdminClient();
  const [
    settingsResult,
    billingSettingsResult,
    doctorsResult,
    logsResult,
    billingPeriodsResult,
  ] = await Promise.all([
    admin
      .from("sms_platform_settings")
      .select(
        "sms_enabled, confirmation_sms_enabled, reminder_24h_sms_enabled, provider, updated_at"
      )
      .eq("id", 1)
      .maybeSingle(),
    admin
      .from("clinic_billing_settings")
      .select("sms_unit_price_ron, billing_currency")
      .eq("id", 1)
      .maybeSingle(),
    admin
      .from("doctors")
      .select("id, slug, profile_id")
      .order("slug", { ascending: true }),
    admin
      .from("sms_delivery_logs")
      .select(
        "doctor_id, event, status, invoice_status, unit_cost_minor, currency, created_at"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("doctor_sms_billing_periods")
      .select(
        "id, doctor_id, profile_id, period_start, period_end, sms_count, net_amount_minor, vat_amount_minor, gross_amount_minor, currency, payment_status, paid_at, saga_invoice_status, saga_invoice_reference, saga_invoice_issued_at"
      )
      .order("period_start", { ascending: false }),
  ]);

  const firstError =
    settingsResult.error ??
    billingSettingsResult.error ??
    doctorsResult.error ??
    logsResult.error ??
    billingPeriodsResult.error;

  if (firstError) {
    console.error("SMS administration query failed:", firstError);
    return json(
      {
        code: "sms_administration_load_failed",
        error: "Datele SMS nu au putut fi încărcate.",
      },
      500
    );
  }

  const doctors = (doctorsResult.data ?? []) as DoctorRow[];
  const logs = (logsResult.data ?? []) as SmsLogRow[];
  const billingPeriods =
    (billingPeriodsResult.data ?? []) as SmsBillingPeriodRow[];
  const configuredUnitCostMinor = currentSmsUnitCostMinor(
    billingSettingsResult.data?.sms_unit_price_ron
  );
  const configuredCurrency = normalizeCurrency(
    billingSettingsResult.data?.billing_currency
  );

  const profileIds = Array.from(
    new Set(
      doctors
        .map((doctor) => doctor.profile_id)
        .filter((profileId): profileId is string => Boolean(profileId))
    )
  );
  const profileMap = new Map<string, ProfileRow>();

  if (profileIds.length > 0) {
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", profileIds);

    if (error) {
      console.error("SMS Doctor profile query failed:", error);
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }
  }

  const doctorIdentity = new Map<
    string,
    { doctorName: string; slug: string }
  >();

  for (const doctor of doctors) {
    const profile = doctor.profile_id
      ? profileMap.get(doctor.profile_id)
      : undefined;
    const profileName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    doctorIdentity.set(doctor.id, {
      doctorName: profileName || nameFromSlug(doctor.slug),
      slug: doctor.slug,
    });
  }

  const counts = new Map<
    string,
    {
      total: number;
      sent: number;
      failed: number;
      skipped: number;
      confirmed: number;
      reminder24h: number;
      invoiced: number;
      uninvoiced: number;
      notBillable: number;
      credited: number;
      estimatedUninvoicedMinor: number;
      estimatedInvoicedMinor: number;
      lastSentAt: string | null;
    }
  >();

  for (const log of logs) {
    if (!log.doctor_id) continue;

    const current = counts.get(log.doctor_id) ?? {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      confirmed: 0,
      reminder24h: 0,
      invoiced: 0,
      uninvoiced: 0,
      notBillable: 0,
      credited: 0,
      estimatedUninvoicedMinor: 0,
      estimatedInvoicedMinor: 0,
      lastSentAt: null,
    };
    const invoiceStatus = log.invoice_status ?? "not_billable";
    const unitCostMinor = log.unit_cost_minor ?? configuredUnitCostMinor;

    current.total += 1;

    if (log.status === "sent") {
      current.sent += 1;
      current.lastSentAt = current.lastSentAt ?? log.created_at;
    } else if (log.status === "failed") {
      current.failed += 1;
    } else if (log.status === "skipped") {
      current.skipped += 1;
    }

    if (log.event === "confirmed") current.confirmed += 1;
    if (log.event === "reminder_24_hours") current.reminder24h += 1;

    if (invoiceStatus === "invoiced") {
      current.invoiced += 1;
      current.estimatedInvoicedMinor += unitCostMinor;
    } else if (invoiceStatus === "uninvoiced") {
      current.uninvoiced += 1;
      current.estimatedUninvoicedMinor += unitCostMinor;
    } else if (invoiceStatus === "credited") {
      current.credited += 1;
    } else {
      current.notBillable += 1;
    }

    counts.set(log.doctor_id, current);
  }

  const doctorCounters = doctors.map((doctor) => ({
    doctorId: doctor.id,
    doctorName:
      doctorIdentity.get(doctor.id)?.doctorName ?? nameFromSlug(doctor.slug),
    slug: doctor.slug,
    ...(counts.get(doctor.id) ?? {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      confirmed: 0,
      reminder24h: 0,
      invoiced: 0,
      uninvoiced: 0,
      notBillable: 0,
      credited: 0,
      estimatedUninvoicedMinor: 0,
      estimatedInvoicedMinor: 0,
      lastSentAt: null,
    }),
  }));

  const smsBillingPeriods = billingPeriods.map((period) => ({
    ...period,
    doctorName:
      doctorIdentity.get(period.doctor_id)?.doctorName ?? "Medic necunoscut",
    slug: doctorIdentity.get(period.doctor_id)?.slug ?? "",
  }));

  return json({
    code: "sms_administration_loaded",
    settings:
      settingsResult.data ?? {
        sms_enabled: false,
        confirmation_sms_enabled: true,
        reminder_24h_sms_enabled: false,
        provider: "smslink",
        updated_at: null,
      },
    billing: {
      unitCostMinor: configuredUnitCostMinor,
      currency: configuredCurrency,
      vatMode: "plus_vat",
    },
    doctorCounters,
    smsBillingPeriods,
  });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  let body: SmsPatchBody;
  try {
    body = (await request.json()) as SmsPatchBody;
  } catch {
    return json(
      { code: "invalid_json", error: "Cererea nu conține date JSON valide." },
      400
    );
  }

  const admin = createAdminClient();

  if (body.action === "mark_sms_billing_period_saga_issued") {
    const permissionError = await requireSmsBillingCapability(
      authorization.role,
      authorization.profileId
    );
    if (permissionError) return permissionError;

    const billingPeriodId = cleanText(body.billingPeriodId);
    const invoiceReference = cleanText(body.invoiceReference);

    if (!billingPeriodId || !invoiceReference) {
      return json(
        {
          code: "saga_reference_required",
          error: "Perioada și referința facturii SAGA sunt obligatorii.",
        },
        400
      );
    }

    if (invoiceReference.length > 120) {
      return json(
        {
          code: "invoice_reference_too_long",
          error: "Referința facturii poate avea maximum 120 de caractere.",
        },
        400
      );
    }

    const { data, error } = await admin
      .from("doctor_sms_billing_periods")
      .update({
        saga_invoice_status: "issued",
        saga_invoice_reference: invoiceReference,
        saga_invoice_issued_at: new Date().toISOString(),
      })
      .eq("id", billingPeriodId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("SAGA invoice reference update failed:", error);
      return json(
        {
          code: "saga_reference_save_failed",
          error: "Referința SAGA nu a putut fi salvată.",
        },
        500
      );
    }

    return json({
      code: "saga_reference_saved",
      message: "Referința SAGA a fost salvată.",
    });
  }

  if (body.action === "mark_doctor_sms_invoiced") {
    const permissionError = await requireSmsBillingCapability(
      authorization.role,
      authorization.profileId
    );
    if (permissionError) return permissionError;

    const doctorId = cleanText(body.doctorId);
    const invoiceReference = cleanText(body.invoiceReference);

    if (!doctorId || !invoiceReference) {
      return json(
        {
          code: "doctor_invoice_reference_required",
          error: "Medicul și referința facturii sunt obligatorii.",
        },
        400
      );
    }

    if (invoiceReference.length > 120) {
      return json(
        {
          code: "invoice_reference_too_long",
          error: "Referința facturii poate avea maximum 120 de caractere.",
        },
        400
      );
    }

    const { data, error } = await admin
      .from("sms_delivery_logs")
      .update({
        invoice_status: "invoiced",
        invoice_reference: invoiceReference,
        invoiced_by_profile_id: authorization.profileId,
        invoiced_at: new Date().toISOString(),
      })
      .eq("doctor_id", doctorId)
      .eq("status", "sent")
      .eq("invoice_status", "uninvoiced")
      .select("id");

    if (error) {
      console.error("SMS mark as invoiced failed:", error);
      return json(
        {
          code: "sms_invoice_mark_failed",
          error: "SMS-urile nu au putut fi marcate ca facturate.",
        },
        500
      );
    }

    return json({
      code: "sms_marked_invoiced",
      message: `${data?.length ?? 0} SMS-uri au fost marcate ca facturate.`,
      updatedCount: data?.length ?? 0,
    });
  }

  const administratorError = requireAdministratorCapability(
    authorization.role,
    "Numai administratorii pot modifica setările SMS."
  );
  if (administratorError) return administratorError;

  const { data, error } = await admin
    .from("sms_platform_settings")
    .upsert(
      {
        id: 1,
        sms_enabled: boolFromUnknown(body.smsEnabled),
        confirmation_sms_enabled: boolFromUnknown(
          body.confirmationSmsEnabled
        ),
        reminder_24h_sms_enabled: boolFromUnknown(
          body.reminder24hSmsEnabled
        ),
        provider: "smslink",
        updated_by_profile_id: authorization.profileId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select(
      "sms_enabled, confirmation_sms_enabled, reminder_24h_sms_enabled, provider, updated_at"
    )
    .single();

  if (error) {
    console.error("SMS settings update failed:", error);
    return json(
      {
        code: "sms_settings_save_failed",
        error: "Setările SMS nu au putut fi salvate.",
      },
      500
    );
  }

  return json({
    code: "sms_settings_saved",
    message: "Setările SMS au fost salvate.",
    settings: data,
  });
}
