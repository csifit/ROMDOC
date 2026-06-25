import { redirect } from "next/navigation";

import DoctorSecuritySettings from "@/components/doctor/doctor-security-settings";
import { createClient } from "@/lib/supabase/server";

export default async function DoctorSecurityPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login?next=/doctor-dashboard/security"
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        account_status,
        first_name,
        last_name
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "doctor" ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
            Securitate
          </p>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Autentificare în doi pași
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Protejează contul medical cu Google Authenticator.
            Activarea este opțională în această etapă și nu modifică
            înregistrarea, confirmarea e-mailului, plata sau activarea
            contului.
          </p>
        </header>

        <div className="mt-8">
          <DoctorSecuritySettings />
        </div>
      </div>
    </main>
  );
}
