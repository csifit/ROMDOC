import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import ClinicManagerDashboardSidebar from "@/components/dashboard/clinic-manager-dashboard-sidebar";
import { createClient } from "@/lib/supabase/server";

type ClinicManagerDashboardLayoutProps = {
  children: ReactNode;
};

export default async function ClinicManagerDashboardLayout({
  children,
}: ClinicManagerDashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/clinic-manager-dashboard");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      role,
      account_status,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !== "active"
  ) {
    redirect("/");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  if (profile.role === "manager") {
    redirect("/manager-dashboard");
  }

  if (profile.role !== "clinic_manager") {
    redirect("/dashboard");
  }

  const fullName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const userName =
    fullName || user.email?.split("@")[0] || "Clinic Manager";

  const userEmail = user.email ?? "E-mail indisponibil";

  return (
    <ClinicManagerDashboardSidebar userName={userName} userEmail={userEmail}>
      {children}
    </ClinicManagerDashboardSidebar>
  );
}
