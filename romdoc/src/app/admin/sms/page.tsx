import { redirect } from "next/navigation";

import AdminSmsControlPanel from "@/components/admin/admin-sms-control-panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function canAccessSmsAccounting(profileId: string, role: string) {
  if (role === "admin") {
    return true;
  }

  if (role !== "manager") {
    return false;
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("manager_permissions")
    .select("id")
    .eq("profile_id", profileId)
    .eq("permission_key", "accounting")
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    console.error("SMS page accounting permission query failed:", error);
    return false;
  }

  return Boolean(data);
}

export default async function AdminSmsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/admin/sms");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !== "active" ||
    !(await canAccessSmsAccounting(user.id, profile.role))
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-[#9A4F35]">
            Administrare
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            SMS
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Gestionează serviciul SMS RomDoc, activează sau oprește notificările
            și urmărește numărul de mesaje trimise pe fiecare cont de medic.
          </p>
        </div>

        <a
          href="/api/admin/sms/export"
          className="romdoc-focus-ring w-fit rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49]"
        >
          Export CSV pentru SAGA
        </a>
      </header>

      <AdminSmsControlPanel />
    </div>
  );
}
