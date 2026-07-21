import { redirect } from "next/navigation";

import DoctorVerificationsManagement from "@/components/admin/doctor-verifications-management";
import { getPlatformOperatorDoctors } from "@/lib/i18n/platform-operator-doctors";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVerificationsPage() {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorDoctors(locale);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/admin/verifications",
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
    redirect("/dashboard");
  }

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          {copy.common.administration}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.adminVerifications.title}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.adminVerifications.description}
        </p>
      </header>

      <DoctorVerificationsManagement />
    </div>
  );
}
