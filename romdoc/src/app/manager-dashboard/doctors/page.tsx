import DoctorsManagement from "@/components/admin/doctors-management";

export default function ManagerDoctorsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Management operațional
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Medici
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Caută și filtrează medicii și gestionează informațiile permise
          rolului de manager.
        </p>
      </header>

      <DoctorsManagement />
    </div>
  );
}
