import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    specialty: string;
    city: string;
  }>;
};

export default async function SpecialtyCityPage({ params }: Props) {
  const { specialty, city } = await params;

  const supabase = await createClient();

  const { data: specialtyData } = await supabase
    .from("specialties")
    .select(`
      id,
      slug,
      specialty_translations (
        locale,
        name,
        meta_description
      )
    `)
    .eq("slug", specialty)
    .single();

  const { data: cityData } = await supabase
    .from("cities")
    .select(`
      id,
      slug,
      city_translations (
        locale,
        name
      )
    `)
    .eq("slug", city)
    .single();

  if (!specialtyData || !cityData) {
    notFound();
  }

  const specialtyTranslation = specialtyData.specialty_translations?.find(
    (t: { locale: string }) => t.locale === "ro"
  );

  const cityTranslation = cityData.city_translations?.find(
    (t: { locale: string }) => t.locale === "ro"
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold">
        {specialtyTranslation?.name} în {cityTranslation?.name}
      </h1>

      <p className="mt-4 text-gray-600">
        Găsește medici pentru {specialtyTranslation?.name.toLowerCase()} în{" "}
        {cityTranslation?.name} și trimite o cerere de programare online.
      </p>

      <div className="mt-8 rounded-lg border p-6">
        <p>
          În curând aici vor fi afișați medicii disponibili în{" "}
          {cityTranslation?.name}.
        </p>
      </div>
    </main>
  );
}