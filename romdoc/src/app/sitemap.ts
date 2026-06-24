import type {
  MetadataRoute,
} from "next";

import {
  createClient,
} from "@/lib/supabase/server";

type DoctorRow = {
  id: string;
  slug: string;
  updated_at: string | null;
};

type SpecialtyRow = {
  id: string;
  slug: string;
  updated_at: string | null;
};

type CityRow = {
  id: string;
  slug: string;
  updated_at: string | null;
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
        city_id: string | null;
      }
    | Array<{
        status: string;
        city_id: string | null;
      }>
    | null;
};

type LocalizedPaths = {
  ro: string;
  en: string;
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

function createLocalizedEntries({
  paths,
  lastModified,
  changeFrequency,
  priority,
}: {
  paths: LocalizedPaths;
  lastModified?:
    | string
    | Date
    | null;
  changeFrequency:
    MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}): MetadataRoute.Sitemap {
  const languages = {
    ro: absoluteUrl(paths.ro),
    en: absoluteUrl(paths.en),
    "x-default":
      absoluteUrl(paths.ro),
  };

  const shared = {
    ...(lastModified
      ? {
          lastModified:
            new Date(lastModified),
        }
      : {}),
    changeFrequency,
    priority,
    alternates: {
      languages,
    },
  };

  return [
    {
      url:
        absoluteUrl(paths.ro),
      ...shared,
    },
    {
      url:
        absoluteUrl(paths.en),
      ...shared,
    },
  ];
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
      .select(
        "id, slug, updated_at"
      )
      .eq("status", "active")
      .not("slug", "is", null),

    supabase
      .from("specialties")
      .select(
        "id, slug, updated_at"
      )
      .eq("is_active", true)
      .not("slug", "is", null),

    supabase
      .from("cities")
      .select(
        "id, slug, updated_at"
      )
      .eq("is_active", true)
      .not("slug", "is", null),

    supabase
      .from(
        "doctor_specialties"
      )
      .select(
        "doctor_id, specialty_id"
      ),

    supabase
      .from("doctor_clinics")
      .select(`
        doctor_id,
        clinics (
          status,
          city_id
        )
      `),
  ]);

  if (doctorsResult.error) {
    console.error(
      "Sitemap doctors lookup failed:",
      doctorsResult.error
    );
  }

  if (specialtiesResult.error) {
    console.error(
      "Sitemap specialties lookup failed:",
      specialtiesResult.error
    );
  }

  if (citiesResult.error) {
    console.error(
      "Sitemap cities lookup failed:",
      citiesResult.error
    );
  }

  if (
    doctorSpecialtiesResult.error
  ) {
    console.error(
      "Sitemap doctor specialties lookup failed:",
      doctorSpecialtiesResult.error
    );
  }

  if (doctorClinicsResult.error) {
    console.error(
      "Sitemap doctor clinics lookup failed:",
      doctorClinicsResult.error
    );
  }

  const doctors =
    (
      doctorsResult.data ?? []
    ) as DoctorRow[];

  const specialties =
    (
      specialtiesResult.data ?? []
    ) as SpecialtyRow[];

  const cities =
    (
      citiesResult.data ?? []
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
        (doctor) => doctor.id
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
    new Map<string, Set<string>>();

  for (
    const relation of
    doctorSpecialties
  ) {
    if (
      !activeDoctorIds.has(
        relation.doctor_id
      ) ||
      !specialtyById.has(
        relation.specialty_id
      )
    ) {
      continue;
    }

    const current =
      specialtyIdsByDoctor.get(
        relation.doctor_id
      ) ?? new Set<string>();

    current.add(
      relation.specialty_id
    );

    specialtyIdsByDoctor.set(
      relation.doctor_id,
      current
    );
  }

  const cityIdsByDoctor =
    new Map<string, Set<string>>();

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
      ) ?? new Set<string>();

    current.add(clinic.city_id);

    cityIdsByDoctor.set(
      relation.doctor_id,
      current
    );
  }

  const directoryPairs =
    new Set<string>();

  for (const doctor of doctors) {
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
        const cityId of cityIds
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
        },
        changeFrequency: "daily",
        priority: 1,
      }),

      ...createLocalizedEntries({
        paths: {
          ro: "/ro/medici",
          en: "/en/doctors",
        },
        changeFrequency: "daily",
        priority: 0.9,
      }),

      ...createLocalizedEntries({
        paths: {
          ro: "/ro/specialitati",
          en: "/en/specialties",
        },
        changeFrequency: "weekly",
        priority: 0.8,
      }),

      ...createLocalizedEntries({
        paths: {
          ro: "/ro/ghid-pacienti",
          en: "/en/patient-guide",
        },
        changeFrequency: "monthly",
        priority: 0.65,
      }),
    ];

  for (const doctor of doctors) {
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
        },
        lastModified:
          doctor.updated_at,
        changeFrequency:
          "weekly",
        priority: 0.8,
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
        },
        lastModified:
          specialty.updated_at,
        changeFrequency:
          "weekly",
        priority: 0.7,
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
    ] = pair.split(":");

    const specialty =
      specialtyById.get(
        specialtyId
      );

    const city =
      cityById.get(cityId);

    if (!specialty || !city) {
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
        specialty.updated_at,
        city.updated_at,
      ]
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
        .sort()
        .at(-1) ?? null;

    entries.push(
      ...createLocalizedEntries({
        paths: {
          ro:
            `/ro/medici/${specialtySlug}/${citySlug}`,
          en:
            `/en/doctors/${specialtySlug}/${citySlug}`,
        },
        lastModified:
          latestUpdate,
        changeFrequency:
          "daily",
        priority: 0.75,
      })
    );
  }

  return entries;
}
