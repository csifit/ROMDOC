import { redirect } from "next/navigation";

import ContractDashboard from "@/components/contracts/contract-dashboard";
import { loadDoctorContractDashboard } from "@/lib/contracts/contract-dashboard-data";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

export default async function DoctorContractPage() {
  const locale = await getStoredAppLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const query = new URLSearchParams({ locale, next: "/doctor-dashboard/contract" });
    redirect(`/login?${query.toString()}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "doctor" || profile.account_status !== "active") {
    redirect("/dashboard");
  }

  const data = await loadDoctorContractDashboard(supabase, user.id);

  return <ContractDashboard data={data} />;
}
