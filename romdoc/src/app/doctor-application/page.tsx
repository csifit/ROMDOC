import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DoctorApplication = {
  status: string;
  phone: string | null;
  professional_registration_number:
    | string
    | null;
  created_at: string;
};

function getStatusContent(
  status: string
) {
  switch (status) {
    case "pending_payment":
      return {
        title:
          "Continuă cu abonamentul RomDoc",

        description:
          "Adresa de e-mail a fost confirmată. Următorul pas este activarea abonamentului de medic.",

        badge:
          "Plată necesară",
      };

    case "payment_processing":
      return {
        title:
          "Plata este în curs de procesare",

        description:
          "Așteptăm confirmarea finală de la procesatorul de plăți.",

        badge:
          "În procesare",
      };

    case "paid":
    case "approved":
      return {
        title:
          "Abonamentul este activ",

        description:
          "Contul tău de medic este activ și ai acces la serviciile platformei.",

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
          "Poți contacta echipa RomDoc dacă dorești reactivarea procesului.",

        badge:
          "Anulată",
      };

    default:
      return {
        title:
          "Cererea ta de medic",

        description:
          "Cererea este în curs de pregătire.",

        badge:
          "Înregistrată",
      };
  }
}

export default async function DoctorApplicationPage() {
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
    redirect("/check-email?type=doctor");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/login");
  }

  if (profile.role === "doctor") {
    redirect(
      "/doctor-dashboard/appointments"
    );
  }

  if (
    profile.role !==
    "doctor_applicant"
  ) {
    redirect("/dashboard");
  }

  const {
    data: application,
    error: applicationError,
  } = await supabase
    .from("doctor_applications")
    .select(`
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

  const typedApplication =
    application as
      | DoctorApplication
      | null;

  const statusContent =
    getStatusContent(
      typedApplication?.status ??
        "pending_payment"
    );

  const applicantName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Înregistrare medic
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

          {typedApplication?.status ===
            "pending_payment" && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-sm font-medium text-gray-500">
                Abonament unic
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                50 lei
                <span className="text-base font-medium text-gray-500">
                  {" "}/ lună + TVA
                </span>
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                Include toate serviciile
                disponibile pentru medici pe
                platforma RomDoc.
              </p>

              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-xl bg-[#D97757] px-5 py-3.5 text-sm font-semibold text-white opacity-60"
              >
                Plata Stripe va fi adăugată
                în Step 52F
              </button>
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