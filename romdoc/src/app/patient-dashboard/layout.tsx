import {
  redirect,
} from "next/navigation";
import type {
  ReactNode,
} from "react";

import PatientDashboardSidebar from "@/components/dashboard/patient-dashboard-sidebar";
import PublicFooter from "@/components/public/public-footer";
import { createClient } from "@/lib/supabase/server";

type PatientDashboardLayoutProps = {
  children: ReactNode;
};

export default async function PatientDashboardLayout({
  children,
}: PatientDashboardLayoutProps) {
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
      "/login?next=/patient-dashboard"
    );
  }

  if (
    !user.email_confirmed_at
  ) {
    redirect(
      "/check-email"
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
    profile.role !==
      "patient" ||
    ![
      "active",
      "closure_requested",
    ].includes(
      profile.account_status
    )
  ) {
    redirect(
      "/dashboard"
    );
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
    "Pacient RomDoc";

  const userEmail =
    user.email ??
    "E-mail indisponibil";

  return (
    <PatientDashboardSidebar
      userName={userName}
      userEmail={userEmail}
      accountStatus={
        profile.account_status
      }
      footer={
        <PublicFooter />
      }
    >
      {children}
    </PatientDashboardSidebar>
  );
}
