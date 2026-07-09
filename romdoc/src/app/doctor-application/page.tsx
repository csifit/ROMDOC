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

function getStatusContent(
  applicationStatus: string,
  subscriptionStatus: string | null,
  hasClinicCoverage: boolean
) {
  if (hasClinicCoverage) {
    return {
      title: "Abonamentul este acoperit de clinică",
      description:
        "Contul tău de medic a fost creat printr-o invitație de clinică. Plata abonamentului RomDoc este gestionată de clinică.",
      badge: "Clinic-paid",
      badgeClasses: "bg-green-100 text-green-800",
    };
  }

  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
    return {
      title: "Abonamentul este activ",
      description:
        "Contul tău de medic este activ și ai acces la serviciile platformei.",
      badge: "Activ",
      badgeClasses: "bg-green-100 text-green-800",
    };
  }

  if (subscriptionStatus === "past_due") {
    return {
      title: "Plata abonamentului necesită atenție",
      description: "Actualizează metoda de plată în portalul de facturare.",
      badge: "Plată restantă",
      badgeClasses: "bg-amber-100 text-amber-900",
    };
  }

  if (subscriptionStatus === "canceled" || subscriptionStatus === "unpaid") {
    return {
      title: "Abonamentul nu este activ",
      description:
        "Abonamentul trebuie reactivat pentru acces complet la serviciile de medic.",
      badge: "Inactiv",
      badgeClasses: "bg-red-100 text-red-800",
    };
  }

  switch (applicationStatus) {
    case "payment_processing":
      return {
        title: "Plata este în curs de procesare",
        description:
          "Așteptăm confirmarea securizată de la Stripe. Pagina se va actualiza după procesarea webhookului.",
        badge: "În procesare",
        badgeClasses: "bg-blue-100 text-blue-800",
      };

    case "paid":
    case "approved":
      return {
        title: "Contul de medic este activ",
        description: "Plata a fost confirmată și contul a fost activat.",
        badge: "Activ",
        badgeClasses: "bg-green-100 text-green-800",
      };

    case "rejected":
      return {
        title: "Cererea nu poate continua",
        description: "Contactează echipa RomDoc pentru informații suplimentare.",
        badge: "Respinsă",
        badgeClasses: "bg-red-100 text-red-800",
      };

    case "cancelled":
      return {
        title: "Cererea a fost anulată",
        description:
          "Poți contacta echipa RomDoc pentru reactivarea procesului.",
        badge: "Anulată",
        badgeClasses: "bg-gray-200 text-gray-700",
      };

    default:
      return {
        title: "Activează abonamentul RomDoc",
        description:
          "Adresa de e-mail a fost confirmată. Următorul pas este activarea abonamentului de medic.",
        badge: "Plată necesară",
        badgeClasses: "bg-amber-100 text-amber-900",
      };
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getSubscriptionStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Activ";

    case "trialing":
      return "Perioadă de probă";

    case "past_due":
      return "Plată restantă";

    case "canceled":
      return "Anulat";

    case "unpaid":
      return "Neplătit";

    case "incomplete":
      return "Plată incompletă";

    case "incomplete_expired":
      return "Plată expirată";

    case "paused":
      return "Suspendat";

    default:
      return status;
  }
}

export default async function DoctorApplicationPage({
  searchParams,
}: DoctorApplicationPageProps) {
  const parameters = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/doctor-application");
  }

  if (!user.email_confirmed_at) {
    redirect("/check-email?type=doctor");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
        role,
        first_name,
        last_name,
        account_status
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/login");
  }

  if (profile.account_status === "blocked") {
    await supabase.auth.signOut();
    redirect("/login?error=account-blocked");
  }

  const { data: application, error: applicationError } = await supabase
    .from("doctor_applications")
    .select(
      `
        id,
        status,
        phone,
        professional_registration_number,
        created_at
      `
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (applicationError) {
    console.error("Doctor application query failed:", applicationError);
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("doctor_subscriptions")
    .select(
      `
        status,
        billing_interval,
        stripe_price_id,
        current_period_end,
        cancel_at_period_end
      `
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Doctor subscription query failed:", subscriptionError);
  }

  const { data: clinicCoverage, error: clinicCoverageError } = await supabase
    .from("clinic_doctor_relationships")
    .select(
      `
        id,
        organization_id,
        invitation_status,
        payment_responsibility,
        coverage_status,
        accepted_at
      `
    )
    .eq("accepted_profile_id", user.id)
    .eq("payment_responsibility", "clinic_paid")
    .eq("coverage_status", "active")
    .maybeSingle();

  if (clinicCoverageError) {
    console.error("Clinic doctor coverage query failed:", clinicCoverageError);
  }

  const typedApplication = application as DoctorApplication | null;
  const typedSubscription = subscription as DoctorSubscription | null;
  const typedClinicCoverage = clinicCoverage as ClinicDoctorRelationship | null;
  const hasClinicCoverage = Boolean(typedClinicCoverage);

  if (profile.role === "doctor" && !typedApplication) {
    redirect("/doctor-dashboard/appointments");
  }

  if (!["doctor_applicant", "doctor"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const statusContent = getStatusContent(
    typedApplication?.status ?? "pending_payment",
    typedSubscription?.status ?? null,
    hasClinicCoverage
  );

  const applicantName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const hasActiveSubscription =
    hasClinicCoverage ||
    typedSubscription?.status === "active" ||
    typedSubscription?.status === "trialing";

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {parameters.checkout === "success" && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Plata a fost transmisă către Stripe. Activarea finală este realizată automat după confirmarea webhookului securizat.
          </div>
        )}

        {parameters.checkout === "cancelled" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Plata a fost anulată. Poți selecta din nou planul dorit când ești pregătit.
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#036661]">
                Cont medic RomDoc
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
                Candidat
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {applicantName || "Nume indisponibil"}
              </p>

              <p className="mt-1 text-sm text-gray-600">{user.email}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Cerere trimisă
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {typedApplication ? formatDate(typedApplication.created_at) : "—"}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Status cerere: {typedApplication?.status ?? "—"}
              </p>
            </div>
          </div>

          {hasClinicCoverage && typedClinicCoverage && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
              Abonamentul tău este acoperit de clinică din{" "}
              {typedClinicCoverage.accepted_at
                ? formatDate(typedClinicCoverage.accepted_at)
                : "momentul acceptării invitației"}
              . Nu este necesară plata individuală prin Stripe.
            </div>
          )}

          {typedSubscription && !hasClinicCoverage && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Plan curent
                </p>

                <p className="mt-2 font-semibold text-gray-900">
                  {typedSubscription.billing_interval === "yearly"
                    ? "Abonament anual"
                    : "Abonament lunar"}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {typedSubscription.billing_interval === "yearly"
                    ? "Facturare o dată pe an"
                    : "Facturare în fiecare lună"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status abonament
                </p>

                <p className="mt-2 font-semibold text-gray-900">
                  {getSubscriptionStatusLabel(typedSubscription.status)}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {typedSubscription.current_period_end
                    ? `Perioada curentă se încheie la ${formatDate(
                        typedSubscription.current_period_end
                      )}.`
                    : "Data următoarei facturări nu este disponibilă."}
                </p>

                {typedSubscription.cancel_at_period_end && (
                  <p className="mt-2 text-sm font-medium text-amber-800">
                    Abonamentul este programat pentru anulare la sfârșitul perioadei curente.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-gray-200 pt-8">
            {hasClinicCoverage ? (
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Abonament acoperit de clinică
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                  Clinica gestionează plata abonamentului tău RomDoc. Următorul
                  pas pentru tine este să finalizezi datele profesionale și
                  verificarea profilului de medic.
                </p>
              </div>
            ) : hasActiveSubscription ? (
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Administrarea abonamentului
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                  În portalul Stripe poți schimba planul lunar sau anual, metoda
                  de plată și informațiile de facturare.
                </p>
                <div className="mt-5">
                  <ManageSubscriptionButton />
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Alege planul de abonament
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                  Selectează facturarea lunară sau anuală. Accesul la platforma
                  medicilor este activat după confirmarea plății Stripe.
                </p>
                <div className="mt-6">
                  <SubscriptionCheckoutButton />
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
                Deschide panoul medicului
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
