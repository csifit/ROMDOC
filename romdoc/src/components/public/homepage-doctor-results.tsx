"use client";

import Link from "next/link";
import {useTranslations} from "next-intl";

import HomepageDoctorCard, {type HomepageDoctorCardData} from "@/components/public/homepage-doctor-card";

type HomepageDoctorResultsProps = {doctors: HomepageDoctorCardData[]};

export default function HomepageDoctorResults({doctors}: HomepageDoctorResultsProps) {
  const t = useTranslations("HomepageResults");

  if (doctors.length === 0) {
    return (
      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t("emptyTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">{t("emptyDescription")}</p>
          <Link href="/medici" className="romdoc-button romdoc-button-primary mt-6">{t("openDirectory")}</Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="homepage-doctors-title" className="px-4 pb-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">{t("eyebrow")}</p>
            <h2 id="homepage-doctors-title" className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{t("title")}</h2>
            <p className="mt-3 max-w-2xl text-gray-600">{t("description")}</p>
          </div>
          <Link href="/medici" className="romdoc-button romdoc-button-secondary">{t("viewAll")}</Link>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doctor) => <HomepageDoctorCard key={doctor.id} doctor={doctor} />)}
        </div>
      </div>
    </section>
  );
}
