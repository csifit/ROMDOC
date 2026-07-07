import ClinicManagementActions from "@/components/admin/clinic-management-actions";
import ClinicEditingPanel from "@/components/clinic/clinic-editing-panel";
import AdminAccordion from "@/components/ui/admin-accordion";

export default function ManagerClinicsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Management operațional
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Clinici
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Verifică și gestionează clinicile propuse de medici. Acțiunile
          rezervate administratorului rămân protejate de API.
        </p>
      </header>

      <AdminAccordion
        title="Editează clinici"
        description="Managerii pot modifica datele publice ale clinicilor, fără acțiunile rezervate exclusiv administratorului."
      >
        <ClinicEditingPanel
          title="Toate clinicile"
          description="Editează datele de contact, descrierea și adresa verificată a clinicilor din RomDoc. Modificările se aplică tuturor medicilor asociați acelei clinici."
          emptyMessage="Nu există încă clinici în platformă."
        />
      </AdminAccordion>

      <ClinicManagementActions />
    </div>
  );
}
