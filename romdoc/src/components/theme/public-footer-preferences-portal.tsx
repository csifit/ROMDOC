"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import FooterPreferencesPanel from "@/components/theme/footer-preferences-panel";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { isDashboardPath } from "@/lib/theme/app-theme";

export default function PublicFooterPreferencesPortal({
  locale,
}: {
  locale: AppLocale;
}) {
  const pathname = usePathname();
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const shouldUsePublicFooter =
    !isDashboardPath(pathname) || pathname.startsWith("/patient-dashboard");

  useEffect(() => {
    if (!shouldUsePublicFooter) {
      setHost(null);
      return;
    }

    let mountedHost: HTMLDivElement | null = null;
    let observer: MutationObserver | null = null;

    const attach = () => {
      const footer = document.querySelector("footer");
      if (!footer) return false;

      mountedHost = document.createElement("div");
      mountedHost.dataset.romdocPreferencesHost = "public-footer";
      mountedHost.className = "pointer-events-none absolute inset-0 z-20";
      footer.appendChild(mountedHost);
      setHost(mountedHost);
      return true;
    };

    if (!attach()) {
      observer = new MutationObserver(() => {
        if (attach()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      mountedHost?.remove();
      setHost(null);
    };
  }, [pathname, shouldUsePublicFooter]);

  if (!host) return null;

  return createPortal(
    <FooterPreferencesPanel
      locale={locale}
      panelId="romdoc-public-footer-preferences"
    />,
    host
  );
}
