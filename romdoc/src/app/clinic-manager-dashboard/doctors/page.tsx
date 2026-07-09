export default function ClinicManagerDoctorsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Clinic Manager
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Medici gestionați de clinică
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Aici vor apărea medicii invitați sau acoperiți de clinică. Medicul
          rămâne proprietarul profilului medical, iar clinica gestionează doar
          relația comercială și administrativă.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Funcționalitate în pregătire
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          În pașii următori vom afișa doctorii asociați clinicii, statusul
          invitației, responsabilitatea de plată și acoperirea aprobată de
          administrator.
        </p>
      </section>
    </div>
  );
}
