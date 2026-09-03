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
  const [{ data: profile }, { data: payment }] = await Promise.all([
    admin.from("profiles").select("role, account_status").eq("id", user.id).maybeSingle(),
    admin.from("telehealth_payments").select("id, status, amount_minor, amount_refunded_minor, stripe_account_id, stripe_payment_intent_id, recipient_type, recipient_id, appointments(doctor_id)").eq("appointment_id", appointmentId).maybeSingle(),
  ]);
  if (!profile || profile.account_status !== "active") return NextResponse.json({ error: "An active account is required." }, { status: 403 });
  if (!payment || payment.status !== "paid" || !payment.stripe_payment_intent_id) return NextResponse.json({ error: "This payment cannot be refunded." }, { status: 409 });

  const appointment = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments;
  let authorized = false;
  if (payment.recipient_type === "doctor" && profile.role === "doctor") {
    const { data: doctor } = await admin.from("doctors").select("id").eq("id", appointment?.doctor_id ?? "").eq("profile_id", user.id).maybeSingle();
    authorized = Boolean(doctor && payment.recipient_id === doctor.id);
  } else if (payment.recipient_type === "clinic_organization" && profile.role === "clinic_manager") {
    const { data: membership } = await admin.from("clinic_organization_members").select("id").eq("organization_id", payment.recipient_id).eq("profile_id", user.id).eq("status", "active").in("member_role", ["owner", "billing_manager"]).maybeSingle();
    authorized = Boolean(membership);
  }
  if (!authorized) return NextResponse.json({ error: "Only the payment recipient can issue this refund." }, { status: 403 });

  const refund = await getStripe().refunds.create(
    { payment_intent: payment.stripe_payment_intent_id, metadata: { romdoc_appointment_id: appointmentId, romdoc_payment_id: payment.id } },
    { stripeAccount: payment.stripe_account_id }
  );
  if (refund.status === "failed") return NextResponse.json({ error: "Stripe could not complete the refund." }, { status: 502 });

  const now = new Date().toISOString();
  await admin.from("telehealth_payments").update({ status: "refunded", amount_refunded_minor: payment.amount_minor, refunded_at: now, updated_at: now }).eq("id", payment.id);
  await admin.from("telehealth_audit_events").insert({ appointment_id: appointmentId, doctor_id: appointment?.doctor_id ?? null, event_type: "refund_created", actor_profile_id: user.id, metadata: { refund_id: refund.id, amount_minor: payment.amount_minor } });
  return NextResponse.json({ success: true, refundId: refund.id });
}

