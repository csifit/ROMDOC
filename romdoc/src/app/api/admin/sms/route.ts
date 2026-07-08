import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SMS_UNIT_COST_MINOR = 30;
const SMS_CURRENCY = "RON";

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
  event: string;
  status: string;
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

function boolFromUnknown(value: unknown) {
  return value === true;
}

function nameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireSmsBillingCapability(
  role: "admin" | "manager",
  profileId: string
) {
  if (role === "admin") {
    return null;
  }

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

  if (data) {
    return null;
  }

  return NextResponse.json(
    {
      error:
        "Numai administratorii și managerii cu permisiune de contabilitate pot accesa facturarea SMS.",
      code: "accounting_permission_required",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const smsBillingOnly = await requireSmsBillingCapability(
    authorization.role,
    authorization.profileId
  );

  if (smsBillingOnly) {
    return smsBillingOnly;
  }

  const admin = createAdminClient();

  const [settingsResult, doctorsResult, logsResult, billingPeriodsResult] =
    await Promise.all([
      admin
        .from("sms_platform_settings")
        .select(
          "sms_enabled, confirmation_sms_enabled, reminder_24h_sms_enabled, provider, updated_at"
        )
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

  if (settingsResult.error) {
    console.error("SMS settings query failed:", settingsResult.error);

    return NextResponse.json(
      { error: "Setările SMS nu au putut fi încărcate." },
      { status: 500 }
    );
  }

  if (doctorsResult.error) {
    console.error("SMS doctors query failed:", doctorsResult.error);

    return NextResponse.json(
      { error: "Lista medicilor nu a putut fi încărcată." },
      { status: 500 }
    );
  }

  if (logsResult.error) {
    console.error("SMS logs query failed:", logsResult.error);

    return NextResponse.json(
      { error: "Statisticile SMS nu au putut fi încărcate." },
      { status: 500 }
    );
  }

  if (billingPeriodsResult.error) {
    console.error("SMS billing periods query failed:", billingPeriodsResult.error);

    return NextResponse.json(
      { error: "Facturarea SMS nu a putut fi încărcată." },
      { status: 500 }
    );
  }

  const doctors = (doctorsResult.data ?? []) as DoctorRow[];
  const logs = (logsResult.data ?? []) as SmsLogRow[];
  const billingPeriods =
    (billingPeriodsResult.data ?? []) as SmsBillingPeriodRow[];

  const profileIds = Array.from(
    new Set(
      doctors
        .map((doctor) => doctor.profile_id)
        .filter((profileId): profileId is string => Boolean(profileId))
    )
  );

  const profileMap = new Map<string, ProfileRow>();

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", profileIds);

    if (profilesError) {
      console.error("SMS doctor profile query failed:", profilesError);
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }
  }

  const doctorNameMap = new Map<string, { doctorName: string; slug: string }>();

  for (const doctor of doctors) {
    const profile = doctor.profile_id ? profileMap.get(doctor.profile_id) : null;
    const profileName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    doctorNameMap.set(doctor.id, {
      doctorName: profileName || nameFromSlug(doctor.slug),
      slug: doctor.slug,
    });
  }

  const logCounts = new Map<
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
    if (!log.doctor_id) {
      continue;
    }

    const current = logCounts.get(log.doctor_id) ?? {
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
    const unitCostMinor = log.unit_cost_minor ?? SMS_UNIT_COST_MINOR;

    current.total += 1;

    if (log.status === "sent") {
      current.sent += 1;
      current.lastSentAt = current.lastSentAt ?? log.created_at;
    } else if (log.status === "failed") {
      current.failed += 1;
    } else if (log.status === "skipped") {
      current.skipped += 1;
    }

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

    if (log.event === "confirmed") {
      current.confirmed += 1;
    }

    if (log.event === "reminder_24_hours") {
      current.reminder24h += 1;
    }

    logCounts.set(log.doctor_id, current);
  }

  const doctorCounters = doctors.map((doctor) => {
    const doctorIdentity = doctorNameMap.get(doctor.id);
    const counts = logCounts.get(doctor.id) ?? {
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

    return {
      doctorId: doctor.id,
      doctorName: doctorIdentity?.doctorName ?? nameFromSlug(doctor.slug),
      slug: doctor.slug,
      ...counts,
    };
  });

  const smsBillingPeriods = billingPeriods.map((period) => {
    const doctorIdentity = doctorNameMap.get(period.doctor_id);

    return {
      ...period,
      doctorName: doctorIdentity?.doctorName ?? "Medic necunoscut",
      slug: doctorIdentity?.slug ?? "",
    };
  });

  return NextResponse.json(
    {
      settings:
        settingsResult.data ?? {
          sms_enabled: false,
          confirmation_sms_enabled: true,
          reminder_24h_sms_enabled: false,
          provider: "smslink",
          updated_at: null,
        },
      billing: {
        unitCostMinor: SMS_UNIT_COST_MINOR,
        currency: SMS_CURRENCY,
        vatMode: "plus_vat",
      },
      doctorCounters,
      smsBillingPeriods,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  let body: SmsPatchBody;

  try {
    body = (await request.json()) as SmsPatchBody;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  if (body.action === "mark_sms_billing_period_saga_issued") {
    const smsBillingOnly = await requireSmsBillingCapability(
      authorization.role,
      authorization.profileId
    );

    if (smsBillingOnly) {
      return smsBillingOnly;
    }

    const billingPeriodId = cleanText(body.billingPeriodId);
    const invoiceReference = cleanText(body.invoiceReference);

    if (!billingPeriodId) {
      return NextResponse.json(
        { error: "Perioada de facturare lipsește." },
        { status: 400 }
      );
    }

    if (!invoiceReference) {
      return NextResponse.json(
        { error: "Referința facturii SAGA este obligatorie." },
        { status: 400 }
      );
    }

    if (invoiceReference.length > 120) {
      return NextResponse.json(
        { error: "Referința facturii poate avea maximum 120 de caractere." },
        { status: 400 }
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

      return NextResponse.json(
        { error: "Referința SAGA nu a putut fi salvată." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Referința SAGA a fost salvată.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (body.action === "mark_doctor_sms_invoiced") {
    const smsBillingOnly = await requireSmsBillingCapability(
      authorization.role,
      authorization.profileId
    );

    if (smsBillingOnly) {
      return smsBillingOnly;
    }

    const doctorId = cleanText(body.doctorId);
    const invoiceReference = cleanText(body.invoiceReference);

    if (!doctorId) {
      return NextResponse.json(
        { error: "Medicul nu a fost selectat." },
        { status: 400 }
      );
    }

    if (!invoiceReference) {
      return NextResponse.json(
        { error: "Referința facturii este obligatorie." },
        { status: 400 }
      );
    }

    if (invoiceReference.length > 120) {
      return NextResponse.json(
        { error: "Referința facturii poate avea maximum 120 de caractere." },
        { status: 400 }
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

      return NextResponse.json(
        { error: "SMS-urile nu au putut fi marcate ca facturate." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `${data?.length ?? 0} SMS-uri au fost marcate ca facturate.`,
        updatedCount: data?.length ?? 0,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Numai administratorii pot modifica setările SMS."
  );

  if (adminOnly) {
    return adminOnly;
  }

  const { data, error } = await admin
    .from("sms_platform_settings")
    .upsert(
      {
        id: 1,
        sms_enabled: boolFromUnknown(body.smsEnabled),
        confirmation_sms_enabled: boolFromUnknown(body.confirmationSmsEnabled),
        reminder_24h_sms_enabled: boolFromUnknown(body.reminder24hSmsEnabled),
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

    return NextResponse.json(
      { error: "Setările SMS nu au putut fi salvate." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message: "Setările SMS au fost salvate.",
      settings: data,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
