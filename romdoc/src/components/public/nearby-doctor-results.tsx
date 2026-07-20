"use client";

import Link from "next/link";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import SaveDoctorButton from "@/components/patient/save-doctor-button";
import PublicDoctorPhoto from "@/components/public/public-doctor-photo";
import VerifiedDoctorBadge from "@/components/public/verified-doctor-badge";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

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
    formattedAddress:
      | string
      | null;
    googleMapsUri:
      | string
      | null;
    distanceKilometres:
      number;
  };

  averageRating: number;
  reviewCount: number;

  yearsExperience:
    | number
    | null;

  consultationPrice:
    | number
    | null;

  isVerified: boolean;

  hasOnlineAvailability:
    boolean;
};

type NearbyDoctorMeta = {
  latitude: number;
  longitude: number;
  radiusKilometres: number;
  specialty: string;
  specialtyName: string;
  verifiedOnly: boolean;
  onlineOnly: boolean;
  clinicCount: number;
  doctorCount: number;
};

type NearbyDoctorApiResponse = {
  doctors?:
    PublicNearbyDoctor[];

  meta?:
    NearbyDoctorMeta;

  error?: string;
};

type NearbyDoctorResultsProps = {
  specialty: string;
  latitude: number;
  longitude: number;
  radius:
    | 10
    | 50;
  locationLabel: string;

  countryCode:
    | string
    | null;

  verifiedOnly: boolean;
  onlineOnly: boolean;
};

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

function getDoctorProfileHref(
  locale:
    | "ro"
    | "en"
    | "de",
  slug: string
) {
  const encodedSlug =
    encodeURIComponent(
      slug
    );

  if (locale === "de") {
    return `/de/arzt/${encodedSlug}`;
  }

  return `/${locale}/doctor/${encodedSlug}`;
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
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "NearbyDoctors"
    );

  const [
    doctors,
    setDoctors,
  ] =
    useState<
      PublicNearbyDoctor[]
    >([]);

  const [
    meta,
    setMeta,
  ] =
    useState<
      NearbyDoctorMeta | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const homeFiltersHref =
    `/${locale}#doctor-filters`;

  const requestUrl =
    useMemo(() => {
      const params =
        new URLSearchParams({
          specialty,

          lat:
            latitude
              .toString(),

          lng:
            longitude
              .toString(),

          radius:
            radius.toString(),

          locale,
        });

      if (
        verifiedOnly
      ) {
        params.set(
          "verified",
          "true"
        );
      }

      if (
        onlineOnly
      ) {
        params.set(
          "online",
          "true"
        );
      }

      return `/api/public/doctors/nearby?${params.toString()}`;
    }, [
      specialty,
      latitude,
      longitude,
      radius,
      locale,
      verifiedOnly,
      onlineOnly,
    ]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadDoctors() {
      try {
        setIsLoading(
          true
        );

        setError(null);

        const response =
          await fetch(
            requestUrl,
            {
              method:
                "GET",

              headers: {
                Accept:
                  "application/json",
              },

              signal:
                controller.signal,
            }
          );

        const result =
          (await response.json()) as
            NearbyDoctorApiResponse;

        if (
          !response.ok
        ) {
          console.error(
            "Nearby doctor API returned an error:",
            result.error
          );

          throw new Error(
            t("loadFailed")
          );
        }

        setDoctors(
          result.doctors ??
            []
        );

        setMeta(
          result.meta ??
            null
        );
      } catch (
        loadError
      ) {
        if (
          loadError instanceof
            DOMException &&
          loadError.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Nearby doctor results failed:",
          loadError
        );

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : t(
                "loadFailed"
              )
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setIsLoading(
            false
          );
        }
      }
    }

    void loadDoctors();

    return () => {
      controller.abort();
    };
  }, [
    requestUrl,
    t,
  ]);

  function formatPrice(
    value: number
  ) {
    return new Intl.NumberFormat(
      locale,
      {
        maximumFractionDigits:
          2,
      }
    ).format(value);
  }

  const specialtyLabel =
    meta?.specialtyName ??
    specialty;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          {t("eyebrow")}
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t("title")}
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
          {t(
            "summary",
            {
              specialty:
                specialtyLabel,

              radius,

              location:
                locationLabel,

              country:
                countryCode
                  ? ` (${countryCode})`
                  : "",
            }
          )}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">
            {t(
              "radius",
              {
                radius,
              }
            )}
          </span>

          {verifiedOnly && (
            <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">
              {t(
                "verifiedOnly"
              )}
            </span>
          )}

          {onlineOnly && (
            <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">
              {t(
                "onlineOnly"
              )}
            </span>
          )}
        </div>

        <div className="mt-6">
          <Link
            href={
              homeFiltersHref
            }
            className="romdoc-button romdoc-button-secondary"
          >
            {t(
              "editFilters"
            )}
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
            {t(
              "loading"
            )}
          </p>
        </section>
      )}

      {!isLoading &&
        error && (
          <section className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              {t(
                "searchFailed"
              )}
            </h2>

            <p className="mt-3 text-sm leading-6 text-red-700">
              {error}
            </p>

            <Link
              href={
                homeFiltersHref
              }
              className="romdoc-button romdoc-button-primary mt-6"
            >
              {t(
                "tryAgain"
              )}
            </Link>
          </section>
        )}

      {!isLoading &&
        !error &&
        doctors.length ===
          0 && (
          <section className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              {t(
                "emptyTitle"
              )}
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              {t(
                "emptyDescription"
              )}
            </p>

            <Link
              href={
                homeFiltersHref
              }
              className="romdoc-button romdoc-button-primary mt-6"
            >
              {t(
                "changeSearch"
              )}
            </Link>
          </section>
        )}

      {!isLoading &&
        !error &&
        doctors.length >
          0 && (
          <section
            aria-labelledby="nearby-doctors-title"
            className="space-y-5"
          >
            <div>
              <h2
                id="nearby-doctors-title"
                className="text-2xl font-bold tracking-tight text-gray-900"
              >
                {t(
                  "doctorCount",
                  {
                    count:
                      doctors.length,
                  }
                )}
              </h2>

              {meta && (
                <p className="mt-2 text-sm text-gray-600">
                  {t(
                    "clinicCount",
                    {
                      count:
                        meta.clinicCount,
                    }
                  )}
                </p>
              )}
            </div>

            <div className="grid gap-5">
              {doctors.map(
                (
                  doctor
                ) => {
                  const profileHref =
                    getDoctorProfileHref(
                      locale,
                      doctor.slug
                    );

                  return (
                    <article
                      key={
                        doctor.id
                      }
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
                    >
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <PublicDoctorPhoto
                            photoUrl={
                              doctor.photoUrl
                            }
                            doctorName={
                              doctor.name
                            }
                            size="medium"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                                    <Link
                                      href={
                                        profileHref
                                      }
                                      className="romdoc-focus-ring rounded-sm transition hover:text-[#036661]"
                                    >
                                      {
                                        doctor.name
                                      }
                                    </Link>
                                  </h3>

                                  {doctor.isVerified && (
                                    <VerifiedDoctorBadge
                                      compact
                                    />
                                  )}
                                </div>

                                <p className="mt-2 text-sm font-semibold text-[#036661]">
                                  {
                                    doctor
                                      .specialty
                                      .name
                                  }
                                </p>

                                <p className="mt-1 text-sm text-gray-600">
                                  {
                                    doctor.title
                                  }
                                </p>
                              </div>

                              <SaveDoctorButton
                                doctorId={
                                  doctor.id
                                }
                                doctorName={
                                  doctor.name
                                }
                                compact
                                className="shrink-0"
                              />
                            </div>

                            <div className="mt-5 grid gap-4 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {t(
                                    "clinic"
                                  )}
                                </p>

                                <p className="mt-1">
                                  {
                                    doctor
                                      .clinic
                                      .name
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="font-medium text-gray-900">
                                  {t(
                                    "location"
                                  )}
                                </p>

                                <p className="mt-1">
                                  {
                                    doctor
                                      .clinic
                                      .cityName
                                  }

                                  {doctor
                                    .clinic
                                    .countryCode
                                    ? `, ${doctor.clinic.countryCode}`
                                    : ""}
                                </p>
                              </div>

                              <div>
                                <p className="font-medium text-gray-900">
                                  {t(
                                    "distance"
                                  )}
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
                                  {t(
                                    "rating"
                                  )}
                                </p>

                                <p className="mt-1 inline-flex items-center gap-1.5">
                                  <RatingIcon />

                                  <span className="font-semibold text-gray-900">
                                    {doctor.averageRating.toFixed(
                                      1
                                    )}
                                  </span>

                                  <span>
                                    (
                                    {
                                      doctor.reviewCount
                                    }
                                    )
                                  </span>
                                </p>
                              </div>
                            </div>

                            {doctor
                              .clinic
                              .formattedAddress && (
                              <p className="mt-4 text-sm leading-6 text-gray-600">
                                {
                                  doctor
                                    .clinic
                                    .formattedAddress
                                }
                              </p>
                            )}

                            <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-600">
                              {doctor.yearsExperience !==
                                null && (
                                <span>
                                  {t(
                                    "yearsExperience",
                                    {
                                      years:
                                        doctor.yearsExperience,
                                    }
                                  )}
                                </span>
                              )}

                              {doctor.consultationPrice !==
                                null && (
                                <span>
                                  {t(
                                    "priceFrom",
                                    {
                                      price:
                                        formatPrice(
                                          doctor.consultationPrice
                                        ),
                                    }
                                  )}
                                </span>
                              )}

                              {doctor.hasOnlineAvailability && (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  {t(
                                    "onlineAvailable"
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:w-56 lg:grid-cols-1">
                          <Link
                            href={
                              profileHref
                            }
                            className="romdoc-button romdoc-button-secondary romdoc-button-full"
                          >
                            {t(
                              "viewProfile"
                            )}
                          </Link>

                          <Link
                            href={`${profileHref}#programare`}
                            className="romdoc-button romdoc-button-primary romdoc-button-full"
                          >
                            {t(
                              "bookAppointment"
                            )}
                          </Link>

                          {doctor
                            .clinic
                            .googleMapsUri && (
                            <a
                              href={
                                doctor
                                  .clinic
                                  .googleMapsUri
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="romdoc-button romdoc-button-muted romdoc-button-full"
                            >
                              {t(
                                "viewOnMap"
                              )}
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        )}
    </div>
  );
}
