import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: cities } = await supabase
    .from("city_translations")
    .select(`
      name,
      locale,
      cities (
        slug
      )
    `)
    .eq("locale", "ro")
    .order("name");

  const { data: specialties } = await supabase
    .from("specialty_translations")
    .select(`
      name,
      locale,
      meta_description,
      specialties (
        slug,
        icon
      )
    `)
    .eq("locale", "ro")
    .order("name");

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Găsește medici în România
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-gray-600">
          RomDoc este o platformă medicală multilingvă pentru găsirea medicilor,
          clinicilor și specialităților medicale.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">
              Orașe
            </h2>

            <ul className="mt-4 space-y-2">
              {cities?.map((city) => (
                <li key={city.name} className="text-gray-700">
                  {city.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">
              Specialități
            </h2>

            <ul className="mt-4 space-y-4">
              {specialties?.map((specialty) => (
                <li key={specialty.name}>
                  <div className="font-medium text-gray-800">
                    {specialty.name}
                  </div>
                  <p className="text-sm text-gray-500">
                    {specialty.meta_description}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}