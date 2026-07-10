import { redirect } from "next/navigation";

import AdminMfaSetupForm from "@/components/auth/admin-mfa-setup-form";
import PublicFooter from "@/components/public/public-footer";
import { createClient } from "@/lib/supabase/server";

type AdminMfaSetupPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

function safeNextPath(value: string | undefined) {
  if (!value) {
    return "/dashboard";
  }

  const isAdminPath = value === "/admin" || value.startsWith("/admin/");
  const isManagerPath =
    value === "/manager-dashboard" || value.startsWith("/manager-dashboard/");
  const isClinicManagerPath =
    value === "/clinic-manager-dashboard" ||
    value.startsWith("/clinic-manager-dashboard/");

  if (value.startsWith("//") || (!isAdminPath && !isManagerPath && !isClinicManagerPath)) {
    return "/dashboard";
  }

  return value;
}

export default async function AdminMfaSetupPage({
  searchParams,
}: AdminMfaSetupPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !["admin", "manager", "clinic_manager"].includes(profile.role) ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const { data: assurance } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (assurance?.currentLevel === "aal2") {
    redirect(nextPath);
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();

  if ((factors?.totp?.length ?? 0) > 0) {
    redirect(`/mfa/admin/verify?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <AdminMfaSetupForm nextPath={nextPath} />
      </main>

      <PublicFooter />
    </div>
  );
}
