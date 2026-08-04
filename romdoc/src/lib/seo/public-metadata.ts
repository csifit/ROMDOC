import type {
  Metadata,
} from "next";

import {
  createClient,
} from "@/lib/supabase/server";
import {
  type AppLocale,
} from "@/i18n/routing";

type Translation = {
  locale: string;
  name?: string | null;
  title?: string | null;
  biography?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

type CityRelation = {
  city_translations:
    Translation[] | null;
};

type ClinicRelation = {
  clinic_translations:
    Translation[] | null;
  cities:
    | CityRelation
    | CityRelation[]
    | null;
};

type DoctorClinicRelation = {
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type DoctorMetadataRow = {
  slug: string;
  doctor_translations:
    Translation[] | null;
  doctor_clinics:
    DoctorClinicRelation[] | null;
};

type SpecialtyMetadataRow = {
  slug: string;
  specialty_translations:
    Translation[] | null;
};

type CityMetadataRow = {
  slug: string;
  city_translations:
    Translation[] | null;
};

type LocalizedPaths = {
  ro: string;
  en: string;
  de: string;
};

const SITE_NAME = "RomDoc";

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

function getExactTranslation(
  translations:
    | Translation[]
    | null
    | undefined,
  locale: AppLocale
) {
  return (
    translations?.find(
      (translation) =>
        translation.locale === locale
    ) ?? null
  );
}

function getTranslation(
  translations:
    | Translation[]
    | null
    | undefined,
  locale: AppLocale
) {
  return (
    getExactTranslation(
      translations,
      locale
    ) ??
    translations?.find(
      (translation) =>
        translation.locale === "ro"
    ) ??
    translations?.[0] ??
    null
  );
}

function formatSlug(
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

function truncate(
  value: string,
  maximumLength = 160
) {
  const normalized =
    value
      .replace(/\s+/g, " ")
      .trim();

  if (
    normalized.length <=
    maximumLength
  ) {
    return normalized;
  }

  return `${normalized
    .slice(
      0,
      maximumLength - 1
    )
    .trimEnd()}…`;
}

function createMetadata({
  locale,
  title,
  description,
  paths,
  type = "website",
  indexable = true,
}: {
  locale: AppLocale;
  title: string;
  description: string;
  paths: LocalizedPaths;
  type?: "website" | "profile";
  indexable?: boolean;
}): Metadata {
  const canonical =
    paths[locale];

  const openGraphLocale:
    Record<AppLocale, string> = {
      ro: "ro_RO",
      en: "en_US",
      de: "de_DE",
    };

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ro: paths.ro,
        en: paths.en,
        de: paths.de,
        "x-default":
          paths.ro,
      },
    },
    robots: {
      index: indexable,
      follow: true,
    },
    openGraph: {
      type,
      locale:
        openGraphLocale[
          locale
        ],
      siteName:
        SITE_NAME,
      title,
      description,
      url: canonical,
    },
    twitter: {
      card:
        "summary_large_image",
      title,
      description,
    },
  };
}

export function
getHomeMetadata(
  locale: AppLocale
): Metadata {
  const copy: Record<
    AppLocale,
    {
      title: string;
      description: string;
    }
  > = {
    ro: {
      title:
        "Medici și programări medicale în România",
      description:
        "Catalogul medicilor, clinicilor și gestionarea programărilor medicale.",
    },
    en: {
      title:
        "Doctors and medical appointments",
      description:
        "Find doctors, approved clinics and online medical appointments with RomDoc.",
    },
    de: {
      title:
        "Ärzte und medizinische Termine",
      description:
        "Ärzte- und Klinikverzeichnis mit Verwaltung medizinischer Termine.",
    },
  };

  return createMetadata({
    locale,
    ...copy[locale],
    paths: {
      ro: "/ro",
      en: "/en",
      de: "/de",
    },
  });
}

export function
getDoctorsIndexMetadata(
  locale: AppLocale
): Metadata {
  const copy: Record<
    AppLocale,
    {
      title: string;
      description: string;
    }
  > = {
    ro: {
      title:
        "Găsește medici în România",
      description:
        "Caută medici RomDoc după specializare, oraș, verificare profesională și disponibilitate online.",
    },
    en: {
      title:
        "Find doctors",
      description:
        "Browse RomDoc doctors by specialty, city, professional verification and online availability.",
    },
    de: {
      title:
        "Ärzte finden",
      description:
        "Durchsuchen Sie RomDoc-Ärzte nach Fachrichtung, Stadt, beruflicher Verifizierung und Online-Verfügbarkeit.",
    },
  };

  return createMetadata({
    locale,
    ...copy[locale],
    paths: {
      ro: "/ro/medici",
      en: "/en/doctors",
      de: "/de/aerzte",
    },
  });
}

export function
getSpecializationsMetadata(
  locale: AppLocale
): Metadata {
  const copy: Record<
    AppLocale,
    {
      title: string;
      description: string;
    }
  > = {
    ro: {
      title:
        "Specializări medicale",
      description:
        "Explorează specializările medicale și găsește medicii și clinicile potrivite în România.",
    },
    en: {
      title:
        "Medical specialties",
      description:
        "Browse medical specialties and find suitable doctors and clinics.",
    },
    de: {
      title:
        "Medizinische Fachrichtungen",
      description:
        "Entdecken Sie medizinische Fachrichtungen und finden Sie passende Ärzte und Kliniken.",
    },
  };

  return createMetadata({
    locale,
    ...copy[locale],
    paths: {
      ro:
        "/ro/specialitati",
      en:
        "/en/specialties",
      de:
        "/de/fachrichtungen",
    },
  });
}

export async function
getDoctorProfileMetadata({
  locale,
  slug,
}: {
  locale: AppLocale;
  slug: string;
}): Promise<Metadata> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("doctors")
    .select(`
      slug,
      doctor_translations (
        locale,
        title,
        biography,
        meta_title,
        meta_description
      ),
      doctor_clinics (
        clinics (
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
      )
    `)
    .eq("slug", slug)
    .eq(
      "status",
      "active"
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Doctor metadata lookup failed:",
      error
    );
  }

  const doctor =
    data as
      | DoctorMetadataRow
      | null;

  const doctorName =
    formatSlug(slug);

  const exactTranslation =
    getExactTranslation(
      doctor
        ?.doctor_translations,
      locale
    );

  const translation =
    getTranslation(
      doctor
        ?.doctor_translations,
      locale
    );

  const firstClinicRelation =
    doctor
      ?.doctor_clinics?.[0] ??
    null;

  const clinic =
    getFirstRelation(
      firstClinicRelation
        ?.clinics
    );

  const city =
    getFirstRelation(
      clinic?.cities
    );

  const clinicName =
    getTranslation(
      clinic
        ?.clinic_translations,
      locale
    )?.name ?? null;

  const cityName =
    getTranslation(
      city
        ?.city_translations,
      locale
    )?.name ?? null;

  const professionalTitle =
    translation
      ?.title
      ?.trim() ??
    null;

  const title =
    translation
      ?.meta_title
      ?.trim() ||
    [
      doctorName,
      professionalTitle,
      cityName,
    ]
      .filter(Boolean)
      .join(" – ");

  const fallbackDescription:
    Record<AppLocale, string> = {
      ro:
        `Vezi profilul ${doctorName}, serviciile medicale, clinica, recenziile și disponibilitatea pentru programări pe RomDoc.`,
      en:
        `View ${doctorName}'s profile, medical services, clinic information, reviews and appointment availability on RomDoc.`,
      de:
        `Sehen Sie das Profil von ${doctorName}, medizinische Leistungen, Klinikangaben, Bewertungen und Terminverfügbarkeit auf RomDoc.`,
    };

  const contextDescription =
    [
      doctorName,
      professionalTitle,
      clinicName,
      cityName,
    ]
      .filter(Boolean)
      .join(", ");

  const description =
    truncate(
      translation
        ?.meta_description
        ?.trim() ||
      translation
        ?.biography
        ?.trim() ||
      (
        contextDescription
          ? `${contextDescription}. ${fallbackDescription[locale]}`
          : fallbackDescription[
              locale
            ]
      )
    );

  const encodedSlug =
    encodeURIComponent(
      slug
    );

  return createMetadata({
    locale,
    title:
      title ||
      doctorName,
    description,
    paths: {
      ro:
        `/ro/doctor/${encodedSlug}`,
      en:
        `/en/doctor/${encodedSlug}`,
      de:
        `/de/arzt/${encodedSlug}`,
    },
    type: "profile",
    indexable:
      locale !== "de" ||
      Boolean(
        exactTranslation
      ),
  });
}

export async function
getSpecialtyMetadata({
  locale,
  specialtySlug,
}: {
  locale: AppLocale;
  specialtySlug: string;
}): Promise<Metadata> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("specialties")
    .select(`
      slug,
      specialty_translations (
        locale,
        name,
        meta_title,
        meta_description
      )
    `)
    .eq(
      "slug",
      specialtySlug
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Specialty metadata lookup failed:",
      error
    );
  }

  const specialty =
    data as
      | SpecialtyMetadataRow
      | null;

  const exactTranslation =
    getExactTranslation(
      specialty
        ?.specialty_translations,
      locale
    );

  const translation =
    getTranslation(
      specialty
        ?.specialty_translations,
      locale
    );

  const specialtyName =
    translation
      ?.name
      ?.trim() ||
    formatSlug(
      specialtySlug
    );

  const titleFallback:
    Record<AppLocale, string> = {
      ro:
        `Medici ${specialtyName}`,
      en:
        `${specialtyName} doctors`,
      de:
        `Ärzte für ${specialtyName}`,
    };

  const descriptionFallback:
    Record<AppLocale, string> = {
      ro:
        `Găsește medici de ${specialtyName.toLowerCase()}, clinici și opțiuni de programare online.`,
      en:
        `Find ${specialtyName.toLowerCase()} doctors, clinics and online appointment options.`,
      de:
        `Finden Sie Ärzte für ${specialtyName}, Kliniken und Online-Terminoptionen.`,
    };

  const encodedSpecialtySlug =
    encodeURIComponent(
      specialtySlug
    );

  return createMetadata({
    locale,
    title:
      translation
        ?.meta_title
        ?.trim() ||
      titleFallback[locale],
    description:
      truncate(
        translation
          ?.meta_description
          ?.trim() ||
        descriptionFallback[
          locale
        ]
      ),
    paths: {
      ro:
        `/ro/medici/${encodedSpecialtySlug}`,
      en:
        `/en/doctors/${encodedSpecialtySlug}`,
      de:
        `/de/aerzte/${encodedSpecialtySlug}`,
    },
    indexable:
      locale !== "de" ||
      Boolean(
        exactTranslation
          ?.name
          ?.trim()
      ),
  });
}

export async function
getDirectoryMetadata({
  locale,
  specialtySlug,
  citySlug,
}: {
  locale: AppLocale;
  specialtySlug: string;
  citySlug: string;
}): Promise<Metadata> {
  const supabase =
    await createClient();

  const [
    specialtyResult,
    cityResult,
  ] = await Promise.all([
    supabase
      .from(
        "specialties"
      )
      .select(`
        slug,
        specialty_translations (
          locale,
          name,
          meta_title,
          meta_description
        )
      `)
      .eq(
        "slug",
        specialtySlug
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle(),

    supabase
      .from("cities")
      .select(`
        slug,
        city_translations (
          locale,
          name
        )
      `)
      .eq(
        "slug",
        citySlug
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle(),
  ]);

  if (
    specialtyResult.error
  ) {
    console.error(
      "Directory specialty metadata lookup failed:",
      specialtyResult.error
    );
  }

  if (cityResult.error) {
    console.error(
      "Directory city metadata lookup failed:",
      cityResult.error
    );
  }

  const specialty =
    specialtyResult.data as
      | SpecialtyMetadataRow
      | null;

  const city =
    cityResult.data as
      | CityMetadataRow
      | null;

  const exactSpecialty =
    getExactTranslation(
      specialty
        ?.specialty_translations,
      locale
    );

  const exactCity =
    getExactTranslation(
      city
        ?.city_translations,
      locale
    );

  const specialtyName =
    getTranslation(
      specialty
        ?.specialty_translations,
      locale
    )
      ?.name
      ?.trim() ||
    formatSlug(
      specialtySlug
    );

  const cityName =
    getTranslation(
      city
        ?.city_translations,
      locale
    )
      ?.name
      ?.trim() ||
    formatSlug(
      citySlug
    );

  const titles:
    Record<AppLocale, string> = {
      ro:
        `Medici ${specialtyName} în ${cityName}`,
      en:
        `${specialtyName} doctors in ${cityName}`,
      de:
        `Ärzte für ${specialtyName} in ${cityName}`,
    };

  const descriptions:
    Record<AppLocale, string> = {
      ro:
        `Găsește medici de ${specialtyName.toLowerCase()} în ${cityName}. Compară clinicile, recenziile, verificarea profesională și disponibilitatea pentru programări.`,
      en:
        `Find ${specialtyName.toLowerCase()} doctors in ${cityName}. Compare clinics, reviews, professional verification and appointment availability.`,
      de:
        `Finden Sie Ärzte für ${specialtyName} in ${cityName}. Vergleichen Sie Kliniken, Bewertungen, berufliche Verifizierung und Terminverfügbarkeit.`,
    };

  const encodedSpecialtySlug =
    encodeURIComponent(
      specialtySlug
    );

  const encodedCitySlug =
    encodeURIComponent(
      citySlug
    );

  return createMetadata({
    locale,
    title:
      titles[locale],
    description:
      truncate(
        descriptions[
          locale
        ]
      ),
    paths: {
      ro:
        `/ro/medici/${encodedSpecialtySlug}/${encodedCitySlug}`,
      en:
        `/en/doctors/${encodedSpecialtySlug}/${encodedCitySlug}`,
      de:
        `/de/aerzte/${encodedSpecialtySlug}/${encodedCitySlug}`,
    },
    indexable:
      locale !== "de" ||
      Boolean(
        exactSpecialty
          ?.name
          ?.trim() &&
        exactCity
          ?.name
          ?.trim()
      ),
  });
}
