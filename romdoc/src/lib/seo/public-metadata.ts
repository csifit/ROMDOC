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

const SITE_NAME = "RomDoc";

function getFirstRelation<T>(
  relation: T | T[] | null
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
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
      (translation) =>
        translation.locale === locale
    ) ??
    translations?.find(
      (translation) =>
        translation.locale === "ro"
    ) ??
    translations?.[0] ??
    null
  );
}

function formatSlug(slug: string) {
  return decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function truncate(
  value: string,
  maximumLength = 160
) {
  const normalized =
    value.replace(/\s+/g, " ").trim();

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
  type = "website",
}: {
  locale: AppLocale;
  title: string;
  description: string;
  type?: "website" | "profile";
}): Metadata {
  return {
    title,
    description,
    openGraph: {
      type,
      locale:
        locale === "ro"
          ? "ro_RO"
          : "en_US",
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function getHomeMetadata(
  locale: AppLocale
): Metadata {
  if (locale === "en") {
    return createMetadata({
      locale,
      title:
        "Doctors and medical appointments in Romania",
      description:
        "Find doctors, approved clinics and online medical appointments across Romania with RomDoc.",
    });
  }

  return createMetadata({
    locale,
    title:
      "Medici și programări medicale în România",
    description:
      "Găsește medici, clinici aprobate și programări medicale online în România prin RomDoc.",
  });
}

export function getDoctorsIndexMetadata(
  locale: AppLocale
): Metadata {
  if (locale === "en") {
    return createMetadata({
      locale,
      title:
        "Find doctors in Romania",
      description:
        "Browse RomDoc doctors by specialty, city, professional verification and online availability.",
    });
  }

  return createMetadata({
    locale,
    title:
      "Găsește medici în România",
    description:
      "Caută medici RomDoc după specializare, oraș, verificare profesională și disponibilitate online.",
  });
}

export function getSpecializationsMetadata(
  locale: AppLocale
): Metadata {
  if (locale === "en") {
    return createMetadata({
      locale,
      title:
        "Medical specialties",
      description:
        "Browse medical specialties and find the right doctors and clinics in Romania.",
    });
  }

  return createMetadata({
    locale,
    title:
      "Specializări medicale",
    description:
      "Explorează specializările medicale și găsește medicii și clinicile potrivite în România.",
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
    .eq("status", "active")
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

  const translation =
    getTranslation(
      doctor?.doctor_translations,
      locale
    );

  const firstClinicRelation =
    doctor?.doctor_clinics?.[0] ??
    null;

  const clinic =
    getFirstRelation(
      firstClinicRelation?.clinics ??
      null
    );

  const city =
    getFirstRelation(
      clinic?.cities ?? null
    );

  const clinicName =
    getTranslation(
      clinic?.clinic_translations,
      locale
    )?.name ?? null;

  const cityName =
    getTranslation(
      city?.city_translations,
      locale
    )?.name ?? null;

  const professionalTitle =
    translation?.title?.trim() ??
    null;

  const title =
    translation?.meta_title?.trim() ||
    [
      doctorName,
      professionalTitle,
      cityName,
    ]
      .filter(Boolean)
      .join(" – ");

  const fallbackDescription =
    locale === "en"
      ? `View ${doctorName}'s profile, medical services, clinic information, reviews and appointment availability on RomDoc.`
      : `Vezi profilul ${doctorName}, serviciile medicale, clinica, recenziile și disponibilitatea pentru programări pe RomDoc.`;

  const contextDescription =
    locale === "en"
      ? [
          doctorName,
          professionalTitle,
          clinicName,
          cityName,
        ]
          .filter(Boolean)
          .join(", ")
      : [
          doctorName,
          professionalTitle,
          clinicName,
          cityName,
        ]
          .filter(Boolean)
          .join(", ");

  const description = truncate(
    translation
      ?.meta_description
      ?.trim() ||
      translation?.biography?.trim() ||
      (
        contextDescription
          ? `${contextDescription}. ${fallbackDescription}`
          : fallbackDescription
      )
  );

  return createMetadata({
    locale,
    title:
      title || doctorName,
    description,
    type: "profile",
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
    .eq("slug", specialtySlug)
    .eq("is_active", true)
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

  const translation =
    getTranslation(
      specialty
        ?.specialty_translations,
      locale
    );

  const specialtyName =
    translation?.name?.trim() ||
    formatSlug(specialtySlug);

  const title =
    translation?.meta_title?.trim() ||
    (
      locale === "en"
        ? `${specialtyName} doctors`
        : `Medici ${specialtyName}`
    );

  const description = truncate(
    translation
      ?.meta_description
      ?.trim() ||
      (
        locale === "en"
          ? `Find ${specialtyName.toLowerCase()} doctors, clinics and online appointment options in Romania.`
          : `Găsește medici de ${specialtyName.toLowerCase()}, clinici și opțiuni de programare online în România.`
      )
  );

  return createMetadata({
    locale,
    title,
    description,
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
      .eq("slug", specialtySlug)
      .eq("is_active", true)
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
      .eq("slug", citySlug)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (specialtyResult.error) {
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

  const specialtyTranslation =
    getTranslation(
      specialty
        ?.specialty_translations,
      locale
    );

  const cityTranslation =
    getTranslation(
      city?.city_translations,
      locale
    );

  const specialtyName =
    specialtyTranslation
      ?.name
      ?.trim() ||
    formatSlug(specialtySlug);

  const cityName =
    cityTranslation
      ?.name
      ?.trim() ||
    formatSlug(citySlug);

  const title =
    locale === "en"
      ? `${specialtyName} doctors in ${cityName}`
      : `Medici ${specialtyName} în ${cityName}`;

  const description =
    locale === "en"
      ? `Find ${specialtyName.toLowerCase()} doctors in ${cityName}. Compare clinics, reviews, professional verification and appointment availability.`
      : `Găsește medici de ${specialtyName.toLowerCase()} în ${cityName}. Compară clinicile, recenziile, verificarea profesională și disponibilitatea pentru programări.`;

  return createMetadata({
    locale,
    title,
    description:
      truncate(description),
  });
}
