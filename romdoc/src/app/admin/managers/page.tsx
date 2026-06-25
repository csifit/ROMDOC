import { redirect } from "next/navigation";

import ManagersManagement from "@/components/admin/managers-management";
import { createClient } from "@/lib/supabase/server";

export default async function AdminManagersPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?next=/admin/managers"
    );
  }

  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        account_status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    !profile ||
    profile.role !==
      "admin" ||
    profile.account_status !==
      "active"
  ) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          Administrare acces
        </p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Manageri RomDoc
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Invită manageri operaționali și controlează accesul lor.
          Managerii nu pot invita alți manageri și nu pot șterge medici.
        </p>
      </header>

      <div className="mt-8">
        <ManagersManagement />
      </div>
    </main>
  );
}
