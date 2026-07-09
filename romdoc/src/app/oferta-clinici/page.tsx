import type { Metadata } from "next";
import Link from "next/link";

import PublicLayout from "@/components/public/public-layout";

export const metadata: Metadata = {
  title: "Ofertă pentru clinici | RomDoc",
  description:
    "RomDoc pentru clinici: invitați medici, centralizați abonamentele, urmăriți costurile SMS și oferiți pacienților o experiență mai simplă de programare.",
};

const clinicBenefits = [
  {
    title: "Invitați medici în RomDoc",
    description:
      "Clinica poate invita medicii colaboratori să își creeze sau să își conecteze profilul RomDoc.",
  },
  {
    title: "Centralizați abonamentele medicilor",
    description:
      "Pentru medicii acoperiți de clinică, plata poate fi cumulată într-un singur total lunar simplu de urmărit.",
  },
  {
    title: "Urmăriți consumul SMS",
    description:
      "Clinica poate vedea consumul SMS asociat medicilor acoperiți, cu separarea mesajelor facturate și nefacturate.",
  },
  {
    title: "Gestionare mai simplă pentru echipă",
    description:
      "RomDoc păstrează relația Doctor–Staff existentă, dar adaugă un nivel separat pentru administrarea clinicii.",
  },
];

const howItWorks = [
  "Clinica creează un cont folosind opțiunea „Suntem clinică”.",
  "Administratorul RomDoc verifică datele clinicii și datele de facturare.",
  "Clinica invită medicii colaboratori.",
  "Medicul acceptă invitația și rămâne proprietarul profilului său profesional.",
  "Administratorul poate aproba acoperirea abonamentului medicului de către clinică.",
  "Clinica urmărește abonamentele acoperite și consumul SMS într-un singur loc.",
];

export default function ClinicOfferPage() {
  return (
    <PublicLayout>
      <main className="bg-[#F0EEE9]">
        <section className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-6 py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[#036661]">
              RomDoc pentru clinici
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
              O soluție simplă pentru clinici care vor să gestioneze medici,
              programări și costuri într-un singur loc.
            </h1>

            <p className="mt-6 text-lg leading-8 text-gray-700">
              RomDoc ajută clinicile să invite medici, să centralizeze
              abonamentele acoperite de clinică și să urmărească utilizarea
              serviciilor precum notificările SMS, păstrând în același timp
              independența profesională a fiecărui medic.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register?role=clinic"
                className="romdoc-button romdoc-button-primary"
              >
                Creați cont pentru clinică
              </Link>

              <Link
                href="/contact#suport-medici"
                className="romdoc-button romdoc-button-secondary"
              >
                Contactați RomDoc
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-14 lg:grid-cols-4 lg:px-8">
            {clinicBenefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-950">
                  {benefit.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#036661]">
              Cum funcționează
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
              Clinica plătește simplu, medicul rămâne medic.
            </h2>

            <p className="mt-5 text-base leading-7 text-gray-700">
              Pentru medicii invitați de clinică, continuitatea accesului poate
              fi guvernată de regulile clinicii. În MVP, acoperirea abonamentului
              este aprobată manual de administratorul RomDoc, pentru a păstra
              procesul clar și sigur.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <ol className="space-y-4">
              {howItWorks.map((item, index) => (
                <li key={item} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#036661] text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-6 text-gray-700">
                    {item}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
            <div className="rounded-3xl bg-[#036661] p-8 text-white lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    Pregătiți clinica pentru programări online?
                  </h2>
                  <p className="mt-4 text-base leading-7 text-white/85">
                    În etapa următoare, RomDoc va permite clinicilor să creeze
                    conturi dedicate, să adauge date de facturare și să invite
                    medici în organizația clinicii.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link
                    href="/register?role=clinic"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#036661] transition-colors hover:bg-[#F0EEE9]"
                  >
                    Suntem clinică
                  </Link>

                  <Link
                    href="/contact#suport-medici"
                    className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Cereți detalii
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
