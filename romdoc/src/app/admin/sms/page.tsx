import Link from "next/link";
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
      <header>
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
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Export CSV pentru SAGA
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Alege perioada și statusurile dorite. Câmpurile goale exportă toate
              înregistrările disponibile.
            </p>
          </div>

          <Link
            href="/api/admin/sms/export"
            className="romdoc-focus-ring w-fit rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            Export fără filtre
          </Link>
        </div>

        <form
          action="/api/admin/sms/export"
          method="get"
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5"
        >
          <label className="text-sm font-semibold text-gray-700">
            De la
            <input
              type="date"
              name="from"
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal text-gray-950"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Până la
            <input
              type="date"
              name="to"
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal text-gray-950"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Status plată
            <select
              name="paymentStatus"
              defaultValue="all"
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal text-gray-950"
            >
              <option value="all">Toate</option>
              <option value="open">Neplătite / deschise</option>
              <option value="unpaid">Neplătite</option>
              <option value="checkout_open">Checkout deschis</option>
              <option value="paid">Plătite</option>
              <option value="failed">Eșuate</option>
              <option value="cancelled">Anulate</option>
              <option value="refunded">Rambursate</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Status SAGA
            <select
              name="sagaStatus"
              defaultValue="all"
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal text-gray-950"
            >
              <option value="all">Toate</option>
              <option value="missing">Fără factură SAGA</option>
              <option value="not_issued">Neemise</option>
              <option value="issued">Emise</option>
              <option value="cancelled">Anulate</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="romdoc-focus-ring w-full rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49]"
            >
              Descarcă CSV
            </button>
          </div>
        </form>
      </section>

      <AdminSmsControlPanel />
    </div>
  );
}
