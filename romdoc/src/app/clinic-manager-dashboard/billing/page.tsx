export default function ClinicManagerBillingPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Clinic Manager
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Facturare clinică
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Aici vor fi afișate datele de facturare ale clinicii, medicii
          acoperiți activ și sumarul lunar simplu pentru abonamente și SMS.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Sumarul de facturare vine în pasul următor
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Regula rămâne simplă: medicii acoperiți activ de clinică × 60 RON/lună
          + TVA, iar SMS-urile se adaugă separat după conectarea logurilor SMS
          la organizația clinicii.
        </p>
      </section>
    </div>
  );
}
