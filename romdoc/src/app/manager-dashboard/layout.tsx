import {
  redirect,
} from "next/navigation";
import type {
  ReactNode,
} from "react";

import ManagerDashboardSidebar from "@/components/dashboard/manager-dashboard-sidebar";
import {
  getAdminMfaRedirect,
} from "@/lib/auth/admin-mfa";
import {
  createClient,
} from "@/lib/supabase/server";

type ManagerDashboardLayoutProps = {
  children: ReactNode;
};

export default async function ManagerDashboardLayout({
  children,
}: ManagerDashboardLayoutProps) {
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
      "/login?next=/manager-dashboard"
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        account_status,
        first_name,
        last_name
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !==
      "active"
  ) {
    redirect("/");
  }

  if (
    profile.role ===
    "admin"
  ) {
    redirect("/admin");
  }

  if (
    profile.role !==
    "manager"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const mfaRedirect =
    await getAdminMfaRedirect({
      supabase,
      nextPath:
        "/manager-dashboard",
    });

  if (mfaRedirect) {
    redirect(mfaRedirect);
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
    user.email?.split(
      "@"
    )[0] ||
    "Manager";

  const userEmail =
    user.email ??
    "E-mail indisponibil";

  return (
    <ManagerDashboardSidebar
      userName={userName}
      userEmail={userEmail}
    >
      {children}
    </ManagerDashboardSidebar>
  );
}
