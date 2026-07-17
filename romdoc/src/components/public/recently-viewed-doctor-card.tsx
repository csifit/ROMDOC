"use client";

import Link from "next/link";

import type {
  RecentlyViewedDoctor,
} from "@/lib/doctors/recently-viewed-doctors";

type Props = {
  doctor: RecentlyViewedDoctor;
  profileLabel: string;
};

export default function RecentlyViewedDoctorCard({
  doctor,
  profileLabel,
}: Props) {
  return (
    <article className="flex min-w-[250px] max-w-[280px] flex-1 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {doctor.photoUrl ? (
          <img
            src={doctor.photoUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 bg-[#F0EEE9] object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-[#F0EEE9] text-lg font-bold text-[#036661]"
          >
            {doctor.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-gray-900">
              {doctor.name}
            </h3>

            {doctor.isVerified && (
              <span
                title="Medic verificat"
                aria-label="Medic verificat"
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
              >
                ✓
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-xs font-semibold text-[#036661]">
            {doctor.specialtyName}
          </p>

          {doctor.clinicName && (
            <p className="mt-1 truncate text-xs text-gray-500">
              {doctor.clinicName}
            </p>
          )}
        </div>
      </div>

      <Link
        href={`/doctor/${doctor.slug}`}
        className="romdoc-focus-ring mt-4 inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-800 transition hover:border-[#036661] hover:text-[#036661]"
      >
        {profileLabel}
      </Link>
    </article>
  );
}
