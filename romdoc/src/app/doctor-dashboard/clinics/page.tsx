import { redirect } from "next/navigation";

import ClinicProposalForm from "@/components/clinic/clinic-proposal-form";
import { createClient } from "@/lib/supabase/server";

type ClinicTranslation = {
  locale: string;
  name: string;
  description: string | null;
};

type ClinicRelation = {
  id: string;
  slug: string;
  formatted_address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  clinic_translations: ClinicTranslation[] | null;
};

type DoctorClinicRow = {
  clinic_id: string;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

type DoctorAccount = {
  id: string;
  account_type: string | null;
  clinic_organization_id: string | null;
};

type ClinicOrganization = {
  id: string;
  name: string;
  status: string;
  contact_email: string | null;
  contact_phone: string | null;
};

function getFirstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatFallbackName(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getClinicName(clinic: ClinicRelation) {
  const romanianTranslation = clinic.clinic_translations?.find(
    (translation) => translation.locale === "ro"
  );

  const fallbackTranslation = clinic.clinic_translations?.[0];

  return (
    romanianTranslation?.name ??
    fallbackTranslation?.name ??
    formatFallbackName(clinic.slug)
  );
}

function getOrganizationStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Activă";

    case "suspended":
      return "Suspendată";

    case "rejected":
      return "Respinsă";

    case "archived":
      return "Arhivată";

    default:
      return "În așteptare";
  }
}

export default async function DoctorClinicsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/doctor-dashboard/clinics");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/dashboard");
  }

  if (profile.role !== "doctor") {
    redirect("/dashboard");
  }

  const { data: doctorData, error: doctorError } = await supabase
    .from("doctors")
    .select(
      `
        id,
        account_type,
        clinic_organization_id
      `
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError) {
    console.error("Doctor clinics account query failed:", doctorError);
  }

  const doctor = doctorData as DoctorAccount | null;
  const isClinicSubAccount = doctor?.account_type === "clinic_sub_account";

  if (!isClinicSubAccount || !doctor) {
    return <ClinicProposalForm />;
  }

  const [organizationResult, doctorClinicsResult] = await Promise.all([
    doctor.clinic_organization_id
      ? supabase
          .from("clinic_organizations")
          .select(
            `
              id,
              name,
              status,
              contact_email,
              contact_phone
            `
          )
          .eq("id", doctor.clinic_organization_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    supabase
      .from("doctor_clinics")
      .select(
        `
          clinic_id,
          clinics (
            id,
            slug,
            formatted_address,
            email,
            phone,
            website,
            clinic_translations (
              locale,
              name,
              description
            )
          )
        `
      )
      .eq("doctor_id", doctor.id),
  ]);

  if (organizationResult.error) {
    console.error("Clinic doctor organization query failed:", organizationResult.error);
  }

  if (doctorClinicsResult.error) {
    console.error("Clinic doctor assigned clinics query failed:", doctorClinicsResult.error);
  }

  const organization = organizationResult.data as ClinicOrganization | null;
  const doctorClinicRows =
    (doctorClinicsResult.data as unknown as DoctorClinicRow[] | null) ?? [];

  const clinics = doctorClinicRows
    .map((row) => getFirstRelation(row.clinics))
    .filter((clinic): clinic is ClinicRelation => Boolean(clinic));

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Cont medic clinică
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Clinica mea
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Acest cont este administrat în relație cu o clinică. Nu poți propune
          clinici noi din acest cont; clinic managerul gestionează organizația,
          plata abonamentului și asocierea clinicilor.
        </p>
      </header>

      <section className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm leading-6 text-green-900 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-green-950">
          Abonament acoperit de clinică
        </h2>

        <p className="mt-2">
          Pentru acest cont, abonamentul și consumul SMS sunt gestionate de
          clinică. Dacă dorești un cont independent sau un cont pentru altă
          clinică, folosește o adresă de e-mail separată.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-gray-900">
          Organizația clinicii
        </h2>

        {organization ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Nume organizație
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {organization.name}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status organizație
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {getOrganizationStatusLabel(organization.status)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                E-mail contact
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {organization.contact_email ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Telefon contact
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {organization.contact_phone ?? "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Contul este marcat ca medic clinică, dar organizația clinicii nu a
            fost găsită. Contactează clinic managerul sau RomDoc.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-gray-900">
          Clinici asociate contului
        </h2>

        {clinics.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
            Nu există încă o clinică asociată direct acestui cont de medic.
            Clinic managerul poate finaliza asocierea în pașii următori.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {clinics.map((clinic) => (
              <article
                key={clinic.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <h3 className="font-semibold text-gray-900">
                  {getClinicName(clinic)}
                </h3>

                <dl className="mt-3 space-y-2 text-sm text-gray-600">
                  <div>
                    <dt className="font-medium text-gray-800">Adresă</dt>
                    <dd>{clinic.formatted_address ?? "—"}</dd>
                  </div>

                  <div>
                    <dt className="font-medium text-gray-800">E-mail</dt>
                    <dd>{clinic.email ?? "—"}</dd>
                  </div>

                  <div>
                    <dt className="font-medium text-gray-800">Telefon</dt>
                    <dd>{clinic.phone ?? "—"}</dd>
                  </div>

                  <div>
                    <dt className="font-medium text-gray-800">Website</dt>
                    <dd>{clinic.website ?? "—"}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
