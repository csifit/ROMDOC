"use client";

import {
  useEffect,
} from "react";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type AppLocaleCookieSyncProps = {
  locale: AppLocale;
};

const ONE_YEAR_IN_SECONDS =
  60 * 60 * 24 * 365;

export default function
AppLocaleCookieSync({
  locale,
}: AppLocaleCookieSyncProps) {
  useEffect(() => {
    document.cookie = [
      `NEXT_LOCALE=${locale}`,
      "Path=/",
      `Max-Age=${ONE_YEAR_IN_SECONDS}`,
      "SameSite=Lax",
    ].join("; ");
  }, [locale]);

  return null;
}
