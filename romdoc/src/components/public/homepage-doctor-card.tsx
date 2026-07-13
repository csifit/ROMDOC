import Link from "@/components/public/localized-public-link";

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

type HomepageDoctorCardProps = {
  doctor: HomepageDoctorCardData;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
  }).format(value);
}

function RatingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 fill-amber-400 text-amber-400"
    >
      <path d="m12 2.7 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.7Z" />
    </svg>
  );
}

export default function HomepageDoctorCard({
  doctor,
}: HomepageDoctorCardProps) {
  const profileHref = `/doctor/${doctor.slug}`;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start gap-4">
        <PublicDoctorPhoto
          photoUrl={doctor.photoUrl}
          doctorName={doctor.name}
          size="small"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#036661]">
                {doctor.specialtyName}
              </p>

              <h3 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
                <Link
                  href={profileHref}
                  className="romdoc-focus-ring rounded-sm transition hover:text-[#036661]"
                >
                  {doctor.name}
                </Link>
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                {doctor.title}
              </p>
            </div>

            {doctor.isVerified && (
              <VerifiedDoctorBadge compact />
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-800">
            Clinica:
          </span>{" "}
          {doctor.clinicName}
        </p>

        <p>
          <span className="font-medium text-gray-800">
            OraÈ™:
          </span>{" "}
          {doctor.cityName}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <RatingIcon />
          <span className="font-semibold text-gray-900">
            {doctor.averageRating.toFixed(1)}
          </span>
          <span>({doctor.reviewCount})</span>
        </span>

        {doctor.yearsExperience !== null && (
          <span>
            {doctor.yearsExperience} ani experienÈ›Äƒ
          </span>
        )}

        {doctor.consultationPrice !== null && (
          <span>
            De la {formatPrice(doctor.consultationPrice)} RON
          </span>
        )}
      </div>

      <div className="mt-5">
        {doctor.hasOnlineAvailability ? (
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            ProgramÄƒri online disponibile
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
            VerificÄƒ disponibilitatea pe profil
          </span>
        )}
      </div>

      <div className="mt-auto grid gap-3 pt-6 sm:grid-cols-2">
        <Link
          href={profileHref}
          className="romdoc-button romdoc-button-secondary romdoc-button-full"
        >
          Vezi profilul
        </Link>

        <Link
          href={`${profileHref}#programare`}
          className="romdoc-button romdoc-button-primary romdoc-button-full"
        >
          ProgrameazÄƒ-te
        </Link>
      </div>
    </article>
  );
}

