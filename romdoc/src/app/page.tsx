import { getLocale, getTranslations } from "next-intl/server";

import HomepageDoctorCta from "@/components/public/homepage-doctor-cta";
import HomepageDoctorFilters from "@/components/public/homepage-doctor-filters";
import HomepageDoctorResults from "@/components/public/homepage-doctor-results";
import HomepageTrustSection from "@/components/public/homepage-trust-section";
import PublicClinicMap from "@/components/public/public-clinic-map";
import PublicLayout from "@/components/public/public-layout";
import type { HomepageDoctorCardData } from "@/components/public/homepage-doctor-card";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Locale = "ro" | "en" | "de";
type Translation = { locale: string; name?: string; title?: string };
type CityRow = { slug: string; city_translations: Translation[] | null };
type SpecialtyRow = { slug: string; icon: string | null; specialty_translations: Array<Translation & { meta_description?: string | null }> | null };
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
  clinics: { id: string; status: string; clinic_translations: Translation[] | null; cities: { slug: string; city_translations: Translation[] | null } | Array<{ slug: string; city_translations: Translation[] | null }> | null } | Array<{ id: string; status: string; clinic_translations: Translation[] | null; cities: { slug: string; city_translations: Translation[] | null } | Array<{ slug: string; city_translations: Translation[] | null }> | null }> | null;
};
type DoctorSpecialtyRow = { doctor_id: string; specialties: { specialty_translations: Translation[] | null } | Array<{ specialty_translations: Translation[] | null }> | null };
type AvailabilityRow = { doctor_id: string };

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function localized(translations: Translation[] | null | undefined, locale: Locale, field: "name" | "title") {
  return translations?.find((item) => item.locale === locale)?.[field]
    ?? translations?.find((item) => item.locale === "ro")?.[field]
    ?? translations?.[0]?.[field]
    ?? null;
}

function formatDoctorName(slug: string) {
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function normalizeNumber(value: number | string | null) {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function Home() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("HomePage");
  const supabase = await createClient();

  const [citiesResult, specialtiesResult, doctorCandidatesResult] = await Promise.all([
    supabase.from("cities").select("slug, city_translations(locale,name)").eq("is_active", true).order("slug").limit(100),
    supabase.from("specialties").select("slug, icon, specialty_translations(locale,name,meta_description)").eq("is_active", true).order("slug").limit(100),
    supabase.from("doctors").select("id, slug, photo_url, years_experience, consultation_price, average_rating, review_count, verification_status, doctor_translations(locale,title)").eq("status", "active").order("average_rating", { ascending: false, nullsFirst: false }).limit(18),
  ]);

  if (citiesResult.error) console.error("Homepage cities lookup failed:", citiesResult.error);
  if (specialtiesResult.error) console.error("Homepage specialties lookup failed:", specialtiesResult.error);
  if (doctorCandidatesResult.error) console.error("Homepage doctor candidates lookup failed:", doctorCandidatesResult.error);

  const cities = (citiesResult.data ?? []) as CityRow[];
  const specialties = (specialtiesResult.data ?? []) as SpecialtyRow[];
  const doctorCandidates = (doctorCandidatesResult.data ?? []) as DoctorCandidate[];

  const cityOptions = cities.map((city) => ({
    slug: city.slug,
    name: localized(city.city_translations, locale, "name") ?? city.slug,
  })).sort((a, b) => a.name.localeCompare(b.name, locale));

  const specialtyOptions = specialties.map((specialty) => {
    const selected = specialty.specialty_translations?.find((item) => item.locale === locale)
      ?? specialty.specialty_translations?.find((item) => item.locale === "ro")
      ?? specialty.specialty_translations?.[0]
      ?? null;
    return {
      slug: specialty.slug,
      icon: specialty.icon,
      name: selected?.name ?? specialty.slug,
      meta_description: selected?.meta_description ?? null,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, locale));

  let homepageDoctors: HomepageDoctorCardData[] = [];
  if (doctorCandidates.length > 0) {
    const doctorIds = doctorCandidates.map((doctor) => doctor.id);
    const [clinicsResult, doctorSpecialtiesResult, availabilityResult] = await Promise.all([
      supabase.from("doctor_clinics").select("doctor_id, clinics(id,status,clinic_translations(locale,name),cities(slug,city_translations(locale,name)))").in("doctor_id", doctorIds),
      supabase.from("doctor_specialties").select("doctor_id, specialties(specialty_translations(locale,name))").in("doctor_id", doctorIds),
      supabase.from("availability").select("doctor_id").in("doctor_id", doctorIds).eq("is_active", true),
    ]);

    if (clinicsResult.error) console.error("Homepage doctor clinics lookup failed:", clinicsResult.error);
    if (doctorSpecialtiesResult.error) console.error("Homepage doctor specialties lookup failed:", doctorSpecialtiesResult.error);
    if (availabilityResult.error) console.error("Homepage doctor availability lookup failed:", availabilityResult.error);

    const clinicRows = (clinicsResult.data ?? []) as DoctorClinicRow[];
    const specialtyRows = (doctorSpecialtiesResult.data ?? []) as DoctorSpecialtyRow[];
    const onlineDoctorIds = new Set(((availabilityResult.data ?? []) as AvailabilityRow[]).map((row) => row.doctor_id));

    homepageDoctors = doctorCandidates.flatMap((doctor): HomepageDoctorCardData[] => {
      const clinicRow = clinicRows.find((row) => row.doctor_id === doctor.id && relation(row.clinics)?.status === "approved");
      const clinic = clinicRow ? relation(clinicRow.clinics) : null;
      if (!clinic) return [];
      const city = relation(clinic.cities);
      const clinicName = localized(clinic.clinic_translations, locale, "name");
      const cityName = city ? localized(city.city_translations, locale, "name") ?? city.slug : null;
      const specialtyRow = specialtyRows.find((row) => row.doctor_id === doctor.id);
      const specialty = specialtyRow ? relation(specialtyRow.specialties) : null;
      const specialtyName = localized(specialty?.specialty_translations, locale, "name");
      if (!clinicName || !cityName || !specialtyName) return [];

      return [{
        id: doctor.id,
        slug: doctor.slug,
        name: formatDoctorName(doctor.slug),
        title: localized(doctor.doctor_translations, locale, "title") ?? (locale === "de" ? "Arzt" : locale === "en" ? "Doctor" : "Medic"),
        photoUrl: doctor.photo_url,
        specialtyName,
        cityName,
        clinicName,
        averageRating: normalizeNumber(doctor.average_rating) ?? 0,
        reviewCount: doctor.review_count ?? 0,
        consultationPrice: normalizeNumber(doctor.consultation_price),
        yearsExperience: doctor.years_experience,
        isVerified: doctor.verification_status === "verified",
        hasOnlineAvailability: onlineDoctorIds.has(doctor.id),
      }];
    }).sort((a, b) => Number(b.isVerified) - Number(a.isVerified) || b.averageRating - a.averageRating || b.reviewCount - a.reviewCount).slice(0, 6);
  }

  return (
    <PublicLayout>
      <main className="bg-[#F0EEE9]">
        <PublicClinicMap />

        <section id="doctor-filters" className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">RomDoc</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{t("heroTitle")}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">{t("heroDescription")}</p>
            </div>
            <HomepageDoctorFilters specialties={specialtyOptions.map(({ slug, name }) => ({ slug, name }))} />
          </div>
        </section>

        <HomepageDoctorResults doctors={homepageDoctors} />

        <section id="orase" className="scroll-mt-24 px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#036661]">{t("citiesEyebrow")}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{t("citiesTitle")}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cityOptions.slice(0, 12).map((city) => (
                <Link key={city.slug} href={{ pathname: "/medici", query: { city: city.slug } }} className="romdoc-focus-ring rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-[#036661] hover:text-[#036661]">
                  {city.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="specialitati" className="scroll-mt-24 px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#036661]">{t("specializationsEyebrow")}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{t("specializationsTitle")}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">{t("specializationsDescription")}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {specialtyOptions.slice(0, 12).map((specialty) => (
                <Link key={specialty.slug} href={{ pathname: "/medici/[specialty]", params: { specialty: specialty.slug } }} className="romdoc-focus-ring rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-[#036661] hover:bg-white">
                  <h3 className="font-semibold text-gray-900">{specialty.name}</h3>
                  {specialty.meta_description && <p className="mt-2 text-sm leading-6 text-gray-600">{specialty.meta_description}</p>}
                </Link>
              ))}
            </div>
            <div className="mt-7 flex justify-center"><Link href="/specialitati" className="romdoc-button romdoc-button-primary">{t("allSpecializations")}</Link></div>
          </div>
        </section>

        <HomepageTrustSection />
        <HomepageDoctorCta />
      </main>
    </PublicLayout>
  );
}
