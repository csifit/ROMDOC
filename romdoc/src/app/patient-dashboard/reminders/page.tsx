import Link from "next/link";
import { redirect } from "next/navigation";

import PatientReminderPreferences from "@/components/patient/patient-reminder-preferences";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function
PatientReminderPreferencesPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      "/login?next=/patient-dashboard/reminders"
    );
  }

  if (!user.email_confirmed_at) {
    redirect("/check-email");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "patient" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/patient-dashboard"
          className="text-sm font-semibold text-[#036661] hover:underline"
        >
          ← Înapoi la programările mele
        </Link>

        <div className="mt-5">
          <PatientReminderPreferences />
        </div>
      </div>
    </main>
  );
}
