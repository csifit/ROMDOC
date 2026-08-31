import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import ClinicOrganisationQuestionnaire from "@/components/public/clinic-organisation-questionnaire";
import PublicLayout from "@/components/public/public-layout";
import {
  normalizeAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";

type PreferredSolution = "integrated" | "romdoc";

type PageProps = {
  searchParams?: Promise<{
    solution?: string;
  }>;
};

const COPY: Record<
  AppLocale,
  {
    eyebrow: string;
    title: string;
    description: string;
    note: string;
    metadataTitle: string;
    metadataDescription: string;
  }
> = {
  ro: {
    eyebrow: "RomDoc pentru organizații medicale",
    title: "Spuneți-ne cum ar trebui să funcționeze programările pentru organizația dumneavoastră.",
    description:
      "Puteți folosi RomDoc ca platformă completă de director și programări sau putem discuta o soluție integrată în website-ul și sistemele pe care le utilizați deja.",
    note: "Formularul durează aproximativ un minut. După trimitere, vom reveni pentru a discuta cerințele concrete.",
    metadataTitle: "Soluții de programări pentru clinici și organizații medicale",
    metadataDescription:
      "Spuneți-ne dacă preferați RomDoc sau o soluție de programări integrată în platforma existentă a organizației. Solicitați o demonstrație sau o discuție tehnică.",
  },
  en: {
    eyebrow: "RomDoc for healthcare organisations",
    title: "Tell us how appointments should work for your organisation.",
    description:
      "Use RomDoc as a complete directory and appointment platform, or discuss an appointment solution integrated with the website and systems you already use.",
    note: "The questionnaire takes about one minute. After submission, we will contact you to discuss your requirements.",
    metadataTitle: "Appointment solutions for clinics and healthcare organisations",
    metadataDescription:
      "Tell RomDoc whether you prefer the ready-built RomDoc platform or an appointment solution integrated with your existing systems. Request a demo or integration discussion.",
  },
  de: {
    eyebrow: "RomDoc für medizinische Organisationen",
    title: "Sagen Sie uns, wie Termine in Ihrer Organisation funktionieren sollen.",
    description:
      "Nutzen Sie RomDoc als vollständige Verzeichnis- und Terminplattform oder besprechen Sie eine Lösung, die in Ihre vorhandene Website und Systeme integriert wird.",
    note: "Der Fragebogen dauert etwa eine Minute. Nach dem Absenden kontaktieren wir Sie, um Ihre Anforderungen zu besprechen.",
    metadataTitle: "Terminlösungen für Kliniken und medizinische Organisationen",
    metadataDescription:
      "Teilen Sie RomDoc mit, ob Sie die fertige RomDoc-Plattform oder eine in Ihre bestehenden Systeme integrierte Terminlösung bevorzugen. Demo oder Integrationsgespräch anfragen.",
  },
};

const LOCALIZED_PATHS: Record<AppLocale, string> = {
  ro: "/ro/oferta-clinici",
  en: "/en/clinic-offer",
  de: "/de/angebot-fuer-kliniken",
};

function getInitialSolution(value: string | undefined): PreferredSolution | null {
  return value === "integrated" || value === "romdoc" ? value : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeAppLocale(await getLocale());
  const copy = COPY[locale];

  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
      canonical: LOCALIZED_PATHS[locale],
      languages: {
        ro: LOCALIZED_PATHS.ro,
        en: LOCALIZED_PATHS.en,
        de: LOCALIZED_PATHS.de,
        "x-default": LOCALIZED_PATHS.ro,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      title: copy.metadataTitle,
      description: copy.metadataDescription,
      url: LOCALIZED_PATHS[locale],
      siteName: "RomDoc",
    },
  };
}

export default async function ClinicOfferPage({ searchParams }: PageProps) {
  const locale = normalizeAppLocale(await getLocale());
  const parameters = searchParams ? await searchParams : {};
  const initialSolution = getInitialSolution(parameters.solution);
  const copy = COPY[locale];

  return (
    <PublicLayout locale={locale}>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-[34px] sm:px-6 lg:px-8 lg:py-[55px]">
        <div className="mx-auto max-w-6xl">
          <header className="mb-[34px] max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              {copy.eyebrow}
            </p>

            <h1 className="mt-[13px] text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
              {copy.title}
            </h1>

            <p className="mt-[21px] max-w-3xl text-base leading-7 text-gray-700 sm:text-lg">
              {copy.description}
            </p>

            <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-500">
              {copy.note}
            </p>
          </header>

          <ClinicOrganisationQuestionnaire
            locale={locale}
            initialSolution={initialSolution}
          />
        </div>
      </main>
    </PublicLayout>
  );
}
