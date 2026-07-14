"use client";

import Link from "next/link";
import {useLocale, useTranslations} from "next-intl";

import PublicDoctorPhoto from "@/components/public/public-doctor-photo";
import VerifiedDoctorBadge from "@/components/public/verified-doctor-badge";

export type HomepageDoctorCardData = {
  id: string;
  slug: string;
  name: string;
  title: string;
  photoUrl: string | null;
  specialtyName: string;
  cityName: string;
  clinicName: string;
  averageRating: number;
  reviewCount: number;
  consultationPrice: number | null;
  yearsExperience: number | null;
  isVerified: boolean;
  hasOnlineAvailability: boolean;
};

type HomepageDoctorCardProps = {doctor: HomepageDoctorCardData};

export default function HomepageDoctorCard({doctor}: HomepageDoctorCardProps) {
  const locale = useLocale();
  const t = useTranslations("HomepageDoctorCard");
  const profileHref = `/doctor/${doctor.slug}`;
  const formatPrice = (value: number) =>
    new Intl.NumberFormat(locale, {maximumFractionDigits: 2}).format(value);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start gap-4">
        <PublicDoctorPhoto photoUrl={doctor.photoUrl} doctorName={doctor.name} size="small" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#036661]">{doctor.specialtyName}</p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
                <Link href={profileHref} className="romdoc-focus-ring rounded-sm transition hover:text-[#036661]">{doctor.name}</Link>
              </h3>
              <p className="mt-1 text-sm text-gray-600">{doctor.title}</p>
            </div>
            {doctor.isVerified && <VerifiedDoctorBadge compact />}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-gray-600">
        <p><span className="font-medium text-gray-800">{t("clinic")}:</span>{" "}{doctor.clinicName}</p>
        <p><span className="font-medium text-gray-800">{t("city")}:</span>{" "}{doctor.cityName}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
        <span><span className="font-semibold text-gray-900">{doctor.averageRating.toFixed(1)}</span>{" "}({doctor.reviewCount})</span>
        {doctor.yearsExperience !== null && <span>{t("yearsExperience", {years: doctor.yearsExperience})}</span>}
        {doctor.consultationPrice !== null && <span>{t("priceFrom", {price: formatPrice(doctor.consultationPrice)})}</span>}
      </div>

      <div className="mt-5">
        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
          doctor.hasOnlineAvailability
            ? "bg-emerald-50 text-emerald-700"
            : "bg-gray-100 text-gray-600"
        }`}>
          {doctor.hasOnlineAvailability ? t("onlineAvailable") : t("checkAvailability")}
        </span>
      </div>

      <div className="mt-auto grid gap-3 pt-6 sm:grid-cols-2">
        <Link href={profileHref} className="romdoc-button romdoc-button-secondary romdoc-button-full">{t("viewProfile")}</Link>
        <Link href={`${profileHref}#programare`} className="romdoc-button romdoc-button-primary romdoc-button-full">{t("bookAppointment")}</Link>
      </div>
    </article>
  );
}
