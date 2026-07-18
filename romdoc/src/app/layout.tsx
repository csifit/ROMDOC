import type {
  Metadata,
} from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";
import {
  getLocale,
} from "next-intl/server";

import "./globals.css";
import "./romdoc-visual-system.css";

import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable:
    "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable:
    "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://www.romdoc.fit";

export const metadata: Metadata = {
  metadataBase:
    new URL(siteUrl),
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

export default async function
RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale =
    await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
