import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CheckoutBody = {
  action?: unknown;
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

  const action = cleanText(body.action);

  if (action !== "pay_unpaid_sms_balance") {
    return NextResponse.json(
      { error: "Acțiunea solicitată nu este validă." },
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

  const { data: billingPeriodsData, error: billingPeriodsError } = await admin
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
    .eq("profile_id", user.id)
    .in("payment_status", ["unpaid", "checkout_open", "failed"])
    .gt("gross_amount_minor", 0)
    .order("period_start", { ascending: true });

  if (billingPeriodsError) {
    console.error("SMS unpaid balance query failed:", billingPeriodsError);

    return NextResponse.json(
      { error: "Soldul SMS nu a putut fi încărcat." },
      { status: 500 }
    );
  }

  const billingPeriods = (billingPeriodsData ?? []) as SmsBillingPeriodRow[];

  if (billingPeriods.length === 0) {
    return NextResponse.json(
      { error: "Nu există facturi SMS neplătite." },
      { status: 400 }
    );
  }

  const firstPeriod = billingPeriods[0];
  const doctorId = firstPeriod.doctor_id;
  const currency = firstPeriod.currency;

  const hasMixedDoctorOrCurrency = billingPeriods.some(
    (period) => period.doctor_id !== doctorId || period.currency !== currency
  );

  if (hasMixedDoctorOrCurrency) {
    return NextResponse.json(
      { error: "Soldul SMS conține date inconsistente." },
      { status: 409 }
    );
  }

  const totalSmsCount = billingPeriods.reduce(
    (total, period) => total + period.sms_count,
    0
  );
  const netAmountMinor = billingPeriods.reduce(
    (total, period) => total + period.net_amount_minor,
    0
  );
  const vatAmountMinor = billingPeriods.reduce(
    (total, period) => total + period.vat_amount_minor,
    0
  );
  const grossAmountMinor = billingPeriods.reduce(
    (total, period) => total + period.gross_amount_minor,
    0
  );

  if (grossAmountMinor <= 0 || totalSmsCount <= 0) {
    return NextResponse.json(
      { error: "Soldul SMS nu are o sumă de plată validă." },
      { status: 400 }
    );
  }

  const { data: payment, error: paymentError } = await admin
    .from("doctor_sms_payments")
    .insert({
      doctor_id: doctorId,
      profile_id: user.id,
      period_count: billingPeriods.length,
      sms_count: totalSmsCount,
      net_amount_minor: netAmountMinor,
      vat_amount_minor: vatAmountMinor,
      gross_amount_minor: grossAmountMinor,
      currency,
      payment_status: "checkout_open",
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    console.error("SMS payment creation failed:", paymentError);

    return NextResponse.json(
      { error: "Plata SMS nu a putut fi pregătită." },
      { status: 500 }
    );
  }

  const { error: itemsError } = await admin
    .from("doctor_sms_payment_items")
    .insert(
      billingPeriods.map((period) => ({
        payment_id: payment.id,
        billing_period_id: period.id,
        doctor_id: period.doctor_id,
        profile_id: period.profile_id,
        net_amount_minor: period.net_amount_minor,
        vat_amount_minor: period.vat_amount_minor,
        gross_amount_minor: period.gross_amount_minor,
      }))
    );

  if (itemsError) {
    console.error("SMS payment items creation failed:", itemsError);

    await admin
      .from("doctor_sms_payments")
      .update({ payment_status: "failed" })
      .eq("id", payment.id);

    return NextResponse.json(
      { error: "Detaliile plății SMS nu au putut fi pregătite." },
      { status: 500 }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const stripe = getStripe();
  const firstLabel = formatPeriodLabel(
    billingPeriods[0].period_start,
    billingPeriods[0].period_end
  );
  const lastLabel = formatPeriodLabel(
    billingPeriods[billingPeriods.length - 1].period_start,
    billingPeriods[billingPeriods.length - 1].period_end
  );
  const periodLabel =
    firstLabel === lastLabel ? firstLabel : `${firstLabel} - ${lastLabel}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    client_reference_id: payment.id,
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: grossAmountMinor,
          product_data: {
            name: `RomDoc SMS - sold restant`,
            description: `${totalSmsCount} SMS-uri, ${billingPeriods.length} perioadă/perioade: ${periodLabel}. Include TVA.`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      romdoc_payment_type: "doctor_sms_balance",
      romdoc_sms_payment_id: payment.id,
      romdoc_doctor_id: doctorId,
      romdoc_profile_id: user.id,
    },
    payment_intent_data: {
      metadata: {
        romdoc_payment_type: "doctor_sms_balance",
        romdoc_sms_payment_id: payment.id,
        romdoc_doctor_id: doctorId,
        romdoc_profile_id: user.id,
      },
    },
    success_url: `${siteUrl}/api/doctor/sms-billing/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/doctor-dashboard?payment=sms-cancelled`,
  });

  const { error: updateError } = await admin
    .from("doctor_sms_payments")
    .update({
      stripe_checkout_session_id: session.id,
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("SMS payment checkout persistence failed:", updateError);
  }

  await admin
    .from("doctor_sms_billing_periods")
    .update({
      payment_status: "checkout_open",
      stripe_checkout_session_id: session.id,
    })
    .in(
      "id",
      billingPeriods.map((period) => period.id)
    );

  return NextResponse.json(
    { url: session.url },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
