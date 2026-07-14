import { getLocale } from "next-intl/server";

import PublicLayout from "@/components/public/public-layout";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Locale = "ro" | "en" | "de";
type SpecialtyTranslation = { locale: string; name: string; meta_description: string | null };
type SpecialtyRow = { id: string; slug: string; icon: string | null; specialty_translations: SpecialtyTranslation[] | null };

const labels = {
  ro: { eyebrow: "Director medical", title: "Toate specializările medicale", description: "Alege specializarea medicală potrivită pentru a descoperi medicii disponibili în RomDoc.", search: "Caută un medic", list: "Lista specializărilor", view: "Vezi medici", empty: "Specializările nu sunt disponibile momentan", emptyHelp: "Revino în curând sau folosește formularul principal de căutare." },
  en: { eyebrow: "Medical directory", title: "All medical specialties", description: "Choose the appropriate medical specialty to discover doctors available on RomDoc.", search: "Find a doctor", list: "Specialty list", view: "View doctors", empty: "Specialties are currently unavailable", emptyHelp: "Please return soon or use the main search form." },
  de: { eyebrow: "Ärzteverzeichnis", title: "Alle medizinischen Fachrichtungen", description: "Wählen Sie die passende medizinische Fachrichtung, um verfügbare Ärzte auf RomDoc zu finden.", search: "Arzt suchen", list: "Liste der Fachrichtungen", view: "Ärzte anzeigen", empty: "Fachrichtungen sind derzeit nicht verfügbar", emptyHelp: "Bitte versuchen Sie es später erneut oder verwenden Sie die Hauptsuche." },
} as const;

function getTranslation(translations: SpecialtyTranslation[] | null, locale: Locale) {
  return translations?.find((item) => item.locale === locale)
    ?? translations?.find((item) => item.locale === "ro")
    ?? translations?.[0]
    ?? null;
}

export default async function SpecialtiesPage() {
  const locale = (await getLocale()) as Locale;
  const t = labels[locale];
  const supabase = await createClient();
  const { data, error } = await supabase.from("specialties").select("id, slug, icon, specialty_translations(locale,name,meta_description)").eq("is_active", true).order("slug");
  if (error) console.error("Public specialties lookup failed:", error);

  const specialties = ((data ?? []) as SpecialtyRow[]).map((specialty) => {
    const translation = getTranslation(specialty.specialty_translations, locale);
    return { id: specialty.id, slug: specialty.slug, icon: specialty.icon, name: translation?.name ?? specialty.slug, description: translation?.meta_description ?? null };
  }).sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">{t.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{t.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">{t.description}</p>
            <div className="mt-7"><Link href={{ pathname: "/", hash: "doctor-filters" }} className="romdoc-button romdoc-button-secondary">{t.search}</Link></div>
          </header>

          {specialties.length > 0 ? (
            <section aria-labelledby="specialties-title" className="mt-8">
              <h2 id="specialties-title" className="sr-only">{t.list}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {specialties.map((specialty) => (
                  <Link key={specialty.id} href={{ pathname: "/medici/[specialty]", params: { specialty: specialty.slug } }} className="romdoc-focus-ring rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#036661] hover:shadow-md">
                    <div className="flex items-start gap-4">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#036661]/10 text-xl text-[#036661]">{specialty.icon ?? "✚"}</span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">{specialty.name}</h3>
                        {specialty.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{specialty.description}</p>}
                        <span className="mt-4 inline-flex text-sm font-semibold text-[#036661]">{t.view}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <section className="mt-8 rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">{t.empty}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{t.emptyHelp}</p>
            </section>
          )}
        </div>
      </main>
    </PublicLayout>
  );
}
