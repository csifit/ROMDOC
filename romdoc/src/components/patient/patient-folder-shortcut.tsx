import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type PatientFolderShortcutProps = {
  locale:
    AppLocale;
};

export default async function PatientFolderShortcut({
  locale,
}: PatientFolderShortcutProps) {
  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientDashboard.folderShortcut",
    });

  return (
    <section className="mt-6 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {t("eyebrow")}
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-900">
            {t("title")}
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            {t("description")}
          </p>
        </div>

        <Link
          href="/patient-dashboard/folder"
          className="romdoc-button romdoc-button-primary shrink-0"
        >
          {t("open")}
        </Link>
      </div>
    </section>
  );
}
