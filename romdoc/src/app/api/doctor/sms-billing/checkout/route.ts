import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CheckoutBody = {
  billingPeriodId?: unknown;
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
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatPeriodLabel(periodStart: string, periodEnd: string) {
  const startDate = new Date(`${periodStart}T12:00:00Z`);
  const endDate = new Date(`${periodEnd}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  const formatter = new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return formatter.format(startDate) || `${periodStart} - ${periodEnd}`;
}

export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Trebuie să fii autentificat." },
      { status: 401 }
    );
  }

  let body: CheckoutBody;

  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const billingPeriodId = cleanText(body.billingPeriodId);

  if (!billingPeriodId) {
    return NextResponse.json(
      { error: "Perioada de facturare lipsește." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "doctor" ||
    profile.account_status !== "active"
  ) {
    return NextResponse.json(
      { error: "Doar medicii activi pot plăti facturile SMS." },
      { status: 403 }
    );
  }

  const { data: billingPeriodData, error: billingPeriodError } = await admin
    .from("doctor_sms_billing_periods")
    .select(`
      id,
      doctor_id,
      profile_id,
      period_start,
      period_end,
      sms_count,
      net_amount_minor,
      vat_amount_minor,
      gross_amount_minor,
      currency,
      payment_status
    `)
    .eq("id", billingPeriodId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (billingPeriodError || !billingPeriodData) {
    return NextResponse.json(
      { error: "Factura SMS nu a fost găsită." },
      { status: 404 }
    );
  }

  const billingPeriod = billingPeriodData as SmsBillingPeriodRow;

  if (billingPeriod.payment_status === "paid") {
    return NextResponse.json(
      { error: "Această factură SMS este deja plătită." },
      { status: 409 }
    );
  }

  if (billingPeriod.gross_amount_minor <= 0 || billingPeriod.sms_count <= 0) {
    return NextResponse.json(
      { error: "Factura SMS nu are o sumă de plată validă." },
      { status: 400 }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const stripe = getStripe();
  const periodLabel = formatPeriodLabel(
    billingPeriod.period_start,
    billingPeriod.period_end
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    client_reference_id: billingPeriod.id,
    line_items: [
      {
        price_data: {
          currency: billingPeriod.currency.toLowerCase(),
          unit_amount: billingPeriod.gross_amount_minor,
          product_data: {
            name: `RomDoc SMS - ${periodLabel}`,
            description: `${billingPeriod.sms_count} SMS-uri trimise. Include TVA.`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      romdoc_payment_type: "doctor_sms_bill",
      romdoc_sms_billing_period_id: billingPeriod.id,
      romdoc_doctor_id: billingPeriod.doctor_id,
      romdoc_profile_id: user.id,
    },
    payment_intent_data: {
      metadata: {
        romdoc_payment_type: "doctor_sms_bill",
        romdoc_sms_billing_period_id: billingPeriod.id,
        romdoc_doctor_id: billingPeriod.doctor_id,
        romdoc_profile_id: user.id,
      },
    },
    success_url: `${siteUrl}/api/doctor/sms-billing/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/doctor-dashboard?payment=sms-cancelled`,
  });

  const { error: updateError } = await admin
    .from("doctor_sms_billing_periods")
    .update({
      payment_status: "checkout_open",
      stripe_checkout_session_id: session.id,
    })
    .eq("id", billingPeriod.id)
    .eq("profile_id", user.id);

  if (updateError) {
    console.error("SMS billing checkout persistence failed:", updateError);
  }

  return NextResponse.json(
    { url: session.url },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
