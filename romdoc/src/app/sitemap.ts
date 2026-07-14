import type {
  MetadataRoute,
} from "next";

import {
  createClient,
} from "@/lib/supabase/server";

type TranslationRow = {
  locale: string;
};

type DoctorRow = {
  id: string;
  slug: string;
  updated_at: string | null;
  doctor_translations:
    TranslationRow[] | null;
};

type SpecialtyRow = {
  id: string;
  slug: string;
  updated_at: string | null;
  specialty_translations:
    TranslationRow[] | null;
};

type CityRow = {
  id: string;
  slug: string;
  updated_at: string | null;
  city_translations:
    TranslationRow[] | null;
};

type DoctorSpecialtyRow = {
  doctor_id: string;
  specialty_id: string;
};

type DoctorClinicRow = {
  doctor_id: string;
  clinics:
    | {
        status: string;
        city_id:
          | string
          | null;
      }
    | Array<{
        status: string;
        city_id:
          | string
          | null;
      }>
    | null;
};

type LocalizedPaths = {
  ro: string;
  en: string;
  de: string;
};

const siteUrl =
  (
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    "https://www.romdoc.fit"
  ).replace(/\/+$/, "");

function absoluteUrl(
  path: string
) {
  return `${siteUrl}${path}`;
}

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

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function hasTranslation(
  translations:
    | TranslationRow[]
    | null
    | undefined,
  locale: string
) {
  return Boolean(
    translations?.some(
      (translation) =>
        translation.locale ===
        locale
    )
  );
}

function createLocalizedEntries({
  paths,
  lastModified,
  changeFrequency,
  priority,
  includeGerman = true,
}: {
  paths: LocalizedPaths;
  lastModified?:
    | string
    | Date
    | null;
  changeFrequency:
    MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  includeGerman?: boolean;
}): MetadataRoute.Sitemap {
  const languages: Record<
    string,
    string
  > = {
    ro:
      absoluteUrl(
        paths.ro
      ),
    en:
      absoluteUrl(
        paths.en
      ),
    "x-default":
      absoluteUrl(
        paths.ro
      ),
  };

  if (includeGerman) {
    languages.de =
      absoluteUrl(
        paths.de
      );
  }

  const shared = {
    ...(lastModified
      ? {
          lastModified:
            new Date(
              lastModified
            ),
        }
      : {}),
    changeFrequency,
    priority,
    alternates: {
      languages,
    },
  };

  const entries:
    MetadataRoute.Sitemap = [
      {
        url:
          absoluteUrl(
            paths.ro
          ),
        ...shared,
      },
      {
        url:
          absoluteUrl(
            paths.en
          ),
        ...shared,
      },
    ];

  if (includeGerman) {
    entries.push({
      url:
        absoluteUrl(
          paths.de
        ),
      ...shared,
    });
  }

  return entries;
}

export default async function
sitemap(): Promise<
  MetadataRoute.Sitemap
> {
  const supabase =
    await createClient();

  const [
    doctorsResult,
    specialtiesResult,
    citiesResult,
    doctorSpecialtiesResult,
    doctorClinicsResult,
  ] = await Promise.all([
    supabase
      .from("doctors")
      .select(`
        id,
        slug,
        updated_at,
        doctor_translations (
          locale
        )
      `)
      .eq(
        "status",
        "active"
      )
      .not(
        "slug",
        "is",
        null
      ),

    supabase
      .from(
        "specialties"
      )
      .select(`
        id,
        slug,
        updated_at,
        specialty_translations (
          locale
        )
      `)
      .eq(
        "is_active",
        true
      )
      .not(
        "slug",
        "is",
        null
      ),

    supabase
      .from("cities")
      .select(`
        id,
        slug,
        updated_at,
        city_translations (
          locale
        )
      `)
      .eq(
        "is_active",
        true
      )
      .not(
        "slug",
        "is",
        null
      ),

    supabase
      .from(
        "doctor_specialties"
      )
      .select(
        "doctor_id, specialty_id"
      ),

    supabase
      .from(
        "doctor_clinics"
      )
      .select(`
        doctor_id,
        clinics (
          status,
          city_id
        )
      `),
  ]);

  for (
    const [label, error] of [
      [
        "doctors",
        doctorsResult.error,
      ],
      [
        "specialties",
        specialtiesResult.error,
      ],
      [
        "cities",
        citiesResult.error,
      ],
      [
        "doctor specialties",
        doctorSpecialtiesResult.error,
      ],
      [
        "doctor clinics",
        doctorClinicsResult.error,
      ],
    ] as const
  ) {
    if (error) {
      console.error(
        `Sitemap ${label} lookup failed:`,
        error
      );
    }
  }

  const doctors =
    (
      doctorsResult.data ??
      []
    ) as DoctorRow[];

  const specialties =
    (
      specialtiesResult.data ??
      []
    ) as SpecialtyRow[];

  const cities =
    (
      citiesResult.data ??
      []
    ) as CityRow[];

  const doctorSpecialties =
    (
      doctorSpecialtiesResult.data ??
      []
    ) as DoctorSpecialtyRow[];

  const doctorClinics =
    (
      doctorClinicsResult.data ??
      []
    ) as DoctorClinicRow[];

  const activeDoctorIds =
    new Set(
      doctors.map(
        (doctor) =>
          doctor.id
      )
    );

  const specialtyById =
    new Map(
      specialties.map(
        (specialty) => [
          specialty.id,
          specialty,
        ]
      )
    );

  const cityById =
    new Map(
      cities.map(
        (city) => [
          city.id,
          city,
        ]
      )
    );

  const specialtyIdsByDoctor =
    new Map<
      string,
      Set<string>
    >();

  for (
    const relation of
    doctorSpecialties
  ) {
    if (
      !activeDoctorIds.has(
        relation.doctor_id
      ) ||
      !specialtyById.has(
        relation
          .specialty_id
      )
    ) {
      continue;
    }

    const current =
      specialtyIdsByDoctor.get(
        relation.doctor_id
      ) ??
      new Set<string>();

    current.add(
      relation
        .specialty_id
    );

    specialtyIdsByDoctor.set(
      relation.doctor_id,
      current
    );
  }

  const cityIdsByDoctor =
    new Map<
      string,
      Set<string>
    >();

  for (
    const relation of
    doctorClinics
  ) {
    if (
      !activeDoctorIds.has(
        relation.doctor_id
      )
    ) {
      continue;
    }

    const clinic =
      getFirstRelation(
        relation.clinics
      );

    if (
      !clinic ||
      clinic.status !==
        "approved" ||
      !clinic.city_id ||
      !cityById.has(
        clinic.city_id
      )
    ) {
      continue;
    }

    const current =
      cityIdsByDoctor.get(
        relation.doctor_id
      ) ??
      new Set<string>();

    current.add(
      clinic.city_id
    );

    cityIdsByDoctor.set(
      relation.doctor_id,
      current
    );
  }

  const directoryPairs =
    new Set<string>();

  for (
    const doctor of
    doctors
  ) {
    const specialtyIds =
      specialtyIdsByDoctor.get(
        doctor.id
      );

    const cityIds =
      cityIdsByDoctor.get(
        doctor.id
      );

    if (
      !specialtyIds ||
      !cityIds
    ) {
      continue;
    }

    for (
      const specialtyId of
      specialtyIds
    ) {
      for (
        const cityId of
        cityIds
      ) {
        directoryPairs.add(
          `${specialtyId}:${cityId}`
        );
      }
    }
  }

  const entries:
    MetadataRoute.Sitemap = [
      ...createLocalizedEntries({
        paths: {
          ro: "/ro",
          en: "/en",
          de: "/de",
        },
        changeFrequency:
          "daily",
        priority: 1,
      }),

      ...createLocalizedEntries({
        paths: {
          ro:
            "/ro/medici",
          en:
            "/en/doctors",
          de:
            "/de/aerzte",
        },
        changeFrequency:
          "daily",
        priority: 0.9,
      }),

      ...createLocalizedEntries({
        paths: {
          ro:
            "/ro/specialitati",
          en:
            "/en/specialties",
          de:
            "/de/fachrichtungen",
        },
        changeFrequency:
          "weekly",
        priority: 0.8,
      }),

      ...createLocalizedEntries({
        paths: {
          ro:
            "/ro/ghid-pacienti",
          en:
            "/en/patient-guide",
          de:
            "/de/patientenratgeber",
        },
        changeFrequency:
          "monthly",
        priority: 0.65,
      }),

      ...createLocalizedEntries({
        paths: {
          ro:
            "/ro/ghid-medici-personal",
          en:
            "/en/doctor-staff-guide",
          de:
            "/de/ratgeber-aerzte-personal",
        },
        changeFrequency:
          "monthly",
        priority: 0.6,
      }),
    ];

  for (
    const doctor of
    doctors
  ) {
    const slug =
      encodeURIComponent(
        doctor.slug
      );

    entries.push(
      ...createLocalizedEntries({
        paths: {
          ro:
            `/ro/doctor/${slug}`,
          en:
            `/en/doctor/${slug}`,
          de:
            `/de/arzt/${slug}`,
        },
        lastModified:
          doctor.updated_at,
        changeFrequency:
          "weekly",
        priority: 0.8,
        includeGerman:
          hasTranslation(
            doctor
              .doctor_translations,
            "de"
          ),
      })
    );
  }

  for (
    const specialty of
    specialties
  ) {
    const slug =
      encodeURIComponent(
        specialty.slug
      );

    entries.push(
      ...createLocalizedEntries({
        paths: {
          ro:
            `/ro/medici/${slug}`,
          en:
            `/en/doctors/${slug}`,
          de:
            `/de/aerzte/${slug}`,
        },
        lastModified:
          specialty.updated_at,
        changeFrequency:
          "weekly",
        priority: 0.7,
        includeGerman:
          hasTranslation(
            specialty
              .specialty_translations,
            "de"
          ),
      })
    );
  }

  for (
    const pair of
    directoryPairs
  ) {
    const [
      specialtyId,
      cityId,
    ] =
      pair.split(":");

    const specialty =
      specialtyById.get(
        specialtyId
      );

    const city =
      cityById.get(
        cityId
      );

    if (
      !specialty ||
      !city
    ) {
      continue;
    }

    const specialtySlug =
      encodeURIComponent(
        specialty.slug
      );

    const citySlug =
      encodeURIComponent(
        city.slug
      );

    const latestUpdate =
      [
        specialty
          .updated_at,
        city.updated_at,
      ]
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
        .sort()
        .at(-1) ??
      null;

    entries.push(
      ...createLocalizedEntries({
        paths: {
          ro:
            `/ro/medici/${specialtySlug}/${citySlug}`,
          en:
            `/en/doctors/${specialtySlug}/${citySlug}`,
          de:
            `/de/aerzte/${specialtySlug}/${citySlug}`,
        },
        lastModified:
          latestUpdate,
        changeFrequency:
          "daily",
        priority: 0.75,
        includeGerman:
          hasTranslation(
            specialty
              .specialty_translations,
            "de"
          ) &&
          hasTranslation(
            city
              .city_translations,
            "de"
          ),
      })
    );
  }

  return entries;
}
