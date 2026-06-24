import type {
  Metadata,
} from "next";
import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import PublicLayout from "@/components/public/public-layout";
import {
  type AppLocale,
  routing,
} from "@/i18n/routing";

type Props = {
  params: Promise<{
    locale: AppLocale;
  }>;
};

const siteUrl =
  (
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    "https://www.romdoc.fit"
  ).replace(/\/+$/, "");

function isLocale(
  value: string
): value is AppLocale {
  return routing.locales.includes(
    value as AppLocale
  );
}

export async function
generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } =
    await params;

  const isEnglish =
    locale === "en";

  const title =
    isEnglish
      ? "How RomDoc helps patients find doctors in Romania"
      : "Cum te ajută RomDoc să găsești medici în România";

  const description =
    isEnglish
      ? "Learn how to use RomDoc to find doctors by specialty and city, compare public profile information and request a medical appointment."
      : "Află cum folosești RomDoc pentru a găsi medici după specializare și oraș, a compara informațiile publice și a solicita o programare medicală.";

  return {
    title,
    description,
    alternates: {
      canonical:
        isEnglish
          ? "/en/patient-guide"
          : "/ro/ghid-pacienti",
      languages: {
        ro: "/ro/ghid-pacienti",
        en: "/en/patient-guide",
        "x-default":
          "/ro/ghid-pacienti",
      },
    },
    openGraph: {
      type: "article",
      locale:
        isEnglish
          ? "en_US"
          : "ro_RO",
      siteName: "RomDoc",
      title,
      description,
      url:
        isEnglish
          ? `${siteUrl}/en/patient-guide`
          : `${siteUrl}/ro/ghid-pacienti`,
    },
  };
}

export default async function
PatientGuidePage({
  params,
}: Props) {
  const { locale } =
    await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const isEnglish =
    locale === "en";

  const homeHref =
    isEnglish ? "/en" : "/ro";

  const doctorsHref =
    isEnglish
      ? "/en/doctors"
      : "/ro/medici";

  const specialtiesHref =
    isEnglish
      ? "/en/specialties"
      : "/ro/specialitati";

  const cardiologyHref =
    isEnglish
      ? "/en/doctors/cardiologie/bucuresti"
      : "/ro/medici/cardiologie/bucuresti";

  const benefits = [
    {
      title: isEnglish ? "Search by specialty and city" : "Căutare după specializare și oraș",
      body: isEnglish ? "Narrow the directory to the type of doctor and location you need. For example, a person searching for a cardiologist in Bucharest can open the cardiology and Bucharest directory page." : "Restrânge directorul la tipul de medic și locația de care ai nevoie. De exemplu, o persoană care caută un cardiolog în București poate deschide pagina dedicată cardiologiei în București.",
    },
    {
      title: isEnglish ? "Clear public doctor profiles" : "Profiluri publice clare",
      body: isEnglish ? "Doctor pages can present professional information, clinic locations, services, prices, verification status, reviews and appointment availability." : "Paginile medicilor pot prezenta informații profesionale, locațiile clinicilor, serviciile, tarifele, statutul verificării, recenziile și disponibilitatea programărilor.",
    },
    {
      title: isEnglish ? "One patient account for appointments" : "Un singur cont de pacient pentru programări",
      body: isEnglish ? "Authenticated patients can request appointments, follow their status, cancel eligible appointments and review appointment history." : "Pacienții autentificați pot solicita programări, urmări starea lor, anula programările eligibile și consulta istoricul programărilor.",
    },
    {
      title: isEnglish ? "Useful comparison information" : "Informații utile pentru comparație",
      body: isEnglish ? "RomDoc helps patients compare relevant public information. It does not replace medical advice, diagnosis or emergency services." : "RomDoc ajută pacienții să compare informațiile publice relevante. Platforma nu înlocuiește consultația, diagnosticul sau serviciile medicale de urgență.",
    },
  ];

  const steps = [
    {
      title: isEnglish ? "Open the RomDoc search" : "Deschide căutarea RomDoc",
      body: isEnglish ? "Go to the homepage or doctor directory and select the medical specialty that matches your need." : "Intră pe pagina principală sau în directorul medicilor și selectează specializarea medicală potrivită nevoii tale.",
    },
    {
      title: isEnglish ? "Choose the city" : "Alege orașul",
      body: isEnglish ? "Select the city where you want the consultation. This creates a focused directory such as cardiology doctors in Bucharest." : "Selectează orașul în care dorești consultația. Astfel ajungi la un director relevant, precum medici cardiologi în București.",
    },
    {
      title: isEnglish ? "Compare doctor profiles" : "Compară profilurile medicilor",
      body: isEnglish ? "Review the doctor’s professional title, clinic, services, public reviews and whether professional documents were verified by RomDoc." : "Verifică titlul profesional al medicului, clinica, serviciile, recenziile publice și dacă documentele profesionale au fost verificate de RomDoc.",
    },
    {
      title: isEnglish ? "Create or use your patient account" : "Creează sau folosește contul de pacient",
      body: isEnglish ? "Appointments require an authenticated patient account. Confirm your email address to access appointment history." : "Programările necesită un cont de pacient autentificat. Confirmă adresa de e-mail pentru a accesa istoricul programărilor.",
    },
    {
      title: isEnglish ? "Submit the appointment request" : "Trimite solicitarea de programare",
      body: isEnglish ? "Choose the clinic, available date and time, provide the requested contact details and send the request." : "Alege clinica, data și ora disponibile, completează datele de contact solicitate și trimite cererea.",
    },
  ];

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish ? "Patient guide" : "Ghid pentru pacienți"}
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {isEnglish ? "How to find a doctor and request an appointment with RomDoc" : "Cum găsești un medic și soliciți o programare prin RomDoc"}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 sm:text-lg">
              {isEnglish ? (
                <>
                  RomDoc is a medical directory and appointment platform for people looking for doctors and clinics in Romania. Start on the{" "}
                  <Link href={homeHref} className="font-semibold text-[#036661] underline underline-offset-4">RomDoc homepage</Link>, choose a medical specialty and city, review available doctor profiles and submit an appointment request.
                </>
              ) : (
                <>
                  RomDoc este un director medical și o platformă de programări pentru persoanele care caută medici și clinici în România. Începe de pe{" "}
                  <Link href={homeHref} className="font-semibold text-[#036661] underline underline-offset-4">pagina principală RomDoc</Link>, alege specializarea medicală și orașul, analizează profilurile disponibile și trimite o solicitare de programare.
                </>
              )}
            </p>
          </header>

          <section aria-labelledby="benefits-title" className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish ? "Benefits" : "Beneficii"}
            </p>
            <h2 id="benefits-title" className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {isEnglish ? "Why patients use RomDoc" : "De ce folosesc pacienții RomDoc"}
            </h2>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-semibold text-gray-900">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-700">{benefit.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-7 text-sm leading-7 text-gray-700">
              {isEnglish ? (
                <>Explore the <Link href={specialtiesHref} className="font-semibold text-[#036661] underline underline-offset-4">medical specialties directory</Link> or browse <Link href={doctorsHref} className="font-semibold text-[#036661] underline underline-offset-4">doctors available on RomDoc</Link>.</>
              ) : (
                <>Explorează <Link href={specialtiesHref} className="font-semibold text-[#036661] underline underline-offset-4">directorul de specializări medicale</Link> sau consultă <Link href={doctorsHref} className="font-semibold text-[#036661] underline underline-offset-4">medicii disponibili pe RomDoc</Link>.</>
              )}
            </p>
          </section>

          <section aria-labelledby="how-to-use-title" className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish ? "How to use" : "Cum se folosește"}
            </p>
            <h2 id="how-to-use-title" className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {isEnglish ? "How to search for a doctor step by step" : "Cum cauți un medic, pas cu pas"}
            </h2>
            <ol className="mt-7 space-y-5">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4 rounded-2xl border border-gray-200 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#036661] font-bold text-white">{index + 1}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-700">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEnglish ? "Example: cardiologist in Bucharest" : "Exemplu: cardiolog în București"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-700">
                {isEnglish ? (
                  <>A patient searching for a cardiologist in Bucharest can open the <Link href={cardiologyHref} className="font-semibold text-[#036661] underline underline-offset-4">cardiology doctors in Bucharest page</Link>, compare the listed profiles and continue to the selected doctor’s public page.</>
                ) : (
                  <>Un pacient care caută un cardiolog în București poate deschide pagina <Link href={cardiologyHref} className="font-semibold text-[#036661] underline underline-offset-4">medici cardiologi în București</Link>, compara profilurile afișate și continua către pagina publică a medicului ales.</>
                )}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={homeHref} className="romdoc-button romdoc-button-primary">
                {isEnglish ? "Start on RomDoc" : "Începe căutarea pe RomDoc"}
              </Link>
              <Link href={specialtiesHref} className="romdoc-button romdoc-button-secondary">
                {isEnglish ? "Browse specialties" : "Vezi specializările"}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
