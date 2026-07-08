import {
  NextResponse,
} from "next/server";

import {
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

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

type BillingProfileRow = {
  doctor_id: string;
  legal_name: string | null;
  entity_type: string | null;
  cui: string | null;
  trade_registry_number: string | null;
  vat_payer: boolean | null;
  billing_email: string | null;
  billing_address: string | null;
  county: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
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

function csvCell(value: string | number | boolean | null | undefined) {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function amount(minorAmount: number) {
  return (minorAmount / 100).toFixed(2);
}

function nameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDoctorDisplayName(
  doctor: DoctorRow | undefined,
  profile: ProfileRow | undefined
) {
  const profileName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return profileName || (doctor ? nameFromSlug(doctor.slug) : "Medic necunoscut");
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
        "Numai administratorii și managerii cu permisiune de contabilitate pot exporta facturarea SMS.",
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

  const [periodsResult, doctorsResult, billingProfilesResult] =
    await Promise.all([
      admin
        .from("doctor_sms_billing_periods")
        .select(
          "id, doctor_id, profile_id, period_start, period_end, sms_count, net_amount_minor, vat_amount_minor, gross_amount_minor, currency, payment_status, paid_at, saga_invoice_status, saga_invoice_reference, saga_invoice_issued_at"
        )
        .order("period_start", { ascending: false }),

      admin
        .from("doctors")
        .select("id, slug, profile_id"),

      admin
        .from("doctor_billing_profiles")
        .select(
          "doctor_id, legal_name, entity_type, cui, trade_registry_number, vat_payer, billing_email, billing_address, county, city, postal_code, country"
        ),
    ]);

  if (periodsResult.error) {
    console.error("SMS billing export periods query failed:", periodsResult.error);

    return NextResponse.json(
      { error: "Perioadele de facturare SMS nu au putut fi exportate." },
      { status: 500 }
    );
  }

  if (doctorsResult.error) {
    console.error("SMS billing export doctors query failed:", doctorsResult.error);

    return NextResponse.json(
      { error: "Medicii nu au putut fi încărcați pentru export." },
      { status: 500 }
    );
  }

  if (billingProfilesResult.error) {
    console.error(
      "SMS billing export billing profiles query failed:",
      billingProfilesResult.error
    );
  }

  const periods = (periodsResult.data ?? []) as SmsBillingPeriodRow[];
  const doctors = (doctorsResult.data ?? []) as DoctorRow[];
  const billingProfiles =
    (billingProfilesResult.data ?? []) as BillingProfileRow[];

  const profileIds = Array.from(
    new Set(
      doctors
        .map((doctor) => doctor.profile_id)
        .filter((profileId): profileId is string => Boolean(profileId))
    )
  );

  const profilesMap = new Map<string, ProfileRow>();

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", profileIds);

    if (profilesError) {
      console.error("SMS billing export profiles query failed:", profilesError);
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profilesMap.set(profile.id, profile);
    }
  }

  const doctorsMap = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const billingProfileMap = new Map(
    billingProfiles.map((profile) => [profile.doctor_id, profile])
  );

  const headers = [
    "Doctor",
    "Doctor slug",
    "Billing legal name",
    "Entity type",
    "CUI",
    "Trade registry number",
    "VAT payer",
    "Billing email",
    "Billing address",
    "County",
    "City",
    "Postal code",
    "Country",
    "Period start",
    "Period end",
    "SMS count",
    "Net amount",
    "VAT 21%",
    "Gross amount",
    "Currency",
    "Payment status",
    "Paid at",
    "SAGA invoice status",
    "SAGA invoice reference",
    "SAGA invoice issued at",
  ];

  const rows = periods.map((period) => {
    const doctor = doctorsMap.get(period.doctor_id);
    const profile = doctor?.profile_id ? profilesMap.get(doctor.profile_id) : undefined;
    const billingProfile = billingProfileMap.get(period.doctor_id);

    return [
      getDoctorDisplayName(doctor, profile),
      doctor?.slug ?? "",
      billingProfile?.legal_name ?? "",
      billingProfile?.entity_type ?? "",
      billingProfile?.cui ?? "",
      billingProfile?.trade_registry_number ?? "",
      billingProfile?.vat_payer ? "yes" : "no",
      billingProfile?.billing_email ?? "",
      billingProfile?.billing_address ?? "",
      billingProfile?.county ?? "",
      billingProfile?.city ?? "",
      billingProfile?.postal_code ?? "",
      billingProfile?.country ?? "",
      period.period_start,
      period.period_end,
      period.sms_count,
      amount(period.net_amount_minor),
      amount(period.vat_amount_minor),
      amount(period.gross_amount_minor),
      period.currency,
      period.payment_status,
      period.paid_at,
      period.saga_invoice_status,
      period.saga_invoice_reference,
      period.saga_invoice_issued_at,
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const fileName = `romdoc-sms-billing-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new Response(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
