import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import AdminClinicBillingSettingsForm from "@/components/admin/admin-clinic-billing-settings-form";
import {
  createClient,
} from "@/lib/supabase/server";

type BillingSettings = {
  clinic_doctor_monthly_price_ron:
    number;
  sms_unit_price_ron: number;
  vat_rate: number;
  updated_at: string | null;
};

export default async function AdminClinicBillingPage() {
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
      "/login?next=/admin/clinics/clinic-billing"
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, account_status"
    )
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

  const {
    data: settingsData,
    error: settingsError,
  } = await supabase
    .from(
      "clinic_billing_settings"
    )
    .select(`
      clinic_doctor_monthly_price_ron,
      sms_unit_price_ron,
      vat_rate,
      updated_at
    `)
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    console.error(
      "Admin clinic billing settings query failed:",
      settingsError
    );
  }

  const settings =
    settingsData as
      | BillingSettings
      | null;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Administrare clinici
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Tarife clinică
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Configurează tariful lunar pentru medicii invitați de clinică,
          prețul unui SMS trimis cu succes și procentul TVA utilizat în
          estimările Clinic Manager.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <AdminClinicBillingSettingsForm
          initialDoctorPriceRon={
            Number(
              settings
                ?.clinic_doctor_monthly_price_ron ??
                60
            )
          }
          initialSmsPriceRon={
            Number(
              settings
                ?.sms_unit_price_ron ??
                0.35
            )
          }
          initialVatPercent={
            Number(
              settings
                ?.vat_rate ??
                0.21
            ) * 100
          }
          updatedAt={
            settings?.updated_at ??
            null
          }
        />
      </section>

      <div>
        <Link
          href="/admin/clinics"
          className="romdoc-focus-ring inline-flex rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          ← Înapoi la Clinici
        </Link>
      </div>
    </div>
  );
}
