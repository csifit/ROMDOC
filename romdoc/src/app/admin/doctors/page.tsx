import { redirect } from "next/navigation";

import AdminDoctorInvitations from "@/components/admin/admin-doctor-invitations";
import DoctorsManagement from "@/components/admin/doctors-management";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDoctorsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/admin/doctors");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
        role,
        account_status
      `
    )
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
        <p className="text-sm font-semibold text-[#036661]">Administrare</p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">Medici</h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Doctorii nu așteaptă aprobare Admin pentru activarea normală a
          contului. Adminul urmărește medicii, verifică profesional badge-ul
          RomDoc și poate suspenda profiluri sau bloca abuzuri.
        </p>
      </header>

      <AdminDoctorInvitations />

      <DoctorsManagement />
    </div>
  );
}
