import type {
  Metadata,
} from "next";
import {
  NextIntlClientProvider,
} from "next-intl";

import DoctorDevicePairing from "@/components/doctor-mobile/doctor-device-pairing";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";

import roMessages from "../../../../messages/ro.json";
import enMessages from "../../../../messages/en.json";
import deMessages from "../../../../messages/de.json";

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

export const metadata:
  Metadata = {
    title:
      "Conectare dispozitiv RomDoc",
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
    referrer: "no-referrer",
  };

export default async function DoctorDevicePairingPage() {
  const locale =
    await getStoredAppLocale();

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={
        messagesByLocale[locale]
      }
    >
      <DoctorDevicePairing />
    </NextIntlClientProvider>
  );
}
