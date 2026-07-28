import { redirect } from "next/navigation";

import AdminContractManagement from "@/components/admin/contracts/admin-contract-management";
import { loadAdminContractManagementData } from "@/lib/contracts/admin-contract-management-data";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminContractsPage() {
  const locale = await getStoredAppLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/admin/contracts",
    });
    redirect(`/login?${parameters.toString()}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const data = await loadAdminContractManagementData(createAdminClient());

  return <AdminContractManagement locale={locale} data={data} />;
}
