import { redirect } from "next/navigation";

import ManagersManagement from "@/components/admin/managers-management";
import { getPlatformOperatorAccess } from "@/lib/i18n/platform-operator-access";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

export default async function AdminManagersPage() {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorAccess(locale);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/admin/managers",
    });
    redirect(`/login?${parameters.toString()}`);
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
    redirect("/admin");
  }

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          {copy.common.accessAdministration}
        </p>
        <h1 className="mt-[13px] text-3xl font-bold text-gray-900">
          {copy.managers.page.title}
        </h1>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.managers.page.description}
        </p>
      </header>

      <ManagersManagement />
    </div>
  );
}
