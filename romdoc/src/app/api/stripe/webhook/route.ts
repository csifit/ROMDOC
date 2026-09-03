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
import { createDailyRoom, roomExpiryForAppointmentDate } from "@/lib/telehealth/daily";
import { notifyAppointmentLifecycle } from "@/lib/appointments/notify-appointment-lifecycle";

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

async function completeTelehealthCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;
  const appointmentId = session.metadata?.romdoc_appointment_id;
  const paymentId = session.metadata?.romdoc_payment_id;
  if (!appointmentId || !paymentId) {
    throw new Error("Telehealth Checkout metadata is incomplete.");
  }

  const admin = createAdminClient();
  const [{ data: payment }, { data: appointment }] = await Promise.all([
    admin.from("telehealth_payments").select("id, status, amount_minor, stripe_account_id").eq("id", paymentId).eq("appointment_id", appointmentId).maybeSingle(),
    admin.from("appointments").select("id, doctor_id, status, requested_date, requested_time, telehealth_public_reference").eq("id", appointmentId).eq("consultation_mode", "video").maybeSingle(),
  ]);
  if (!payment || !appointment) throw new Error("Telehealth payment or appointment was not found.");

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  const now = new Date().toISOString();

  const reversePaymentAfterCancellation = async () => {
    if (payment.status === "refunded" || !paymentIntentId) return;
    const refund = await getStripe().refunds.create(
      { payment_intent: paymentIntentId, metadata: { romdoc_appointment_id: appointment.id, romdoc_payment_id: payment.id, reason: "checkout_completed_after_cancellation" } },
      { stripeAccount: payment.stripe_account_id, idempotencyKey: `telehealth-cancelled-${payment.id}` }
    );
    if (refund.status === "failed") throw new Error("A telehealth payment completed after cancellation and could not be reversed.");
    const refundedAt = new Date().toISOString();
    await admin.from("telehealth_payments").update({ status: "refunded", amount_refunded_minor: payment.amount_minor, refunded_at: refundedAt, updated_at: refundedAt }).eq("id", payment.id);
    await admin.from("telehealth_audit_events").insert({ appointment_id: appointment.id, doctor_id: appointment.doctor_id, event_type: "refund_created", metadata: { refund_id: refund.id, amount_minor: payment.amount_minor, reason: "checkout_completed_after_cancellation" } });
  };

  if (!["paid", "refunded"].includes(payment.status)) {
    const { error: paymentError } = await admin.from("telehealth_payments").update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      paid_at: now,
      updated_at: now,
    }).eq("id", payment.id);
    if (paymentError) throw paymentError;

    await admin.from("telehealth_audit_events").insert({
      appointment_id: appointment.id,
      doctor_id: appointment.doctor_id,
      event_type: "payment_succeeded",
      metadata: { payment_id: payment.id, checkout_session_id: session.id },
    });
  }

  if (appointment.status === "cancelled") {
    await reversePaymentAfterCancellation();
    return;
  }

  if (appointment.status === "pending") {
    const { data: confirmedAppointment, error: appointmentError } = await admin.from("appointments").update({
      status: "confirmed",
      scheduled_date: appointment.requested_date,
      scheduled_time: appointment.requested_time,
    }).eq("id", appointment.id).eq("status", "pending").select("id").maybeSingle();
    if (appointmentError) throw appointmentError;
    if (!confirmedAppointment) {
      const { data: currentAppointment } = await admin.from("appointments").select("status").eq("id", appointment.id).maybeSingle();
      if (currentAppointment?.status === "cancelled") {
        await reversePaymentAfterCancellation();
        return;
      }
      if (!currentAppointment || !["confirmed", "rescheduled", "completed"].includes(currentAppointment.status)) {
        throw new Error("Telehealth appointment changed while payment was being confirmed.");
      }
    }
  } else if (!["confirmed", "rescheduled", "completed"].includes(appointment.status)) {
    throw new Error(`Telehealth payment cannot confirm appointment in status ${appointment.status}.`);
  }

  const { data: existingRoom } = await admin.from("appointment_video_rooms").select("id").eq("appointment_id", appointment.id).maybeSingle();
  if (!existingRoom && appointment.requested_date) {
    try {
      const expiresAt = roomExpiryForAppointmentDate(appointment.requested_date);
      const room = await createDailyRoom({ appointmentId: appointment.id, expiresAt });
      const { error: roomError } = await admin.from("appointment_video_rooms").insert({
        appointment_id: appointment.id,
        provider_room_name: room.name,
        provider_room_url: room.url,
        status: "available",
        expires_at: expiresAt.toISOString(),
      });
      if (roomError) throw roomError;
      await admin.from("telehealth_audit_events").insert({
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        event_type: "room_created",
        metadata: { provider: "daily", expires_at: expiresAt.toISOString() },
      });
    } catch (roomError) {
      // Payment and confirmation remain valid. The join endpoint retries room
      // provisioning, so a transient Daily failure does not duplicate payment.
      console.error("Daily room provisioning after payment failed:", roomError);
    }
  }

  await notifyAppointmentLifecycle({
    appointmentId: appointment.id,
    status: "confirmed",
    triggeredByProfileId: null,
  });
}

async function failTelehealthCheckout(
  session: Stripe.Checkout.Session,
  paymentStatus: "failed" | "cancelled"
) {
  if (session.metadata?.romdoc_flow !== "telehealth") return;
  const appointmentId = session.metadata.romdoc_appointment_id;
  const paymentId = session.metadata.romdoc_payment_id;
  if (!appointmentId || !paymentId) {
    throw new Error("Telehealth Checkout metadata is incomplete.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: payment, error: paymentError } = await admin
    .from("telehealth_payments")
    .update({ status: paymentStatus, updated_at: now })
    .eq("id", paymentId)
    .eq("appointment_id", appointmentId)
    .eq("status", "checkout_pending")
    .select("id")
    .maybeSingle();
  if (paymentError) throw paymentError;
  if (!payment) return;

  await admin.from("appointments").update({ status: "cancelled" }).eq("id", appointmentId).eq("status", "pending");
  const { data: appointment } = await admin.from("appointments").select("doctor_id").eq("id", appointmentId).maybeSingle();
  await admin.from("telehealth_audit_events").insert({
    appointment_id: appointmentId,
    doctor_id: appointment?.doctor_id ?? null,
    event_type: "payment_failed",
    metadata: { payment_id: paymentId, checkout_session_id: session.id, status: paymentStatus },
  });
}

async function syncTelehealthChargeRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;
  if (!paymentIntentId || charge.amount_refunded <= 0) return;

  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("telehealth_payments")
    .select("id, appointment_id, amount_minor, amount_refunded_minor")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (paymentError) throw paymentError;
  if (!payment || payment.amount_refunded_minor >= charge.amount_refunded) return;

  const refundedInFull = charge.amount_refunded >= payment.amount_minor;
  const now = new Date().toISOString();
  const { error: updateError } = await admin.from("telehealth_payments").update({
    status: refundedInFull ? "refunded" : "partially_refunded",
    amount_refunded_minor: Math.min(charge.amount_refunded, payment.amount_minor),
    refunded_at: now,
    updated_at: now,
  }).eq("id", payment.id);
  if (updateError) throw updateError;

  const { data: appointment } = await admin.from("appointments").select("doctor_id").eq("id", payment.appointment_id).maybeSingle();
  await admin.from("telehealth_audit_events").insert({
    appointment_id: payment.appointment_id,
    doctor_id: appointment?.doctor_id ?? null,
    event_type: "refund_created",
    metadata: { charge_id: charge.id, amount_refunded_minor: charge.amount_refunded, source: "stripe_webhook" },
  });
}

async function syncTelehealthConnectAccount(account: Stripe.Account) {
  const admin = createAdminClient();
  const { error } = await admin.from("telehealth_commercial_accounts").update({
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    updated_at: new Date().toISOString(),
  }).eq("stripe_account_id", account.id);
  if (error) throw error;
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const stripe =
    getStripe();

  const webhookSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter((secret): secret is string => Boolean(secret?.trim()));

  if (webhookSecrets.length === 0) {
    return NextResponse.json(
      {
        error:
          "No Stripe webhook secret is configured.",
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
    Stripe.Event | null = null;

  let signatureError: unknown = null;
  for (const webhookSecret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      signatureError = null;
      break;
    } catch (error) {
      signatureError = error;
    }
  }

  if (!event) {
    console.error(
      "Stripe webhook signature verification failed:",
      signatureError
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

        if (session.mode === "payment" && session.metadata?.romdoc_flow === "telehealth") {
          await completeTelehealthCheckout(session);
          break;
        }

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

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await completeTelehealthCheckout(session);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await failTelehealthCheckout(session, "failed");
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await failTelehealthCheckout(session, "cancelled");
        break;
      }

      case "charge.refunded": {
        await syncTelehealthChargeRefund(event.data.object as Stripe.Charge);
        break;
      }

      case "account.updated": {
        await syncTelehealthConnectAccount(event.data.object as Stripe.Account);
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
