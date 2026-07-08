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

  const paymentType = session.metadata?.romdoc_payment_type;
  const paymentId = session.metadata?.romdoc_sms_payment_id;

  if (paymentType !== "doctor_sms_balance" || !paymentId) {
    return NextResponse.redirect(
      new URL("/doctor-dashboard?payment=sms-invalid-session", siteUrl)
    );
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const { data: paymentItems, error: itemsError } = await admin
    .from("doctor_sms_payment_items")
    .select("billing_period_id")
    .eq("payment_id", paymentId);

  if (itemsError) {
    console.error("SMS payment items lookup failed:", itemsError);

    return NextResponse.redirect(
      new URL("/doctor-dashboard?payment=sms-error", siteUrl)
    );
  }

  const billingPeriodIds = (paymentItems ?? [])
    .map((item) => item.billing_period_id)
    .filter((id): id is string => Boolean(id));

  if (session.payment_status !== "paid") {
    await admin
      .from("doctor_sms_payments")
      .update({
        payment_status: "failed",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", paymentId);

    if (billingPeriodIds.length > 0) {
      await admin
        .from("doctor_sms_billing_periods")
        .update({
          payment_status: "failed",
          stripe_checkout_session_id: session.id,
        })
        .in("id", billingPeriodIds);
    }

    return NextResponse.redirect(
      new URL("/doctor-dashboard?payment=sms-not-paid", siteUrl)
    );
  }

  const paidAt = new Date().toISOString();

  await admin
    .from("doctor_sms_payments")
    .update({
      payment_status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: paidAt,
    })
    .eq("id", paymentId);

  if (billingPeriodIds.length > 0) {
    await admin
      .from("doctor_sms_billing_periods")
      .update({
        payment_status: "paid",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        paid_at: paidAt,
      })
      .in("id", billingPeriodIds);
  }

  return NextResponse.redirect(
    new URL("/doctor-dashboard?payment=sms-success", siteUrl)
  );
}
