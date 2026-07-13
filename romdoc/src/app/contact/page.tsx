import type { Metadata } from "next";
import NextLink from "next/link";

import PublicLayout from "@/components/public/public-layout";
import {
  Link as LocalizedLink,
} from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactează echipa RomDoc pentru suport, corectări de profil, probleme de programare sau confidențialitate.",
};

const contactOptions = [
  {
    id: "suport-pacienti",
    title: "Suport pentru pacienți",
    description:
      "Cont pacient, autentificare, dashboard, programări care nu apar sau anulări.",
    email: "support@romdoc.fit",
    href: "/support?type=patient&category=patient_support",
    buttonLabel: "Deschide tichet pacient",
  },
  {
    id: "suport-medici",
    title: "Suport pentru medici",
    description:
      "Profil medic, abonament, clinici, disponibilitate, verificare profesională sau dashboard medic.",
    email: "medici@romdoc.fit",
    href: "/support?type=doctor&category=doctor_support",
    buttonLabel: "Deschide tichet medic",
  },
  {
    id: "corectari-profil",
    title: "Corectări profil / informații publice",
    description:
      "Semnalează informații incorecte despre un medic, o clinică, adresă, specialitate sau pagină publică.",
    email: "support@romdoc.fit",
    href: "/support?type=visitor&category=profile_correction",
    buttonLabel: "Raportează corectare",
  },
  {
    id: "probleme-programare",
    title: "Probleme cu programările",
    description:
      "Programare lipsă, confirmare lipsă, oră greșită, mesaj de eroare sau problemă la trimiterea solicitării.",
    email: "support@romdoc.fit",
    href: "/support?type=patient&category=booking_problem",
    buttonLabel: "Raportează problemă",
  },
  {
    id: "probleme-tehnice",
    title: "Probleme tehnice",
    description:
      "Erori de pagină, butoane care nu funcționează, formulare care nu se trimit sau probleme de afișare.",
    email: "support@romdoc.fit",
    href: "/support?type=visitor&category=technical_problem",
    buttonLabel: "Raportează eroare tehnică",
  },
  {
    id: "confidentialitate",
    title: "Confidențialitate și date personale",
    description:
      "Solicitări privind accesul, corectarea, ștergerea datelor personale sau întrebări de confidențialitate.",
    email: "privacy@romdoc.fit",
    href: "/support?type=visitor&category=privacy_request",
    buttonLabel: "Trimite solicitare privacy",
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
              Alege categoria potrivită pentru a trimite un tichet către echipa RomDoc. Formularul este pentru suport privind platforma, nu pentru sfaturi medicale.
            </p>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              Pentru întrebări medicale, diagnostic, tratament sau urgențe, contactează direct medicul, clinica sau serviciile medicale potrivite.
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {contactOptions.map((option) => (
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

                  <div className="mt-6 flex flex-wrap gap-3">
                    <NextLink
                      href={option.href}
                      className="romdoc-button romdoc-button-primary romdoc-button-sm"
                    >
                      {option.buttonLabel}
                    </NextLink>

                    <a
                      href={`mailto:${option.email}`}
                      className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                    >
                      {option.email}
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <LocalizedLink
                href="/confidentialitate"
                className="romdoc-button romdoc-button-secondary"
              >
                Confidențialitate
              </LocalizedLink>

              <LocalizedLink
                href="/termeni-si-conditii"
                className="romdoc-button romdoc-button-secondary"
              >
                Termeni și condiții
              </LocalizedLink>
            </div>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
