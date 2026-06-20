import Link from "next/link";
import { redirect } from "next/navigation";
import ManageSubscriptionButton from "@/components/doctor/manage-subscription-button";
import SubscriptionCheckoutButton from "@/components/doctor/subscription-checkout-button";
import { createClient } from "@/lib/supabase/server";

type DoctorApplicationPageProps = {
  searchParams: Promise<{
    checkout?: string;
  }>;
};

type DoctorApplication = {
  id: string;
  status: string;
  phone: string | null;
  professional_registration_number:
    | string
    | null;
  created_at: string;
};

type DoctorSubscription = {
  status: string;
  current_period_end:
    | string
    | null;
  cancel_at_period_end:
    boolean;
};

function getStatusContent(
  applicationStatus: string,
  subscriptionStatus:
    | string
    | null
) {
  if (
    subscriptionStatus ===
      "active" ||
    subscriptionStatus ===
      "trialing"
  ) {
    return {
      title:
        "Abonamentul este activ",

      description:
        "Contul tău de medic este activ și ai acces la serviciile platformei.",

      badge:
        "Activ",
    };
  }

  if (
    subscriptionStatus ===
    "past_due"
  ) {
    return {
      title:
        "Plata abonamentului necesită atenție",

      description:
        "Actualizează metoda de plată în portalul de facturare.",

      badge:
        "Plată restantă",
    };
  }

  if (
    subscriptionStatus ===
      "canceled" ||
    subscriptionStatus ===
      "unpaid"
  ) {
    return {
      title:
        "Abonamentul nu este activ",

      description:
        "Abonamentul trebuie reactivat pentru acces complet la serviciile de medic.",

      badge:
        "Inactiv",
    };
  }

  switch (applicationStatus) {
    case "payment_processing":
      return {
        title:
          "Plata este în curs de procesare",

        description:
          "Așteptăm confirmarea securizată de la Stripe. Pagina se va actualiza după procesarea webhookului.",

        badge:
          "În procesare",
      };

    case "paid":
    case "approved":
      return {
        title:
          "Contul de medic este activ",

        description:
          "Plata a fost confirmată și contul a fost activat.",

        badge:
          "Activ",
      };

    case "rejected":
      return {
        title:
          "Cererea nu poate continua",

        description:
          "Contactează echipa RomDoc pentru informații suplimentare.",

        badge:
          "Respinsă",
      };

    case "cancelled":
      return {
        title:
          "Cererea a fost anulată",

        description:
          "Poți contacta echipa RomDoc pentru reactivarea procesului.",

        badge:
          "Anulată",
      };

    default:
      return {
        title:
          "Activează abonamentul RomDoc",

        description:
          "Adresa de e-mail a fost confirmată. Următorul pas este activarea abonamentului de medic.",

        badge:
          "Plată necesară",
      };
  }
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(value));
}

export default async function DoctorApplicationPage({
  searchParams,
}: DoctorApplicationPageProps) {
  const parameters =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?next=/doctor-application"
    );
  }

  if (!user.email_confirmed_at) {
    redirect(
      "/check-email?type=doctor"
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
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/login");
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

  const typedApplication =
    application as
      | DoctorApplication
      | null;

  const typedSubscription =
    subscription as
      | DoctorSubscription
      | null;

  if (
    profile.role ===
      "doctor" &&
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

      typedSubscription?.status ??
        null
    );

  const applicantName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const hasActiveSubscription =
    typedSubscription &&
    [
      "active",
      "trialing",
    ].includes(
      typedSubscription.status
    );

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {parameters.checkout ===
          "success" && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Plata a fost transmisă către
            Stripe. Activarea finală este
            realizată automat după confirmarea
            webhookului securizat.
          </div>
        )}

        {parameters.checkout ===
          "cancelled" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Plata a fost anulată. Nu ai fost
            taxat și poți relua procesul.
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Cont medic
              </p>

              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {statusContent.title}
              </h1>
            </div>

            <span className="rounded-full bg-[#F0EEE9] px-4 py-2 text-sm font-semibold text-[#9A4F35]">
              {statusContent.badge}
            </span>
          </div>

          <p className="mt-5 leading-7 text-gray-600">
            {applicantName
              ? `${applicantName}, `
              : ""}

            {statusContent.description}
          </p>

          {!hasActiveSubscription &&
            typedApplication?.status !==
              "rejected" &&
            typedApplication?.status !==
              "cancelled" && (
              <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <p className="text-sm font-medium text-gray-500">
                  Abonament unic
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  50 lei

                  <span className="text-base font-medium text-gray-500">
                    {" "}
                    / lună + TVA
                  </span>
                </p>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Include toate serviciile
                  disponibile pentru medici pe
                  platforma RomDoc.
                </p>

                <div className="mt-6">
                  <SubscriptionCheckoutButton />
                </div>
              </div>
            )}

          {hasActiveSubscription && (
            <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">
              <h2 className="font-semibold text-green-950">
                Abonament activ
              </h2>

              {typedSubscription
                .current_period_end && (
                <p className="mt-2 text-sm text-green-900">
                  Perioada curentă este valabilă
                  până la{" "}
                  {formatDate(
                    typedSubscription
                      .current_period_end
                  )}
                  .
                </p>
              )}

              {typedSubscription
                .cancel_at_period_end && (
                <p className="mt-2 text-sm font-medium text-amber-800">
                  Abonamentul este programat
                  pentru anulare la finalul
                  perioadei curente.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/doctor-dashboard/appointments"
                  className="rounded-xl bg-[#D97757] px-5 py-3 text-sm font-semibold text-white"
                >
                  Deschide panoul medicului
                </Link>

                <ManageSubscriptionButton />
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="font-semibold text-gray-900">
              Verificarea profesională
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Verificarea profesională este
              separată de abonament. După
              verificare, profilul va primi
              insigna „Medic verificat de
              RomDoc”.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/"
              className="text-sm font-semibold text-[#9A4F35] underline-offset-4 hover:underline"
            >
              Înapoi la pagina principală
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}