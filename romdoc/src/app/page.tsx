import Link from "next/link";
import PublicClinicMap from "@/components/public/public-clinic-map";
import PublicLayout from "@/components/public/public-layout";
import { createClient } from "@/lib/supabase/server";

type CityTranslationRow = {
  name: string;

  cities:
    | {
        slug:
          | string
          | null;
      }
    | Array<{
        slug:
          | string
          | null;
      }>
    | null;
};

type SpecialtyTranslationRow = {
  name: string;

  meta_description:
    | string
    | null;

  specialties:
    | {
        slug:
          | string
          | null;

        icon:
          | string
          | null;
      }
    | Array<{
        slug:
          | string
          | null;

        icon:
          | string
          | null;
      }>
    | null;
};

function getSingleRelation<T>(
  relation:
    | T
    | T[]
    | null
) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export default async function Home() {
  const supabase =
    await createClient();

  const [
    citiesResult,
    specialtiesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "city_translations"
        )
        .select(`
          name,
          cities (
            slug
          )
        `)
        .eq(
          "locale",
          "ro"
        )
        .order("name")
        .limit(12),

      supabase
        .from(
          "specialty_translations"
        )
        .select(`
          name,
          meta_description,
          specialties (
            slug,
            icon
          )
        `)
        .eq(
          "locale",
          "ro"
        )
        .order("name")
        .limit(12),
    ]);

  if (citiesResult.error) {
    console.error(
      "Homepage cities lookup failed:",
      citiesResult.error
    );
  }

  if (
    specialtiesResult.error
  ) {
    console.error(
      "Homepage specialties lookup failed:",
      specialtiesResult.error
    );
  }

  const cities =
    (citiesResult.data ??
      []) as CityTranslationRow[];

  const specialties =
    (specialtiesResult.data ??
      []) as SpecialtyTranslationRow[];

  return (
    <PublicLayout>
      <main className="bg-[#F0EEE9]">
        <PublicClinicMap />

        <section
          id="doctor-filters"
          className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
                  RomDoc
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Găsește medicul potrivit în România
                </h1>

                <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
                  Explorează clinicile aprobate pe hartă, apoi caută medici
                  după specialitate, oraș și statutul de verificare.
                </p>
              </div>

              <Link
                href="/medici"
                className="romdoc-button romdoc-button-primary romdoc-button-lg"
              >
                Deschide directorul medical
              </Link>
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-[#036661]/30 bg-[#036661]/5 p-5">
              <p className="font-semibold text-gray-900">
                Filtrele avansate urmează în Step 59D
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Aici vom adăuga specialitatea, orașul, medicii verificați și
                disponibilitatea programărilor online.
              </p>
            </div>
          </div>
        </section>

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
              {cities.map(
                (city) => {
                  const relation =
                    getSingleRelation(
                      city.cities
                    );

                  return (
                    <Link
                      key={city.name}
                      href={
                        relation?.slug
                          ? `/medici?city=${encodeURIComponent(
                              relation.slug
                            )}`
                          : "/medici"
                      }
                      className="romdoc-focus-ring rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-[#036661] hover:text-[#036661]"
                    >
                      {city.name}
                    </Link>
                  );
                }
              )}
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

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Specialități
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {specialties.map(
                (specialty) => {
                  const relation =
                    getSingleRelation(
                      specialty.specialties
                    );

                  return (
                    <Link
                      key={
                        specialty.name
                      }
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
                        {
                          specialty.name
                        }
                      </h3>

                      {specialty.meta_description && (
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {
                            specialty.meta_description
                          }
                        </p>
                      )}
                    </Link>
                  );
                }
              )}
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
