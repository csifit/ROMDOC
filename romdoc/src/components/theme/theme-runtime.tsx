"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  APP_APPEARANCE_CHANGE_EVENT,
  APP_APPEARANCE_STORAGE_KEY,
  applyAppAppearance,
  isDashboardPath,
  normalizeAppAppearance,
  readStoredAppAppearance,
} from "@/lib/theme/app-theme";

export default function ThemeRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.dataset.romdocSurface = isDashboardPath(pathname)
      ? "dashboard"
      : "public";
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const refresh = () => applyAppAppearance(readStoredAppAppearance());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === APP_APPEARANCE_STORAGE_KEY) {
        applyAppAppearance(normalizeAppAppearance(event.newValue));
      }
    };

    const handleAppearanceChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      applyAppAppearance(normalizeAppAppearance(customEvent.detail));
    };

    refresh();
    media.addEventListener("change", refresh);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      APP_APPEARANCE_CHANGE_EVENT,
      handleAppearanceChange
    );

    return () => {
      media.removeEventListener("change", refresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        APP_APPEARANCE_CHANGE_EVENT,
        handleAppearanceChange
      );
    };
  }, []);

  return null;
}
