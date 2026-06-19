import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StaffDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, first_name, last_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "staff"
  ) {
    redirect("/dashboard");
  }

  const staffName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Panou personal clinică
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Bun venit
            {staffName
              ? `, ${staffName}`
              : ""}
          </h1>

          <p className="mt-4 text-gray-600">
            Panoul personalului va permite gestionarea
            programărilor clinicii după implementarea
            relației dintre personal și clinică.
          </p>

          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Panoul personalului este în curs de dezvoltare.
          </div>
        </div>
      </div>
    </main>
  );
}