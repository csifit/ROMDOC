import Link from "next/link";

const sections = [
  {
    href:
      "/manager-dashboard/users",
    title: "Utilizatori",
    description:
      "Vezi utilizatorii și gestionează suspendarea conturilor în limitele rolului de manager.",
  },
  {
    href:
      "/manager-dashboard/doctors",
    title: "Medici",
    description:
      "Caută medicii și gestionează profilurile fără acțiunile rezervate administratorului.",
  },
  {
    href:
      "/manager-dashboard/verifications",
    title:
      "Verificări profesionale",
    description:
      "Analizează cererile de verificare profesională și documentele asociate.",
  },
  {
    href:
      "/manager-dashboard/clinics",
    title: "Clinici",
    description:
      "Verifică și gestionează clinicile propuse în platformă.",
  },
  {
    href:
      "/manager-dashboard/clinic-sms",
    title: "Facturare SMS clinici",
    description:
      "Pentru managerii Facturare: vezi consumul SMS al clinicilor și datele necesare pentru invoicing.",
  },
  {
    href:
      "/manager-dashboard/cities",
    title: "Orașe",
    description:
      "Actualizează informațiile orașelor utilizate în directoare și filtre.",
  },
  {
    href:
      "/manager-dashboard/reviews",
    title: "Recenzii",
    description:
      "Moderează recenziile care încalcă regulile platformei.",
  },
  {
    href:
      "/manager-dashboard/security",
    title: "Account security",
    description:
      "Verifică starea autentificării în doi pași a contului de manager.",
  },
] as const;

export default function ManagerDashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Panou manager
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
          Prezentare generală
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Accesează instrumentele operaționale atribuite managerilor
          RomDoc. Funcțiile rezervate exclusiv administratorului nu apar
          în acest panou.
        </p>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map(
          (section) => (
            <Link
              key={
                section.href
              }
              href={
                section.href
              }
              className="romdoc-focus-ring rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#036661]/40 hover:shadow-md"
            >
              <h2 className="text-lg font-bold text-gray-900">
                {section.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {
                  section.description
                }
              </p>

              <span className="mt-5 inline-flex text-sm font-semibold text-[#036661]">
                Deschide secțiunea →
              </span>
            </Link>
          )
        )}
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
        Rolul de manager folosește aceleași API-uri securizate ca zona
        administrativă, însă fiecare acțiune este verificată separat prin
        capabilitățile atribuite managerului. Secțiunea de facturare SMS
        pentru clinici este vizibilă doar managerilor cu permisiunea
        <strong> Facturare</strong>.
      </section>
    </div>
  );
}
