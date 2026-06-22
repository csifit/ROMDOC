import type {
  Metadata,
} from "next";
import Link from "next/link";
import PublicLayout from "@/components/public/public-layout";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactează echipa RomDoc pentru suport sau raportarea unei probleme.",
};

const contactOptions = [
  {
    id: "suport",
    title: "Suport pentru pacienți",
    description:
      "Întrebări despre cont, programări, anulări sau utilizarea platformei.",
    email:
      "support@romdoc.fit",
  },
  {
    id: "suport-medici",
    title: "Suport pentru medici",
    description:
      "Întrebări despre profil, abonament, clinici, disponibilitate sau verificare profesională.",
    email:
      "medici@romdoc.fit",
  },
  {
    id: "raporteaza-problema",
    title: "Raportează o problemă",
    description:
      "Semnalează informații incorecte, conținut nepotrivit, un profil suspect sau o eroare tehnică.",
    email:
      "support@romdoc.fit",
  },
  {
    id: "confidentialitate",
    title: "Confidențialitate",
    description:
      "Solicitări privind accesul, corectarea sau ștergerea datelor personale.",
    email:
      "privacy@romdoc.fit",
  },
];

export default function ContactPage() {
  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              Contact
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Cum te putem ajuta?
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
              Alege categoria potrivită pentru a direcționa solicitarea către echipa RomDoc.
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {contactOptions.map(
                (option) => (
                  <article
                    key={option.id}
                    id={option.id}
                    className="scroll-mt-28 rounded-2xl border border-gray-200 bg-gray-50 p-6"
                  >
                    <h2 className="text-xl font-bold text-gray-900">
                      {option.title}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {option.description}
                    </p>

                    <a
                      href={`mailto:${option.email}`}
                      className="romdoc-button romdoc-button-primary mt-6"
                    >
                      {option.email}
                    </a>
                  </article>
                )
              )}
            </div>

            <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              Adresele de mai sus sunt propuneri pentru structura publică. Creează căsuțele poștale înainte de publicarea paginii sau înlocuiește-le cu adresele finale.
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/confidentialitate"
                className="romdoc-button romdoc-button-secondary"
              >
                Confidențialitate
              </Link>

              <Link
                href="/termeni-si-conditii"
                className="romdoc-button romdoc-button-secondary"
              >
                Termeni și condiții
              </Link>
            </div>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
