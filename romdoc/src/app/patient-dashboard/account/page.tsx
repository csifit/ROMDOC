import type {
  Metadata,
} from "next";
import {
  getTranslations,
} from "next-intl/server";

import PatientAccountSettings from "@/components/patient/patient-account-settings";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientPages.account",
    });

  return {
    title:
      t(
        "metadataTitle"
      ),
    description:
      t(
        "metadataDescription"
      ),
  };
}

export default function PatientAccountPage() {
  return (
    <div className="px-[13px] py-[21px] sm:px-[21px] sm:py-[34px] lg:px-[34px]">
      <div className="mx-auto max-w-5xl">
        <PatientAccountSettings />
      </div>
    </div>
  );
}
