import { redirect } from "next/navigation";
import type {
  ReactNode,
} from "react";

import AdminDashboardSidebar from "@/components/dashboard/admin-dashboard-sidebar";
import {
  getAdminMfaRedirect,
} from "@/lib/auth/admin-mfa";
import {
  isTrustedAdminMfaIp,
} from "@/lib/auth/admin-mfa-ip";
import { createClient } from "@/lib/supabase/server";

type AdminDashboardLayoutProps = {
  children: ReactNode;
};

export default async function AdminDashboardLayout({
  children,
}: AdminDashboardLayoutProps) {
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
      "/login?next=/admin"
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
    ![
      "admin",
      "manager",
    ].includes(
      profile.role
    ) ||
    profile.account_status !==
      "active"
  ) {
    redirect("/");
  }

  /*
   * Trusted-IP MFA bypass remains admin-only.
   * Managers must always reach AAL2.
   */
  const trustedIp =
    profile.role ===
    "admin"
      ? await isTrustedAdminMfaIp()
      : false;

  if (!trustedIp) {
    const mfaRedirect =
      await getAdminMfaRedirect({
        supabase,
        nextPath:
          "/admin",
      });

    if (mfaRedirect) {
      redirect(
        mfaRedirect
      );
    }
  }

  const fullName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const roleLabel =
    profile.role ===
    "admin"
      ? "Administrator"
      : "Manager";

  const userName =
    fullName ||
    user.email?.split(
      "@"
    )[0] ||
    roleLabel;

  const userEmail =
    user.email ??
    "E-mail indisponibil";

  return (
    <AdminDashboardSidebar
      userName={userName}
      userEmail={userEmail}
      roleLabel={
        roleLabel
      }
    >
      {children}
    </AdminDashboardSidebar>
  );
}
