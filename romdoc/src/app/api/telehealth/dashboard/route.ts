import { NextRequest, NextResponse } from "next/server";

import { validateSameOrigin, sameOriginErrorResponse } from "@/lib/security/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeTelehealthOwner } from "@/lib/telehealth/server";

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) return sameOriginErrorResponse();

  const body = (await request.json().catch(() => null)) as { doctorId?: unknown } | null;
  const doctorId = typeof body?.doctorId === "string" ? body.doctorId.trim() : undefined;
  const authorization = await authorizeTelehealthOwner(doctorId);
  if (authorization.response || !authorization.context) return authorization.response;

  const { context } = authorization;
  const admin = createAdminClient();
  const { data: account, error } = await admin
    .from("telehealth_commercial_accounts")
    .select("stripe_account_id, details_submitted")
    .eq(context.ownerType === "doctor" ? "doctor_id" : "organization_id", context.ownerId)
    .maybeSingle();

  if (error) {
    console.error("Telehealth Stripe account lookup failed:", error);
    return NextResponse.json({ error: "The payment account could not be loaded." }, { status: 500 });
  }
  if (!account?.stripe_account_id || !account.details_submitted) {
    return NextResponse.json({ error: "Complete Stripe Connect onboarding before opening the Stripe Dashboard." }, { status: 409 });
  }

  return NextResponse.json({ url: "https://dashboard.stripe.com/" });
}
