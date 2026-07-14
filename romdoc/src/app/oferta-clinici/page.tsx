import type { Metadata } from "next";
import NextLink from "next/link";
import { getLocale } from "next-intl/server";

import PublicLayout from "@/components/public/public-layout";
import { Link as LocalizedLink } from "@/i18n/navigation";

type Locale = "ro" | "en" | "de";

const copy = {
  ro: {
    eyebrow: "RomDoc pentru clinici",
    title: "O soluție simplă pentru clinici care vor să gestioneze medici, programări și costuri într-un singur loc.",
    intro: "RomDoc ajută clinicile să invite medici, să centralizeze abonamentele plătite de organizație și să urmărească serviciile operaționale, păstrând independența profesională a fiecărui medic.",
    create: "Creați cont pentru clinică",
    contact: "Contactați RomDoc",
    benefits: [
      ["Invitați medici în RomDoc", "Clinica poate invita medicii colaboratori printr-un flux dedicat organizației."],
      ["Centralizați abonamentele", "Abonamentele medicilor invitați de clinică pot fi administrate într-un singur loc."],
      ["Urmăriți consumul SMS", "Vizualizați consumul SMS al medicilor acoperiți și separarea mesajelor facturate de cele nefacturate."],
      ["Organizați echipa clinicii", "Gestionați membrii organizației, clinicile asociate și relațiile comerciale cu medicii invitați."],
    ],
    how: "Cum funcționează",
    howTitle: "Clinica gestionează relația comercială, medicul își păstrează independența profesională.",
    howDescription: "Medicul invitat are propriul cont, propriul profil și propria responsabilitate clinică. Organizația clinicii gestionează invitația și continuitatea acoperirii comerciale.",
    steps: ["Clinica creează un cont folosind opțiunea „Suntem clinică”.", "RomDoc verifică organizația și datele sale operaționale.", "Managerul clinicii invită medicii colaboratori.", "Medicul acceptă invitația și își activează contul separat.", "Clinica administrează acoperirea abonamentului și costurile operaționale.", "Echipa urmărește indicatorii organizației într-un singur dashboard."],
    ready: "Pregătiți clinica pentru programări online?",
    readyText: "Creați contul organizației, adăugați clinicile și invitați medicii care vor utiliza RomDoc prin relația cu organizația dumneavoastră.",
    clinic: "Suntem clinică",
    details: "Cereți detalii",
  },
  en: {
    eyebrow: "RomDoc for clinics",
    title: "A simple solution for clinics that want to manage doctors, appointments and costs in one place.",
    intro: "RomDoc helps clinics invite doctors, centralise organisation-paid subscriptions and monitor operational services while preserving each doctor's professional independence.",
    create: "Create clinic account",
    contact: "Contact RomDoc",
    benefits: [
      ["Invite doctors to RomDoc", "The clinic can invite collaborating doctors through a dedicated organisation workflow."],
      ["Centralise subscriptions", "Subscriptions for clinic-invited doctors can be administered in one place."],
      ["Track SMS usage", "View SMS usage for covered doctors and separate invoiced from uninvoiced messages."],
      ["Organise the clinic team", "Manage organisation members, associated clinics and commercial relationships with invited doctors."],
    ],
    how: "How it works",
    howTitle: "The clinic manages the commercial relationship; the doctor keeps professional independence.",
    howDescription: "An invited doctor has a separate account, profile and clinical responsibility. The clinic organisation manages the invitation and continuity of commercial coverage.",
    steps: ["The clinic creates an account using the “We are a clinic” option.", "RomDoc reviews the organisation and its operational details.", "The clinic manager invites collaborating doctors.", "The doctor accepts the invitation and activates a separate account.", "The clinic manages subscription coverage and operational costs.", "The team follows organisation indicators from one dashboard."],
    ready: "Ready to offer online appointments?",
    readyText: "Create the organisation account, add clinics and invite doctors who will use RomDoc through your clinic organisation.",
    clinic: "We are a clinic",
    details: "Request details",
  },
  de: {
    eyebrow: "RomDoc für Kliniken",
    title: "Eine einfache Lösung für Kliniken, die Ärzte, Termine und Kosten an einem Ort verwalten möchten.",
    intro: "RomDoc unterstützt Kliniken dabei, Ärzte einzuladen, von der Organisation bezahlte Abonnements zu bündeln und operative Dienste zu verfolgen, ohne die berufliche Unabhängigkeit der Ärzte einzuschränken.",
    create: "Klinikkonto erstellen",
    contact: "RomDoc kontaktieren",
    benefits: [
      ["Ärzte zu RomDoc einladen", "Die Klinik kann kooperierende Ärzte über einen eigenen Organisationsablauf einladen."],
      ["Abonnements bündeln", "Abonnements klinikeingeladener Ärzte können zentral verwaltet werden."],
      ["SMS-Nutzung verfolgen", "Sehen Sie die SMS-Nutzung der abgedeckten Ärzte und trennen Sie abgerechnete von nicht abgerechneten Nachrichten."],
      ["Klinikteam organisieren", "Verwalten Sie Organisationsmitglieder, zugeordnete Kliniken und Geschäftsbeziehungen mit eingeladenen Ärzten."],
    ],
    how: "So funktioniert es",
    howTitle: "Die Klinik verwaltet die Geschäftsbeziehung; der Arzt behält seine berufliche Unabhängigkeit.",
    howDescription: "Ein eingeladener Arzt besitzt ein separates Konto, ein eigenes Profil und die eigene klinische Verantwortung. Die Klinikorganisation verwaltet Einladung und kommerzielle Abdeckung.",
    steps: ["Die Klinik erstellt über „Wir sind eine Klinik“ ein Konto.", "RomDoc prüft die Organisation und ihre operativen Angaben.", "Der Klinikmanager lädt kooperierende Ärzte ein.", "Der Arzt nimmt die Einladung an und aktiviert ein separates Konto.", "Die Klinik verwaltet Abonnementabdeckung und operative Kosten.", "Das Team verfolgt die Organisationskennzahlen in einem Dashboard."],
    ready: "Bereit für Online-Termine?",
    readyText: "Erstellen Sie das Organisationskonto, fügen Sie Kliniken hinzu und laden Sie Ärzte ein, die RomDoc über Ihre Klinikorganisation nutzen.",
    clinic: "Wir sind eine Klinik",
    details: "Details anfordern",
  },
} as const;


const metadataCopy = {
  ro: {
    title: "RomDoc pentru clinici | Administrarea medicilor și programărilor",
    description:
      "Descoperiți soluția RomDoc pentru clinici: invitați medici, administrați abonamentele și urmăriți serviciile operaționale într-un singur loc.",
  },
  en: {
    title: "RomDoc for clinics | Manage doctors and appointments",
    description:
      "Discover RomDoc for clinics: invite doctors, manage subscriptions and monitor operational services from one place.",
  },
  de: {
    title: "RomDoc für Kliniken | Ärzte und Termine verwalten",
    description:
      "Entdecken Sie RomDoc für Kliniken: Ärzte einladen, Abonnements verwalten und operative Dienste zentral verfolgen.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const localizedMetadata = metadataCopy[locale] ?? metadataCopy.ro;

  return {
    title: localizedMetadata.title,
    description: localizedMetadata.description,
  };
}

export default async function ClinicOfferPage() {
  const locale = (await getLocale()) as Locale;
  const t = copy[locale];
  return (
    <PublicLayout>
      <main className="bg-[#F0EEE9]">
        <section className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-6 py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[#036661]">{t.eyebrow}</p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">{t.title}</h1>
            <p className="mt-6 text-lg leading-8 text-gray-700">{t.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <NextLink href="/register?role=clinic" className="romdoc-button romdoc-button-primary">{t.create}</NextLink>
              <LocalizedLink href={{ pathname: "/contact", hash: "suport-medici" }} className="romdoc-button romdoc-button-secondary">{t.contact}</LocalizedLink>
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-14 lg:grid-cols-4 lg:px-8">
            {t.benefits.map(([title, description]) => <article key={title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-gray-950">{title}</h2><p className="mt-3 text-sm leading-6 text-gray-600">{description}</p></article>)}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#036661]">{t.how}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">{t.howTitle}</h2>
            <p className="mt-5 text-base leading-7 text-gray-700">{t.howDescription}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <ol className="space-y-4">{t.steps.map((item, index) => <li key={item} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#036661] text-sm font-semibold text-white">{index + 1}</span><p className="pt-1 text-sm leading-6 text-gray-700">{item}</p></li>)}</ol>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
            <div className="rounded-3xl bg-[#036661] p-8 text-white lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
                <div><h2 className="text-3xl font-bold tracking-tight">{t.ready}</h2><p className="mt-4 text-base leading-7 text-white/85">{t.readyText}</p></div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <NextLink href="/register?role=clinic" className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#036661] transition hover:bg-[#F0EEE9]">{t.clinic}</NextLink>
                  <LocalizedLink href={{ pathname: "/contact", hash: "suport-medici" }} className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">{t.details}</LocalizedLink>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
