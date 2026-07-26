"use client";

import { usePathname } from "next/navigation";

import FooterPreferencesPanel from "@/components/theme/footer-preferences-panel";
import { footerPreferencesCopy } from "@/components/theme/footer-preferences-copy";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { isDashboardPath } from "@/lib/theme/app-theme";

export default function DashboardPreferencesFooter({
  locale,
}: {
  locale: AppLocale;
}) {
  const pathname = usePathname();

  if (!isDashboardPath(pathname) || pathname.startsWith("/patient-dashboard")) {
    return null;
  }

  const copy = footerPreferencesCopy[locale];

  return (
    <footer className="relative min-h-[280px] overflow-hidden border-t border-[var(--rd-border)] bg-[var(--rd-surface)]">
      <FooterPreferencesPanel
        locale={locale}
        panelId="romdoc-dashboard-footer-preferences"
      />

      <div className="mx-auto flex min-h-[280px] max-w-7xl flex-col justify-end px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 border-t border-[var(--rd-border)] pt-5 text-sm text-[var(--rd-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 RomDoc</p>
          <p>{copy.footerText}</p>
        </div>
      </div>
    </footer>
  );
}
