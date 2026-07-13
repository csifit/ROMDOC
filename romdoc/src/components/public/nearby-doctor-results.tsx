"use client";

import Link from "@/components/public/localized-public-link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PublicDoctorPhoto from "@/components/public/public-doctor-photo";
import VerifiedDoctorBadge from "@/components/public/verified-doctor-badge";

type PublicNearbyDoctor = {
  id: string;
  slug: string;
  name: string;
  title: string;
  photoUrl: string | null;
  specialty: {
    slug: string;
    name: string;
  };
  clinic: {
    id: string;
    slug: string | null;
    name: string;
    cityName: string;
    citySlug: string | null;
    countryCode: string | null;
    formattedAddress: string | null;
    googleMapsUri: string | null;
    distanceKilometres: number;
  };
  averageRating: number;
  reviewCount: number;
  yearsExperience: number | null;
  consultationPrice: number | null;
  isVerified: boolean;
  hasOnlineAvailability: boolean;
};

type NearbyDoctorMeta = {
  latitude: number;
  longitude: number;
  radiusKilometres: number;
  specialty: string;
  verifiedOnly: boolean;
  onlineOnly: boolean;
  clinicCount: number;
  doctorCount: number;
};

type NearbyDoctorApiResponse = {
  doctors?: PublicNearbyDoctor[];
  meta?: NearbyDoctorMeta;
  error?: string;
};

type NearbyDoctorResultsProps = {
  specialty: string;
  latitude: number;
  longitude: number;
  radius: 10 | 50;
  locationLabel: string;
  countryCode: string | null;
  verifiedOnly: boolean;
  onlineOnly: boolean;
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

export default function NearbyDoctorResults({
  specialty,
  latitude,
  longitude,
  radius,
  locationLabel,
  countryCode,
  verifiedOnly,
  onlineOnly,
}: NearbyDoctorResultsProps) {
  const [doctors, setDoctors] = useState<
    PublicNearbyDoctor[]
  >([]);

  const [meta, setMeta] =
    useState<NearbyDoctorMeta | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      specialty,
      lat: latitude.toString(),
      lng: longitude.toString(),
      radius: radius.toString(),
    });

    if (verifiedOnly) {
      params.set("verified", "true");
    }

    if (onlineOnly) {
      params.set("online", "true");
    }

    return `/api/public/doctors/nearby?${params.toString()}`;
  }, [
    specialty,
    latitude,
    longitude,
    radius,
    verifiedOnly,
    onlineOnly,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDoctors() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          requestUrl,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        const result =
          (await response.json()) as NearbyDoctorApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Medicii nu au putut fi Ã®ncÄƒrcaÈ›i."
          );
        }

        setDoctors(result.doctors ?? []);
        setMeta(result.meta ?? null);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Nearby doctor results failed:",
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Medicii nu au putut fi Ã®ncÄƒrcaÈ›i."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadDoctors();

    return () => {
      controller.abort();
    };
  }, [requestUrl]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          CÄƒutare geograficÄƒ
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Medici Ã®n apropiere
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
          Rezultate pentru specialitatea{" "}
          <span className="font-semibold text-gray-900">
            {specialty}
          </span>{" "}
          la maximum{" "}
          <span className="font-semibold text-gray-900">
            {radius} km
          </span>{" "}
          de{" "}
          <span className="font-semibold text-gray-900">
            {locationLabel}
          </span>
          {countryCode ? ` (${countryCode})` : ""}.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">
            RazÄƒ {radius} km
          </span>

          {verifiedOnly && (
            <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">
              Doar medici verificaÈ›i
            </span>
          )}

          {onlineOnly && (
            <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">
              ProgramÄƒri online
            </span>
          )}
        </div>

        <div className="mt-6">
          <Link
            href="/#doctor-filters"
            className="romdoc-button romdoc-button-secondary"
          >
            ModificÄƒ filtrele
          </Link>
        </div>
      </section>

      {isLoading && (
        <section className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <span
            aria-hidden="true"
            className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-[#036661] border-r-transparent"
          />

          <p className="mt-4 text-sm font-medium text-gray-700">
            Se cautÄƒ medicii din apropiere...
          </p>
        </section>
      )}

      {!isLoading && error && (
        <section className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            CÄƒutarea nu a putut fi finalizatÄƒ
          </h2>

          <p className="mt-3 text-sm leading-6 text-red-700">
            {error}
          </p>

          <Link
            href="/#doctor-filters"
            className="romdoc-button romdoc-button-primary mt-6"
          >
            ÃŽncearcÄƒ din nou
          </Link>
        </section>
      )}

      {!isLoading &&
        !error &&
        doctors.length === 0 && (
          <section className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Nu am gÄƒsit medici Ã®n aceastÄƒ zonÄƒ
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              ÃŽncearcÄƒ o razÄƒ de 50 km, eliminÄƒ filtrele
              opÈ›ionale sau alege o altÄƒ locaÈ›ie.
            </p>

            <Link
              href="/#doctor-filters"
              className="romdoc-button romdoc-button-primary mt-6"
            >
              SchimbÄƒ cÄƒutarea
            </Link>
          </section>
        )}

      {!isLoading &&
        !error &&
        doctors.length > 0 && (
          <section
            aria-labelledby="nearby-doctors-title"
            className="space-y-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="nearby-doctors-title"
                  className="text-2xl font-bold tracking-tight text-gray-900"
                >
                  {doctors.length === 1
                    ? "1 medic gÄƒsit"
                    : `${doctors.length} medici gÄƒsiÈ›i`}
                </h2>

                {meta && (
                  <p className="mt-2 text-sm text-gray-600">
                    {meta.clinicCount === 1
                      ? "1 clinicÄƒ aprobatÄƒ Ã®n raza selectatÄƒ"
                      : `${meta.clinicCount} clinici aprobate Ã®n raza selectatÄƒ`}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-5">
              {doctors.map((doctor) => {
                const profileHref =
                  `/doctor/${doctor.slug}`;

                return (
                  <article
                    key={doctor.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <PublicDoctorPhoto
                          photoUrl={doctor.photoUrl}
                          doctorName={doctor.name}
                          size="medium"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                              <Link
                                href={profileHref}
                                className="romdoc-focus-ring rounded-sm transition hover:text-[#036661]"
                              >
                                {doctor.name}
                              </Link>
                            </h3>

                            {doctor.isVerified && (
                              <VerifiedDoctorBadge compact />
                            )}
                          </div>

                          <p className="mt-2 text-sm font-semibold text-[#036661]">
                            {doctor.specialty.name}
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            {doctor.title}
                          </p>

                          <div className="mt-5 grid gap-4 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                Clinica
                              </p>
                              <p className="mt-1">
                                {doctor.clinic.name}
                              </p>
                            </div>

                            <div>
                              <p className="font-medium text-gray-900">
                                LocaÈ›ie
                              </p>
                              <p className="mt-1">
                                {doctor.clinic.cityName}
                                {doctor.clinic.countryCode
                                  ? `, ${doctor.clinic.countryCode}`
                                  : ""}
                              </p>
                            </div>

                            <div>
                              <p className="font-medium text-gray-900">
                                DistanÈ›Äƒ
                              </p>
                              <p className="mt-1">
                                {doctor.clinic.distanceKilometres.toFixed(
                                  1
                                )}{" "}
                                km
                              </p>
                            </div>

                            <div>
                              <p className="font-medium text-gray-900">
                                Evaluare
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1.5">
                                <RatingIcon />
                                <span className="font-semibold text-gray-900">
                                  {doctor.averageRating.toFixed(
                                    1
                                  )}
                                </span>
                                <span>
                                  ({doctor.reviewCount})
                                </span>
                              </p>
                            </div>
                          </div>

                          {doctor.clinic.formattedAddress && (
                            <p className="mt-4 text-sm leading-6 text-gray-600">
                              {doctor.clinic.formattedAddress}
                            </p>
                          )}

                          <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-600">
                            {doctor.yearsExperience !==
                              null && (
                              <span>
                                {doctor.yearsExperience} ani
                                experienÈ›Äƒ
                              </span>
                            )}

                            {doctor.consultationPrice !==
                              null && (
                              <span>
                                De la{" "}
                                {formatPrice(
                                  doctor.consultationPrice
                                )}{" "}
                                RON
                              </span>
                            )}

                            {doctor.hasOnlineAvailability && (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                ProgramÄƒri online disponibile
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:w-56 lg:grid-cols-1">
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

                        {doctor.clinic.googleMapsUri && (
                          <a
                            href={
                              doctor.clinic.googleMapsUri
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="romdoc-button romdoc-button-muted romdoc-button-full"
                          >
                            Vezi pe hartÄƒ
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
    </div>
  );
}

