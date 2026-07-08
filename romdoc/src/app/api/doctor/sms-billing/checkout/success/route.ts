import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (!sessionId) {
    return NextResponse.redirect(
      new URL("/doctor-dashboard?payment=sms-missing-session", siteUrl)
    );
  }

  const stripe = getStripe();
  const admin = createAdminClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  const billingPeriodId = session.metadata?.romdoc_sms_billing_period_id;
  const paymentType = session.metadata?.romdoc_payment_type;

  if (paymentType !== "doctor_sms_bill" || !billingPeriodId) {
    return NextResponse.redirect(
      new URL("/doctor-dashboard?payment=sms-invalid-session", siteUrl)
    );
  }

  if (session.payment_status !== "paid") {
    await admin
      .from("doctor_sms_billing_periods")
      .update({
        payment_status: "failed",
        stripe_checkout_session_id: session.id,
      })
      .eq("id", billingPeriodId);

    return NextResponse.redirect(
      new URL("/doctor-dashboard?payment=sms-not-paid", siteUrl)
    );
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await admin
    .from("doctor_sms_billing_periods")
    .update({
      payment_status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", billingPeriodId);

  return NextResponse.redirect(
    new URL("/doctor-dashboard?payment=sms-success", siteUrl)
  );
}
