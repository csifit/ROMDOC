import { NextRequest, NextResponse } from "next/server";

import { validateSameOrigin, sameOriginErrorResponse } from "@/lib/security/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { authorizeTelehealthOwner } from "@/lib/telehealth/server";

const CONNECT_ACCOUNT_CONFIGURATION_VERSION = "full-dashboard-v1";

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) return sameOriginErrorResponse();

  const body = (await request.json().catch(() => null)) as { doctorId?: unknown } | null;
  const doctorId = typeof body?.doctorId === "string" ? body.doctorId.trim() : undefined;
  const authorization = await authorizeTelehealthOwner(doctorId);
  if (authorization.response || !authorization.context) return authorization.response;

  const { context } = authorization;
  const admin = createAdminClient();
  const stripe = getStripe();
  const ownerColumn = context.ownerType === "doctor" ? "doctor_id" : "organization_id";

  const { data: restriction } = await admin.from("doctor_telehealth_restrictions").select("is_restricted").eq("doctor_id", context.doctorId).maybeSingle();
  if (restriction?.is_restricted) {
    return NextResponse.json({ error: "Telehealth is restricted by RomDoc Admin for this Doctor account." }, { status: 409 });
  }

  let { data: commercialAccount } = await admin
    .from("telehealth_commercial_accounts")
    .select("id, stripe_account_id")
    .eq(ownerColumn, context.ownerId)
    .maybeSingle();

  let stripeAccountId = commercialAccount?.stripe_account_id ?? null;
  if (!stripeAccountId) {
    let connectedAccount;
    try {
      connectedAccount = await stripe.accounts.create(
        {
          country: "RO",
          controller: {
            fees: { payer: "account" },
            losses: { payments: "stripe" },
            requirement_collection: "stripe",
            stripe_dashboard: { type: "full" },
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            romdoc_owner_type: context.ownerType,
            romdoc_owner_id: context.ownerId,
          },
        },
        {
          idempotencyKey: `romdoc-telehealth-connect-${CONNECT_ACCOUNT_CONFIGURATION_VERSION}-${context.ownerType}-${context.ownerId}`,
        }
      );
    } catch (stripeError) {
      console.error("Stripe Connect account creation failed:", stripeError);
      const message = stripeError instanceof Error ? stripeError.message : "";
      if (message.includes("platform profile") || message.includes("responsibilities of managing losses")) {
        return NextResponse.json(
          {
            error:
              "Stripe Connect setup is incomplete. RomDoc Admin must complete the Stripe platform profile before creating receiving accounts.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "The Stripe receiving account could not be created." }, { status: 502 });
    }
    stripeAccountId = connectedAccount.id;

    const values = {
      owner_type: context.ownerType,
      doctor_id: context.ownerType === "doctor" ? context.ownerId : null,
      organization_id: context.ownerType === "clinic_organization" ? context.ownerId : null,
      stripe_account_id: stripeAccountId,
      details_submitted: connectedAccount.details_submitted,
      charges_enabled: connectedAccount.charges_enabled,
      payouts_enabled: connectedAccount.payouts_enabled,
      updated_at: new Date().toISOString(),
    };
    const query = commercialAccount?.id
      ? admin.from("telehealth_commercial_accounts").update(values).eq("id", commercialAccount.id)
      : admin.from("telehealth_commercial_accounts").insert(values);
    const { data, error } = await query
      .select("id, stripe_account_id")
      .single();

    if (error) {
      console.error("Stripe Connect account persistence failed:", error);
      return NextResponse.json({ error: "Stripe account could not be linked." }, { status: 500 });
    }
    commercialAccount = data;
  }

  const returnPath = context.ownerType === "doctor" ? "/doctor-dashboard/telehealth" : "/clinic-manager-dashboard/telehealth";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? request.nextUrl.origin;
  try {
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}${returnPath}?connect=refresh`,
      return_url: `${origin}${returnPath}?connect=return`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (stripeError) {
    console.error("Stripe Connect onboarding-link creation failed:", stripeError);
    return NextResponse.json({ error: "Stripe onboarding could not be opened." }, { status: 502 });
  }
}
