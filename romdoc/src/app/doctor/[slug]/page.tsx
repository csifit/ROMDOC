import { notFound } from "next/navigation";

import AuthenticatedAppointmentRequest from "@/components/appointments/authenticated-appointment-request";
import PublicDoctorServices from "@/components/doctor/public-doctor-services";
import DoctorBookingSummary from "@/components/public/doctor-booking-summary";
import DoctorMobileBookingBar from "@/components/public/doctor-mobile-booking-bar";
import VerifiedDoctorBadge from "@/components/public/verified-doctor-badge";
import PublicDoctorReviews, {
  type PublicDoctorReview,
} from "@/components/reviews/public-doctor-reviews";
import RatingStars from "@/components/reviews/rating-stars";
import { getNextAvailableAppointment } from "@/lib/appointments/calculate-available-slots";
import { createClient } from "@/lib/supabase/server";
import DoctorProfileSaveControl from "@/components/patient/doctor-profile-save-control";
import RecordRecentlyViewedDoctor from "@/components/public/record-recently-viewed-doctor";

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
  city_translations: CityTranslation[] | null;
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
  clinic_translations: ClinicTranslation[] | null;
  cities: CityRelation | CityRelation[] | null;
};

type DoctorClinicRelation = {
  clinic_id: string;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

type ClinicOption = {
  id: string;
  name: string;
  address: string;
};

type ReviewRelation = {
  id: string;
  patient_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  status: string;
  approved: boolean;
};

type DoctorRecord = {
  id: string;
  slug: string;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  years_experience: number | null;
  consultation_price: number | string | null;
  average_rating: number | string | null;
  review_count: number | null;
  verification_status: string | null;
  doctor_translations: DoctorTranslation[] | null;
  doctor_specialties: DoctorSpecialtyRelation[] | null;
  doctor_clinics: DoctorClinicRelation[] | null;
  reviews: ReviewRelation[] | null;
};

function formatDoctorName(slug: string) {
  return slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getFirstRelation<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getRomanianClinicTranslation(
  clinic: ClinicRelation
) {
  return (
    clinic.clinic_translations?.find(
      (translation) =>
        translation.locale === "ro"
    ) ??
    clinic.clinic_translations?.[0] ??
    null
  );
}

function getRomanianCityName(
  clinic: ClinicRelation
) {
  const city = getFirstRelation(
    clinic.cities
  );

  return (
    city?.city_translations?.find(
      (translation) =>
        translation.locale === "ro"
    )?.name ??
    city?.city_translations?.[0]?.name ??
    null
  );
}

function getClinicAddress(
  clinic: ClinicRelation
) {
  if (clinic.formatted_address?.trim()) {
    return clinic.formatted_address;
  }

  return [
    clinic.street_address,
    getRomanianCityName(clinic),
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    )
    .join(", ");
}

function clinicIsApproved(
  clinic: ClinicRelation
) {
  return clinic.status === "approved";
}

function normalizeNumber(
  value: number | string | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getRomanianSpecialtyName(
  doctor: DoctorRecord
) {
  const specialty =
    getFirstRelation(
      doctor.doctor_specialties?.[0]
        ?.specialties
    );

  return (
    specialty
      ?.specialty_translations
      ?.find(
        (translation) =>
          translation.locale === "ro"
      )?.name ??
    specialty
      ?.specialty_translations?.[0]
      ?.name ??
    "Specialitate medicală"
  );
}

export default async function DoctorPage({
  params,
}: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("doctors")
    .select(`
      id,
      slug,
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
      ),
      reviews (
        id,
        patient_name,
        rating,
        review_text,
        created_at,
        status,
        approved
      )
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error(
      "Doctor profile query failed:",
      error
    );
  }

  if (!data) {
    notFound();
  }

  const doctor =
    data as unknown as DoctorRecord;

  const translation =
    doctor.doctor_translations?.find(
      (item) => item.locale === "ro"
    ) ??
    doctor.doctor_translations?.[0] ??
    null;

  const approvedClinicRelations =
    (doctor.doctor_clinics ?? []).filter(
      (relation) => {
        const clinic = getFirstRelation(
          relation.clinics
        );

        return clinic
          ? clinicIsApproved(clinic)
          : false;
      }
    );

  const clinicOptions: ClinicOption[] =
    approvedClinicRelations.flatMap(
      (relation) => {
        const clinic = getFirstRelation(
          relation.clinics
        );

        if (!clinic) {
          return [];
        }

        const clinicTranslation =
          getRomanianClinicTranslation(
            clinic
          );

        return [
          {
            id: clinic.id,
            name:
              clinicTranslation?.name ??
              "Clinică medicală",
            address:
              getClinicAddress(clinic),
          },
        ];
      }
    );

  const publishedReviews: PublicDoctorReview[] =
    (doctor.reviews ?? [])
      .filter(
        (review) =>
          review.status === "published" &&
          review.approved === true
      )
      .sort(
        (first, second) =>
          new Date(
            second.created_at
          ).getTime() -
          new Date(
            first.created_at
          ).getTime()
      )
      .map((review) => ({
        id: review.id,
        patient_name:
          review.patient_name,
        rating: review.rating,
        review_text:
          review.review_text,
        created_at:
          review.created_at,
      }));

  const publicReviewCount =
    publishedReviews.length;
  const publicAverageRating =
    publicReviewCount > 0
      ? publishedReviews.reduce(
          (total, review) =>
            total + review.rating,
          0
        ) / publicReviewCount
      : 0;
  const storedAverageRating =
    normalizeNumber(
      doctor.average_rating
    ) ?? 0;
  const displayedAverageRating =
    publicReviewCount > 0
      ? Math.round(
          publicAverageRating * 10
        ) / 10
      : storedAverageRating;
  const displayedReviewCount =
    publicReviewCount > 0
      ? publicReviewCount
      : doctor.review_count ?? 0;
  const consultationPrice =
    normalizeNumber(
      doctor.consultation_price
    );
  const doctorName =
    formatDoctorName(doctor.slug);
  const specialtyName =
    getRomanianSpecialtyName(
      doctor
    );
  const isVerified =
    doctor.verification_status ===
    "verified";

  const primaryClinicOption =
    clinicOptions[0] ?? null;

  let nextAvailableSlot: {
    date: string;
    time: string;
  } | null = null;

  if (primaryClinicOption) {
    try {
      const nextAvailable =
        await getNextAvailableAppointment(
          supabase,
          {
            doctorId: doctor.id,
            clinicId:
              primaryClinicOption.id,
          }
        );

      if (nextAvailable) {
        nextAvailableSlot = {
          date: nextAvailable.date,
          time: nextAvailable.time,
        };
      }
    } catch (availabilityError) {
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
                    src={doctor.photo_url}
                    alt={`Fotografie de profil pentru ${doctorName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#036661]">
                    {doctorName
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                  Profil medical
                </p>

                <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                  {doctorName}
                </h1>

                <p className="mt-3 text-lg text-gray-700">
                  {translation?.title ??
                    "Medic"}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-4 text-sm text-gray-600">
                  <div className="flex flex-wrap items-center gap-3">
                    <RatingStars
                      rating={Math.round(
                        displayedAverageRating
                      )}
                      size="small"
                      label={`Evaluare ${displayedAverageRating.toFixed(
                        1
                      )} din 5`}
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
                      {displayedReviewCount}{" "}
                      {displayedReviewCount === 1
                        ? "recenzie"
                        : "recenzii"}
                    </a>
                  </div>

                  {doctor.years_experience !==
                    null && (
                    <span>
                      {
                        doctor.years_experience
                      }{" "}
                      ani experiență
                    </span>
                  )}

                  {consultationPrice !==
                    null && (
                    <span className="font-semibold text-gray-900">
                      De la{" "}
                      {formatPrice(
                        consultationPrice
                      )}{" "}
                      RON
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
               doctorId={doctor.id}
               doctorName={doctorName}
              />
          </div>
          </div>

          {isVerified && (
            <p className="mt-6 max-w-4xl text-sm leading-6 text-gray-600">
              RomDoc a verificat informațiile profesionale și documentele transmise de acest medic. Insigna nu înseamnă că RomDoc a emis licența medicală.
            </p>
          )}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                Servicii
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Servicii și tarife
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                Tarifele afișate sunt orientative. Clinica poate confirma prețul final în funcție de serviciul selectat.
              </p>

              <div className="mt-6">
                <PublicDoctorServices
                  doctorId={doctor.id}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                Clinici
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Locații disponibile
              </h2>

              {approvedClinicRelations.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {approvedClinicRelations.map(
                    (relation) => {
                      const clinic = getFirstRelation(
                        relation.clinics
                      );

                      if (!clinic) {
                        return null;
                      }

                      const clinicTranslation =
                        getRomanianClinicTranslation(
                          clinic
                        );
                      const address =
                        getClinicAddress(clinic);

                      return (
                        <article
                          key={relation.clinic_id}
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                        >
                          <h3 className="text-xl font-semibold text-gray-900">
                            {clinicTranslation?.name ??
                              "Clinică medicală"}
                          </h3>

                          {address && (
                            <p className="mt-2 text-sm leading-6 text-gray-700">
                              {address}
                            </p>
                          )}

                          {clinicTranslation?.description && (
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600">
                              {clinicTranslation.description}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-3">
                            {clinic.google_maps_uri && (
                              <a
                                href={clinic.google_maps_uri}
                                target="_blank"
                                rel="noreferrer"
                                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                              >
                                Deschide în Google Maps
                              </a>
                            )}

                            {clinic.website && (
                              <a
                                href={clinic.website}
                                target="_blank"
                                rel="noreferrer"
                                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                              >
                                Website clinică
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
                  Locațiile aprobate ale acestui medic nu sunt încă disponibile.
                </div>
              )}
            </section>

            <section
              id="programare"
              className="scroll-mt-24"
            >
              <AuthenticatedAppointmentRequest
                doctorId={doctor.id}
                doctorName={doctorName}
                doctorSlug={doctor.slug}
                clinics={clinicOptions}
              />
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                Despre medic
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Experiență profesională
              </h2>

              <p className="mt-5 whitespace-pre-line leading-7 text-gray-700">
                {translation?.biography ??
                  "Informațiile despre acest medic vor fi disponibile în curând."}
              </p>
            </section>

            {(doctor.phone || doctor.email) && (
              <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                  Contact
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                  Date de contact
                </h2>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {doctor.phone && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Telefon
                      </p>

                      <a
                        href={`tel:${doctor.phone.replace(/\s+/g, "")}`}
                        className="mt-2 block font-medium text-gray-900 underline-offset-4 hover:underline"
                      >
                        {doctor.phone}
                      </a>
                    </div>
                  )}

                  {doctor.email && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        E-mail
                      </p>

                      <a
                        href={`mailto:${doctor.email}`}
                        className="mt-2 block break-all font-medium text-gray-900 underline-offset-4 hover:underline"
                      >
                        {doctor.email}
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
                reviews={publishedReviews}
              />
            </div>
          </div>

          <DoctorBookingSummary
            clinicName={primaryClinicOption?.name ?? null}
            clinicAddress={primaryClinicOption?.address ?? null}
            consultationPrice={consultationPrice}
            nextAvailableSlot={nextAvailableSlot}
          />
        </div>
      </div>

      <DoctorMobileBookingBar
        consultationPrice={consultationPrice}
      />
      <RecordRecentlyViewedDoctor
         doctor={{
          id: doctor.id,
          slug: doctor.slug,
          name: doctorName,
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
