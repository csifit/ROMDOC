import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import ManageSubscriptionButton from "@/components/doctor/manage-subscription-button";
import SubscriptionCheckoutButton from "@/components/doctor/subscription-checkout-button";
import type { AppLocale } from "@/i18n/routing";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import { createClient } from "@/lib/supabase/server";

import deMessages from "../../../messages/de.json";
import enMessages from "../../../messages/en.json";
import roMessages from "../../../messages/ro.json";

type DoctorApplicationPageProps = {
  searchParams: Promise<{
    checkout?: string;
    locale?: string;
  }>;
};
 
type DoctorApplication = {
  id: string;
  status: string;
  phone: string | null;
  professional_registration_number: string | null;
  created_at: string;
};

type DoctorSubscription = {
  status: string;
  billing_interval: "monthly" | "yearly";
  stripe_price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type ClinicDoctorRelationship = {
  id: string;
  organization_id: string;
  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;
  accepted_at: string | null;
};

type DoctorApplicationCopy =
  (typeof roMessages)["DoctorApplication"];

type StatusCopy =
  DoctorApplicationCopy["status"];

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

const dateLocales: Record<
  AppLocale,
  string
> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

function formatTemplate(
  template: string,
  values: Record<string, string>
) {
  return Object.entries(values).reduce(
    (message, [key, value]) =>
      message.replaceAll(
        `{${key}}`,
        value
      ),
    template
  );
}

function getStatusContent(
  applicationStatus: string,
  subscriptionStatus: string | null,
  hasClinicCoverage: boolean,
  copy: StatusCopy
) {
  if (hasClinicCoverage) {
    return {
      ...copy.clinicCovered,
      badgeClasses:
        "bg-green-100 text-green-800",
    };
  }

  if (
    subscriptionStatus === "active" ||
    subscriptionStatus === "trialing"
  ) {
    return {
      ...copy.active,
      badgeClasses:
        "bg-green-100 text-green-800",
    };
  }

  if (subscriptionStatus === "past_due") {
    return {
      ...copy.pastDue,
      badgeClasses:
        "bg-amber-100 text-amber-900",
    };
  }

  if (
    subscriptionStatus === "canceled" ||
    subscriptionStatus === "unpaid"
  ) {
    return {
      ...copy.inactive,
      badgeClasses:
        "bg-red-100 text-red-800",
    };
  }

  switch (applicationStatus) {
    case "payment_processing":
      return {
        ...copy.processing,
        badgeClasses:
          "bg-blue-100 text-blue-800",
      };

    case "paid":
    case "approved":
      return {
        ...copy.approved,
        badgeClasses:
          "bg-green-100 text-green-800",
      };

    case "rejected":
      return {
        ...copy.rejected,
        badgeClasses:
          "bg-red-100 text-red-800",
      };

    case "cancelled":
      return {
        ...copy.cancelled,
        badgeClasses:
          "bg-gray-200 text-gray-700",
      };

    default:
      return {
        ...copy.pending,
        badgeClasses:
          "bg-amber-100 text-amber-900",
      };
  }
}

function formatDate(
  value: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    dateLocales[locale],
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(value));
}

function getSubscriptionStatusLabel(
  status: string,
  copy: DoctorApplicationCopy[
    "subscriptionStatuses"
  ]
) {
  switch (status) {
    case "active":
      return copy.active;
    case "trialing":
      return copy.trialing;
    case "past_due":
      return copy.pastDue;
    case "canceled":
      return copy.canceled;
    case "unpaid":
      return copy.unpaid;
    case "incomplete":
      return copy.incomplete;
    case "incomplete_expired":
      return copy.incompleteExpired;
    case "paused":
      return copy.paused;
    default:
      return status;
  }
}

function getApplicationStatusLabel(
  status: string,
  copy: DoctorApplicationCopy[
    "applicationStatuses"
  ]
) {
  switch (status) {
    case "pending_payment":
      return copy.pendingPayment;
    case "payment_processing":
      return copy.paymentProcessing;
    case "paid":
      return copy.paid;
    case "approved":
      return copy.approved;
    case "rejected":
      return copy.rejected;
    case "cancelled":
      return copy.cancelled;
    default:
      return status;
  }
}

function getConfiguredEuroPrice(
  value: string | undefined,
  fallback: string
) {
  const normalized = value?.trim();

  if (
    normalized &&
    /^\d+(?:[.,]\d{1,2})?$/.test(
      normalized
    )
  ) {
    return normalized.replace(",", ".");
  }

  return fallback;
}

function formatEuroPrice(
  value: string,
  locale: AppLocale
) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return `${value} EUR`;
  }

  return new Intl.NumberFormat(
    dateLocales[locale],
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits:
        Number.isInteger(numericValue)
          ? 0
          : 2,
      maximumFractionDigits: 2,
    }
  ).format(numericValue);
}

export default async function DoctorApplicationPage({
  searchParams,
}: DoctorApplicationPageProps) {
  const parameters = await searchParams;
  const requestLocale =
    parameters.locale ??
    (await getLocale());
  const locale =
    normalizeAppLocale(requestLocale);
  const messages =
    messagesByLocale[locale];
  const copy =
    messages.DoctorApplication as DoctorApplicationCopy;
  const applicationPath =
    `/doctor-application?locale=${locale}`;

  const monthlyPrice =
    formatEuroPrice(
      getConfiguredEuroPrice(
        process.env
          .NEXT_PUBLIC_DOCTOR_MONTHLY_PRICE_EURO,
        "40"
      ),
      locale
    );

  const yearlyPrice =
    formatEuroPrice(
      getConfiguredEuroPrice(
        process.env
          .NEXT_PUBLIC_DOCTOR_YEARLY_PRICE_EURO,
        "400"
      ),
      locale
    );

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?locale=${locale}` +
        `&next=${encodeURIComponent(
          applicationPath
        )}`
    );
  }

  if (!user.email_confirmed_at) {
    redirect(
      `/check-email?locale=${locale}` +
        "&type=doctor" +
        `&next=${encodeURIComponent(
          applicationPath
        )}`
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      first_name,
      last_name,
      account_status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect(`/login?locale=${locale}`);
  }

  if (
    profile.account_status === "blocked"
  ) {
    await supabase.auth.signOut();
    redirect(
      `/login?locale=${locale}` +
        "&error=account-blocked"
    );
  }

  const {
    data: application,
    error: applicationError,
  } = await supabase
    .from("doctor_applications")
    .select(`
      id,
      status,
      phone,
      professional_registration_number,
      created_at
    `)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (applicationError) {
    console.error(
      "Doctor application query failed:",
      applicationError
    );
  }

  const {
    data: subscription,
    error: subscriptionError,
  } = await supabase
    .from("doctor_subscriptions")
    .select(`
      status,
      billing_interval,
      stripe_price_id,
      current_period_end,
      cancel_at_period_end
    `)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error(
      "Doctor subscription query failed:",
      subscriptionError
    );
  }

  const {
    data: clinicCoverage,
    error: clinicCoverageError,
  } = await supabase
    .from("clinic_doctor_relationships")
    .select(`
      id,
      organization_id,
      invitation_status,
      payment_responsibility,
      coverage_status,
      accepted_at
    `)
    .eq("accepted_profile_id", user.id)
    .eq(
      "payment_responsibility",
      "clinic_paid"
    )
    .eq("coverage_status", "active")
    .maybeSingle();

  if (clinicCoverageError) {
    console.error(
      "Clinic doctor coverage query failed:",
      clinicCoverageError
    );
  }

  const typedApplication =
    application as
      | DoctorApplication
      | null;
  const typedSubscription =
    subscription as
      | DoctorSubscription
      | null;
  const typedClinicCoverage =
    clinicCoverage as
      | ClinicDoctorRelationship
      | null;
  const hasClinicCoverage =
    Boolean(typedClinicCoverage);

  if (
    profile.role === "doctor" &&
    !typedApplication
  ) {
    redirect(
      "/doctor-dashboard/appointments"
    );
  }

  if (
    ![
      "doctor_applicant",
      "doctor",
    ].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const statusContent =
    getStatusContent(
      typedApplication?.status ??
        "pending_payment",
      typedSubscription?.status ?? null,
      hasClinicCoverage,
      copy.status
    );

  const applicantName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const hasActiveSubscription =
    hasClinicCoverage ||
    typedSubscription?.status ===
      "active" ||
    typedSubscription?.status ===
      "trialing";

  const acceptedCoverageDate =
    typedClinicCoverage?.accepted_at
      ? formatDate(
          typedClinicCoverage.accepted_at,
          locale
        )
      : copy.invitationAccepted;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
    >
      <main className="min-h-screen bg-[#F0EEE9] px-6 py-12">
        <div className="mx-auto max-w-3xl">
          {parameters.checkout ===
            "success" && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {copy.checkoutSuccess}
            </div>
          )}

          {parameters.checkout ===
            "cancelled" && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {copy.checkoutCancelled}
            </div>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#036661]">
                  {copy.eyebrow}
                </p>

                <h1 className="mt-2 text-3xl font-bold text-gray-900">
                  {statusContent.title}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                  {statusContent.description}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusContent.badgeClasses}`}
              >
                {statusContent.badge}
              </span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.applicant}
                </p>

                <p className="mt-2 font-semibold text-gray-900">
                  {applicantName ||
                    copy.nameUnavailable}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {user.email}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.applicationSubmitted}
                </p>

                <p className="mt-2 font-semibold text-gray-900">
                  {typedApplication
                    ? formatDate(
                        typedApplication.created_at,
                        locale
                      )
                    : "—"}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {formatTemplate(
                    copy.applicationStatus,
                    {
                      status:
                        typedApplication
                          ? getApplicationStatusLabel(
                              typedApplication.status,
                              copy.applicationStatuses
                            )
                          : "—",
                    }
                  )}
                </p>
              </div>
            </div>

            {hasClinicCoverage &&
              typedClinicCoverage && (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
                  {formatTemplate(
                    copy.clinicCoverageNotice,
                    {
                      date:
                        acceptedCoverageDate,
                    }
                  )}
                </div>
              )}

            {typedSubscription &&
              !hasClinicCoverage && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.currentPlan}
                    </p>

                    <p className="mt-2 font-semibold text-gray-900">
                      {typedSubscription.billing_interval ===
                      "yearly"
                        ? copy.yearlyPlan
                        : copy.monthlyPlan}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {typedSubscription.billing_interval ===
                      "yearly"
                        ? copy.yearlyBilling
                        : copy.monthlyBilling}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.subscriptionStatus}
                    </p>

                    <p className="mt-2 font-semibold text-gray-900">
                      {getSubscriptionStatusLabel(
                        typedSubscription.status,
                        copy.subscriptionStatuses
                      )}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {typedSubscription.current_period_end
                        ? formatTemplate(
                            copy.currentPeriodEnds,
                            {
                              date: formatDate(
                                typedSubscription.current_period_end,
                                locale
                              ),
                            }
                          )
                        : copy.nextBillingUnavailable}
                    </p>

                    {typedSubscription.cancel_at_period_end && (
                      <p className="mt-2 text-sm font-medium text-amber-800">
                        {copy.cancellationScheduled}
                      </p>
                    )}
                  </div>
                </div>
              )}

            <div className="mt-8 border-t border-gray-200 pt-8">
              {hasClinicCoverage ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {copy.clinicCoveredTitle}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    {copy.clinicCoveredDescription}
                  </p>
                </div>
              ) : hasActiveSubscription ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {copy.manageTitle}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    {copy.manageDescription}
                  </p>

                  <div className="mt-5">
                    <ManageSubscriptionButton />
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {copy.choosePlanTitle}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    {copy.choosePlanDescription}
                  </p>

                  <div className="mt-6">
                    <SubscriptionCheckoutButton
                      monthlyPrice={
                        monthlyPrice
                      }
                      yearlyPrice={
                        yearlyPrice
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {profile.role === "doctor" && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <Link
                  href="/doctor-dashboard/appointments"
                  className="inline-flex rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ff2800]"
                >
                  {copy.openDoctorDashboard}
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
