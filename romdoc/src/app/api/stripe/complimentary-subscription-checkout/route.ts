import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getStripe,
} from "@/lib/stripe";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type BillingInterval =
  | "monthly"
  | "yearly";

type CheckoutRequestBody = {
  billingInterval?: unknown;
};

const MIN_TRIAL_SECONDS =
  48 * 60 * 60;

function getOrigin(
  request: NextRequest
) {
  return (
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    request.nextUrl.origin
  ).replace(/\/$/, "");
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
    billingInterval === "yearly"
  ) {
    return process.env
      .STRIPE_DOCTOR_YEARLY_PRICE_ID;
  }

  return process.env
    .STRIPE_DOCTOR_PRICE_ID;
}

function toUnixTimestamp(
  value: string
) {
  return Math.floor(
    new Date(value).getTime() /
      1000
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    let body:
      CheckoutRequestBody;

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

    if (
      !user.email_confirmed_at
    ) {
      return NextResponse.json(
        {
          error:
            "Confirmă adresa de e-mail înainte de configurarea abonamentului.",
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
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "doctor"
    ) {
      return NextResponse.json(
        {
          error:
            "Configurarea este disponibilă numai medicilor independenți.",
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

    const {
      data: doctor,
      error: doctorError,
    } = await supabase
      .from("doctors")
      .select(`
        id,
        account_type
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

    if (
      doctorError ||
      !doctor
    ) {
      return NextResponse.json(
        {
          error:
            "Profilul de medic nu a putut fi verificat.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      doctor.account_type !==
      "independent"
    ) {
      return NextResponse.json(
        {
          error:
            "Medicii invitați de o clinică nu gestionează un abonament Stripe individual.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data:
        complimentaryGrant,
      error:
        complimentaryGrantError,
    } = await admin
      .from(
        "doctor_access_grants"
      )
      .select(`
        id,
        status,
        starts_at,
        ends_at
      `)
      .eq(
        "doctor_id",
        doctor.id
      )
      .eq(
        "grant_type",
        "admin_complimentary"
      )
      .eq(
        "status",
        "active"
      )
      .order(
        "ends_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (
      complimentaryGrantError
    ) {
      console.error(
        "Complimentary grant lookup failed:",
        complimentaryGrantError
      );

      return NextResponse.json(
        {
          error:
            "Perioada gratuită nu a putut fi verificată.",
        },
        {
          status: 500,
        }
      );
    }

    if (!complimentaryGrant) {
      return NextResponse.json(
        {
          error:
            "Nu există o perioadă gratuită activă pentru acest cont.",
        },
        {
          status: 409,
        }
      );
    }

    const nowUnix =
      Math.floor(
        Date.now() / 1000
      );

    const trialEnd =
      toUnixTimestamp(
        complimentaryGrant.ends_at
      );

    if (
      !Number.isFinite(
        trialEnd
      ) ||
      trialEnd <= nowUnix
    ) {
      return NextResponse.json(
        {
          error:
            "Perioada gratuită s-a încheiat deja.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      trialEnd <
      nowUnix +
        MIN_TRIAL_SECONDS
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe cere ca data de final a perioadei gratuite să fie la cel puțin 48 de ore în viitor. Perioada RomDoc nu va fi modificată sau prelungită automat.",
        },
        {
          status: 409,
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

    const stripePrice =
      await stripe.prices.retrieve(
        stripePriceId
      );

    const expectedInterval =
      billingInterval ===
      "yearly"
        ? "year"
        : "month";

    if (
      !stripePrice.active ||
      stripePrice.type !==
        "recurring" ||
      stripePrice.recurring
        ?.interval !==
        expectedInterval
    ) {
      return NextResponse.json(
        {
          error:
            "Prețul Stripe configurat nu corespunde planului selectat.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data:
        existingSubscription,
      error:
        existingSubscriptionError,
    } = await admin
      .from(
        "doctor_subscriptions"
      )
      .select(`
        stripe_customer_id,
        stripe_subscription_id,
        status
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

    const reusableStatuses =
      new Set([
        "canceled",
        "incomplete_expired",
        "pending",
      ]);

    if (
      existingSubscription
        ?.stripe_subscription_id &&
      !reusableStatuses.has(
        existingSubscription.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Există deja un abonament Stripe pentru acest cont. Folosește portalul Stripe pentru administrare.",
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

    if (stripeCustomerId) {
      const stripeSubscriptions =
        await stripe.subscriptions.list({
          customer:
            stripeCustomerId,
          status: "all",
          limit: 20,
        });

      const existingLiveSubscription =
        stripeSubscriptions.data.find(
          (
            subscription
          ) =>
            ![
              "canceled",
              "incomplete_expired",
            ].includes(
              subscription.status
            )
        );

      if (
        existingLiveSubscription
      ) {
        return NextResponse.json(
          {
            error:
              "Stripe are deja un abonament în curs pentru acest cont. Reîncarcă pagina de facturare și folosește portalul Stripe.",
          },
          {
            status: 409,
          }
        );
      }
    }

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
            romdoc_doctor_id:
              doctor.id,
            romdoc_subscription_flow:
              "independent_complimentary",
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
            null,
          doctor_id:
            doctor.id,
          stripe_customer_id:
            stripeCustomerId,
          stripe_subscription_id:
            null,
          stripe_price_id:
            stripePriceId,
          billing_interval:
            billingInterval,
          status:
            "pending",
          current_period_start:
            null,
          current_period_end:
            null,
          cancel_at_period_end:
            false,
          canceled_at:
            null,
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
        "Complimentary subscription persistence failed:",
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
        mode:
          "subscription",

        customer:
          stripeCustomerId,

        line_items: [
          {
            price:
              stripePriceId,
            quantity: 1,
          },
        ],

        payment_method_collection:
          "always",

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
          `${origin}/doctor-dashboard/billing` +
          "?subscription_setup=success",

        cancel_url:
          `${origin}/doctor-dashboard/billing` +
          "?subscription_setup=cancelled",

        client_reference_id:
          user.id,

        metadata: {
          romdoc_profile_id:
            user.id,
          romdoc_doctor_id:
            doctor.id,
          romdoc_access_grant_id:
            complimentaryGrant.id,
          romdoc_billing_interval:
            billingInterval,
          romdoc_subscription_flow:
            "independent_complimentary",
        },

        subscription_data: {
          trial_end:
            trialEnd,
          metadata: {
            romdoc_profile_id:
              user.id,
            romdoc_doctor_id:
              doctor.id,
            romdoc_access_grant_id:
              complimentaryGrant.id,
            romdoc_billing_interval:
              billingInterval,
            romdoc_subscription_flow:
              "independent_complimentary",
          },
        },
      });

    if (
      !checkoutSession.url
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe nu a returnat adresa paginii de configurare.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      url:
        checkoutSession.url,
    });
  } catch (error) {
    console.error(
      "Complimentary Stripe Checkout creation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Configurarea Stripe nu a putut fi pornită.",
      },
      {
        status: 500,
      }
    );
  }
}
