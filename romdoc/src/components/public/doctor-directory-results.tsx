import HomepageDoctorCard, { type HomepageDoctorCardData } from "@/components/public/homepage-doctor-card";

type Props = {
  doctors: HomepageDoctorCardData[];
  cityName: string | null;
  specialtyName: string | null;
  verifiedOnly: boolean;
  locale: "ro" | "en" | "de";
};

const labels = {
  ro: { results: "Rezultate", all: "Toți medicii disponibili", inCity: "în", verified: "verificați profesional", one: "1 medic găsit", many: "{count} medici găsiți", empty: "Nu am găsit medici pentru aceste filtre", emptyHelp: "Resetează filtrele sau încearcă un alt oraș ori o altă specialitate." },
  en: { results: "Results", all: "All available doctors", inCity: "in", verified: "professionally verified", one: "1 doctor found", many: "{count} doctors found", empty: "No doctors matched these filters", emptyHelp: "Reset the filters or try another city or specialty." },
  de: { results: "Ergebnisse", all: "Alle verfügbaren Ärzte", inCity: "in", verified: "beruflich verifiziert", one: "1 Arzt gefunden", many: "{count} Ärzte gefunden", empty: "Für diese Filter wurden keine Ärzte gefunden", emptyHelp: "Setzen Sie die Filter zurück oder wählen Sie eine andere Stadt oder Fachrichtung." },
} as const;

export default function DoctorDirectoryResults({ doctors, cityName, specialtyName, verifiedOnly, locale }: Props) {
  const t = labels[locale];
  const parts = [specialtyName, cityName ? `${t.inCity} ${cityName}` : null, verifiedOnly ? t.verified : null].filter(Boolean);
  const title = parts.length ? parts.join(" ") : t.all;
  const count = doctors.length === 1 ? t.one : t.many.replace("{count}", String(doctors.length));

  return (
    <section aria-labelledby="doctor-directory-results-title" className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">{t.results}</p>
        <h2 id="doctor-directory-results-title" className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{title}</h2>
        <p className="mt-3 text-sm text-gray-600">{count}</p>
        {doctors.length === 0 ? (
          <div className="mt-7 rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">{t.empty}</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">{t.emptyHelp}</p>
          </div>
        ) : (
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {doctors.map((doctor) => <HomepageDoctorCard key={doctor.id} doctor={doctor} />)}
          </div>
        )}
      </div>
    </section>
  );
}
