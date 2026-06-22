import Link from "next/link";

import PublicLayout from "@/components/public/public-layout";

const steps = [
  {
    number: "1",
    title: "Creează contul de medic",
    description:
      "Înregistrează-te cu adresa ta de e-mail și confirmă contul RomDoc.",
  },
  {
    number: "2",
    title: "Alege abonamentul",
    description:
      "După confirmarea e-mailului, activează abonamentul lunar sau anual pentru acces la panoul medicului.",
  },
  {
    number: "3",
    title: "Completează profilul",
    description:
      "Adaugă fotografia, specialitățile, biografia, datele de contact, experiența, serviciile și tarifele.",
  },
  {
    number: "4",
    title: "Asociază o clinică",
    description:
      "Selectează o clinică aprobată sau propune o clinică nouă pentru verificarea administratorului.",
  },
  {
    number: "5",
    title: "Configurează disponibilitatea",
    description:
      "Stabilește zilele de lucru, intervalele orare, durata consultațiilor, pauzele și zilele libere.",
  },
  {
    number: "6",
    title: "Primește programări",
    description:
      "Pacienții autentificați pot trimite cereri de programare, iar tu sau personalul autorizat le puteți administra.",
  },
];

export default function DoctorInstructionsPage() {
  return (
    <PublicLayout>
      <main className="bg-[#F0EEE9] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="rounded-3xl bg-white p-6 shadow-sm sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              Pentru medici
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Cum funcționează RomDoc
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">
              RomDoc te ajută să publici un profil medical clar,
              să îți organizezi disponibilitatea și să administrezi
              cererile de programare într-un singur loc.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register?role=doctor"
                className="romdoc-button romdoc-button-primary romdoc-button-lg"
              >
                Creează cont de medic
              </Link>

              <Link
                href="/login"
                className="romdoc-button romdoc-button-secondary romdoc-button-lg"
              >
                Autentificare medic
              </Link>
            </div>
          </header>

          <section className="mt-8 grid gap-5 md:grid-cols-2">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#036661] text-sm font-bold text-white">
                  {step.number}
                </span>

                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  {step.title}
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {step.description}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Verificarea profesională
            </h2>

            <p className="mt-3 max-w-3xl leading-7 text-gray-600">
              Verificarea profesională este separată de abonament.
              Medicii care transmit documentele profesionale și sunt
              aprobați de RomDoc primesc insigna publică
              „Medic verificat de RomDoc”. RomDoc verifică
              documentele transmise, dar nu emite licențe medicale.
            </p>
          </section>

          <section className="mt-8 rounded-3xl bg-[#036661] p-6 text-white shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold">
              Pregătit să începi?
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-white/85">
              Creează contul, completează profilul și configurează
              programul pentru a deveni vizibil pacienților RomDoc.
            </p>

            <Link
              href="/register?role=doctor"
              className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#036661] transition hover:bg-[#F0EEE9]"
            >
              Înscrie-te ca medic
            </Link>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
