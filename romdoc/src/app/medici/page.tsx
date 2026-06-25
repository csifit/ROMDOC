import type {
  Metadata,
} from "next";

import DoctorDirectoryFilters from "@/components/public/doctor-directory-filters";
import DoctorDirectoryResults from "@/components/public/doctor-directory-results";
import HomepageDoctorFilters from "@/components/public/homepage-doctor-filters";
import PublicClinicMap from "@/components/public/public-clinic-map";
import PublicLayout from "@/components/public/public-layout";
import type {
  HomepageDoctorCardData,
} from "@/components/public/homepage-doctor-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title:
    "Medici în România | RomDoc",
  description:
    "Descoperă medici din România după specialitate, oraș, verificare profesională și disponibilitate pentru programări online.",
  alternates: {
    canonical:
      "https://www.romdoc.fit/medici",
    languages: {
      ro:
        "https://www.romdoc.fit/medici",
      en:
        "https://www.romdoc.fit/en/doctors",
    },
  },
};

type SearchParams = {
  city?: string;
  specialty?: string;
  verified?: string;
};

type DoctorsPageProps = {
  searchParams: Promise<SearchParams>;
};

type Translation = {
  locale: string;
  name?: string;
  title?: string;
};

type CityRow = {
  id: string;
  slug: string;
  city_translations:
    Translation[] | null;
};

type SpecialtyRow = {
  id: string;
  slug: string;
  specialty_translations:
    Translation[] | null;
};

type DoctorRow = {
  id: string;
  slug: string;
  photo_url: string | null;
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
  verification_status:
    | string
    | null;
  doctor_translations:
    Translation[] | null;
};

type DoctorClinicRow = {
  doctor_id: string;
  clinics:
    | {
        id: string;
        status: string;
        city_id:
          | string
          | null;
        clinic_translations:
          Translation[] | null;
        cities:
          | {
              id: string;
              slug: string;
              city_translations:
                Translation[] | null;
            }
          | Array<{
              id: string;
              slug: string;
              city_translations:
                Translation[] | null;
            }>
          | null;
      }
    | Array<{
        id: string;
        status: string;
        city_id:
          | string
          | null;
        clinic_translations:
          Translation[] | null;
        cities:
          | {
              id: string;
              slug: string;
              city_translations:
                Translation[] | null;
            }
          | Array<{
              id: string;
              slug: string;
              city_translations:
                Translation[] | null;
            }>
          | null;
      }>
    | null;
};

type DoctorSpecialtyRow = {
  doctor_id: string;
  specialties:
    | {
        id: string;
        slug: string;
        specialty_translations:
          Translation[] | null;
      }
    | Array<{
        id: string;
        slug: string;
        specialty_translations:
          Translation[] | null;
      }>
    | null;
};

type AvailabilityRow = {
  doctor_id: string;
};

function getSingleRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
): T | null {
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

  return (
    relation ??
    null
  );
}

function getRomanianName(
  translations:
    | Translation[]
    | null
    | undefined
) {
  return (
    translations?.find(
      (translation) =>
        translation.locale ===
        "ro"
    )?.name ??
    translations?.[0]?.name ??
    null
  );
}

function getRomanianTitle(
  translations:
    | Translation[]
    | null
    | undefined
) {
  return (
    translations?.find(
      (translation) =>
        translation.locale ===
        "ro"
    )?.title ??
    translations?.[0]?.title ??
    "Medic"
  );
}

function formatDoctorName(
  slug: string
) {
  return slug
    .split("-")
    .map(
      (part) =>
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
      : Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function normalizeSlug(
  value:
    | string
    | undefined
) {
  const normalized =
    value
      ?.trim()
      .toLowerCase() ??
    "";

  return /^[a-z0-9-]+$/.test(
    normalized
  )
    ? normalized
    : "";
}

export default async function DoctorsPage({
  searchParams,
}: DoctorsPageProps) {
  const params =
    await searchParams;

  const selectedCity =
    normalizeSlug(
      params.city
    );

  const selectedSpecialty =
    normalizeSlug(
      params.specialty
    );

  const verifiedOnly =
    params.verified ===
    "true";

  const supabase =
    await createClient();

  const [
    citiesResult,
    specialtiesResult,
    doctorsResult,
  ] =
    await Promise.all([
      supabase
        .from("cities")
        .select(`
          id,
          slug,
          city_translations (
            locale,
            name
          )
        `)
        .eq(
          "is_active",
          true
        )
        .order("slug")
        .limit(200),

      supabase
        .from(
          "specialties"
        )
        .select(`
          id,
          slug,
          specialty_translations (
            locale,
            name
          )
        `)
        .eq(
          "is_active",
          true
        )
        .order("slug")
        .limit(200),

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
        .eq(
          "status",
          "active"
        )
        .order(
          "average_rating",
          {
            ascending:
              false,
            nullsFirst:
              false,
          }
        )
        .limit(100),
    ]);

  if (
    citiesResult.error
  ) {
    console.error(
      "Doctors directory cities lookup failed:",
      citiesResult.error
    );
  }

  if (
    specialtiesResult.error
  ) {
    console.error(
      "Doctors directory specialties lookup failed:",
      specialtiesResult.error
    );
  }

  if (
    doctorsResult.error
  ) {
    console.error(
      "Doctors directory doctor lookup failed:",
      doctorsResult.error
    );
  }

  const cities =
    (
      citiesResult.data ??
      []
    ) as CityRow[];

  const specialties =
    (
      specialtiesResult.data ??
      []
    ) as SpecialtyRow[];

  const doctorRows =
    (
      doctorsResult.data ??
      []
    ) as DoctorRow[];

  const cityOptions =
    cities
      .map(
        (city) => ({
          slug:
            city.slug,
          name:
            getRomanianName(
              city
                .city_translations
            ) ??
            city.slug,
        })
      )
      .sort(
        (first, second) =>
          first.name.localeCompare(
            second.name,
            "ro"
          )
      );

  const specialtyOptions =
    specialties
      .map(
        (specialty) => ({
          slug:
            specialty.slug,
          name:
            getRomanianName(
              specialty
                .specialty_translations
            ) ??
            specialty.slug,
        })
      )
      .sort(
        (first, second) =>
          first.name.localeCompare(
            second.name,
            "ro"
          )
      );

  let doctors:
    HomepageDoctorCardData[] =
    [];

  if (
    doctorRows.length >
    0
  ) {
    const doctorIds =
      doctorRows.map(
        (doctor) =>
          doctor.id
      );

    const [
      clinicsResult,
      doctorSpecialtiesResult,
      availabilityResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "doctor_clinics"
          )
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
                id,
                slug,
                city_translations (
                  locale,
                  name
                )
              )
            )
          `)
          .in(
            "doctor_id",
            doctorIds
          ),

        supabase
          .from(
            "doctor_specialties"
          )
          .select(`
            doctor_id,
            specialties (
              id,
              slug,
              specialty_translations (
                locale,
                name
              )
            )
          `)
          .in(
            "doctor_id",
            doctorIds
          ),

        supabase
          .from(
            "availability"
          )
          .select(
            "doctor_id"
          )
          .in(
            "doctor_id",
            doctorIds
          )
          .eq(
            "is_active",
            true
          ),
      ]);

    if (
      clinicsResult.error
    ) {
      console.error(
        "Doctors directory clinics lookup failed:",
        clinicsResult.error
      );
    }

    if (
      doctorSpecialtiesResult.error
    ) {
      console.error(
        "Doctors directory specialties mapping failed:",
        doctorSpecialtiesResult.error
      );
    }

    if (
      availabilityResult.error
    ) {
      console.error(
        "Doctors directory availability lookup failed:",
        availabilityResult.error
      );
    }

    const clinicRows =
      (
        clinicsResult.data ??
        []
      ) as DoctorClinicRow[];

    const specialtyRows =
      (
        doctorSpecialtiesResult.data ??
        []
      ) as DoctorSpecialtyRow[];

    const availabilityRows =
      (
        availabilityResult.data ??
        []
      ) as AvailabilityRow[];

    const onlineDoctorIds =
      new Set(
        availabilityRows.map(
          (row) =>
            row.doctor_id
        )
      );

    doctors =
      doctorRows.flatMap(
        (
          doctor
        ):
          HomepageDoctorCardData[] => {
          if (
            verifiedOnly &&
            doctor
              .verification_status !==
              "verified"
          ) {
            return [];
          }

          const clinicCandidates =
            clinicRows
              .filter(
                (row) =>
                  row.doctor_id ===
                  doctor.id
              )
              .map(
                (row) =>
                  getSingleRelation(
                    row.clinics
                  )
              )
              .filter(
                (
                  clinic
                ): clinic is Exclude<
                  typeof clinic,
                  null
                > =>
                  clinic !== null
              );

          const matchingClinic =
            selectedCity
              ? clinicCandidates.find(
                  (clinic) => {
                    const city =
                      getSingleRelation(
                        clinic.cities
                      );

                    return (
                      city?.slug ===
                      selectedCity
                    );
                  }
                ) ?? null
              : clinicCandidates[0] ??
                null;

          if (
            selectedCity &&
            !matchingClinic
          ) {
            return [];
          }

          const specialtyCandidates =
            specialtyRows
              .filter(
                (row) =>
                  row.doctor_id ===
                  doctor.id
              )
              .map(
                (row) =>
                  getSingleRelation(
                    row.specialties
                  )
              )
              .filter(
                (
                  specialty
                ): specialty is Exclude<
                  typeof specialty,
                  null
                > =>
                  specialty !== null
              );

          const matchingSpecialty =
            specialtyCandidates.find(
              (specialty) =>
                !selectedSpecialty ||
                specialty.slug ===
                  selectedSpecialty
            ) ?? null;

          if (
            !matchingSpecialty
          ) {
            return [];
          }

          const city =
            matchingClinic
              ? getSingleRelation(
                  matchingClinic.cities
                )
              : null;

          const clinicName =
            matchingClinic
              ? getRomanianName(
                  matchingClinic
                    .clinic_translations
                ) ??
                "Clinică nespecificată"
              : "Clinică nespecificată";

          const cityName =
            city
              ? getRomanianName(
                  city.city_translations
                ) ??
                "România"
              : "România";

          const specialtyName =
            getRomanianName(
              matchingSpecialty
                .specialty_translations
            );

          if (
            !specialtyName
          ) {
            return [];
          }

          return [
            {
              id:
                doctor.id,
              slug:
                doctor.slug,
              name:
                formatDoctorName(
                  doctor.slug
                ),
              title:
                getRomanianTitle(
                  doctor
                    .doctor_translations
                ),
              photoUrl:
                doctor.photo_url,
              specialtyName,
              cityName,
              clinicName,
              averageRating:
                normalizeNumber(
                  doctor
                    .average_rating
                ) ?? 0,
              reviewCount:
                doctor
                  .review_count ??
                0,
              consultationPrice:
                normalizeNumber(
                  doctor
                    .consultation_price
                ),
              yearsExperience:
                doctor
                  .years_experience,
              isVerified:
                doctor
                  .verification_status ===
                "verified",
              hasOnlineAvailability:
                onlineDoctorIds.has(
                  doctor.id
                ),
            },
          ];
        }
      );
  }

  const selectedCityName =
    cityOptions.find(
      (city) =>
        city.slug ===
        selectedCity
    )?.name ??
    null;

  const selectedSpecialtyName =
    specialtyOptions.find(
      (specialty) =>
        specialty.slug ===
        selectedSpecialty
    )?.name ??
    null;

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9]">
        <section className="px-4 pb-8 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              Director medical RomDoc
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Găsește medici și clinici în România
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
              Explorează clinicile aprobate pe hartă, filtrează medicii după
              oraș și specialitate sau caută în apropierea unei adrese.
            </p>
          </div>
        </section>

        <PublicClinicMap />

        <section
          id="doctor-filters"
          className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                  Director național
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                  Filtrează lista medicilor
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Alege un oraș, o specialitate și, opțional, afișează doar
                  medicii verificați profesional.
                </p>
              </div>

              <DoctorDirectoryFilters
                cities={
                  cityOptions
                }
                specialties={
                  specialtyOptions
                }
                initialCity={
                  selectedCity
                }
                initialSpecialty={
                  selectedSpecialty
                }
                initialVerified={
                  verifiedOnly
                }
              />
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                  Căutare geografică
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                  Caută medici în apropierea unei adrese
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Selectează specialitatea, introdu o adresă sau localitate
                  Google și alege raza de căutare.
                </p>
              </div>

              <HomepageDoctorFilters
                specialties={
                  specialtyOptions
                }
              />
            </div>
          </div>
        </section>

        <DoctorDirectoryResults
          doctors={doctors}
          cityName={
            selectedCityName
          }
          specialtyName={
            selectedSpecialtyName
          }
          verifiedOnly={
            verifiedOnly
          }
        />
      </main>
    </PublicLayout>
  );
}
