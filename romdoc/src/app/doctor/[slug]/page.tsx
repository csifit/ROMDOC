import {
  getLocale,
} from "next-intl/server";
import {
  notFound,
} from "next/navigation";

import AuthenticatedAppointmentRequest from "@/components/appointments/authenticated-appointment-request";
import PublicDoctorServices from "@/components/doctor/public-doctor-services";
import DoctorProfileSaveControl from "@/components/patient/doctor-profile-save-control";
import DoctorBookingSummary from "@/components/public/doctor-booking-summary";
import DoctorMobileBookingBar from "@/components/public/doctor-mobile-booking-bar";
import RecordRecentlyViewedDoctor from "@/components/public/record-recently-viewed-doctor";
import VerifiedDoctorBadge from "@/components/public/verified-doctor-badge";
import PublicDoctorReviews, {
  type PublicDoctorReview,
} from "@/components/reviews/public-doctor-reviews";
import RatingStars from "@/components/reviews/rating-stars";
import {
  getNextAvailableAppointment,
} from "@/lib/appointments/calculate-available-slots";
import {
  normalizeAppLocale,
  selectTranslation,
  type AppLocale,
} from "@/lib/i18n/app-locale";
import {
  DOCTOR_PROFILE_COPY,
  interpolatePublicCopy,
} from "@/lib/public/doctor-profile-copy";
import {
  createClient,
} from "@/lib/supabase/server";
import { SPOKEN_LANGUAGE_OPTIONS } from "@/lib/telehealth/constants";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

type DoctorTranslation = {
  locale: string;
  title: string | null;
  biography: string | null;
};

type ClinicTranslation = {
  locale: string;
  name: string;
  description: string | null;
};

type CityTranslation = {
  locale: string;
  name: string;
};

type SpecialtyTranslation = {
  locale: string;
  name: string;
};

type SpecialtyRelation = {
  specialty_translations:
    | SpecialtyTranslation[]
    | null;
};

type DoctorSpecialtyRelation = {
  specialties:
    | SpecialtyRelation
    | SpecialtyRelation[]
    | null;
};

type CityRelation = {
  slug: string;
  city_translations:
    | CityTranslation[]
    | null;
};

type ClinicRelation = {
  id: string;
  slug: string;
  status: string | null;
  phone: string | null;
  website: string | null;
  street_address: string | null;
  formatted_address: string | null;
  google_maps_uri: string | null;
  clinic_translations:
    | ClinicTranslation[]
    | null;
  cities:
    | CityRelation
    | CityRelation[]
    | null;
};

type DoctorClinicRelation = {
  clinic_id: string;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type ClinicOption = {
  id: string;
  name: string;
  address: string;
};

type DoctorRecord = {
  id: string;
  slug: string;
  public_name: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  years_experience: number | null;
  consultation_price:
    | number
    | string
    | null;
  average_rating:
    | number
    | string
    | null;
  review_count: number | null;
  verification_status: string | null;
  doctor_translations:
    | DoctorTranslation[]
    | null;
  doctor_specialties:
    | DoctorSpecialtyRelation[]
    | null;
  doctor_clinics:
    | DoctorClinicRelation[]
    | null;
  doctor_spoken_languages:
    | Array<{ language_code: string }>
    | null;
};

type PublicReviewRow = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  verified_appointment: boolean;
};

function formatDoctorName(
  slug: string
) {
  return decodeURIComponent(
    slug
  )
    .split("-")
    .filter(Boolean)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getFirstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    !relation
  ) {
    return null;
  }

  if (
    Array.isArray(
      relation
    )
  ) {
    return (
      relation[0] ??
      null
    );
  }

  return relation;
}

function getClinicTranslation(
  clinic: ClinicRelation,
  locale: AppLocale
) {
  return selectTranslation(
    clinic.clinic_translations,
    locale
  );
}

function getCityName(
  clinic: ClinicRelation,
  locale: AppLocale
) {
  const city =
    getFirstRelation(
      clinic.cities
    );

  return selectTranslation(
    city?.city_translations,
    locale
  )?.name ?? null;
}

function getClinicAddress(
  clinic: ClinicRelation,
  locale: AppLocale
) {
  if (
    clinic.formatted_address?.trim()
  ) {
    return clinic.formatted_address;
  }

  return [
    clinic.street_address,
    getCityName(
      clinic,
      locale
    ),
  ]
    .filter(
      (
        value
      ): value is string =>
        typeof value ===
          "string" &&
        value.trim().length >
          0
    )
    .join(", ");
}

function clinicIsApproved(
  clinic: ClinicRelation
) {
  return (
    clinic.status ===
    "approved"
  );
}

function normalizeNumber(
  value:
    | number
    | string
    | null
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const parsedValue =
    typeof value ===
      "number"
      ? value
      : Number(
          value
        );

  return Number.isFinite(
    parsedValue
  )
    ? parsedValue
    : null;
}

function formatPrice(
  value: number
) {
  return new Intl.NumberFormat(
    "ro-RO",
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    value
  );
}

const profileFallbacks:
  Record<
    AppLocale,
    {
      doctorTitle: string;
      medicalSpecialty: string;
      medicalClinic: string;
    }
  > = {
    ro: {
      doctorTitle: "Medic",
      medicalSpecialty:
        "Specialitate medicală",
      medicalClinic:
        "Clinică medicală",
    },
    en: {
      doctorTitle: "Doctor",
      medicalSpecialty:
        "Medical specialty",
      medicalClinic:
        "Medical clinic",
    },
    de: {
      doctorTitle: "Arzt",
      medicalSpecialty:
        "Medizinische Fachrichtung",
      medicalClinic:
        "Medizinische Klinik",
    },
  };

function getSpecialtyName(
  doctor: DoctorRecord,
  locale: AppLocale
) {
  const specialty =
    getFirstRelation(
      doctor.doctor_specialties?.[0]
        ?.specialties
    );

  return (
    selectTranslation(
      specialty
        ?.specialty_translations,
      locale
    )?.name ??
    profileFallbacks[locale]
      .medicalSpecialty
  );
}

export default async function DoctorPage({
  params,
}: Props) {
  const {
    slug,
  } =
    await params;

  const locale =
    normalizeAppLocale(
      await getLocale()
    );

  const profileCopy =
    DOCTOR_PROFILE_COPY[locale];

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "doctors"
    )
    .select(`
      id,
      slug,
      public_name,
      photo_url,
      phone,
      email,
      years_experience,
      consultation_price,
      average_rating,
      review_count,
      verification_status,
      doctor_translations (
        locale,
        title,
        biography
      ),
      doctor_spoken_languages (
        language_code
      ),
      doctor_specialties (
        specialties (
          specialty_translations (
            locale,
            name
          )
        )
      ),
      doctor_clinics (
        clinic_id,
        clinics (
          id,
          slug,
          status,
          phone,
          website,
          street_address,
          formatted_address,
          google_maps_uri,
          clinic_translations (
            locale,
            name,
            description
          ),
          cities (
            slug,
            city_translations (
              locale,
              name
            )
          )
        )
      )
    `)
    .eq(
      "slug",
      slug
    )
    .eq(
      "status",
      "active"
    )
    .maybeSingle();

  if (
    error
  ) {
    console.error(
      "Doctor profile query failed:",
      error
    );
  }

  if (
    !data
  ) {
    notFound();
  }

  const doctor =
    data as unknown as
      DoctorRecord;

  const [publicReviewsResult, telehealthOfferResult] = await Promise.all([
    supabase.rpc("get_public_doctor_reviews", { target_doctor_id: doctor.id }),
    supabase.rpc("get_public_telehealth_offer", { target_doctor_id: doctor.id }),
  ]);
  const publicReviewData = publicReviewsResult.data;
  const publicReviewError = publicReviewsResult.error;

  if (
    publicReviewError
  ) {
    console.error(
      "Public Doctor reviews query failed:",
      publicReviewError
    );
  }

  const publishedReviews:
    PublicDoctorReview[] =
      (
        (
          publicReviewData ??
          []
        ) as PublicReviewRow[]
      ).map(
        (
          review
        ) => ({
          id:
            review.id,
          rating:
            review.rating,
          review_text:
            review.review_text,
          created_at:
            review.created_at,
          verified_appointment:
            review
              .verified_appointment,
        })
      );

  const translation =
    selectTranslation(
      doctor.doctor_translations,
      locale
    );

  const approvedClinicRelations =
    (
      doctor.doctor_clinics ??
      []
    ).filter(
      (
        relation
      ) => {
        const clinic =
          getFirstRelation(
            relation.clinics
          );

        return clinic
          ? clinicIsApproved(
              clinic
            )
          : false;
      }
    );

  const clinicOptions:
    ClinicOption[] =
      approvedClinicRelations.flatMap(
        (
          relation
        ) => {
          const clinic =
            getFirstRelation(
              relation.clinics
            );

          if (
            !clinic
          ) {
            return [];
          }

          const clinicTranslation =
            getClinicTranslation(
              clinic,
              locale
            );

          return [
            {
              id:
                clinic.id,
              name:
                clinicTranslation?.name ??
                profileFallbacks[locale]
                  .medicalClinic,
              address:
                getClinicAddress(
                  clinic,
                  locale
                ),
            },
          ];
        }
      );

  const publicReviewCount =
    publishedReviews.length;

  const publicAverageRating =
    publicReviewCount >
    0
      ? publishedReviews.reduce(
          (
            total,
            review
          ) =>
            total +
            review.rating,
          0
        ) /
        publicReviewCount
      : 0;

  const storedAverageRating =
    normalizeNumber(
      doctor.average_rating
    ) ??
    0;

  const displayedAverageRating =
    publicReviewCount >
    0
      ? Math.round(
          publicAverageRating *
            10
        ) /
        10
      : storedAverageRating;

  const displayedReviewCount =
    publicReviewCount >
    0
      ? publicReviewCount
      : doctor.review_count ??
        0;

  const consultationPrice =
    normalizeNumber(
      doctor.consultation_price
    );

  const doctorName =
    doctor.public_name?.trim() ||
    formatDoctorName(doctor.slug);

  const specialtyName =
    getSpecialtyName(
      doctor,
      locale
    );

  const isVerified =
    doctor.verification_status ===
    "verified";

  const telehealthOffer = ((telehealthOfferResult.data ?? []) as Array<{
    price_minor: number;
    currency: "RON" | "EUR";
    duration_minutes: number;
    recipient_type: "doctor" | "clinic_organization";
    recipient_name: string;
  }>)[0] ?? null;

  const spokenLanguages = (doctor.doctor_spoken_languages ?? []).flatMap((spoken) => {
    const language = SPOKEN_LANGUAGE_OPTIONS.find((option) => option.code === spoken.language_code);
    return language ? [language.labels[locale]] : [];
  });

  const primaryClinicOption =
    clinicOptions[0] ??
    null;

  let nextAvailableSlot: {
    date: string;
    time: string;
  } | null =
    null;

  if (
    primaryClinicOption
  ) {
    try {
      const nextAvailable =
        await getNextAvailableAppointment(
          supabase,
          {
            doctorId:
              doctor.id,
            clinicId:
              primaryClinicOption.id,
          }
        );

      if (
        nextAvailable
      ) {
        nextAvailableSlot =
          {
            date:
              nextAvailable.date,
            time:
              nextAvailable.time,
          };
      }
    } catch (
      availabilityError
    ) {
      console.error(
        `Doctor profile next availability lookup failed for doctor ${doctor.id}:`,
        availabilityError
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] pb-28 pt-10 lg:pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-3xl border border-gray-200 bg-[#F0EEE9]">
                {doctor.photo_url ? (
                  <img
                    src={
                      doctor.photo_url
                    }
                    alt={interpolatePublicCopy(
                      profileCopy.photoAlt,
                      {doctorName}
                    )}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#036661]">
                    {doctorName
                      .charAt(
                        0
                      )
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                  {profileCopy.profileEyebrow}
                </p>

                <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                  {
                    doctorName
                  }
                </h1>

                <p className="mt-3 text-lg text-gray-700">
                  {translation?.title ??
                    profileFallbacks[locale]
                      .doctorTitle}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-4 text-sm text-gray-600">
                  <div className="flex flex-wrap items-center gap-3">
                    <RatingStars
                      rating={Math.round(
                        displayedAverageRating
                      )}
                      size="small"
                      label={interpolatePublicCopy(
                        profileCopy.ratingLabel,
                        {rating: displayedAverageRating.toFixed(1)}
                      )}
                    />

                    <span className="font-semibold text-gray-900">
                      {displayedAverageRating.toFixed(
                        1
                      )}
                    </span>

                    <a
                      href="#recenzii"
                      className="underline-offset-4 hover:text-[#036661] hover:underline"
                    >
                      {
                        displayedReviewCount
                      }{" "}
                      {displayedReviewCount ===
                      1
                        ? profileCopy.reviewSingular
                        : profileCopy.reviewPlural}
                    </a>
                  </div>

                  {doctor.years_experience !==
                    null && (
                    <span>
                      {interpolatePublicCopy(
                        profileCopy.yearsExperience,
                        {
                          years: String(
                            doctor.years_experience
                          ),
                        }
                      )}
                    </span>
                  )}

                  {spokenLanguages.length > 0 && (
                    <span>{locale === "ro" ? "Limbi" : locale === "de" ? "Sprachen" : "Languages"}: {spokenLanguages.join(", ")}</span>
                  )}

                  {consultationPrice !==
                    null && (
                    <span className="font-semibold text-gray-900">
                      {interpolatePublicCopy(
                        profileCopy.priceFrom,
                        {
                          price: formatPrice(
                            consultationPrice
                          ),
                        }
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-4 sm:items-end">
              {isVerified && (
                <VerifiedDoctorBadge />
              )}

              <DoctorProfileSaveControl
                doctorId={
                  doctor.id
                }
                doctorName={
                  doctorName
                }
              />
            </div>
          </div>

          {isVerified && (
            <p className="mt-6 max-w-4xl text-sm leading-6 text-gray-600">
              {profileCopy.verifiedDescription}
            </p>
          )}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-8">
            <PublicDoctorServices
              doctorId={
                doctor.id
              }
              locale={
                locale
              }
            />

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                {profileCopy.clinicsEyebrow}
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                {profileCopy.clinicsTitle}
              </h2>

              {approvedClinicRelations.length >
              0 ? (
                <div className="mt-6 space-y-4">
                  {approvedClinicRelations.map(
                    (
                      relation
                    ) => {
                      const clinic =
                        getFirstRelation(
                          relation.clinics
                        );

                      if (
                        !clinic
                      ) {
                        return null;
                      }

                      const clinicTranslation =
                        getClinicTranslation(
                          clinic,
                          locale
                        );

                      const address =
                        getClinicAddress(
                          clinic,
                          locale
                        );

                      return (
                        <article
                          key={
                            relation.clinic_id
                          }
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                        >
                          <h3 className="text-xl font-semibold text-gray-900">
                            {clinicTranslation?.name ??
                              profileFallbacks[locale]
                                .medicalClinic}
                          </h3>

                          {address && (
                            <p className="mt-2 text-sm leading-6 text-gray-700">
                              {
                                address
                              }
                            </p>
                          )}

                          {clinicTranslation?.description && (
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600">
                              {
                                clinicTranslation.description
                              }
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-3">
                            {clinic.google_maps_uri && (
                              <a
                                href={
                                  clinic.google_maps_uri
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                              >
                                {profileCopy.openMaps}
                              </a>
                            )}

                            {clinic.website && (
                              <a
                                href={
                                  clinic.website
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                              >
                                {profileCopy.clinicWebsite}
                              </a>
                            )}
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                  {profileCopy.clinicsEmpty}
                </div>
              )}
            </section>

            <section
              id="programare"
              className="scroll-mt-24"
            >
              <AuthenticatedAppointmentRequest
                doctorId={
                  doctor.id
                }
                doctorName={
                  doctorName
                }
                doctorSlug={
                  doctor.slug
                }
                clinics={
                  clinicOptions
                }
                telehealthOffer={telehealthOffer}
              />
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                {profileCopy.aboutEyebrow}
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                {profileCopy.aboutTitle}
              </h2>

              <p className="mt-5 whitespace-pre-line leading-7 text-gray-700">
                {translation?.biography ??
                  profileCopy.biographyFallback}
              </p>
            </section>

            {(doctor.phone ||
              doctor.email) && (
              <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                  {profileCopy.contactEyebrow}
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                  {profileCopy.contactTitle}
                </h2>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {doctor.phone && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {profileCopy.phone}
                      </p>

                      <a
                        href={`tel:${doctor.phone.replace(
                          /\s+/g,
                          ""
                        )}`}
                        className="mt-2 block font-medium text-gray-900 underline-offset-4 hover:underline"
                      >
                        {
                          doctor.phone
                        }
                      </a>
                    </div>
                  )}

                  {doctor.email && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {profileCopy.email}
                      </p>

                      <a
                        href={`mailto:${doctor.email}`}
                        className="mt-2 block break-all font-medium text-gray-900 underline-offset-4 hover:underline"
                      >
                        {
                          doctor.email
                        }
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            <div
              id="recenzii"
              className="scroll-mt-24"
            >
              <PublicDoctorReviews
                reviews={
                  publishedReviews
                }
                locale={
                  locale
                }
              />
            </div>
          </div>

          <DoctorBookingSummary
            clinicName={
              primaryClinicOption?.name ??
              null
            }
            clinicAddress={
              primaryClinicOption?.address ??
              null
            }
            consultationPrice={
              consultationPrice
            }
            nextAvailableSlot={
              nextAvailableSlot
            }
            locale={locale}
          />
        </div>
      </div>

      <DoctorMobileBookingBar
        consultationPrice={
          consultationPrice
        }
        locale={locale}
      />

      <RecordRecentlyViewedDoctor
        doctor={{
          id:
            doctor.id,
          slug:
            doctor.slug,
          name:
            doctorName,
          title:
            translation?.title ??
            "Medic",
          specialtyName,
          clinicName:
            primaryClinicOption?.name ??
            null,
          photoUrl:
            doctor.photo_url,
          isVerified,
        }}
      />
    </main>
  );
}
