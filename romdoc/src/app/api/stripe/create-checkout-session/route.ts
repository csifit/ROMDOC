import {
  NextRequest,
  NextResponse,
} from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type BillingInterval =
  | "monthly"
  | "yearly";

type CheckoutRequestBody = {
  billingInterval?: unknown;
};

function getOrigin(
  request: NextRequest
) {
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(
      /\/$/,
      ""
    );
  }

  return request.nextUrl.origin;
}

function normalizeBillingInterval(
  value: unknown
): BillingInterval | null {
  if (
    value === "monthly" ||
    value === "yearly"
  ) {
    return value;
  }

  return null;
}

function getStripePriceId(
  billingInterval: BillingInterval
) {
  if (
    billingInterval ===
    "yearly"
  ) {
    return process.env
      .STRIPE_DOCTOR_YEARLY_PRICE_ID;
  }

  return process.env
    .STRIPE_DOCTOR_PRICE_ID;
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    let body: CheckoutRequestBody;

    try {
      body =
        (await request.json()) as
          CheckoutRequestBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Cererea nu conține date JSON valide.",
        },
        {
          status: 400,
        }
      );
    }

    const billingInterval =
      normalizeBillingInterval(
        body.billingInterval
      );

    if (!billingInterval) {
      return NextResponse.json(
        {
          error:
            "Planul de abonament selectat nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    const stripePriceId =
      getStripePriceId(
        billingInterval
      );

    if (!stripePriceId) {
      return NextResponse.json(
        {
          error:
            billingInterval ===
            "yearly"
              ? "Prețul anual Stripe nu este configurat."
              : "Prețul lunar Stripe nu este configurat.",
        },
        {
          status: 500,
        }
      );
    }

    const stripe =
      getStripe();

    /*
     * Server-side verification prevents a browser from submitting
     * an arbitrary Stripe Price ID.
     */
    const stripePrice =
      await stripe.prices.retrieve(
        stripePriceId
      );

    if (
      !stripePrice.active ||
      stripePrice.type !==
        "recurring"
    ) {
      return NextResponse.json(
        {
          error:
            "Prețul Stripe selectat nu este un abonament recurent activ.",
        },
        {
          status: 500,
        }
      );
    }

    const expectedStripeInterval =
      billingInterval ===
      "yearly"
        ? "year"
        : "month";

    if (
      stripePrice.recurring
        ?.interval !==
      expectedStripeInterval
    ) {
      return NextResponse.json(
        {
          error:
            "Perioada prețului Stripe nu corespunde planului selectat.",
        },
        {
          status: 500,
        }
      );
    }

    const supabase =
      await createClient();

    const admin =
      createAdminClient();

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

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        {
          error:
            "Confirmă adresa de e-mail înainte de plată.",
        },
        {
          status: 403,
        }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          error:
            "Contul nu are o adresă de e-mail validă.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        role,
        first_name,
        last_name,
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
            "Profilul contului nu a putut fi verificat.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      profile.account_status ===
      "blocked"
    ) {
      return NextResponse.json(
        {
          error:
            "Contul este blocat.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      profile.role !==
      "doctor_applicant"
    ) {
      if (
        profile.role ===
        "doctor"
      ) {
        return NextResponse.json(
          {
            error:
              "Contul este deja activat ca medic. Folosește portalul de facturare pentru schimbarea planului.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Doar solicitanții de cont medical pot activa acest abonament.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: application,
      error: applicationError,
    } = await supabase
      .from("doctor_applications")
      .select(`
        id,
        status
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

    if (
      applicationError ||
      !application
    ) {
      return NextResponse.json(
        {
          error:
            "Cererea de înregistrare ca medic nu a fost găsită.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: existingSubscription,
      error:
        existingSubscriptionError,
    } = await supabase
      .from(
        "doctor_subscriptions"
      )
      .select(`
        stripe_customer_id,
        stripe_subscription_id,
        status,
        billing_interval
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

    if (
      existingSubscriptionError
    ) {
      console.error(
        "Existing subscription lookup failed:",
        existingSubscriptionError
      );

      return NextResponse.json(
        {
          error:
            "Abonamentul existent nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      existingSubscription &&
      [
        "active",
        "trialing",
      ].includes(
        existingSubscription.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Ai deja un abonament activ. Folosește portalul de facturare pentru schimbarea planului.",
        },
        {
          status: 409,
        }
      );
    }

    let stripeCustomerId =
      existingSubscription
        ?.stripe_customer_id ??
      null;

    if (!stripeCustomerId) {
      const fullName = [
        profile.first_name,
        profile.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const customer =
        await stripe.customers.create({
          email: user.email,

          name:
            fullName ||
            undefined,

          metadata: {
            romdoc_profile_id:
              user.id,

            romdoc_doctor_application_id:
              application.id,
          },
        });

      stripeCustomerId =
        customer.id;
    }

    const {
      error:
        subscriptionUpsertError,
    } = await admin
      .from(
        "doctor_subscriptions"
      )
      .upsert(
        {
          profile_id:
            user.id,

          doctor_application_id:
            application.id,

          stripe_customer_id:
            stripeCustomerId,

          stripe_price_id:
            stripePriceId,

          billing_interval:
            billingInterval,

          status:
            "pending",

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "profile_id",
        }
      );

    if (
      subscriptionUpsertError
    ) {
      console.error(
        "Subscription persistence failed:",
        subscriptionUpsertError
      );

      return NextResponse.json(
        {
          error:
            "Datele abonamentului nu au putut fi salvate.",
        },
        {
          status: 500,
        }
      );
    }

    const origin =
      getOrigin(request);

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        customer:
          stripeCustomerId,

        line_items: [
          {
            price:
              stripePriceId,

            quantity: 1,
          },
        ],

        billing_address_collection:
          "required",

        automatic_tax: {
          enabled: true,
        },

        tax_id_collection: {
          enabled: true,
        },

        customer_update: {
          address: "auto",
          name: "auto",
        },

        allow_promotion_codes:
          false,

        success_url:
          `${origin}/doctor-application` +
          "?checkout=success" +
          "&session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          `${origin}/doctor-application` +
          "?checkout=cancelled",

        client_reference_id:
          user.id,

        metadata: {
          romdoc_profile_id:
            user.id,

          romdoc_doctor_application_id:
            application.id,

          romdoc_billing_interval:
            billingInterval,
        },

        subscription_data: {
          metadata: {
            romdoc_profile_id:
              user.id,

            romdoc_doctor_application_id:
              application.id,

            romdoc_billing_interval:
              billingInterval,
          },
        },
      });

    if (!checkoutSession.url) {
      return NextResponse.json(
        {
          error:
            "Stripe nu a returnat adresa paginii de plată.",
        },
        {
          status: 500,
        }
      );
    }

    await admin
      .from(
        "doctor_applications"
      )
      .update({
        status:
          "payment_processing",
      })
      .eq(
        "id",
        application.id
      )
      .eq(
        "profile_id",
        user.id
      );

    return NextResponse.json({
      url:
        checkoutSession.url,
    });
  } catch (error) {
    console.error(
      "Stripe Checkout creation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Pagina de plată nu a putut fi creată.",
      },
      {
        status: 500,
      }
    );
  }
}