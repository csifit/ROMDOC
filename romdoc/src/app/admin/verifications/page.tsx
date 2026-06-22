import { redirect } from "next/navigation";
import DoctorVerificationsManagement from "@/components/admin/doctor-verifications-management";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVerificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/admin/verifications");
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
    profile?.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Administrare
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Verificări profesionale
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Examinează cererile și documentele medicilor, începe analiza,
          aprobă sau respinge solicitările și păstrează observații interne.
        </p>
      </header>

      <DoctorVerificationsManagement />
    </div>
  );
}
