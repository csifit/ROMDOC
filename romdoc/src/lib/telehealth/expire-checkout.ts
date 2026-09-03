import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function expirePendingTelehealthCheckout(appointmentId: string) {
  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("telehealth_payments")
    .select("id, stripe_account_id, stripe_checkout_session_id")
    .eq("appointment_id", appointmentId)
    .eq("status", "checkout_pending")
    .maybeSingle();
  if (error) throw error;
  if (!payment?.stripe_checkout_session_id) return false;

  try {
    await getStripe().checkout.sessions.expire(
      payment.stripe_checkout_session_id,
      {},
      { stripeAccount: payment.stripe_account_id }
    );
  } catch (expireError) {
    // A session that completed concurrently cannot be expired. The payment
    // webhook detects a cancelled appointment and reverses that race safely.
    console.error("Pending telehealth Checkout expiration failed:", expireError);
    return false;
  }

  await admin.from("telehealth_payments").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", payment.id).eq("status", "checkout_pending");
  return true;
}
