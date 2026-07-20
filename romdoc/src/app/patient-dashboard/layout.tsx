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

import PatientDashboardSidebar from "@/components/dashboard/patient-dashboard-sidebar";
import PublicFooter from "@/components/public/public-footer";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

import roMessages from "../../../messages/ro.json";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";

type PatientDashboardLayoutProps = {
  children: ReactNode;
};

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

export default async function PatientDashboardLayout({
  children,
}: PatientDashboardLayoutProps) {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientDashboard.layout",
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
          "/patient-dashboard",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  if (
    !user
      .email_confirmed_at
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        type:
          "patient",
        next:
          "/patient-dashboard",
      });

    if (
      user.email
    ) {
      parameters.set(
        "email",
        user.email
      );
    }

    redirect(
      `/check-email?${parameters.toString()}`
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

  const fullName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const userName =
    fullName ||
    user.email
      ?.split("@")[0] ||
    t(
      "fallbackPatient"
    );

  const userEmail =
    user.email ??
    t(
      "emailUnavailable"
    );

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={
        messagesByLocale[
          locale
        ]
      }
    >
      <PatientDashboardSidebar
        userName={
          userName
        }
        userEmail={
          userEmail
        }
        accountStatus={
          profile.account_status
        }
        footer={
          <PublicFooter
            locale={locale}
          />
        }
      >
        {children}
      </PatientDashboardSidebar>
    </NextIntlClientProvider>
  );
}
