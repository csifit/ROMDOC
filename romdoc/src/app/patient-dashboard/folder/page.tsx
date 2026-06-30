import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import PatientMedicalProfile from "@/components/medical-folder/patient-medical-profile";
import PatientMedicalFolder from "@/components/patient/patient-medical-folder";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function PatientFolderPage() {
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
      "/login?next=/patient-dashboard/folder"
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
    profile.role !== "patient" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const patientName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-[#036661]">
            Cont pacient
          </p>

          <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dosarul meu medical
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                {patientName
                  ? `${patientName}, aici găsești profilul medical, documentele și notele adăugate de medicii tăi.`
                  : "Aici găsești profilul medical, documentele și notele adăugate de medicii tăi."}
              </p>
            </div>

            <Link
              href="/patient-dashboard"
              className="romdoc-button romdoc-button-secondary romdoc-button-sm"
            >
              Înapoi la programări
            </Link>
          </div>

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            Informațiile și fișierele sunt private. Profilul medical poate fi
            modificat numai de un medic care are acces legitim printr-o
            programare RomDoc.
          </div>
        </header>

        <PatientMedicalProfile />

        <PatientMedicalFolder />
      </div>
    </main>
  );
}
