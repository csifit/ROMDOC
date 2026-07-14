"use client";

import Link from "next/link";
import {useTranslations} from "next-intl";

export default function HomepageDoctorCta() {
  const t = useTranslations("HomepageDoctorCta");
  const items = ["profileItem", "servicesItem", "clinicsItem", "scheduleItem"] as const;

  return (
    <section className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">{t("eyebrow")}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{t("title")}</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">{t("description")}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/register?role=doctor" className="romdoc-button romdoc-button-primary romdoc-button-lg">{t("createDoctorAccount")}</Link>
              <Link href="/pentru-medici/cum-functioneaza" className="romdoc-button romdoc-button-secondary romdoc-button-lg">{t("howItWorks")}</Link>
            </div>
          </div>

          <div className="bg-[#F0EEE9] p-6 sm:p-8 lg:p-10">
            <h3 className="text-lg font-semibold text-gray-900">{t("manageTitle")}</h3>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-gray-700">
              {items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#036661]" />
                  {t(item)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
