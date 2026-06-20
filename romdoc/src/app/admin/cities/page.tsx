import {
  redirect,
} from "next/navigation";
import CitiesManagement from "@/components/admin/cities-management";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function AdminCitiesPage() {
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
      "/login?next=/admin/cities"
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
          Orașe
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Administrează orașele utilizate în filtre, directoare SEO și
          asocierea clinicilor. Fiecare oraș poate avea o denumire în
          română și una în engleză.
        </p>
      </header>

      <CitiesManagement />
    </div>
  );
}