import ClinicManagementActions from "@/components/admin/clinic-management-actions";

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

      <ClinicManagementActions />
    </div>
  );
}
