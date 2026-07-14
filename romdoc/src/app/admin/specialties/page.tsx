import {
  redirect,
} from "next/navigation";

import SpecialtiesManagement
  from "@/components/admin/specialties-management";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function
AdminSpecialtiesPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login?next=/admin/specialties"
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin"
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Administrare
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Specialități
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Adaugă și administrează specialitățile medicale
          disponibile în directoarele RomDoc. Denumirile în
          română și engleză sunt obligatorii în fluxul actual.
          Traducerea în germană și câmpurile SEO sunt opționale
          și pot fi completate manual.
        </p>
      </header>

      <SpecialtiesManagement />
    </div>
  );
}
