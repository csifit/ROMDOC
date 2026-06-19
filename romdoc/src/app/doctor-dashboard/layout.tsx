import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import DoctorDashboardSidebar from "@/components/dashboard/doctor-dashboard-sidebar";
import { createClient } from "@/lib/supabase/server";

type DoctorDashboardLayoutProps = {
  children: ReactNode;
};

export default async function DoctorDashboardLayout({
  children,
}: DoctorDashboardLayoutProps) {
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
      "Doctor dashboard layout profile query failed:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !== "doctor"
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
    "Medic RomDoc";

  const userEmail =
    user.email ?? "E-mail indisponibil";

  return (
    <DoctorDashboardSidebar
      userName={userName}
      userEmail={userEmail}
      roleLabel="Medic"
    >
      {children}
    </DoctorDashboardSidebar>
  );
}