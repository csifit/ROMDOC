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

  const {
    data: specialtiesData,
    error: specialtiesError,
  } = await supabase
    .from("specialties")
    .select(`
      id,
      slug,
      specialty_translations (
        locale,
        name
      )
    `)
    .order("slug");

  if (specialtiesError) {
    console.error(
      "Registration specialties query failed:",
      specialtiesError
    );
  }

  const specialtyRows =
    (specialtiesData as unknown as
      | SpecialtyRow[]
      | null) ?? [];

  const specialties =
    specialtyRows
      .map((specialty) => ({
        id: specialty.id,

        name:
          getRomanianName(
            specialty
              .specialty_translations,
            specialty.slug
          ),
      }))
      .sort((first, second) =>
        first.name.localeCompare(
          second.name,
          "ro"
        )
      );

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] items-center justify-center">
        <RegisterForm
          specialties={specialties}
        />
      </div>
    </main>
  );
}