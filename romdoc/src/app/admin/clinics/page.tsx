import {
  redirect,
} from "next/navigation";
import ClinicManagementActions from "@/components/admin/clinic-management-actions";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function AdminClinicsPage() {
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
      "/login?next=/admin/clinics"
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin"
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Administrare
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Clinici
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Verifică clinicile propuse de medici. După aprobare,
          clinica devine o entitate comună RomDoc și este asociată
          automat medicului care a propus-o.
        </p>
      </header>

      <ClinicManagementActions />
    </div>
  );
}