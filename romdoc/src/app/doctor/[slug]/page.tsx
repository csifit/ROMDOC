import { notFound } from "next/navigation";

import AuthenticatedAppointmentRequest from "@/components/appointments/authenticated-appointment-request";
import PublicDoctorServices from "@/components/doctor/public-doctor-services";
import VerifiedDoctorBadge from "@/components/public/verified-doctor-badge";
import PublicDoctorReviews, {
  type PublicDoctorReview,
} from "@/components/reviews/public-doctor-reviews";
import RatingStars from "@/components/reviews/rating-stars";
import { createClient } from "@/lib/supabase/server";

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
  doctor_clinics: DoctorClinicRelation[] | null;
  reviews: ReviewRelation[] | null;
};

function formatDoctorName(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFirstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getRomanianClinicTranslation(clinic: ClinicRelation) {
  return (
    clinic.clinic_translations?.find(
      (translation) => translation.locale === "ro"
    ) ??
    clinic.clinic_translations?.[0] ??
    null
  );
}

function getRomanianCityName(clinic: ClinicRelation) {
  const city = getFirstRelation(clinic.cities);

  return (
    city?.city_translations?.find(
      (translation) => translation.locale === "ro"
    )?.name ??
    city?.city_translations?.[0]?.name ??
    null
  );
}

function getClinicAddress(clinic: ClinicRelation) {
  if (clinic.formatted_address?.trim()) {
    return clinic.formatted_address;
  }

  return [clinic.street_address, getRomanianCityName(clinic)]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0
    )
    .join(", ");
}

function clinicIsApproved(clinic: ClinicRelation) {
  return clinic.status === "approved";
}

function normalizeNumber(value: number | string | null) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function DoctorPage({ params }: Props) {
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
    console.error("Doctor profile query failed:", error);
  }

  if (!data) {
    notFound();
  }

  const doctor = data as unknown as DoctorRecord;

  const translation =
    doctor.doctor_translations?.find((item) => item.locale === "ro") ??
    doctor.doctor_translations?.[0] ??
    null;

  const clinicRelations = doctor.doctor_clinics ?? [];

  const approvedClinicRelations = clinicRelations.filter((relation) => {
    const clinic = getFirstRelation(relation.clinics);
    return clinic ? clinicIsApproved(clinic) : false;
  });

  const clinicOptions: ClinicOption[] = approvedClinicRelations.flatMap(
    (relation) => {
      const clinic = getFirstRelation(relation.clinics);

      if (!clinic) {
        return [];
      }

      const clinicTranslation = getRomanianClinicTranslation(clinic);

      return [
        {
          id: clinic.id,
          name: clinicTranslation?.name ?? "Clinică medicală",
          address: getClinicAddress(clinic),
        },
      ];
    }
  );

  const publishedReviews: PublicDoctorReview[] = (doctor.reviews ?? [])
    .filter((review) => review.status === "published" && review.approved === true)
    .sort(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime()
    )
    .map((review) => ({
      id: review.id,
      patient_name: review.patient_name,
      rating: review.rating,
      review_text: review.review_text,
      created_at: review.created_at,
    }));

  const publicReviewCount = publishedReviews.length;

  const publicAverageRating =
    publicReviewCount > 0
      ? publishedReviews.reduce((total, review) => total + review.rating, 0) /
        publicReviewCount
      : 0;

  const storedAverageRating = normalizeNumber(doctor.average_rating) ?? 0;

  const displayedAverageRating =
    publicReviewCount > 0
      ? Math.round(publicAverageRating * 10) / 10
      : storedAverageRating;

  const displayedReviewCount =
    publicReviewCount > 0 ? publicReviewCount : doctor.review_count ?? 0;

  const consultationPrice = normalizeNumber(doctor.consultation_price);
  const doctorName = formatDoctorName(doctor.slug);
  const isVerified = doctor.verification_status === "verified";

  return (
    <main className="min-h-screen bg-[#F0EEE9] py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <article className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <header>
            <p className="text-sm font-semibold text-[#036661]">
              Profil medical
            </p>

            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-[#F0EEE9]">
                  {doctor.photo_url ? (
                    <img
                      src={doctor.photo_url}
                      alt={`Fotografie de profil pentru ${doctorName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#036661]">
                      {doctorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div>
                  <h1 className="text-4xl font-bold text-gray-900">
                    {doctorName}
                  </h1>

                  <p className="mt-3 text-lg text-gray-700">
                    {translation?.title ?? "Medic"}
                  </p>
                </div>
              </div>

              {isVerified && <VerifiedDoctorBadge />}
            </div>

            {isVerified && (
              <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600">
                RomDoc a verificat informațiile profesionale și documentele
                transmise de acest medic. Insigna nu înseamnă că RomDoc a emis
                licența medicală.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4 text-sm text-gray-600">
              <div className="flex flex-wrap items-center gap-3">
                <RatingStars
                  rating={Math.round(displayedAverageRating)}
                  size="small"
                  label={`Evaluare ${displayedAverageRating.toFixed(1)} din 5`}
                />

                <span className="font-semibold text-gray-900">
                  {displayedAverageRating.toFixed(1)}
                </span>

                <span>
                  {displayedReviewCount} {" "}
                  {displayedReviewCount === 1 ? "recenzie" : "recenzii"}
                </span>
              </div>

              {doctor.years_experience !== null && (
                <span>{doctor.years_experience} ani experiență</span>
              )}

              {consultationPrice !== null && (
                <span>De la {formatPrice(consultationPrice)} RON</span>
              )}
            </div>
          </header>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              Despre medic
            </h2>

            <p className="mt-4 whitespace-pre-line leading-7 text-gray-700">
              {translation?.biography ??
                "Informațiile despre acest medic vor fi disponibile în curând."}
            </p>
          </section>

          {(doctor.phone || doctor.email) && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold text-gray-900">
                Date de contact
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {doctor.phone && (
                  <div className="rounded-xl border border-gray-200 p-5">
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
                  <div className="rounded-xl border border-gray-200 p-5">
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

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              Servicii și tarife
            </h2>

            <div className="mt-5">
              <PublicDoctorServices doctorId={doctor.id} />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              Locații
            </h2>

            {approvedClinicRelations.length > 0 ? (
              <div className="mt-5 space-y-4">
                {approvedClinicRelations.map((relation) => {
                  const clinic = getFirstRelation(relation.clinics);

                  if (!clinic) {
                    return null;
                  }

                  const clinicTranslation = getRomanianClinicTranslation(clinic);
                  const address = getClinicAddress(clinic);

                  return (
                    <article
                      key={relation.clinic_id}
                      className="rounded-xl border border-gray-200 bg-white p-6"
                    >
                      <h3 className="text-xl font-semibold text-gray-900">
                        {clinicTranslation?.name ?? "Clinică medicală"}
                      </h3>

                      {clinicTranslation?.description && (
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                          {clinicTranslation.description}
                        </p>
                      )}

                      {address && (
                        <p className="mt-4 text-gray-700">
                          <span className="font-medium">Adresă:</span> {address}
                        </p>
                      )}

                      {clinic.phone && (
                        <p className="mt-2 text-gray-700">
                          <span className="font-medium">Telefon:</span>{" "}
                          <a
                            href={`tel:${clinic.phone.replace(/\s+/g, "")}`}
                            className="underline-offset-4 hover:underline"
                          >
                            {clinic.phone}
                          </a>
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
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
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                Locațiile aprobate ale acestui medic nu sunt încă disponibile.
              </div>
            )}
          </section>

          <section id="programare" className="mt-10 scroll-mt-24">
            <AuthenticatedAppointmentRequest
              doctorId={doctor.id}
              doctorName={doctorName}
              doctorSlug={doctor.slug}
              clinics={clinicOptions}
            />
          </section>
        </article>

        <div className="mt-8">
          <PublicDoctorReviews reviews={publishedReviews} />
        </div>
      </div>
    </main>
  );
}
