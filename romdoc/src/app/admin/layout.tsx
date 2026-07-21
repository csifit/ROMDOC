import {
  NextIntlClientProvider,
} from "next-intl";
import {
  redirect,
} from "next/navigation";
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
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  getPlatformOperatorFoundation,
  platformOperatorMessagesByLocale,
} from "@/lib/i18n/platform-operator-foundation";
import {
  createClient,
} from "@/lib/supabase/server";

type AdminDashboardLayoutProps = {
  children: ReactNode;
};

export default async function AdminDashboardLayout({
  children,
}: AdminDashboardLayoutProps) {
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
          "/admin",
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
    "manager"
  ) {
    redirect(
      "/manager-dashboard"
    );
  }

  if (
    profile.role !==
    "admin"
  ) {
    redirect(
      `/${locale}`
    );
  }

  const trustedIp =
    await isTrustedAdminMfaIp();

  if (
    !trustedIp
  ) {
    const mfaRedirect =
      await getAdminMfaRedirect({
        supabase,
        nextPath:
          "/admin",
        locale,
      });

    if (
      mfaRedirect
    ) {
      redirect(
        mfaRedirect
      );
    }
  }

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
      .fallbackAdmin;

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
      <AdminDashboardSidebar
        userName={
          userName
        }
        userEmail={
          userEmail
        }
        roleLabel={
          copy.common
            .roleAdmin
        }
      >
        {
          children
        }
      </AdminDashboardSidebar>
    </NextIntlClientProvider>
  );
}
