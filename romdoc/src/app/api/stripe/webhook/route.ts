import {
  NextRequest,
  NextResponse,
} from "next/server";
import Stripe from "stripe";

import {
  getStripe,
} from "@/lib/stripe";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

type SubscriptionPeriod = {
  current_period_start?: number;
  current_period_end?: number;
};

type BillingInterval =
  | "monthly"
  | "yearly";

const INDEPENDENT_COMPLIMENTARY_FLOW =
  "independent_complimentary";

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
  subscription: Stripe.Subscription
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
      firstItem?.current_period_start ??
      null,

    end:
      subscriptionWithPeriod
        .current_period_end ??
      firstItem?.current_period_end ??
      null,
  };
}

function getBillingIntervalFromSubscription(
  subscription: Stripe.Subscription
): BillingInterval {
  const metadataInterval =
    subscription.metadata
      .romdoc_billing_interval;

  if (
    metadataInterval ===
      "monthly" ||
    metadataInterval ===
      "yearly"
  ) {
    return metadataInterval;
  }

  const stripeInterval =
    subscription.items.data[0]
      ?.price.recurring?.interval;

  return stripeInterval === "year"
    ? "yearly"
    : "monthly";
}

function getSubscriptionPriceId(
  subscription: Stripe.Subscription
) {
  return (
    subscription.items.data[0]
      ?.price.id ?? null
  );
}

function getCustomerId(
  subscription: Stripe.Subscription
) {
  return typeof subscription.customer ===
    "string"
    ? subscription.customer
    : subscription.customer.id;
}

function isIndependentComplimentarySubscription(
  subscription: Stripe.Subscription
) {
  return (
    subscription.metadata
      .romdoc_subscription_flow ===
    INDEPENDENT_COMPLIMENTARY_FLOW
  );
}

function slugify(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[^\u0000-\u007E]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
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
      .eq(
        "slug",
        candidate
      )
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

async function syncIndependentComplimentarySubscription(
  subscription: Stripe.Subscription,
  options?: {
    markPaid?: boolean;
  }
) {
  const profileId =
    subscription.metadata
      .romdoc_profile_id;

  const doctorId =
    subscription.metadata
      .romdoc_doctor_id;

  if (
    !profileId ||
    !doctorId
  ) {
    throw new Error(
      "Independent complimentary Stripe subscription is missing RomDoc doctor metadata."
    );
  }

  const admin =
    createAdminClient();

  const {
    data: doctor,
    error: doctorError,
  } = await admin
    .from("doctors")
    .select(`
      id,
      profile_id,
      account_type
    `)
    .eq(
      "id",
      doctorId
    )
    .eq(
      "profile_id",
      profileId
    )
    .maybeSingle();

  if (
    doctorError ||
    !doctor
  ) {
    throw new Error(
      `Independent doctor lookup failed: ${
        doctorError?.message ??
        "not found"
      }`
    );
  }

  if (
    doctor.account_type !==
    "independent"
  ) {
    throw new Error(
      "Clinic-invited doctors cannot hold a direct Stripe subscription."
    );
  }

  const period =
    getSubscriptionPeriod(
      subscription
    );

  const updateValues: {
    profile_id: string;
    doctor_application_id: null;
    doctor_id: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    stripe_price_id: string | null;
    billing_interval: BillingInterval;
    status: string;
    current_period_start:
      | string
      | null;
    current_period_end:
      | string
      | null;
    cancel_at_period_end: boolean;
    canceled_at:
      | string
      | null;
    updated_at: string;
    last_payment_at?: string;
  } = {
    profile_id:
      profileId,
    doctor_application_id:
      null,
    doctor_id:
      doctorId,
    stripe_customer_id:
      getCustomerId(
        subscription
      ),
    stripe_subscription_id:
      subscription.id,
    stripe_price_id:
      getSubscriptionPriceId(
        subscription
      ),
    billing_interval:
      getBillingIntervalFromSubscription(
        subscription
      ),
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
    updated_at:
      new Date().toISOString(),
  };

  if (
    options?.markPaid
  ) {
    updateValues.last_payment_at =
      new Date().toISOString();
  }

  const {
    error:
      subscriptionUpsertError,
  } = await admin
    .from(
      "doctor_subscriptions"
    )
    .upsert(
      updateValues,
      {
        onConflict:
          "profile_id",
      }
    );

  if (
    subscriptionUpsertError
  ) {
    throw new Error(
      `Independent subscription persistence failed: ${subscriptionUpsertError.message}`
    );
  }
}

async function activateApplicantDoctorFromSubscription(
  subscription: Stripe.Subscription
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
      "Stripe applicant subscription is missing RomDoc metadata."
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
    .eq(
      "id",
      profileId
    )
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
    error:
      applicationError,
  } = await admin
    .from(
      "doctor_applications"
    )
    .select(`
      id,
      profile_id,
      phone,
      specialty_id,
      city_id,
      status
    `)
    .eq(
      "id",
      applicationId
    )
    .eq(
      "profile_id",
      profileId
    )
    .maybeSingle();

  if (
    applicationError ||
    !application
  ) {
    throw new Error(
      `Doctor application lookup failed: ${
        applicationError
          ?.message ??
        "not found"
      }`
    );
  }

  const {
    data:
      authUserResult,
    error:
      authUserError,
  } =
    await admin.auth.admin
      .getUserById(
        profileId
      );

  if (
    authUserError ||
    !authUserResult.user
  ) {
    throw new Error(
      `Doctor Auth user lookup failed: ${
        authUserError
          ?.message ??
        "not found"
      }`
    );
  }

  let doctorId:
    | string
    | null = null;

  const {
    data:
      existingDoctor,
    error:
      doctorLookupError,
  } = await admin
    .from("doctors")
    .select("id")
    .eq(
      "profile_id",
      profileId
    )
    .maybeSingle();

  if (
    doctorLookupError
  ) {
    throw new Error(
      `Existing doctor lookup failed: ${doctorLookupError.message}`
    );
  }

  if (existingDoctor) {
    doctorId =
      existingDoctor.id;

    const {
      error:
        doctorUpdateError,
    } = await admin
      .from("doctors")
      .update({
        city_id:
          application.city_id,
        phone:
          application.phone,
        email:
          authUserResult.user
            .email ?? null,
        status: "active",
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        doctorId
      );

    if (
      doctorUpdateError
    ) {
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
      error:
        doctorInsertError,
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
          authUserResult.user
            .email ?? null,
        status:
          "active",
      });

    if (
      doctorInsertError
    ) {
      throw new Error(
        `Doctor creation failed: ${doctorInsertError.message}`
      );
    }

    const {
      error:
        translationInsertError,
    } = await admin
      .from(
        "doctor_translations"
      )
      .insert({
        doctor_id:
          doctorId,
        locale: "ro",
        title: "Medic",
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
      .from(
        "doctor_specialties"
      )
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
          profileId,
        doctor_application_id:
          applicationId,
        doctor_id:
          doctorId,
        stripe_customer_id:
          getCustomerId(
            subscription
          ),
        stripe_subscription_id:
          subscription.id,
        stripe_price_id:
          getSubscriptionPriceId(
            subscription
          ),
        billing_interval:
          getBillingIntervalFromSubscription(
            subscription
          ),
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
        last_payment_at:
          new Date().toISOString(),
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
    throw new Error(
      `Subscription activation persistence failed: ${subscriptionUpsertError.message}`
    );
  }

  const {
    error:
      profileUpdateError,
  } = await admin
    .from("profiles")
    .update({
      role: "doctor",
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      profileId
    );

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
    .from(
      "doctor_applications"
    )
    .update({
      status: "paid",
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      applicationId
    );

  if (
    applicationUpdateError
  ) {
    throw new Error(
      `Doctor application activation failed: ${applicationUpdateError.message}`
    );
  }
}

async function syncApplicantSubscriptionRecord(
  subscription: Stripe.Subscription
) {
  const profileId =
    subscription.metadata
      .romdoc_profile_id;

  const applicationId =
    subscription.metadata
      .romdoc_doctor_application_id;

  if (!profileId) {
    return;
  }

  const admin =
    createAdminClient();

  const period =
    getSubscriptionPeriod(
      subscription
    );

  const {
    error,
  } = await admin
    .from(
      "doctor_subscriptions"
    )
    .upsert(
      {
        profile_id:
          profileId,
        doctor_application_id:
          applicationId ||
          null,
        stripe_customer_id:
          getCustomerId(
            subscription
          ),
        stripe_subscription_id:
          subscription.id,
        stripe_price_id:
          getSubscriptionPriceId(
            subscription
          ),
        billing_interval:
          getBillingIntervalFromSubscription(
            subscription
          ),
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
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "profile_id",
      }
    );

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
    await activateApplicantDoctorFromSubscription(
      subscription
    );
  }
}

async function syncSubscriptionRecord(
  subscription: Stripe.Subscription
) {
  if (
    isIndependentComplimentarySubscription(
      subscription
    )
  ) {
    await syncIndependentComplimentarySubscription(
      subscription
    );
    return;
  }

  await syncApplicantSubscriptionRecord(
    subscription
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
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
    data:
      processedEvent,
  } = await admin
    .from(
      "stripe_webhook_events"
    )
    .select(
      "stripe_event_id"
    )
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
    switch (
      event.type
    ) {
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

        if (
          !session.subscription
        ) {
          throw new Error(
            "Completed Checkout Session has no subscription."
          );
        }

        const subscription =
          await getSubscription(
            session.subscription
          );

        await syncSubscriptionRecord(
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

        await syncSubscriptionRecord(
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

        if (
          parentSubscription
        ) {
          const subscription =
            await getSubscription(
              parentSubscription
            );

          if (
            isIndependentComplimentarySubscription(
              subscription
            )
          ) {
            await syncIndependentComplimentarySubscription(
              subscription,
              {
                markPaid:
                  invoice.amount_paid >
                  0,
              }
            );
          } else {
            await syncApplicantSubscriptionRecord(
              subscription
            );
          }
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

        if (
          parentSubscription
        ) {
          const subscription =
            await getSubscription(
              parentSubscription
            );

          /*
           * Important commercial rule:
           * failed or overdue payment updates billing state only.
           * It never suspends, blocks or disables the doctor account.
           */
          await syncSubscriptionRecord(
            subscription
          );
        }

        break;
      }

      default:
        break;
    }

    const {
      error:
        eventLogError,
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
