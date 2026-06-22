import { redirect } from "next/navigation";

import DoctorOnboardingChecklist from "@/components/doctor/doctor-onboarding-checklist";
import { getDoctorProfileCompletion } from "@/lib/doctors/get-doctor-profile-completion";
import { createClient } from "@/lib/supabase/server";

export default async function DoctorDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/doctor-dashboard");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      account_status,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "doctor" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const completion = await getDoctorProfileCompletion(
    supabase,
    user.id,
    profile.first_name,
    profile.last_name
  );

  if (!completion) {
    return (
      <main className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
            Contul este activ, dar profilul de medic nu a putut fi
            găsit. Verifică activarea abonamentului sau contactează
            suportul RomDoc.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold text-[#036661]">
            Panou medic
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
            Bun venit în RomDoc
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-gray-600">
            Urmărește pașii necesari pentru un profil medical complet,
            clar și pregătit pentru programările pacienților.
          </p>
        </header>

        <div className="mt-8">
          <DoctorOnboardingChecklist
            completion={completion}
          />
        </div>
      </div>
    </main>
  );
}
