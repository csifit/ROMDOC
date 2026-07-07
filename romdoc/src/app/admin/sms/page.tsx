import { redirect } from "next/navigation";

import AdminSmsControlPanel from "@/components/admin/admin-sms-control-panel";
import { createClient } from "@/lib/supabase/server";

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
    profile?.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Administrare
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          SMS
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Gestionează serviciul SMS RomDoc, activează sau oprește notificările și urmărește numărul de mesaje trimise pe fiecare cont de medic.
        </p>
      </header>

      <AdminSmsControlPanel />
    </div>
  );
}
