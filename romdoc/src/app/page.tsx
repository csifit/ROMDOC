import Link from "next/link";

import HomepageDoctorCta from "@/components/public/homepage-doctor-cta";
import HomepageDoctorFilters from "@/components/public/homepage-doctor-filters";
import HomepageDoctorResults from "@/components/public/homepage-doctor-results";
import HomepageTrustSection from "@/components/public/homepage-trust-section";
import PublicClinicMap from "@/components/public/public-clinic-map";
import PublicLayout from "@/components/public/public-layout";
import {
  type HomepageDoctorCardData,
} from "@/components/public/homepage-doctor-card";
import { createClient } from "@/lib/supabase/server";

type Translation = {
  locale: string;
  name?: string;
  title?: string;
};

type CityTranslationRow = {
  name: string;
  cities:
    | {
        slug: string | null;
      }
    | Array<{
        slug: string | null;
      }>
    | null;
};

type SpecialtyTranslationRow = {
  name: string;
  meta_description: string | null;
  specialties:
    | {
        slug: string | null;
        icon: string | null;
      }
    | Array<{
        slug: string | null;
        icon: string | null;
      }>
    | null;
};

type DoctorCandidate = {
  id: string;
  slug: string;
  photo_url: string | null;
  years_experience: number | null;
  consultation_price: number | string | null;
  average_rating: number | string | null;
  review_count: number | null;
  verification_status: string | null;
  doctor_translations: Translation[] | null;
};

type DoctorClinicRow = {
  doctor_id: string;
  clinics:
    | {
        id: string;
        status: string;
        city_id: string | null;
        clinic_translations: Translation[] | null;
        cities:
          | {
              city_translations: Translation[] | null;
            }
          | Array<{
              city_translations: Translation[] | null;
            }>
          | null;
      }
    | Array<{
        id: string;
        status: string;
        city_id: string | null;
        clinic_translations: Translation[] | null;
        cities:
          | {
              city_translations: Translation[] | null;
            }
          | Array<{
              city_translations: Translation[] | null;
            }>
          | null;
      }>
    | null;
};

type DoctorSpecialtyRow = {
  doctor_id: string;
  specialties:
    | {
        specialty_translations: Translation[] | null;
      }
    | Array<{
        specialty_translations: Translation[] | null;
      }>
    | null;
};

type AvailabilityRow = {
  doctor_id: string;
};

function getSingleRelation<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function getRomanianName(
  translations: Translation[] | null | undefined
) {
  return (
    translations?.find(
      (translation) => translation.locale === "ro"
    )?.name ??
    translations?.[0]?.name ??
    null
  );
}

function getRomanianTitle(
  translations: Translation[] | null | undefined
) {
  return (
    translations?.find(
      (translation) => translation.locale === "ro"
    )?.title ??
    translations?.[0]?.title ??
    "Medic"
  );
}

function formatDoctorName(slug: string) {
  return slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

function normalizeNumber(
  value: number | string | null
) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export default async function Home() {
  const supabase = await createClient();

  const [
    citiesResult,
    specialtiesResult,
    doctorCandidatesResult,
  ] = await Promise.all([
    supabase
      .from("city_translations")
      .select(`
        name,
        cities (
          slug
        )
      `)
      .eq("locale", "ro")
      .order("name")
      .limit(100),

    supabase
      .from("specialty_translations")
      .select(`
        name,
        meta_description,
        specialties (
          slug,
          icon
        )
      `)
      .eq("locale", "ro")
      .order("name")
      .limit(100),

    supabase
      .from("doctors")
      .select(`
        id,
        slug,
        photo_url,
        years_experience,
        consultation_price,
        average_rating,
        review_count,
        verification_status,
        doctor_translations (
          locale,
          title
        )
      `)
      .eq("status", "active")
      .order("average_rating", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(18),
  ]);

  if (citiesResult.error) {
    console.error(
      "Homepage cities lookup failed:",
      citiesResult.error
    );
  }

  if (specialtiesResult.error) {
    console.error(
      "Homepage specialties lookup failed:",
      specialtiesResult.error
    );
  }

  if (doctorCandidatesResult.error) {
    console.error(
      "Homepage doctor candidates lookup failed:",
      doctorCandidatesResult.error
    );
  }

  const cities =
    (citiesResult.data ?? []) as CityTranslationRow[];

  const specialties =
    (specialtiesResult.data ?? []) as SpecialtyTranslationRow[];

  const doctorCandidates =
    (doctorCandidatesResult.data ?? []) as DoctorCandidate[];

  const cityOptions = cities.flatMap((city) => {
    const relation = getSingleRelation(city.cities);

    if (!relation?.slug) {
      return [];
    }

    return [
      {
        slug: relation.slug,
        name: city.name,
      },
    ];
  });

  const specialtyOptions = specialties.flatMap(
    (specialty) => {
      const relation = getSingleRelation(
        specialty.specialties
      );

      if (!relation?.slug) {
        return [];
      }

      return [
        {
          slug: relation.slug,
          name: specialty.name,
        },
      ];
    }
  );

  let homepageDoctors: HomepageDoctorCardData[] = [];

  if (doctorCandidates.length > 0) {
    const doctorIds = doctorCandidates.map(
      (doctor) => doctor.id
    );

    const [
      clinicsResult,
      doctorSpecialtiesResult,
      availabilityResult,
    ] = await Promise.all([
      supabase
        .from("doctor_clinics")
        .select(`
          doctor_id,
          clinics (
            id,
            status,
            city_id,
            clinic_translations (
              locale,
              name
            ),
            cities (
              city_translations (
                locale,
                name
              )
            )
          )
        `)
        .in("doctor_id", doctorIds),

      supabase
        .from("doctor_specialties")
        .select(`
          doctor_id,
          specialties (
            specialty_translations (
              locale,
              name
            )
          )
        `)
        .in("doctor_id", doctorIds),

      supabase
        .from("availability")
        .select("doctor_id")
        .in("doctor_id", doctorIds)
        .eq("is_active", true),
    ]);

    if (clinicsResult.error) {
      console.error(
        "Homepage doctor clinics lookup failed:",
        clinicsResult.error
      );
    }

    if (doctorSpecialtiesResult.error) {
      console.error(
        "Homepage doctor specialties lookup failed:",
        doctorSpecialtiesResult.error
      );
    }

    if (availabilityResult.error) {
      console.error(
        "Homepage doctor availability lookup failed:",
        availabilityResult.error
      );
    }

    const clinicRows =
      (clinicsResult.data ?? []) as DoctorClinicRow[];

    const specialtyRows =
      (doctorSpecialtiesResult.data ??
        []) as DoctorSpecialtyRow[];

    const availabilityRows =
      (availabilityResult.data ?? []) as AvailabilityRow[];

    const onlineDoctorIds = new Set(
      availabilityRows.map((row) => row.doctor_id)
    );

    homepageDoctors = doctorCandidates
      .flatMap(
        (
          doctor
        ): HomepageDoctorCardData[] => {
          const clinicRow = clinicRows.find((row) => {
            if (row.doctor_id !== doctor.id) {
              return false;
            }

            const clinic = getSingleRelation(row.clinics);

            return clinic?.status === "approved";
          });

          const clinic = clinicRow
            ? getSingleRelation(clinicRow.clinics)
            : null;

          if (!clinic) {
            return [];
          }

          const city = getSingleRelation(clinic.cities);

          const clinicName = getRomanianName(
            clinic.clinic_translations
          );

          const cityName = getRomanianName(
            city?.city_translations
          );

          if (!clinicName || !cityName) {
            return [];
          }

          const specialtyRow = specialtyRows.find(
            (row) => row.doctor_id === doctor.id
          );

          const specialty = specialtyRow
            ? getSingleRelation(
                specialtyRow.specialties
              )
            : null;

          const specialtyName = getRomanianName(
            specialty?.specialty_translations
          );

          if (!specialtyName) {
            return [];
          }

          return [
            {
              id: doctor.id,
              slug: doctor.slug,
              name: formatDoctorName(doctor.slug),
              title: getRomanianTitle(
                doctor.doctor_translations
              ),
              photoUrl: doctor.photo_url,
              specialtyName,
              cityName,
              clinicName,
              averageRating:
                normalizeNumber(
                  doctor.average_rating
                ) ?? 0,
              reviewCount: doctor.review_count ?? 0,
              consultationPrice: normalizeNumber(
                doctor.consultation_price
              ),
              yearsExperience: doctor.years_experience,
              isVerified:
                doctor.verification_status === "verified",
              hasOnlineAvailability:
                onlineDoctorIds.has(doctor.id),
            },
          ];
        }
      )
      .sort(
        (first, second) =>
          Number(second.isVerified) -
            Number(first.isVerified) ||
          second.averageRating -
            first.averageRating ||
          second.reviewCount - first.reviewCount
      )
      .slice(0, 6);
  }

  return (
    <PublicLayout>
      <main className="bg-[#F0EEE9]">
        <PublicClinicMap />

        <section
          id="doctor-filters"
          className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
                RomDoc
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Găsește medicul potrivit în România
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
                Explorează clinicile aprobate pe hartă, apoi caută
                medici după specialitate, locație și atribute
                importante.
              </p>
            </div>

            <HomepageDoctorFilters
              specialties={specialtyOptions}
            />
          </div>
        </section>

        <HomepageDoctorResults doctors={homepageDoctors} />

        <section
          id="orase"
          className="scroll-mt-24 px-4 pb-12 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#036661]">
              Locații
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Orașe populare
            </h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cityOptions.slice(0, 12).map((city) => (
                <Link
                  key={city.slug}
                  href="/medici"
                  className="romdoc-focus-ring rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-[#036661] hover:text-[#036661]"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section
          id="specialitati"
          className="scroll-mt-24 px-4 pb-16 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#036661]">
              Domenii medicale
            </p>

            <div className="mt-2">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Specializări
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                Descoperă medicii RomDoc după domeniul medical de
                care ai nevoie.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {specialties.slice(0, 12).map((specialty) => {
                const relation = getSingleRelation(
                  specialty.specialties
                );

                return (
                  <Link
                    key={specialty.name}
                    href={
                      relation?.slug
                        ? `/medici/${encodeURIComponent(
                            relation.slug
                          )}`
                        : "/medici"
                    }
                    className="romdoc-focus-ring rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-[#036661] hover:bg-white"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {specialty.name}
                    </h3>

                    {specialty.meta_description && (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {specialty.meta_description}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="mt-7 flex justify-center">
              <Link
                href="/specialitati"
                className="romdoc-button romdoc-button-primary"
              >
                Vezi toate specializările
              </Link>
            </div>
          </div>
        </section>

        <HomepageTrustSection />
        <HomepageDoctorCta />
      </main>
    </PublicLayout>
  );
}
