import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";

import "./globals.css";
import "./romdoc-visual-system.css";
import "./romdoc-theme-foundation.css";

import { Analytics } from "@vercel/analytics/next";

import DashboardPreferencesFooter from "@/components/theme/dashboard-preferences-footer";
import PublicFooterPreferencesPortal from "@/components/theme/public-footer-preferences-portal";
import ThemeRuntime from "@/components/theme/theme-runtime";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.romdoc.fit";

const themeInitializationScript = `
(function () {
  try {
    var stored = localStorage.getItem("romdoc-appearance");
    var appearance = stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
    var dark = appearance === "dark" ||
      (appearance === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var path = window.location.pathname;
    var dashboardPrefixes = [
      "/dashboard",
      "/admin",
      "/manager-dashboard",
      "/clinic-manager-dashboard",
      "/doctor-dashboard",
      "/staff-dashboard",
      "/patient-dashboard",
      "/appointments",
      "/medical-folder"
    ];
    var isDashboard = dashboardPrefixes.some(function (prefix) {
      return path === prefix || path.indexOf(prefix + "/") === 0;
    });
    var root = document.documentElement;
    root.dataset.appearance = appearance;
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.romdocSurface = isDashboard ? "dashboard" : "public";
  } catch (error) {
    document.documentElement.dataset.appearance = "system";
    document.documentElement.dataset.theme = "light";
  }
})();`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "RomDoc",
  title: {
    default: "RomDoc",
    template: "%s | RomDoc",
  },
  description:
    "Găsește medici, clinici și programări medicale online în România.",
  openGraph: {
    siteName: "RomDoc",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = normalizeAppLocale(await getLocale());

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body className="min-h-full">
        <ThemeRuntime />
        {children}
        <PublicFooterPreferencesPortal locale={locale} />
        <DashboardPreferencesFooter locale={locale} />
        <Analytics />
      </body>
    </html>
  );
}
