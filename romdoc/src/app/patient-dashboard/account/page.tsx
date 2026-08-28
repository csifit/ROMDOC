import type {
  Metadata,
} from "next";
import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";

import PatientAccountSettings from "@/components/patient/patient-account-settings";
import {
  getAccountSecurityCopy,
} from "@/lib/i18n/account-security";
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

export default async function PatientAccountPage() {
  const locale =
    await getStoredAppLocale();

  const securityCopy =
    getAccountSecurityCopy(
      locale
    );

  return (
    <div className="px-[13px] py-[21px] sm:px-[21px] sm:py-[34px] lg:px-[34px]">
      <div className="mx-auto max-w-5xl space-y-[21px]">
        <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
            {securityCopy.pageEyebrow}
          </p>

          <div className="mt-[8px] flex flex-col justify-between gap-[13px] sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {securityCopy.pageTitle}
              </h2>

              <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
                {securityCopy.pageDescription}
              </p>
            </div>

            <Link
              href="/patient-dashboard/security"
              className="romdoc-button romdoc-button-secondary romdoc-button-sm"
            >
              {securityCopy.navigationLabel}
            </Link>
          </div>
        </section>

        <PatientAccountSettings />
      </div>
    </div>
  );
}
