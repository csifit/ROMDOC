import {
  type AppLocale,
} from "@/i18n/routing";
import {
  createClient,
} from "@/lib/supabase/server";

type Translation = {
  locale: string;
  name?: string | null;
  title?: string | null;
  biography?: string | null;
  description?: string | null;
};

type CityRelation = {
  slug: string;
  city_translations:
    | Translation[]
    | null;
};

type ClinicRelation = {
  id: string;
  slug: string;
  phone: string | null;
  website: string | null;
  street_address: string | null;
  formatted_address: string | null;
  latitude:
    | number
    | string
    | null;
  longitude:
    | number
    | string
    | null;
  clinic_translations:
    | Translation[]
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

type DoctorRecord = {
  id: string;
  slug: string;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  years_experience: number | null;
  average_rating:
    | number
    | string
    | null;
  review_count: number | null;
  verification_status:
    | string
    | null;
  doctor_translations:
    | Translation[]
    | null;
  doctor_clinics:
    | DoctorClinicRelation[]
    | null;
};

type PublicReviewRow = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  verified_appointment: boolean;
};

type Props = {
  locale: AppLocale;
  slug: string;
};

function getFirstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!relation) {
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

function getTranslation(
  translations:
    | Translation[]
    | null
    | undefined,
  locale: AppLocale
) {
  return (
    translations?.find(
      (
        translation
      ) =>
        translation.locale ===
        locale
    ) ??
    translations?.find(
      (
        translation
      ) =>
        translation.locale ===
        "ro"
    ) ??
    translations?.[0] ??
    null
  );
}

function formatDoctorName(
  slug: string
) {
  return decodeURIComponent(
    slug
  )
    .split("-")
    .filter(Boolean)
    .map(
      (
        part
      ) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function normalizeNumber(
  value:
    | number
    | string
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed =
    typeof value ===
      "number"
      ? value
      : Number(
          value
        );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function absoluteUrl(
  path: string
) {
  const siteUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    "https://www.romdoc.fit";

  return new URL(
    path,
    siteUrl
  ).toString();
}

function safeJsonLd(
  value: unknown
) {
  return JSON.stringify(
    value
  ).replace(
    /</g,
    "\\u003c"
  );
}

export default async function DoctorStructuredData({
  locale,
  slug,
}: Props) {
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
      photo_url,
      phone,
      email,
      years_experience,
      average_rating,
      review_count,
      verification_status,
      doctor_translations (
        locale,
        title,
        biography
      ),
      doctor_clinics (
        clinic_id,
        clinics (
          id,
          slug,
          phone,
          website,
          street_address,
          formatted_address,
          latitude,
          longitude,
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
      "Doctor structured data lookup failed:",
      error
    );

    return null;
  }

  if (
    !data
  ) {
    return null;
  }

  const doctor =
    data as unknown as
      DoctorRecord;

  const {
    data:
      publicReviewData,
    error:
      publicReviewError,
  } = await supabase.rpc(
    "get_public_doctor_reviews",
    {
      target_doctor_id:
        doctor.id,
    }
  );

  if (
    publicReviewError
  ) {
    console.error(
      "Doctor structured-data reviews lookup failed:",
      publicReviewError
    );
  }

  const publishedReviews =
    (
      publicReviewData ??
      []
    ) as PublicReviewRow[];

  const doctorName =
    formatDoctorName(
      doctor.slug
    );

  const doctorTranslation =
    getTranslation(
      doctor.doctor_translations,
      locale
    );

  const reviewCount =
    publishedReviews.length;

  const calculatedAverage =
    reviewCount >
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
        reviewCount
      : null;

  const storedAverage =
    normalizeNumber(
      doctor.average_rating
    );

  const averageRating =
    calculatedAverage ??
    (
      (
        doctor.review_count ??
        0
      ) >
      0
        ? storedAverage
        : null
    );

  const profilePath =
    `/${locale}/doctor/${encodeURIComponent(
      doctor.slug
    )}`;

  const profileUrl =
    absoluteUrl(
      profilePath
    );

  const doctorId =
    `${profileUrl}#physician`;

  const clinicNodes =
    (
      doctor.doctor_clinics ??
      []
    ).flatMap(
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

        const translation =
          getTranslation(
            clinic.clinic_translations,
            locale
          );

        const city =
          getFirstRelation(
            clinic.cities
          );

        const cityName =
          getTranslation(
            city?.city_translations,
            locale
          )?.name ??
          null;

        const latitude =
          normalizeNumber(
            clinic.latitude
          );

        const longitude =
          normalizeNumber(
            clinic.longitude
          );

        const clinicId =
          `${profileUrl}#clinic-${clinic.id}`;

        const address =
          clinic.formatted_address ||
          clinic.street_address ||
          null;

        return [
          {
            "@type":
              "MedicalClinic",
            "@id":
              clinicId,
            name:
              translation?.name ??
              (
                locale ===
                "en"
                  ? "Medical clinic"
                  : "Clinică medicală"
              ),
            ...(translation
              ?.description
              ? {
                  description:
                    translation.description,
                }
              : {}),
            ...(clinic.phone
              ? {
                  telephone:
                    clinic.phone,
                }
              : {}),
            ...(clinic.website
              ? {
                  url:
                    clinic.website,
                }
              : {}),
            ...(address
              ? {
                  address: {
                    "@type":
                      "PostalAddress",
                    streetAddress:
                      address,
                    ...(cityName
                      ? {
                          addressLocality:
                            cityName,
                        }
                      : {}),
                    addressCountry:
                      "RO",
                  },
                }
              : {}),
            ...(latitude !==
              null &&
            longitude !==
              null
              ? {
                  geo: {
                    "@type":
                      "GeoCoordinates",
                    latitude,
                    longitude,
                  },
                }
              : {}),
          },
        ];
      }
    );

  const reviewNodes =
    publishedReviews
      .slice(
        0,
        20
      )
      .map(
        (
          review
        ) => ({
          "@type":
            "Review",
          "@id":
            `${profileUrl}#review-${review.id}`,
          itemReviewed: {
            "@id":
              doctorId,
          },

          // Never expose Patient identity in public JSON-LD.
          author: {
            "@type":
              "Person",
            name:
              locale ===
              "en"
                ? "Anonymous patient"
                : "Pacient anonim",
          },

          datePublished:
            review.created_at,

          reviewRating: {
            "@type":
              "Rating",
            ratingValue:
              review.rating,
            bestRating:
              5,
            worstRating:
              1,
          },

          ...(review.review_text
            ? {
                reviewBody:
                  review.review_text,
              }
            : {}),

          ...(review
            .verified_appointment
            ? {
                reviewAspect:
                  locale ===
                  "en"
                    ? "Verified appointment"
                    : "Programare verificată",
              }
            : {}),
        })
      );

  const physicianNode = {
    "@type":
      "Physician",
    "@id":
      doctorId,
    name:
      doctorName,
    url:
      profileUrl,

    ...(doctor.photo_url
      ? {
          image:
            doctor.photo_url,
        }
      : {}),

    ...(doctorTranslation?.title
      ? {
          jobTitle:
            doctorTranslation.title,
        }
      : {}),

    ...(doctorTranslation
      ?.biography
      ? {
          description:
            doctorTranslation.biography,
        }
      : {}),

    ...(doctor.phone
      ? {
          telephone:
            doctor.phone,
        }
      : {}),

    ...(doctor.email
      ? {
          email:
            doctor.email,
        }
      : {}),

    ...(doctor
      .years_experience !==
      null
      ? {
          knowsAbout:
            locale ===
            "en"
              ? `${doctor.years_experience} years of medical experience`
              : `${doctor.years_experience} ani de experiență medicală`,
        }
      : {}),

    ...(doctor
      .verification_status ===
      "verified"
      ? {
          award:
            locale ===
            "en"
              ? "Licensed Medical Professional verified by RomDoc"
              : "Profesionist medical licențiat, verificat de RomDoc",
        }
      : {}),

    ...(clinicNodes.length >
      0
      ? {
          worksFor:
            clinicNodes.map(
              (
                clinic
              ) => ({
                "@id":
                  clinic[
                    "@id"
                  ],
              })
            ),
        }
      : {}),

    ...(averageRating !==
      null &&
    (
      doctor.review_count ??
      0
    ) >
      0
      ? {
          aggregateRating: {
            "@type":
              "AggregateRating",
            ratingValue:
              Math.round(
                averageRating *
                  10
              ) /
              10,
            reviewCount:
              reviewCount >
              0
                ? reviewCount
                : doctor.review_count,
            bestRating:
              5,
            worstRating:
              1,
          },
        }
      : {}),

    ...(reviewNodes.length >
      0
      ? {
          review:
            reviewNodes.map(
              (
                review
              ) => ({
                "@id":
                  review[
                    "@id"
                  ],
              })
            ),
        }
      : {}),
  };

  const graph = {
    "@context":
      "https://schema.org",
    "@graph": [
      physicianNode,
      ...clinicNodes,
      ...reviewNodes,
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html:
          safeJsonLd(
            graph
          ),
      }}
    />
  );
}
