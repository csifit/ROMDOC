import type {
  Metadata,
} from "next";
import {
  NextIntlClientProvider,
} from "next-intl";

import PublicMedicalFolderShare from "@/components/medical-folder/public-medical-folder-share";
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
      "Dosar medical partajat",
    robots: {
      index:
        false,
      follow:
        false,
      noarchive:
        true,
      nosnippet:
        true,
    },
    referrer:
      "no-referrer",
  };

export default async function SharedMedicalFolderPage() {
  const locale =
    await getStoredAppLocale();

  return (
    <NextIntlClientProvider
      locale={
        locale
      }
      messages={
        messagesByLocale[
          locale
        ]
      }
    >
      <PublicMedicalFolderShare />
    </NextIntlClientProvider>
  );
}
