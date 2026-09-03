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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "RomDoc",
  title: {
    default: "RomDoc",
    template: "%s | RomDoc",
  },
  description:
    "Catalogul medicilor, clinicilor și gestionarea programărilor medicale.",
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
