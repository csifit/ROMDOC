import CitiesManagement from "@/components/admin/cities-management";

export default function ManagerCitiesPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Management operațional
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Orașe
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Actualizează orașele utilizate în filtre și directoare.
          Crearea și ștergerea rămân rezervate administratorului.
        </p>
      </header>

      <CitiesManagement />
    </div>
  );
}
