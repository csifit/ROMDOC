import DoctorDirectoryFilters from "@/components/public/doctor-directory-filters";
import DoctorDirectoryResults from "@/components/public/doctor-directory-results";
import HomepageDoctorFilters from "@/components/public/homepage-doctor-filters";
import PublicClinicMap from "@/components/public/public-clinic-map";
import PublicLayout from "@/components/public/public-layout";
import type { HomepageDoctorCardData } from "@/components/public/homepage-doctor-card";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";

type Locale = "ro" | "en" | "de";
type SearchParams = { city?: string; specialty?: string; verified?: string };
type Props = { searchParams: Promise<SearchParams> };
type Translation = { locale: string; name?: string; title?: string };
type CityRow = { id: string; slug: string; city_translations: Translation[] | null };
type SpecialtyRow = { id: string; slug: string; specialty_translations: Translation[] | null };
type DoctorRow = {
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
  clinics: { id: string; status: string; clinic_translations: Translation[] | null; cities: { slug: string; city_translations: Translation[] | null } | Array<{ slug: string; city_translations: Translation[] | null }> | null } | Array<{ id: string; status: string; clinic_translations: Translation[] | null; cities: { slug: string; city_translations: Translation[] | null } | Array<{ slug: string; city_translations: Translation[] | null }> | null }> | null;
};
type DoctorSpecialtyRow = {
  doctor_id: string;
  specialties: { slug: string; specialty_translations: Translation[] | null } | Array<{ slug: string; specialty_translations: Translation[] | null }> | null;
};
type AvailabilityRow = { doctor_id: string };

const labels = {
  ro: {
    eyebrow: "Director medical RomDoc",
    title: "Găsește medici și clinici în România",
    description: "Explorează clinicile aprobate pe hartă, filtrează medicii după oraș și specialitate sau caută în apropierea unei adrese.",
    national: "Director național",
    filterTitle: "Filtrează lista medicilor",
    filterDescription: "Alege un oraș, o specialitate și, opțional, afișează doar medicii verificați profesional.",
    geo: "Căutare geografică",
    geoTitle: "Caută medici în apropierea unei adrese",
    geoDescription: "Selectează specialitatea, introdu o adresă sau localitate Google și alege raza de căutare.",
    clinicFallback: "Clinică nespecificată",
    countryFallback: "România",
    doctorFallback: "Medic",
  },
  en: {
    eyebrow: "RomDoc medical directory",
    title: "Find doctors and clinics in Romania",
    description: "Explore approved clinics on the map, filter doctors by city and specialty, or search near an address.",
    national: "National directory",
    filterTitle: "Filter the doctor directory",
    filterDescription: "Choose a city and specialty and optionally show only professionally verified doctors.",
    geo: "Geographic search",
    geoTitle: "Find doctors near an address",
    geoDescription: "Choose a specialty, enter a Google address or locality and select the search radius.",
    clinicFallback: "Clinic not specified",
    countryFallback: "Romania",
    doctorFallback: "Doctor",
  },
  de: {
    eyebrow: "RomDoc Ärzteverzeichnis",
    title: "Ärzte und Kliniken in Rumänien finden",
    description: "Entdecken Sie zugelassene Kliniken auf der Karte, filtern Sie Ärzte nach Stadt und Fachrichtung oder suchen Sie in der Nähe einer Adresse.",
    national: "Landesweites Verzeichnis",
    filterTitle: "Ärzteliste filtern",
    filterDescription: "Wählen Sie Stadt und Fachrichtung und zeigen Sie optional nur beruflich verifizierte Ärzte an.",
    geo: "Umkreissuche",
    geoTitle: "Ärzte in der Nähe einer Adresse finden",
    geoDescription: "Wählen Sie eine Fachrichtung, geben Sie eine Google-Adresse oder einen Ort ein und bestimmen Sie den Suchradius.",
    clinicFallback: "Klinik nicht angegeben",
    countryFallback: "Rumänien",
    doctorFallback: "Arzt",
  },
} as const;

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function localized(translations: Translation[] | null | undefined, locale: Locale, field: "name" | "title", fallback: string | null = null) {
  return translations?.find((item) => item.locale === locale)?.[field]
    ?? translations?.find((item) => item.locale === "ro")?.[field]
    ?? translations?.[0]?.[field]
    ?? fallback;
}

function cityName(translations: Translation[] | null | undefined, slug: string, locale: Locale) {
  return localized(translations, locale, "name", slug) ?? slug;
}

function formatDoctorName(slug: string) {
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function numberValue(value: number | string | null) {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeSlug(value?: string) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : "";
}

export default async function DoctorsPage({ searchParams }: Props) {
  const locale = (await getLocale()) as Locale;
  const t = labels[locale];
  const params = await searchParams;
  const selectedCity = safeSlug(params.city);
  const selectedSpecialty = safeSlug(params.specialty);
  const verifiedOnly = params.verified === "true";
  const supabase = await createClient();

  const [citiesResult, specialtiesResult, doctorsResult] = await Promise.all([
    supabase.from("cities").select("id, slug, city_translations(locale,name)").eq("is_active", true).order("slug").limit(200),
    supabase.from("specialties").select("id, slug, specialty_translations(locale,name)").eq("is_active", true).order("slug").limit(200),
    supabase.from("doctors").select("id, slug, photo_url, years_experience, consultation_price, average_rating, review_count, verification_status, doctor_translations(locale,title)").eq("status", "active").order("average_rating", { ascending: false, nullsFirst: false }).limit(100),
  ]);

  if (citiesResult.error) console.error("Doctors directory cities lookup failed:", citiesResult.error);
  if (specialtiesResult.error) console.error("Doctors directory specialties lookup failed:", specialtiesResult.error);
  if (doctorsResult.error) console.error("Doctors directory doctor lookup failed:", doctorsResult.error);

  const cities = (citiesResult.data ?? []) as CityRow[];
  const specialties = (specialtiesResult.data ?? []) as SpecialtyRow[];
  const doctorRows = (doctorsResult.data ?? []) as DoctorRow[];

  const cityOptions = cities.map((city) => ({ slug: city.slug, name: cityName(city.city_translations, city.slug, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale));
  const specialtyOptions = specialties.map((specialty) => ({ slug: specialty.slug, name: localized(specialty.specialty_translations, locale, "name", specialty.slug) ?? specialty.slug })).sort((a, b) => a.name.localeCompare(b.name, locale));

  let doctors: HomepageDoctorCardData[] = [];
  if (doctorRows.length > 0) {
    const doctorIds = doctorRows.map((doctor) => doctor.id);
    const [clinicsResult, doctorSpecialtiesResult, availabilityResult] = await Promise.all([
      supabase.from("doctor_clinics").select("doctor_id, clinics(id,status,clinic_translations(locale,name),cities(slug,city_translations(locale,name)))").in("doctor_id", doctorIds),
      supabase.from("doctor_specialties").select("doctor_id, specialties(slug,specialty_translations(locale,name))").in("doctor_id", doctorIds),
      supabase.from("availability").select("doctor_id").in("doctor_id", doctorIds).eq("is_active", true),
    ]);
    if (clinicsResult.error) console.error("Doctors directory clinics lookup failed:", clinicsResult.error);
    if (doctorSpecialtiesResult.error) console.error("Doctors directory specialties mapping failed:", doctorSpecialtiesResult.error);
    if (availabilityResult.error) console.error("Doctors directory availability lookup failed:", availabilityResult.error);

    const clinicRows = (clinicsResult.data ?? []) as DoctorClinicRow[];
    const specialtyRows = (doctorSpecialtiesResult.data ?? []) as DoctorSpecialtyRow[];
    const onlineDoctorIds = new Set(((availabilityResult.data ?? []) as AvailabilityRow[]).map((row) => row.doctor_id));

    doctors = doctorRows.flatMap((doctor): HomepageDoctorCardData[] => {
      if (verifiedOnly && doctor.verification_status !== "verified") return [];
      const clinicCandidates = clinicRows.filter((row) => row.doctor_id === doctor.id).map((row) => relation(row.clinics)).filter((clinic): clinic is NonNullable<typeof clinic> => Boolean(clinic && clinic.status === "approved"));
      const matchingClinic = selectedCity ? clinicCandidates.find((clinic) => relation(clinic.cities)?.slug === selectedCity) ?? null : clinicCandidates[0] ?? null;
      if (selectedCity && !matchingClinic) return [];

      const specialtyCandidates = specialtyRows.filter((row) => row.doctor_id === doctor.id).map((row) => relation(row.specialties)).filter((specialty): specialty is NonNullable<typeof specialty> => Boolean(specialty));
      const matchingSpecialty = specialtyCandidates.find((specialty) => !selectedSpecialty || specialty.slug === selectedSpecialty) ?? null;
      if (!matchingSpecialty) return [];

      const city = matchingClinic ? relation(matchingClinic.cities) : null;
      const specialtyName = localized(matchingSpecialty.specialty_translations, locale, "name");
      if (!specialtyName) return [];

      return [{
  id: doctor.id,
  slug: doctor.slug,
  name: formatDoctorName(doctor.slug),
  title:
    localized(
      doctor.doctor_translations,
      locale,
      "title",
      t.doctorFallback
    ) ?? t.doctorFallback,
  photoUrl: doctor.photo_url,
  specialtyName,
  cityName: city
    ? cityName(
        city.city_translations,
        city.slug,
        locale
      )
    : t.countryFallback,
  clinicId: matchingClinic?.id ?? "",
  clinicName: matchingClinic
    ? localized(
        matchingClinic.clinic_translations,
        locale,
        "name",
        t.clinicFallback
      ) ?? t.clinicFallback
    : t.clinicFallback,
  averageRating:
    numberValue(doctor.average_rating) ?? 0,
  reviewCount: doctor.review_count ?? 0,
  consultationPrice: numberValue(
    doctor.consultation_price
  ),
  yearsExperience: doctor.years_experience,
  isVerified:
    doctor.verification_status === "verified",
  hasOnlineAvailability: onlineDoctorIds.has(
    doctor.id
  ),
  nextAvailableSlot: null,
}];

});

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9]">
        <section className="px-4 pb-8 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">{t.eyebrow}</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{t.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">{t.description}</p>
          </div>
        </section>

        <PublicClinicMap />

        <section id="doctor-filters" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">{t.national}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{t.filterTitle}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">{t.filterDescription}</p>
              <DoctorDirectoryFilters cities={cityOptions} specialties={specialtyOptions} initialCity={selectedCity} initialSpecialty={selectedSpecialty} initialVerified={verifiedOnly} locale={locale} />
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">{t.geo}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{t.geoTitle}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">{t.geoDescription}</p>
              <HomepageDoctorFilters specialties={specialtyOptions} />
            </div>
          </div>
        </section>

        <DoctorDirectoryResults doctors={doctors} cityName={cityOptions.find((city) => city.slug === selectedCity)?.name ?? null} specialtyName={specialtyOptions.find((specialty) => specialty.slug === selectedSpecialty)?.name ?? null} verifiedOnly={verifiedOnly} locale={locale} />
      </main>
    </PublicLayout>
  );
}}
