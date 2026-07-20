import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type PatientReminderPreferencesShortcutProps = {
  locale:
    AppLocale;
};

export default async function PatientReminderPreferencesShortcut({
  locale,
}: PatientReminderPreferencesShortcutProps) {
  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientDashboard.reminderShortcut",
    });

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {t("eyebrow")}
          </p>

          <h2 className="mt-2 text-xl font-bold text-gray-900">
            {t("title")}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            {t("description")}
          </p>
        </div>

        <Link
          href="/patient-dashboard/reminders"
          className="romdoc-button romdoc-button-secondary shrink-0"
        >
          {t("open")}
        </Link>
      </div>
    </section>
  );
}
