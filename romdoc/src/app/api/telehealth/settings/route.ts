import { NextRequest, NextResponse } from "next/server";

import { validateSameOrigin, sameOriginErrorResponse } from "@/lib/security/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeTelehealthOwner } from "@/lib/telehealth/server";
import { getStripe } from "@/lib/stripe";

function doctorIdFromRequest(request: NextRequest) {
  return request.nextUrl.searchParams.get("doctorId")?.trim() || undefined;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeTelehealthOwner(doctorIdFromRequest(request));
  if (authorization.response || !authorization.context) return authorization.response;

  const admin = createAdminClient();
  const { context } = authorization;
  const [{ data: offer }, { data: account }, { data: restriction }] = await Promise.all([
    admin.from("telehealth_offers").select("enabled, price_minor, currency, duration_minutes").eq("doctor_id", context.doctorId).maybeSingle(),
    admin
      .from("telehealth_commercial_accounts")
      .select("id, stripe_account_id, details_submitted, charges_enabled, payouts_enabled")
      .eq(context.ownerType === "doctor" ? "doctor_id" : "organization_id", context.ownerId)
      .maybeSingle(),
    admin.from("doctor_telehealth_restrictions").select("is_restricted, restriction_reason").eq("doctor_id", context.doctorId).maybeSingle(),
  ]);

  let currentAccount = account;
  if (account?.stripe_account_id) {
    try {
      const stripeAccount = await getStripe().accounts.retrieve(account.stripe_account_id);
      const nextState = {
        details_submitted: stripeAccount.details_submitted,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        updated_at: new Date().toISOString(),
      };
      await admin.from("telehealth_commercial_accounts").update(nextState).eq("id", account.id);
      currentAccount = { ...account, ...nextState };
    } catch (stripeError) {
      console.error("Stripe Connect status refresh failed:", stripeError);
    }
  }

  return NextResponse.json({
    doctorId: context.doctorId,
    ownerType: context.ownerType,
    organizationId: context.organizationId,
    restrictedByAdmin: Boolean(restriction?.is_restricted),
    restrictionReason: restriction?.restriction_reason ?? null,
    offer: offer ?? { enabled: false, price_minor: null, currency: "RON", duration_minutes: 30 },
    stripe: currentAccount
      ? {
          connected: Boolean(currentAccount.stripe_account_id),
          detailsSubmitted: currentAccount.details_submitted,
          chargesEnabled: currentAccount.charges_enabled,
          payoutsEnabled: currentAccount.payouts_enabled,
        }
      : { connected: false, detailsSubmitted: false, chargesEnabled: false, payoutsEnabled: false },
  });
}

export async function PATCH(request: NextRequest) {
  if (!validateSameOrigin(request)) return sameOriginErrorResponse();

  const body = (await request.json().catch(() => null)) as
    | { doctorId?: unknown; enabled?: unknown; priceMinor?: unknown; currency?: unknown; durationMinutes?: unknown }
    | null;

  const doctorId = typeof body?.doctorId === "string" ? body.doctorId.trim() : undefined;
  const authorization = await authorizeTelehealthOwner(doctorId);
  if (authorization.response || !authorization.context) return authorization.response;

  const enabled = body?.enabled === true;
  const priceMinor = Number(body?.priceMinor);
  const durationMinutes = Number(body?.durationMinutes);
  const currency = body?.currency === "EUR" ? "EUR" : "RON";

  if (!Number.isInteger(priceMinor) || priceMinor < 1 || priceMinor > 100000000) {
    return NextResponse.json({ error: "Enter a valid video consultation price." }, { status: 400 });
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
    return NextResponse.json({ error: "Enter a valid consultation duration." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { context } = authorization;
  const [{ data: restriction }, { data: account }] = await Promise.all([
    admin.from("doctor_telehealth_restrictions").select("is_restricted").eq("doctor_id", context.doctorId).maybeSingle(),
    admin
      .from("telehealth_commercial_accounts")
      .select("id, details_submitted, charges_enabled, payouts_enabled")
      .eq(context.ownerType === "doctor" ? "doctor_id" : "organization_id", context.ownerId)
      .maybeSingle(),
  ]);

  if (enabled && restriction?.is_restricted) {
    return NextResponse.json({ error: "Telehealth is restricted by RomDoc Admin for this Doctor account." }, { status: 409 });
  }
  if (enabled && (!account?.details_submitted || !account.charges_enabled || !account.payouts_enabled)) {
    return NextResponse.json({ error: "Complete Stripe Connect onboarding before enabling video consultations." }, { status: 409 });
  }

  const { error } = await admin.from("telehealth_offers").upsert(
    {
      doctor_id: context.doctorId,
      organization_id: context.organizationId,
      commercial_account_id: account?.id ?? null,
      enabled,
      price_minor: priceMinor,
      currency,
      duration_minutes: durationMinutes,
      updated_by_profile_id: context.profileId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "doctor_id" }
  );

  if (error) {
    console.error("Telehealth offer update failed:", error);
    return NextResponse.json({ error: "Telehealth settings could not be saved." }, { status: 500 });
  }

  await admin.from("telehealth_audit_events").insert({
    doctor_id: context.doctorId,
    event_type: "offer_updated",
    actor_profile_id: context.profileId,
    metadata: { enabled, price_minor: priceMinor, currency, duration_minutes: durationMinutes, owner_type: context.ownerType },
  });

  return NextResponse.json({ success: true });
}
