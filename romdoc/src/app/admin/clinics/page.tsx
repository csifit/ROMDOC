import { redirect } from "next/navigation";

import AdminClinicCreationForm from "@/components/admin/admin-clinic-creation-form";
import AdminDoctorClinicAssociations from "@/components/admin/admin-doctor-clinic-associations";
import ClinicManagementActions from "@/components/admin/clinic-management-actions";
import ClinicOrganizationLocationApprovals from "@/components/admin/clinic-organization-location-approvals";
import ClinicOrganizationsOverview from "@/components/admin/clinic-organizations-overview";
import ClinicEditingPanel from "@/components/clinic/clinic-editing-panel";
import AdminAccordion from "@/components/ui/admin-accordion";
import { createClient } from "@/lib/supabase/server";

export default async function AdminClinicsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/admin/clinics");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
        role,
        account_status
      `
    )
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
          Clinici
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Creează clinici aprobate, asociază medicii existenți cu locațiile lor,
          verifică propunerile trimise de medici și aprobă punctele de lucru ale
          organizațiilor de clinică. Locațiile aprobate devin eligibile pentru
          harta publică RomDoc.
        </p>
      </header>

      <ClinicOrganizationsOverview />

      <AdminAccordion
        title="Aprobă locații organizații"
        description="Verifică punctele de lucru cerute de Clinic Manager. Aprobarea activează locația pentru organizație și o face eligibilă pentru harta publică."
        defaultOpen
      >
        <ClinicOrganizationLocationApprovals />
      </AdminAccordion>

      <AdminAccordion
        title="Adaugă clinică"
        description="Creează direct o clinică aprobată folosind o adresă verificată prin Google."
      >
        <AdminClinicCreationForm />
      </AdminAccordion>

      <AdminAccordion
        title="Asociază medic cu clinică"
        description="Gestionează relațiile dintre medicii existenți și clinicile aprobate."
      >
        <AdminDoctorClinicAssociations />
      </AdminAccordion>

      <AdminAccordion
        title="Editează clinici"
        description="Administratorii pot modifica toate clinicile din platformă: date de contact, descriere și adresă verificată."
      >
        <ClinicEditingPanel
          title="Toate clinicile"
          description="Editează datele publice ale oricărei clinici din RomDoc. Modificările se aplică tuturor medicilor asociați acelei clinici."
          emptyMessage="Nu există încă clinici în platformă."
        />
      </AdminAccordion>

      <ClinicManagementActions />
    </div>
  );
}
