import {
  redirect,
} from "next/navigation";
import UsersManagement from "@/components/admin/users-management";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function AdminUsersPage() {
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
      "/login?next=/admin/users"
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      account_status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin" ||
    profile.account_status !==
      "active"
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
          Utilizatori
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Vezi conturile înregistrate, filtrează utilizatorii după rol
          și blochează conturile care încalcă regulile platformei.
          Conturile de administrator sunt protejate.
        </p>
      </header>

      <UsersManagement />
    </div>
  );
}