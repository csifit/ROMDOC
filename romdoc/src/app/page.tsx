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

export default async function Home() {
  const supabase =
    await createClient();

  const [
    citiesResult,
    specialtiesResult,
  ] = await Promise.all([
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
      .eq("locale", "ro")
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
      .eq("locale", "ro")
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
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
                RomDoc
              </p>

              <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Găsește medicul potrivit în România
              </h1>

              <p className="mt-5 text-lg leading-8 text-gray-600">
                Descoperă medici, clinici și specialități medicale,
                verifică disponibilitatea și solicită o programare online.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/medici"
                  className="romdoc-button romdoc-button-primary romdoc-button-lg"
                >
                  Găsește un medic
                </a>

                <a
                  href="/register"
                  className="romdoc-button romdoc-button-secondary romdoc-button-lg"
                >
                  Creează cont
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          id="orase"
          className="scroll-mt-24 px-4 pb-12 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#036661]">
                Locații
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Orașe populare
              </h2>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cities.map(
                (city) => (
                  <div
                    key={city.name}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800"
                  >
                    {city.name}
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        <section
          id="specialitati"
          className="scroll-mt-24 px-4 pb-16 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#036661]">
                Domenii medicale
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Specialități
              </h2>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {specialties.map(
                (specialty) => (
                  <article
                    key={
                      specialty.name
                    }
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
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
                  </article>
                )
              )}
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
