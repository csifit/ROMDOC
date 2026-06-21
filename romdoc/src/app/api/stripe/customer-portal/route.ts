import {
  NextRequest,
  NextResponse,
} from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getOrigin(
  request: NextRequest
) {
  return (
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    request.nextUrl.origin
  ).replace(/\/$/, "");
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Trebuie să fii autentificat.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(`
        role,
        account_status
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return NextResponse.json(
        {
          error:
            "Profilul nu a putut fi verificat.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      profile.account_status !==
      "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Contul nu este activ.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      profile.role !==
        "doctor" &&
      profile.role !==
        "doctor_applicant"
    ) {
      return NextResponse.json(
        {
          error:
            "Portalul de facturare este disponibil numai pentru conturile medicale.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: subscription,
      error:
        subscriptionError,
    } = await supabase
      .from(
        "doctor_subscriptions"
      )
      .select(`
        stripe_customer_id,
        stripe_subscription_id
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

    if (
      subscriptionError ||
      !subscription
        ?.stripe_customer_id
    ) {
      return NextResponse.json(
        {
          error:
            "Abonamentul Stripe nu a fost găsit.",
        },
        {
          status: 404,
        }
      );
    }

    const stripe =
      getStripe();

    const portalSession =
      await stripe
        .billingPortal
        .sessions.create({
          customer:
            subscription
              .stripe_customer_id,

          return_url:
            `${getOrigin(
              request
            )}/doctor-application`,
        });

    return NextResponse.json({
      url:
        portalSession.url,
    });
  } catch (error) {
    console.error(
      "Stripe customer portal creation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Portalul de facturare nu a putut fi deschis.",
      },
      {
        status: 500,
      }
    );
  }
}