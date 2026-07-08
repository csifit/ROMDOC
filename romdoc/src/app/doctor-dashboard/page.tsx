import Link from "next/link";
import { redirect } from "next/navigation";

import DoctorOnboardingChecklist from "@/components/doctor/doctor-onboarding-checklist";
import { getDoctorProfileCompletion } from "@/lib/doctors/get-doctor-profile-completion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SmsUsageLogRow = {
  status: string;
  invoice_status: string | null;
  unit_cost_minor: number | null;
};

function getCurrentMonthBounds() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    monthStartIso: monthStart.toISOString(),
    nextMonthStartIso: nextMonthStart.toISOString(),
  };
}

function formatMoney(minorAmount: number, currency = "RON") {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minorAmount / 100);
}

export default async function DoctorDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/doctor-dashboard");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      account_status,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "doctor" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const completion = await getDoctorProfileCompletion(
    supabase,
    user.id,
    profile.first_name,
    profile.last_name
  );

  if (!completion) {
    return (
      <main className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
            Contul este activ, dar profilul de medic nu a putut fi
            găsit. Verifică activarea abonamentului sau contactează
            suportul RomDoc.
          </div>
        </div>
      </main>
    );
  }

  const admin = createAdminClient();
  const { monthStartIso, nextMonthStartIso } = getCurrentMonthBounds();

  const { data: smsLogsData, error: smsLogsError } = await admin
    .from("sms_delivery_logs")
    .select("status, invoice_status, unit_cost_minor")
    .eq("doctor_id", completion.doctorId)
    .gte("created_at", monthStartIso)
    .lt("created_at", nextMonthStartIso);

  if (smsLogsError) {
    console.error("Doctor dashboard SMS usage query failed:", smsLogsError);
  }

  const smsLogs = (smsLogsData ?? []) as SmsUsageLogRow[];

  const smsUsage = smsLogs.reduce(
    (currentUsage, log) => {
      const invoiceStatus = log.invoice_status ?? "not_billable";
      const unitCostMinor = log.unit_cost_minor ?? 30;

      if (log.status === "sent") {
        currentUsage.sent += 1;
      }

      if (invoiceStatus === "invoiced") {
        currentUsage.invoiced += 1;
      }

      if (invoiceStatus === "uninvoiced") {
        currentUsage.uninvoiced += 1;
        currentUsage.uninvoicedValueMinor += unitCostMinor;
      }

      return currentUsage;
    },
    {
      sent: 0,
      invoiced: 0,
      uninvoiced: 0,
      uninvoicedValueMinor: 0,
    }
  );

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold text-[#036661]">
            Panou medic
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
            Bun venit în RomDoc
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-gray-600">
            Urmărește pașii necesari pentru un profil medical complet,
            clar și pregătit pentru programările pacienților.
          </p>
        </header>

        <div className="mt-8">
          <DoctorOnboardingChecklist completion={completion} />
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Date de facturare
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Completează datele private necesare pentru facturarea SMS-urilor
                și a altor servicii RomDoc. Aceste informații nu apar public.
              </p>
            </div>

            <Link
              href="/doctor-dashboard/billing"
              className="romdoc-focus-ring w-fit rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49]"
            >
              Deschide datele de facturare
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                SMS
              </p>

              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Utilizare SMS luna aceasta
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Acest contor arată SMS-urile trimise pentru programările tale în
                luna curentă. Marcarea ca facturat este făcută de Admin sau de
                managerul Facturare.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Valoare nefacturată: {formatMoney(smsUsage.uninvoicedValueMinor)} + TVA
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trimise luna aceasta
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {smsUsage.sent}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Facturate
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-900">
                {smsUsage.invoiced}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Nefacturate
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {smsUsage.uninvoiced}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
