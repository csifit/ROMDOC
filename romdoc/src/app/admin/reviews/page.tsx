import { redirect } from "next/navigation";

import ReviewsManagement from "@/components/admin/reviews-management";
import { getPlatformOperatorDirectory } from "@/lib/i18n/platform-operator-directory";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

export default async function AdminReviewsPage() {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorDirectory(locale);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/admin/reviews",
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
        <p className="text-sm font-semibold text-[#9A4F35]">
          {copy.common.administration}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.reviews.adminTitle}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.reviews.adminDescription}
        </p>
      </header>

      <ReviewsManagement />
    </div>
  );
}
