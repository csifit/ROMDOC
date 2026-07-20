"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/client";

export default function StaffLogoutButton() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorStaffFoundation.staff.logout"
    );

  const router =
    useRouter();

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  async function handleLogout() {
    if (
      isSigningOut
    ) {
      return;
    }

    setIsSigningOut(
      true
    );

    try {
      const supabase =
        createClient();

      const {
        error,
      } =
        await supabase.auth
          .signOut();

      if (
        error
      ) {
        console.error(
          "Staff sign out failed:",
          error
        );
      }
    } finally {
      router.replace(
        `/login?locale=${locale}`
      );

      router.refresh();

      setIsSigningOut(
        false
      );
    }
  }

  return (
    <button
      type="button"
      onClick={() =>
        void handleLogout()
      }
      disabled={
        isSigningOut
      }
      className="romdoc-button romdoc-button-secondary romdoc-button-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSigningOut
        ? t(
            "signingOut"
          )
        : t(
            "signOut"
          )}
    </button>
  );
}
