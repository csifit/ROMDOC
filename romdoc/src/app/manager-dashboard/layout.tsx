import {
  NextIntlClientProvider,
} from "next-intl";
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
  getPlatformOperatorFoundation,
  platformOperatorMessagesByLocale,
} from "@/lib/i18n/platform-operator-foundation";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type ManagerDashboardLayoutProps = {
  children: ReactNode;
};

export default async function ManagerDashboardLayout({
  children,
}: ManagerDashboardLayoutProps) {
  const locale =
    await getStoredAppLocale();

  const copy =
    getPlatformOperatorFoundation(
      locale
    );

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        next:
          "/manager-dashboard",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
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
    profile
      .account_status !==
      "active"
  ) {
    redirect(
      `/${locale}`
    );
  }

  if (
    profile.role ===
    "admin"
  ) {
    redirect(
      "/admin"
    );
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
      locale,
    });

  if (
    mfaRedirect
  ) {
    redirect(
      mfaRedirect
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      accountingPermission,
    error:
      accountingPermissionError,
  } =
    await admin
      .from(
        "manager_permissions"
      )
      .select(
        "profile_id"
      )
      .eq(
        "profile_id",
        user.id
      )
      .eq(
        "permission_key",
        "accounting"
      )
      .is(
        "revoked_at",
        null
      )
      .maybeSingle();

  if (
    accountingPermissionError
  ) {
    console.error(
      "Manager accounting permission lookup failed:",
      accountingPermissionError
    );
  }

  const canManageBilling =
    !accountingPermissionError &&
    Boolean(
      accountingPermission
    );

  const fullName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .trim();

  const userName =
    fullName ||
    user.email?.split(
      "@"
    )[0] ||
    copy.common
      .fallbackManager;

  const userEmail =
    user.email ??
    copy.common
      .emailUnavailable;

  return (
    <NextIntlClientProvider
      locale={
        locale
      }
      messages={
        platformOperatorMessagesByLocale[
          locale
        ]
      }
    >
      <ManagerDashboardSidebar
        userName={
          userName
        }
        userEmail={
          userEmail
        }
        roleLabel={
          copy.common
            .roleManager
        }
        canManageBilling={
          canManageBilling
        }
      >
        {
          children
        }
      </ManagerDashboardSidebar>
    </NextIntlClientProvider>
  );
}
