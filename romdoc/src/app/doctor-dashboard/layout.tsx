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

import DoctorDashboardSidebar from "@/components/dashboard/doctor-dashboard-sidebar";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

import roMessages from "../../../messages/ro.json";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";

type DoctorDashboardLayoutProps = {
  children: ReactNode;
};

type DoctorAccount = {
  account_type:
    | string
    | null;
};

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

export default async function DoctorDashboardLayout({
  children,
}: DoctorDashboardLayoutProps) {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "DoctorStaffFoundation.doctor.layout",
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
          "/doctor-dashboard",
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
        first_name,
        last_name
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError
  ) {
    console.error(
      "Doctor dashboard layout profile query failed:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !==
      "doctor"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data:
      doctorAccount,
    error:
      doctorAccountError,
  } =
    await supabase
      .from(
        "doctors"
      )
      .select(
        "account_type"
      )
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

  if (
    doctorAccountError
  ) {
    console.error(
      "Doctor dashboard layout account type query failed:",
      doctorAccountError
    );
  }

  const typedDoctorAccount =
    doctorAccount as
      | DoctorAccount
      | null;

  const isClinicSubAccount =
    typedDoctorAccount
      ?.account_type ===
    "clinic_sub_account";

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
      "fallbackDoctor"
    );

  const userEmail =
    user.email ??
    t(
      "emailUnavailable"
    );

  const roleLabel =
    isClinicSubAccount
      ? t(
          "roleClinicDoctor"
        )
      : t(
          "roleDoctor"
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
      <DoctorDashboardSidebar
        userName={
          userName
        }
        userEmail={
          userEmail
        }
        roleLabel={
          roleLabel
        }
        isClinicSubAccount={
          isClinicSubAccount
        }
      >
        {children}
      </DoctorDashboardSidebar>
    </NextIntlClientProvider>
  );
}
