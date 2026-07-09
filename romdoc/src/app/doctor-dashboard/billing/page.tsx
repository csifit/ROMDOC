import { redirect } from "next/navigation";

import DoctorBillingProfileForm, {
  type DoctorBillingProfileData,
} from "@/components/doctor/doctor-billing-profile-form";
import { createClient } from "@/lib/supabase/server";

type DoctorRow = {
  id: string;
  slug: string;
  account_type: string | null;
};

export default async function DoctorBillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/doctor-dashboard/billing");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status, first_name, last_name")
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

  const { data: doctorData, error: doctorError } = await supabase
    .from("doctors")
    .select("id, slug, account_type")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError) {
    console.error("Doctor billing page doctor query failed:", doctorError);
  }

  const doctor = doctorData as DoctorRow | null;

  if (!doctor) {
    return (
      <main className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
            Contul tău nu este asociat unui profil de medic.
          </div>
        </div>
      </main>
    );
  }

  if (doctor.account_type === "clinic_sub_account") {
    redirect("/doctor-dashboard");
  }

  const { data: billingProfileData, error: billingProfileError } = await supabase
    .from("doctor_billing_profiles")
    .select(`
      id,
      doctor_id,
      profile_id,
      entity_type,
      legal_name,
      cui,
      trade_registry_number,
      vat_payer,
      billing_address,
      county,
      city,
      postal_code,
      country,
      billing_email,
      accounting_contact_name,
      accounting_contact_phone,
      invoice_notes
    `)
    .eq("doctor_id", doctor.id)
    .maybeSingle();

  if (billingProfileError) {
    console.error(
      "Doctor billing page billing profile query failed:",
      billingProfileError
    );
  }

  const billingProfile =
    (billingProfileData as DoctorBillingProfileData | null) ?? null;

  const displayName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
            Panou medic
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            Date de facturare
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-gray-600">
            Completează datele private folosite de RomDoc pentru facturarea
            serviciilor suplimentare, inclusiv SMS-urile trimise pentru
            programări. Aceste informații nu apar pe profilul public.
          </p>

          {displayName ? (
            <p className="mt-2 text-sm font-medium text-gray-700">
              {displayName}
            </p>
          ) : null}
        </header>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
          Datele de facturare sunt vizibile doar pentru medicul proprietar,
          administratorii RomDoc și managerii cu permisiunea Facturare.
        </div>

        <div className="mt-8">
          <DoctorBillingProfileForm
            doctorId={doctor.id}
            profileId={user.id}
            defaultBillingEmail={user.email ?? ""}
            initialProfile={billingProfile}
          />
        </div>
      </div>
    </main>
  );
}
