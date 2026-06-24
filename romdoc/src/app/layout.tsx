import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import {getLocale} from "next-intl/server";
import "./globals.css";

const geistSans = Geist({variable: "--font-geist-sans", subsets: ["latin"]});
const geistMono = Geist_Mono({variable: "--font-geist-mono", subsets: ["latin"]});

export const metadata: Metadata = {
  title: {default: "RomDoc", template: "%s | RomDoc"},
  description: "Găsește medici, clinici și programări medicale online în România."
};

export default async function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
