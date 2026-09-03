import { NextRequest, NextResponse } from "next/server";

import { validateSameOrigin, sameOriginErrorResponse } from "@/lib/security/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) return sameOriginErrorResponse();
  const body = (await request.json().catch(() => null)) as { appointmentId?: unknown } | null;
  const appointmentId = typeof body?.appointmentId === "string" ? body.appointmentId.trim() : "";
  if (!appointmentId) return NextResponse.json({ error: "Appointment is required." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: profile }, { data: appointment }, { data: payment }] = await Promise.all([
    admin.from("profiles").select("account_status").eq("id", user.id).maybeSingle(),
    admin.from("appointments").select("id, patient_profile_id, status, consultation_mode").eq("id", appointmentId).maybeSingle(),
    admin.from("telehealth_payments").select("id, status, stripe_account_id, stripe_checkout_session_id").eq("appointment_id", appointmentId).maybeSingle(),
  ]);

  if (!profile || profile.account_status !== "active") return NextResponse.json({ error: "An active account is required." }, { status: 403 });
  if (!appointment || appointment.patient_profile_id !== user.id || appointment.consultation_mode !== "video") return NextResponse.json({ error: "Video appointment not found." }, { status: 404 });
  if (appointment.status !== "pending" || payment?.status !== "checkout_pending" || !payment.stripe_checkout_session_id) return NextResponse.json({ error: "This payment can no longer be resumed." }, { status: 409 });

  const session = await getStripe().checkout.sessions.retrieve(
    payment.stripe_checkout_session_id,
    {},
    { stripeAccount: payment.stripe_account_id }
  );
  if (session.status !== "open" || !session.url) {
    const now = new Date().toISOString();
    await Promise.all([
      admin.from("telehealth_payments").update({ status: "cancelled", updated_at: now }).eq("id", payment.id).eq("status", "checkout_pending"),
      admin.from("appointments").update({ status: "cancelled" }).eq("id", appointment.id).eq("status", "pending"),
    ]);
    return NextResponse.json({ error: "This payment session has expired. Please book a new appointment." }, { status: 410 });
  }

  return NextResponse.json({ url: session.url });
}
