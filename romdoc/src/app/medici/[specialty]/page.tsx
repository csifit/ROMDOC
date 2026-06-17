import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    specialty: string;
  }>;
};

export default async function SpecialtyPage({ params }: Props) {
  const { specialty } = await params;

  const supabase = await createClient();

  const { data: specialtyData } = await supabase
    .from("specialties")
    .select(`
      id,
      slug,
      specialty_translations (
        locale,
        name,
        meta_title,
        meta_description
      )
    `)
    .eq("slug", specialty)
    .single();

  if (!specialtyData) {
    notFound();
  }

  const translation = specialtyData.specialty_translations?.find(
    (t: { locale: string }) => t.locale === "ro"
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold">
        {translation?.name}
      </h1>

      <p className="mt-4 text-gray-600">
        {translation?.meta_description}
      </p>

      <div className="mt-8 rounded-lg border p-6">
        <p>
          În curând aici vor fi afișați medicii pentru specialitatea:
        </p>

        <p className="mt-2 font-semibold">
          {translation?.name}
        </p>
      </div>
    </main>
  );
}