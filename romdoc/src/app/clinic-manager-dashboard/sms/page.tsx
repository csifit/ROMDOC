export default function ClinicManagerSmsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Clinic Manager
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Consum SMS clinică
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Această pagină va afișa consumul SMS facturabil al clinicii, fără a
          expune conținut medical, note clinice sau dosare ale pacienților.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Vizibilitate SMS în pregătire
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          În viitor, clinic managerul va vedea statusul livrării, costul,
          perioada și statusul de facturare. Numărul pacientului va fi mascat,
          iar corpul complet al mesajului nu va fi afișat implicit.
        </p>
      </section>
    </div>
  );
}
