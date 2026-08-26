import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import DoctorBillingProfileForm, {
  type DoctorBillingProfileData,
} from "@/components/doctor/doctor-billing-profile-form";
import ManageSubscriptionButton from "@/components/doctor/manage-subscription-button";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type DoctorRow = {
  id: string;
  slug: string;
  account_type: string | null;
};

type DoctorSubscriptionRow = {
  status: string;
  billing_interval:
    | "monthly"
    | "yearly"
    | null;
  stripe_customer_id:
    | string
    | null;
  stripe_subscription_id:
    | string
    | null;
  current_period_start:
    | string
    | null;
  current_period_end:
    | string
    | null;
  cancel_at_period_end:
    | boolean
    | null;
};

type ComplimentaryAccessRow = {
  status: string;
  starts_at: string;
  ends_at: string;
};

type SubscriptionCopy = {
  eyebrow: string;
  title: string;
  description: string;
  accessType: string;
  complimentaryAccess: string;
  noComplimentaryAccess: string;
  complimentaryStatus: string;
  complimentaryStarts: string;
  complimentaryEnds: string;
  stripeStatus: string;
  notActivated: string;
  plan: string;
  monthly: string;
  yearly: string;
  billingPeriodStarts: string;
  billingPeriodEnds: string;
  stripeCustomerReady: string;
  stripeCustomerMissing: string;
  manageHint: string;
  setupLaterHint: string;
  cancelAtPeriodEnd: string;
  yes: string;
  no: string;
  statuses: Record<string, string>;
};

const SUBSCRIPTION_COPY: Record<
  "ro" | "en" | "de",
  SubscriptionCopy
> = {
  ro: {
    eyebrow: "Abonament",
    title: "Abonament și plăți Stripe",
    description:
      "Aici poți vedea separat accesul gratuit și starea abonamentului Stripe. Starea comercială nu suspendă automat accesul la platformă.",
    accessType: "Tip acces",
    complimentaryAccess:
      "Acces gratuit oferit de RomDoc",
    noComplimentaryAccess:
      "Fără acces gratuit activ",
    complimentaryStatus:
      "Stare acces gratuit",
    complimentaryStarts:
      "Începe la",
    complimentaryEnds:
      "Se încheie la",
    stripeStatus:
      "Stare Stripe",
    notActivated:
      "Neactivat",
    plan: "Plan",
    monthly: "Lunar",
    yearly: "Anual",
    billingPeriodStarts:
      "Perioada Stripe începe",
    billingPeriodEnds:
      "Perioada Stripe se încheie",
    stripeCustomerReady:
      "Cont Stripe disponibil",
    stripeCustomerMissing:
      "Cont Stripe neconfigurat",
    manageHint:
      "Poți administra abonamentul, metoda de plată și datele disponibile în Portalul Stripe.",
    setupLaterHint:
      "Activarea Stripe pentru trecerea de la perioada gratuită la abonament va fi configurată în pasul următor.",
    cancelAtPeriodEnd:
      "Anulare la sfârșitul perioadei",
    yes: "Da",
    no: "Nu",
    statuses: {
      scheduled: "Programat",
      active: "Activ",
      expired: "Expirat",
      revoked: "Revocat",
      cancelled: "Anulat",
      pending: "În așteptare",
      incomplete: "Incomplet",
      incomplete_expired:
        "Configurare expirată",
      trialing: "Perioadă de probă",
      past_due: "Plată restantă",
      unpaid: "Neplătit",
      paused: "Pauzat",
      canceled: "Anulat",
    },
  },
  en: {
    eyebrow: "Subscription",
    title: "Stripe subscription and payments",
    description:
      "Complimentary access and Stripe subscription status are shown separately. Commercial status does not automatically suspend platform access.",
    accessType: "Access type",
    complimentaryAccess:
      "RomDoc complimentary access",
    noComplimentaryAccess:
      "No complimentary access",
    complimentaryStatus:
      "Complimentary status",
    complimentaryStarts:
      "Starts",
    complimentaryEnds:
      "Ends",
    stripeStatus:
      "Stripe status",
    notActivated:
      "Not activated",
    plan: "Plan",
    monthly: "Monthly",
    yearly: "Yearly",
    billingPeriodStarts:
      "Stripe period starts",
    billingPeriodEnds:
      "Stripe period ends",
    stripeCustomerReady:
      "Stripe account available",
    stripeCustomerMissing:
      "Stripe account not configured",
    manageHint:
      "You can manage the subscription, payment method and available billing details in the Stripe Portal.",
    setupLaterHint:
      "Stripe activation for the transition from complimentary access to a paid subscription will be configured in the next step.",
    cancelAtPeriodEnd:
      "Cancel at period end",
    yes: "Yes",
    no: "No",
    statuses: {
      scheduled: "Scheduled",
      active: "Active",
      expired: "Expired",
      revoked: "Revoked",
      cancelled: "Cancelled",
      pending: "Pending",
      incomplete: "Incomplete",
      incomplete_expired:
        "Setup expired",
      trialing: "Trialing",
      past_due: "Past due",
      unpaid: "Unpaid",
      paused: "Paused",
      canceled: "Canceled",
    },
  },
  de: {
    eyebrow: "Abonnement",
    title: "Stripe-Abonnement und Zahlungen",
    description:
      "Kostenloser Zugang und Stripe-Abonnementstatus werden getrennt angezeigt. Der kommerzielle Status sperrt den Plattformzugang nicht automatisch.",
    accessType: "Zugangsart",
    complimentaryAccess:
      "Kostenloser RomDoc-Zugang",
    noComplimentaryAccess:
      "Kein kostenloser Zugang",
    complimentaryStatus:
      "Status des kostenlosen Zugangs",
    complimentaryStarts:
      "Beginn",
    complimentaryEnds:
      "Ende",
    stripeStatus:
      "Stripe-Status",
    notActivated:
      "Nicht aktiviert",
    plan: "Plan",
    monthly: "Monatlich",
    yearly: "Jährlich",
    billingPeriodStarts:
      "Stripe-Zeitraum beginnt",
    billingPeriodEnds:
      "Stripe-Zeitraum endet",
    stripeCustomerReady:
      "Stripe-Konto verfügbar",
    stripeCustomerMissing:
      "Stripe-Konto nicht eingerichtet",
    manageHint:
      "Im Stripe-Portal kannst du das Abonnement, die Zahlungsmethode und verfügbare Zahlungsdaten verwalten.",
    setupLaterHint:
      "Die Stripe-Aktivierung für den Übergang vom kostenlosen Zugang zum kostenpflichtigen Abonnement wird im nächsten Schritt eingerichtet.",
    cancelAtPeriodEnd:
      "Kündigung zum Periodenende",
    yes: "Ja",
    no: "Nein",
    statuses: {
      scheduled: "Geplant",
      active: "Aktiv",
      expired: "Abgelaufen",
      revoked: "Widerrufen",
      cancelled: "Storniert",
      pending: "Ausstehend",
      incomplete: "Unvollständig",
      incomplete_expired:
        "Einrichtung abgelaufen",
      trialing: "Testphase",
      past_due: "Überfällig",
      unpaid: "Unbezahlt",
      paused: "Pausiert",
      canceled: "Gekündigt",
    },
  },
};

function getSubscriptionCopy(
  locale: string
) {
  if (
    locale === "en" ||
    locale === "de"
  ) {
    return SUBSCRIPTION_COPY[locale];
  }

  return SUBSCRIPTION_COPY.ro;
}

function getDateLocale(
  locale: string
) {
  if (locale === "en") {
    return "en-GB";
  }

  if (locale === "de") {
    return "de-DE";
  }

  return "ro-RO";
}

function formatDate(
  value: string | null,
  locale: string
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    getDateLocale(locale),
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Bucharest",
    }
  ).format(new Date(value));
}

function getStatusLabel(
  status: string | null,
  copy: SubscriptionCopy
) {
  if (!status) {
    return "—";
  }

  return (
    copy.statuses[status] ??
    status
  );
}

function getStatusClasses(
  status: string | null
) {
  if (
    status === "active" ||
    status === "trialing"
  ) {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (
    status === "past_due" ||
    status === "pending" ||
    status === "scheduled"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (
    status === "unpaid" ||
    status === "canceled" ||
    status === "cancelled" ||
    status === "expired" ||
    status === "revoked" ||
    status === "incomplete_expired"
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

export default async function DoctorBillingPage() {
  const locale =
    await getStoredAppLocale();
  const t = await getTranslations({
    locale,
    namespace:
      "DoctorConfiguration.billingPage",
  });
  const subscriptionCopy =
    getSubscriptionCopy(locale);
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    const query =
      new URLSearchParams({
        locale,
        next:
          "/doctor-dashboard/billing",
      });

    redirect(
      `/login?${query.toString()}`
    );
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(
      "role, account_status, first_name, last_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "doctor" ||
    profile.account_status !==
      "active"
  ) {
    redirect("/dashboard");
  }

  const {
    data: doctorData,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select(
      "id, slug, account_type"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError) {
    console.error(
      "Doctor billing page doctor query failed:",
      doctorError
    );
  }

  const doctor =
    doctorData as DoctorRow | null;

  if (!doctor) {
    return (
      <main className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
            {t("missingProfile")}
          </div>
        </div>
      </main>
    );
  }

  if (
    doctor.account_type ===
    "clinic_invited"
  ) {
    redirect(
      "/doctor-dashboard"
    );
  }

  const [
    billingProfileResult,
    subscriptionResult,
  ] = await Promise.all([
    supabase
      .from(
        "doctor_billing_profiles"
      )
      .select(`
        id,
        doctor_id,
        profile_id,
        entity_type,
        legal_name,
        cui,
        trade_registry_number,
        vat_payer,
        billing_address,
        county,
        city,
        postal_code,
        country,
        billing_email,
        accounting_contact_name,
        accounting_contact_phone,
        invoice_notes
      `)
      .eq(
        "doctor_id",
        doctor.id
      )
      .maybeSingle(),

    supabase
      .from(
        "doctor_subscriptions"
      )
      .select(`
        status,
        billing_interval,
        stripe_customer_id,
        stripe_subscription_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle(),
  ]);

  if (
    billingProfileResult.error
  ) {
    console.error(
      "Doctor billing page billing profile query failed:",
      billingProfileResult.error
    );
  }

  if (
    subscriptionResult.error
  ) {
    console.error(
      "Doctor billing page subscription query failed:",
      subscriptionResult.error
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      complimentaryAccessData,
    error:
      complimentaryAccessError,
  } = await admin
    .from(
      "doctor_access_grants"
    )
    .select(`
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
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (
    complimentaryAccessError
  ) {
    console.error(
      "Doctor billing page complimentary access query failed:",
      complimentaryAccessError
    );
  }

  const billingProfile =
    (billingProfileResult.data as
      | DoctorBillingProfileData
      | null) ?? null;

  const subscription =
    (subscriptionResult.data as
      | DoctorSubscriptionRow
      | null) ?? null;

  const complimentaryAccess =
    (complimentaryAccessData as
      | ComplimentaryAccessRow
      | null) ?? null;

  const hasStripeCustomer =
    Boolean(
      subscription
        ?.stripe_customer_id
    );

  const displayName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const stripeStatus =
    subscription?.status ?? null;

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
            {t("eyebrow")}
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            {t("title")}
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-gray-600">
            {t("description")}
          </p>

          {displayName && (
            <p className="mt-2 text-sm font-medium text-gray-700">
              {displayName}
            </p>
          )}
        </header>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
          {t("privacy")}
        </div>

        <section className="mt-8 rounded-[21px] border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              {
                subscriptionCopy.eyebrow
              }
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
              {
                subscriptionCopy.title
              }
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              {
                subscriptionCopy.description
              }
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[21px] border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                {
                  subscriptionCopy.accessType
                }
              </p>

              <p className="mt-3 text-lg font-bold text-gray-900">
                {complimentaryAccess
                  ? subscriptionCopy.complimentaryAccess
                  : subscriptionCopy.noComplimentaryAccess}
              </p>

              {complimentaryAccess && (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {
                        subscriptionCopy.complimentaryStatus
                      }
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        complimentaryAccess.status
                      )}`}
                    >
                      {getStatusLabel(
                        complimentaryAccess.status,
                        subscriptionCopy
                      )}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {
                          subscriptionCopy.complimentaryStarts
                        }
                      </p>

                      <p className="mt-2 font-semibold text-gray-900">
                        {formatDate(
                          complimentaryAccess.starts_at,
                          locale
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {
                          subscriptionCopy.complimentaryEnds
                        }
                      </p>

                      <p className="mt-2 font-semibold text-gray-900">
                        {formatDate(
                          complimentaryAccess.ends_at,
                          locale
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-[21px] border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                {
                  subscriptionCopy.stripeStatus
                }
              </p>

              <div className="mt-3">
                {subscription ? (
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                      stripeStatus
                    )}`}
                  >
                    {getStatusLabel(
                      stripeStatus,
                      subscriptionCopy
                    )}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                    {
                      subscriptionCopy.notActivated
                    }
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {
                      subscriptionCopy.plan
                    }
                  </p>

                  <p className="mt-2 font-semibold text-gray-900">
                    {subscription
                      ?.billing_interval ===
                    "monthly"
                      ? subscriptionCopy.monthly
                      : subscription
                            ?.billing_interval ===
                          "yearly"
                        ? subscriptionCopy.yearly
                        : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {
                      subscriptionCopy.cancelAtPeriodEnd
                    }
                  </p>

                  <p className="mt-2 font-semibold text-gray-900">
                    {subscription
                      ? subscription.cancel_at_period_end
                        ? subscriptionCopy.yes
                        : subscriptionCopy.no
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {
                      subscriptionCopy.billingPeriodStarts
                    }
                  </p>

                  <p className="mt-2 font-semibold text-gray-900">
                    {formatDate(
                      subscription
                        ?.current_period_start ??
                        null,
                      locale
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {
                      subscriptionCopy.billingPeriodEnds
                    }
                  </p>

                  <p className="mt-2 font-semibold text-gray-900">
                    {formatDate(
                      subscription
                        ?.current_period_end ??
                        null,
                      locale
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-5">
                <p className="text-sm font-semibold text-gray-900">
                  {hasStripeCustomer
                    ? subscriptionCopy.stripeCustomerReady
                    : subscriptionCopy.stripeCustomerMissing}
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {hasStripeCustomer
                    ? subscriptionCopy.manageHint
                    : subscriptionCopy.setupLaterHint}
                </p>

                {hasStripeCustomer && (
                  <div className="mt-5">
                    <ManageSubscriptionButton
                      returnTo="/doctor-dashboard/billing"
                    />
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>

        <div className="mt-8">
          <DoctorBillingProfileForm
            doctorId={doctor.id}
            profileId={user.id}
            defaultBillingEmail={
              user.email ?? ""
            }
            initialProfile={
              billingProfile
            }
          />
        </div>
      </div>
    </main>
  );
}
