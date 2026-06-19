import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminDashboardSidebar from "@/components/dashboard/admin-dashboard-sidebar";
import { createClient } from "@/lib/supabase/server";

type AdminDashboardLayoutProps = {
  children: ReactNode;
};

export default async function AdminDashboardLayout({
  children,
}: AdminDashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, first_name, last_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Admin dashboard layout profile query failed:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/");
  }

  const fullName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const userName =
    fullName ||
    user.email?.split("@")[0] ||
    "Administrator RomDoc";

  const userEmail =
    user.email ?? "E-mail indisponibil";

  return (
    <AdminDashboardSidebar
      userName={userName}
      userEmail={userEmail}
      roleLabel="Administrator"
    >
      {children}
    </AdminDashboardSidebar>
  );
}