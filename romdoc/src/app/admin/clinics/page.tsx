import { redirect } from "next/navigation";

import AdminClinicCreationForm from "@/components/admin/admin-clinic-creation-form";
import ClinicManagementActions from "@/components/admin/clinic-management-actions";
import { createClient } from "@/lib/supabase/server";

export default async function AdminClinicsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/admin/clinics");
  }

  const { data: profile, error: profileError } = await supabase
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
        <p className="text-sm font-semibold text-[#9A4F35]">Administrare</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Clinici</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Creează direct clinici aprobate sau verifică propunerile trimise de medici. Clinicile aprobate sunt entități comune RomDoc și pot fi asociate mai multor medici.
        </p>
      </header>

      <AdminClinicCreationForm />
      <ClinicManagementActions />
    </div>
  );
}
