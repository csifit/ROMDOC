import {
  NextIntlClientProvider,
} from "next-intl";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";
import type {
  ReactNode,
} from "react";

import ClinicManagerDashboardSidebar from "@/components/dashboard/clinic-manager-dashboard-sidebar";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

import roMessages from "../../../messages/ro.json";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";

const messagesByLocale = {
  ro:
    roMessages,
  en:
    enMessages,
  de:
    deMessages,
} as const;

type ClinicManagerDashboardLayoutProps = {
  children:
    ReactNode;
};

export default async function ClinicManagerDashboardLayout({
  children,
}: ClinicManagerDashboardLayoutProps) {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "ClinicOrganisationDashboard.layout",
    });

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
          "/clinic-manager-dashboard",
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
    profile.role ===
    "manager"
  ) {
    redirect(
      "/manager-dashboard"
    );
  }

  if (
    profile.role !==
    "clinic_manager"
  ) {
    redirect(
      "/dashboard"
    );
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
    t(
      "fallbackName"
    );

  const userEmail =
    user.email ??
    t(
      "unavailableEmail"
    );

  return (
    <NextIntlClientProvider
      locale={
        locale
      }
      messages={
        messagesByLocale[
          locale
        ]
      }
    >
      <ClinicManagerDashboardSidebar
        userName={
          userName
        }
        userEmail={
          userEmail
        }
      >
        {children}
      </ClinicManagerDashboardSidebar>
    </NextIntlClientProvider>
  );
}
