import { redirect } from "next/navigation";
import RegisterForm from "@/components/auth/register-form";
import { createClient } from "@/lib/supabase/server";

type TranslationRow = {
  locale: string;
  name: string;
};

type SpecialtyRow = {
  id: string;
  slug: string;
  specialty_translations:
    | TranslationRow[]
    | null;
};

type CityRow = {
  id: string;
  slug: string;
  city_translations:
    | TranslationRow[]
    | null;
};

function getRomanianName(
  translations:
    | TranslationRow[]
    | null,
  fallback: string
) {
  return (
    translations?.find(
      (translation) =>
        translation.locale === "ro"
    )?.name ??
    translations?.[0]?.name ??
    fallback
  );
}

export default async function RegisterPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const [
    specialtiesResult,
    citiesResult,
  ] = await Promise.all([
    supabase
      .from("specialties")
      .select(`
        id,
        slug,
        specialty_translations (
          locale,
          name
        )
      `)
      .order("slug"),

    supabase
      .from("cities")
      .select(`
        id,
        slug,
        city_translations (
          locale,
          name
        )
      `)
      .order("slug"),
  ]);

  if (specialtiesResult.error) {
    console.error(
      "Registration specialties query failed:",
      specialtiesResult.error
    );
  }

  if (citiesResult.error) {
    console.error(
      "Registration cities query failed:",
      citiesResult.error
    );
  }

  const specialtyRows =
    (specialtiesResult.data as unknown as
      | SpecialtyRow[]
      | null) ?? [];

  const cityRows =
    (citiesResult.data as unknown as
      | CityRow[]
      | null) ?? [];

  const specialties =
    specialtyRows.map((specialty) => ({
      id: specialty.id,

      name:
        getRomanianName(
          specialty
            .specialty_translations,
          specialty.slug
        ),
    }));

  const cities =
    cityRows.map((city) => ({
      id: city.id,

      name:
        getRomanianName(
          city.city_translations,
          city.slug
        ),
    }));

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] items-center justify-center">
        <RegisterForm
          cities={cities}
          specialties={specialties}
        />
      </div>
    </main>
  );
}