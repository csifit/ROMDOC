import {
  NextRequest,
  NextResponse,
} from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

type SubscriptionPeriod = {
  current_period_start?: number;
  current_period_end?: number;
};

function timestampToIso(
  timestamp:
    | number
    | null
    | undefined
) {
  if (!timestamp) {
    return null;
  }

  return new Date(
    timestamp * 1000
  ).toISOString();
}

function getSubscriptionPeriod(
  subscription:
    Stripe.Subscription
) {
  const subscriptionWithPeriod =
    subscription as
      Stripe.Subscription &
      SubscriptionPeriod;

  const firstItem =
    subscription.items.data[0] as
      | (Stripe.SubscriptionItem &
          SubscriptionPeriod)
      | undefined;

  return {
    start:
      subscriptionWithPeriod
        .current_period_start ??
      firstItem
        ?.current_period_start ??
      null,

    end:
      subscriptionWithPeriod
        .current_period_end ??
      firstItem
        ?.current_period_end ??
      null,
  };
}

function slugify(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueDoctorSlug(
  baseName: string
) {
  const admin =
    createAdminClient();

  const baseSlug =
    slugify(baseName) ||
    "medic";

  let candidate =
    baseSlug;

  let suffix = 2;

  while (true) {
    const {
      data,
      error,
    } = await admin
      .from("doctors")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Doctor slug lookup failed: ${error.message}`
      );
    }

    if (!data) {
      return candidate;
    }

    candidate =
      `${baseSlug}-${suffix}`;

    suffix += 1;
  }
}

async function getSubscription(
  subscriptionReference:
    | string
    | Stripe.Subscription
) {
  if (
    typeof subscriptionReference !==
    "string"
  ) {
    return subscriptionReference;
  }

  return getStripe()
    .subscriptions.retrieve(
      subscriptionReference
    );
}

async function activateDoctorFromSubscription(
  subscription:
    Stripe.Subscription
) {
  if (
    ![
      "active",
      "trialing",
    ].includes(
      subscription.status
    )
  ) {
    return;
  }

  const profileId =
    subscription.metadata
      .romdoc_profile_id;

  const applicationId =
    subscription.metadata
      .romdoc_doctor_application_id;

  if (
    !profileId ||
    !applicationId
  ) {
    throw new Error(
      "Stripe subscription is missing RomDoc metadata."
    );
  }

  const admin =
    createAdminClient();

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select(`
      id,
      role,
      first_name,
      last_name
    `)
    .eq("id", profileId)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    throw new Error(
      `Doctor profile lookup failed: ${
        profileError?.message ??
        "not found"
      }`
    );
  }

  const {
    data: application,
    error: applicationError,
  } = await admin
    .from("doctor_applications")
    .select(`
      id,
      profile_id,
      phone,
      specialty_id,
      city_id,
      status
    `)
    .eq("id", applicationId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (
    applicationError ||
    !application
  ) {
    throw new Error(
      `Doctor application lookup failed: ${
        applicationError?.message ??
        "not found"
      }`
    );
  }

  const {
    data: authUserResult,
    error: authUserError,
  } =
    await admin.auth.admin
      .getUserById(profileId);

  if (
    authUserError ||
    !authUserResult.user
  ) {
    throw new Error(
      `Doctor Auth user lookup failed: ${
        authUserError?.message ??
        "not found"
      }`
    );
  }

  let doctorId:
    | string
    | null = null;

  const {
    data: existingDoctor,
    error: doctorLookupError,
  } = await admin
    .from("doctors")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (doctorLookupError) {
    throw new Error(
      `Existing doctor lookup failed: ${doctorLookupError.message}`
    );
  }

  if (existingDoctor) {
    doctorId =
      existingDoctor.id;

    const {
      error: doctorUpdateError,
    } = await admin
      .from("doctors")
      .update({
        city_id:
          application.city_id,

        phone:
          application.phone,

        email:
          authUserResult.user.email ??
          null,

        status:
          "active",
      })
      .eq("id", doctorId);

    if (doctorUpdateError) {
      throw new Error(
        `Doctor activation failed: ${doctorUpdateError.message}`
      );
    }
  } else {
    const fullName = [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const doctorSlug =
      await createUniqueDoctorSlug(
        fullName
          ? `dr-${fullName}`
          : `medic-${profileId.slice(
              0,
              8
            )}`
      );

    doctorId =
      crypto.randomUUID();

    const {
      error: doctorInsertError,
    } = await admin
      .from("doctors")
      .insert({
        id:
          doctorId,

        profile_id:
          profileId,

        city_id:
          application.city_id,

        slug:
          doctorSlug,

        phone:
          application.phone,

        email:
          authUserResult.user.email ??
          null,

        status:
          "active",
      });

    if (doctorInsertError) {
      throw new Error(
        `Doctor creation failed: ${doctorInsertError.message}`
      );
    }

    const {
      error:
        translationInsertError,
    } = await admin
      .from("doctor_translations")
      .insert({
        doctor_id:
          doctorId,

        locale:
          "ro",

        title:
          "Medic",
      });

    if (
      translationInsertError
    ) {
      throw new Error(
        `Doctor translation creation failed: ${translationInsertError.message}`
      );
    }
  }

  if (
    doctorId &&
    application.specialty_id
  ) {
    const {
      error:
        specialtyInsertError,
    } = await admin
      .from("doctor_specialties")
      .upsert(
        {
          doctor_id:
            doctorId,

          specialty_id:
            application.specialty_id,
        },
        {
          onConflict:
            "doctor_id,specialty_id",
        }
      );

    if (
      specialtyInsertError
    ) {
      throw new Error(
        `Doctor specialty creation failed: ${specialtyInsertError.message}`
      );
    }
  }

  const period =
    getSubscriptionPeriod(
      subscription
    );

  const customerId =
    typeof subscription.customer ===
    "string"
      ? subscription.customer
      : subscription.customer.id;

  const priceId =
    subscription.items.data[0]
      ?.price.id ??
    null;

  const {
    error: subscriptionUpsertError,
  } = await admin
    .from("doctor_subscriptions")
    .upsert(
      {
        profile_id:
          profileId,

        doctor_application_id:
          applicationId,

        doctor_id:
          doctorId,

        stripe_customer_id:
          customerId,

        stripe_subscription_id:
          subscription.id,

        stripe_price_id:
          priceId,

        status:
          subscription.status,

        current_period_start:
          timestampToIso(
            period.start
          ),

        current_period_end:
          timestampToIso(
            period.end
          ),

        cancel_at_period_end:
          subscription
            .cancel_at_period_end,

        canceled_at:
          timestampToIso(
            subscription
              .canceled_at
          ),

        last_payment_at:
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
    throw new Error(
      `Subscription activation persistence failed: ${subscriptionUpsertError.message}`
    );
  }

  const {
    error: profileUpdateError,
  } = await admin
    .from("profiles")
    .update({
      role:
        "doctor",
    })
    .eq("id", profileId);

  if (
    profileUpdateError
  ) {
    throw new Error(
      `Doctor role activation failed: ${profileUpdateError.message}`
    );
  }

  const {
    error:
      applicationUpdateError,
  } = await admin
    .from("doctor_applications")
    .update({
      status:
        "paid",
    })
    .eq("id", applicationId);

  if (
    applicationUpdateError
  ) {
    throw new Error(
      `Doctor application activation failed: ${applicationUpdateError.message}`
    );
  }
}

async function updateSubscriptionRecord(
  subscription:
    Stripe.Subscription
) {
  const admin =
    createAdminClient();

  const profileId =
    subscription.metadata
      .romdoc_profile_id;

  if (!profileId) {
    return;
  }

  const period =
    getSubscriptionPeriod(
      subscription
    );

  const {
    error,
  } = await admin
    .from("doctor_subscriptions")
    .update({
      status:
        subscription.status,

      current_period_start:
        timestampToIso(
          period.start
        ),

      current_period_end:
        timestampToIso(
          period.end
        ),

      cancel_at_period_end:
        subscription
          .cancel_at_period_end,

      canceled_at:
        timestampToIso(
          subscription.canceled_at
        ),
    })
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(
      `Subscription status update failed: ${error.message}`
    );
  }

  if (
    [
      "active",
      "trialing",
    ].includes(
      subscription.status
    )
  ) {
    await activateDoctorFromSubscription(
      subscription
    );
  }
}

export async function POST(
  request: NextRequest
) {
  const stripe =
    getStripe();

  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET is not configured.",
      },
      {
        status: 500,
      }
    );
  }

  const signature =
    request.headers.get(
      "stripe-signature"
    );

  if (!signature) {
    return NextResponse.json(
      {
        error:
          "Stripe signature is missing.",
      },
      {
        status: 400,
      }
    );
  }

  const rawBody =
    await request.text();

  let event:
    Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Invalid Stripe signature.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: processedEvent,
  } = await admin
    .from(
      "stripe_webhook_events"
    )
    .select("stripe_event_id")
    .eq(
      "stripe_event_id",
      event.id
    )
    .maybeSingle();

  if (processedEvent) {
    return NextResponse.json({
      received: true,
      duplicate: true,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object as
            Stripe.Checkout.Session;

        if (
          session.mode !==
          "subscription"
        ) {
          break;
        }

        if (!session.subscription) {
          throw new Error(
            "Completed Checkout Session has no subscription."
          );
        }

        const subscription =
          await getSubscription(
            session.subscription
          );

        await updateSubscriptionRecord(
          subscription
        );

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as
            Stripe.Subscription;

        await updateSubscriptionRecord(
          subscription
        );

        break;
      }

      case "invoice.paid": {
        const invoice =
          event.data.object as
            Stripe.Invoice;

        const parentSubscription =
          invoice.parent
            ?.subscription_details
            ?.subscription;

        if (parentSubscription) {
          const subscription =
            await getSubscription(
              parentSubscription
            );

          await activateDoctorFromSubscription(
            subscription
          );
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice =
          event.data.object as
            Stripe.Invoice;

        const parentSubscription =
          invoice.parent
            ?.subscription_details
            ?.subscription;

        if (parentSubscription) {
          const subscription =
            await getSubscription(
              parentSubscription
            );

          await updateSubscriptionRecord(
            subscription
          );
        }

        break;
      }

      default:
        break;
    }

    const {
      error: eventLogError,
    } = await admin
      .from(
        "stripe_webhook_events"
      )
      .insert({
        stripe_event_id:
          event.id,

        event_type:
          event.type,
      });

    if (
      eventLogError &&
      eventLogError.code !==
        "23505"
    ) {
      throw new Error(
        `Webhook event logging failed: ${eventLogError.message}`
      );
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      `Stripe webhook processing failed for ${event.type}:`,
      error
    );

    return NextResponse.json(
      {
        error:
          "Stripe webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}