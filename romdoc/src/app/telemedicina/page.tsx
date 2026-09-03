import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import PublicLayout from "@/components/public/public-layout";
import { getPathname } from "@/i18n/navigation";
import {
  normalizeAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";

type ContentCard = {
  title: string;
  description: string;
};

type Step = {
  title: string;
  description: string;
};

type PageCopy = {
  metadataTitle: string;
  metadataDescription: string;
  eyebrow: string;
  title: string;
  lead: string;
  patientCta: string;
  professionalCta: string;
  capabilitiesEyebrow: string;
  capabilitiesTitle: string;
  capabilities: ContentCard[];
  flowEyebrow: string;
  flowTitle: string;
  steps: Step[];
  valueEyebrow: string;
  valueTitle: string;
  patientValueTitle: string;
  patientValue: string;
  doctorValueTitle: string;
  doctorValue: string;
  clinicValueTitle: string;
  clinicValue: string;
  paymentsTitle: string;
  paymentsDescription: string;
  privacyTitle: string;
  privacyDescription: string;
  suitabilityTitle: string;
  suitabilityDescription: string;
  availabilityTitle: string;
  availabilityDescription: string;
  emergencyTitle: string;
  emergencyDescription: string;
  closingTitle: string;
  closingDescription: string;
};

const LOCALIZED_PATHS: Record<AppLocale, string> = {
  ro: "/ro/telemedicina",
  en: "/en/telehealth",
  de: "/de/telemedizin",
};

const COPY: Record<AppLocale, PageCopy> = {
  ro: {
    metadataTitle: "Consultații video prin RomDoc",
    metadataDescription:
      "Descoperă cum RomDoc integrează programarea, plata, notificările și accesul la consultația video pentru pacienți, medici și organizații medicale.",
    eyebrow: "Telemedicină RomDoc",
    title: "Consultația video, integrată firesc în programarea medicală.",
    lead:
      "RomDoc reunește alegerea medicului, programarea, plata și accesul la consultația video într-un flux clar. Pacientul alege opțiunea video atunci când medicul sau organizația o oferă, iar consultația rămâne parte din aceeași programare RomDoc.",
    patientCta: "Găsește un medic",
    professionalCta: "Înscrie-te ca medic",
    capabilitiesEyebrow: "Ce poate face modulul",
    capabilitiesTitle: "Un singur flux, de la alegerea consultației până la întâlnirea video",
    capabilities: [
      {
        title: "Opțiune și cost vizibile înainte de rezervare",
        description:
          "Acolo unde consultațiile video sunt oferite, pacientul vede modalitatea, durata, prețul și limbile vorbite înainte de a trimite programarea.",
      },
      {
        title: "Plată online prin Stripe",
        description:
          "Plata este procesată în contul Stripe conectat al medicului independent sau al organizației medicale care primește plata.",
      },
      {
        title: "Același link RomDoc pentru pacient și medic",
        description:
          "Participanții autorizați folosesc aceeași adresă protejată a programării. Pe desktop, consultația se deschide într-o fereastră RomDoc; pe mobil, într-o filă nouă.",
      },
      {
        title: "Programare, calendar și notificări coordonate",
        description:
          "Durata consultației este păstrată în disponibilitate, confirmări, remindere și evenimentul de calendar, pentru un orar coerent.",
      },
      {
        title: "Continuitate cu Dosarul Medical al Pacientului",
        description:
          "Consultația video folosește aceeași programare și aceleași limite de acces ca restul fluxului RomDoc, inclusiv informațiile medicale permise pentru consultație.",
      },
      {
        title: "Control pentru medici și organizații",
        description:
          "Medicul independent își stabilește prețul și relația Stripe. Pentru medicii invitați de clinică, organizația controlează prețul și contul care primește plata.",
      },
    ],
    flowEyebrow: "Cum funcționează",
    flowTitle: "Patru pași simpli",
    steps: [
      {
        title: "Pacientul alege consultația video",
        description:
          "Opțiunea apare numai acolo unde este oferită. Pacientul vede informațiile relevante și își exprimă acordul informat pentru consultația la distanță.",
      },
      {
        title: "Programarea și plata sunt confirmate",
        description:
          "Stripe procesează plata, iar RomDoc confirmă programarea după notificarea securizată de plată.",
      },
      {
        title: "RomDoc pregătește sala Daily",
        description:
          "Pacientul și medicul accesează sala prin adresa RomDoc a programării, după autentificare și verificarea dreptului de participare.",
      },
      {
        title: "Consultația are loc fără înregistrare",
        description:
          "Daily furnizează conexiunea video. RomDoc și Daily nu înregistrează, nu transcriu și nu stochează conținutul audio sau video.",
      },
    ],
    valueEyebrow: "Valoare pentru fiecare participant",
    valueTitle: "Mai puțină fricțiune administrativă, mai multă claritate",
    patientValueTitle: "Pentru pacienți",
    patientValue:
      "Acces mai simplu atunci când deplasarea nu este necesară, informații clare înainte de plată și toate detaliile consultației în contul RomDoc.",
    doctorValueTitle: "Pentru medici independenți",
    doctorValue:
      "Control asupra ofertei, duratei și prețului, încasare în propriul cont Stripe și un flux video legat direct de programare.",
    clinicValueTitle: "Pentru organizații medicale",
    clinicValue:
      "Administrarea centralizată a ofertei și încasărilor pentru medicii invitați, păstrând programările și responsabilitățile comerciale în cadrul organizației.",
    paymentsTitle: "Cine primește plata și gestionează rambursarea?",
    paymentsDescription:
      "Plata ajunge la medicul independent sau la organizația medicală, în funcție de tipul contului medicului. RomDoc aplică un comision de aplicație de 0. Beneficiarul plății emite factura sau chitanța și gestionează rambursările.",
    privacyTitle: "Consultația este înregistrată?",
    privacyDescription:
      "Nu. Conținutul audio și video nu este înregistrat, transcris sau stocat de RomDoc ori Daily. RomDoc păstrează numai datele operaționale necesare programării, plății, accesului și auditului.",
    suitabilityTitle: "Consultația video înlocuiește întotdeauna examenul fizic?",
    suitabilityDescription:
      "Nu. Medicul decide dacă îngrijirea la distanță este potrivită situației și poate recomanda ulterior o consultație în persoană sau investigații suplimentare.",
    availabilityTitle: "Cât timp este disponibilă sala video?",
    availabilityDescription:
      "Sala rămâne disponibilă până la sfârșitul zilei următoare datei programării. O rambursare integrală face consultația video indisponibilă.",
    emergencyTitle: "Este potrivită pentru urgențe?",
    emergencyDescription:
      "Nu. Telemedicina RomDoc nu înlocuiește serviciile medicale de urgență. Pentru o urgență, apelează serviciile de urgență corespunzătoare.",
    closingTitle: "Consultații video, fără un sistem separat de programări",
    closingDescription:
      "RomDoc păstrează consultația video în același loc cu profilul medicului, disponibilitatea, programarea, mesajele și informațiile medicale permise.",
  },
  en: {
    metadataTitle: "Video consultations through RomDoc",
    metadataDescription:
      "Learn how RomDoc combines booking, payment, reminders and video access for patients, doctors and healthcare organisations.",
    eyebrow: "RomDoc telehealth",
    title: "Video consultation, naturally integrated into the medical appointment.",
    lead:
      "RomDoc brings doctor selection, booking, payment and video access into one clear flow. Patients choose video where the doctor or organisation offers it, and the consultation remains part of the same RomDoc appointment.",
    patientCta: "Find a doctor",
    professionalCta: "Join as a doctor",
    capabilitiesEyebrow: "What the module can do",
    capabilitiesTitle: "One flow from choosing the consultation to joining the video call",
    capabilities: [
      {
        title: "Format and cost shown before booking",
        description:
          "Where video consultations are offered, patients see the format, duration, price and spoken languages before submitting the appointment.",
      },
      {
        title: "Online payment through Stripe",
        description:
          "Payment is processed in the connected Stripe account of the independent doctor or healthcare organisation receiving the funds.",
      },
      {
        title: "The same RomDoc link for patient and doctor",
        description:
          "Authorised participants use the same protected appointment address. On desktop, the consultation opens in a RomDoc window; on mobile, it opens in a new tab.",
      },
      {
        title: "Coordinated booking, calendar and reminders",
        description:
          "Consultation duration is carried through availability, confirmations, reminders and the calendar event, keeping schedules consistent.",
      },
      {
        title: "Continuity with the Patient Medical Folder",
        description:
          "The video consultation uses the same appointment and access boundaries as the rest of RomDoc, including medical information permitted for the consultation.",
      },
      {
        title: "Control for doctors and organisations",
        description:
          "Independent doctors set their own price and Stripe relationship. For clinic-invited doctors, the organisation controls the price and receiving account.",
      },
    ],
    flowEyebrow: "How it works",
    flowTitle: "Four straightforward steps",
    steps: [
      {
        title: "The patient chooses video",
        description:
          "The option appears only where it is offered. The patient sees the relevant details and records informed consent for remote consultation.",
      },
      {
        title: "Booking and payment are confirmed",
        description:
          "Stripe processes the payment, and RomDoc confirms the appointment after the secure payment notification.",
      },
      {
        title: "RomDoc prepares the Daily room",
        description:
          "Patient and doctor enter through the RomDoc appointment address after authentication and participant-access checks.",
      },
      {
        title: "The consultation takes place without recording",
        description:
          "Daily provides the video connection. RomDoc and Daily do not record, transcribe or store audio or video content.",
      },
    ],
    valueEyebrow: "Value for every participant",
    valueTitle: "Less administrative friction and greater clarity",
    patientValueTitle: "For patients",
    patientValue:
      "Simpler access when travel is unnecessary, clear information before payment, and all consultation details in the RomDoc account.",
    doctorValueTitle: "For independent doctors",
    doctorValue:
      "Control of the offer, duration and price, payment into their own Stripe account, and a video workflow directly linked to the appointment.",
    clinicValueTitle: "For healthcare organisations",
    clinicValue:
      "Centralised management of the offer and receipts for invited doctors, keeping commercial responsibilities and appointments within the organisation.",
    paymentsTitle: "Who receives payment and handles refunds?",
    paymentsDescription:
      "Payment goes to the independent doctor or healthcare organisation, depending on the doctor account type. RomDoc applies a zero application fee. The payment recipient issues the invoice or receipt and manages refunds.",
    privacyTitle: "Is the consultation recorded?",
    privacyDescription:
      "No. Audio and video content is not recorded, transcribed or stored by RomDoc or Daily. RomDoc keeps only the operational data required for the appointment, payment, access and audit trail.",
    suitabilityTitle: "Does video always replace an in-person examination?",
    suitabilityDescription:
      "No. The doctor decides whether remote care is appropriate for the situation and may later recommend an in-person appointment or additional investigations.",
    availabilityTitle: "How long is the video room available?",
    availabilityDescription:
      "The room remains available through the end of the day following the appointment date. A full refund makes the video consultation unavailable.",
    emergencyTitle: "Is it suitable for emergencies?",
    emergencyDescription:
      "No. RomDoc telehealth does not replace emergency medical services. For an emergency, contact the appropriate emergency service.",
    closingTitle: "Video consultations without a separate booking system",
    closingDescription:
      "RomDoc keeps video care alongside the doctor profile, availability, appointment, messages and permitted medical information.",
  },
  de: {
    metadataTitle: "Videosprechstunden über RomDoc",
    metadataDescription:
      "Erfahren Sie, wie RomDoc Terminbuchung, Zahlung, Erinnerungen und Videozugang für Patienten, Ärzte und medizinische Organisationen verbindet.",
    eyebrow: "RomDoc Telemedizin",
    title: "Die Videosprechstunde – nahtlos in den Arzttermin integriert.",
    lead:
      "RomDoc verbindet Arztauswahl, Terminbuchung, Zahlung und Videozugang in einem klaren Ablauf. Patienten wählen Video dort, wo der Arzt oder die Organisation es anbietet; die Sprechstunde bleibt Teil desselben RomDoc-Termins.",
    patientCta: "Arzt finden",
    professionalCta: "Als Arzt registrieren",
    capabilitiesEyebrow: "Was das Modul bietet",
    capabilitiesTitle: "Ein Ablauf von der Auswahl bis zur Videosprechstunde",
    capabilities: [
      {
        title: "Format und Kosten vor der Buchung sichtbar",
        description:
          "Wo Videosprechstunden angeboten werden, sehen Patienten Format, Dauer, Preis und gesprochene Sprachen vor der Terminanfrage.",
      },
      {
        title: "Online-Zahlung über Stripe",
        description:
          "Die Zahlung wird im verbundenen Stripe-Konto des selbstständigen Arztes oder der medizinischen Organisation verarbeitet, die das Geld erhält.",
      },
      {
        title: "Derselbe RomDoc-Link für Patient und Arzt",
        description:
          "Berechtigte Teilnehmer nutzen dieselbe geschützte Terminadresse. Auf dem Desktop öffnet sich die Sprechstunde in einem RomDoc-Fenster, mobil in einem neuen Tab.",
      },
      {
        title: "Abgestimmte Buchung, Kalender und Erinnerungen",
        description:
          "Die Sprechstundendauer wird in Verfügbarkeit, Bestätigungen, Erinnerungen und Kalendereintrag übernommen und hält den Zeitplan konsistent.",
      },
      {
        title: "Kontinuität mit der Patientenakte",
        description:
          "Die Videosprechstunde nutzt denselben Termin und dieselben Zugriffsgrenzen wie RomDoc, einschließlich der für die Sprechstunde erlaubten medizinischen Informationen.",
      },
      {
        title: "Kontrolle für Ärzte und Organisationen",
        description:
          "Selbstständige Ärzte bestimmen Preis und Stripe-Beziehung selbst. Bei von einer Klinik eingeladenen Ärzten steuert die Organisation Preis und Empfängerkonto.",
      },
    ],
    flowEyebrow: "So funktioniert es",
    flowTitle: "Vier einfache Schritte",
    steps: [
      {
        title: "Der Patient wählt Video",
        description:
          "Die Option erscheint nur dort, wo sie angeboten wird. Der Patient sieht die relevanten Angaben und erteilt die Einwilligung zur Fernkonsultation.",
      },
      {
        title: "Termin und Zahlung werden bestätigt",
        description:
          "Stripe verarbeitet die Zahlung; RomDoc bestätigt den Termin nach der sicheren Zahlungsbenachrichtigung.",
      },
      {
        title: "RomDoc bereitet den Daily-Raum vor",
        description:
          "Patient und Arzt treten nach Anmeldung und Teilnehmerprüfung über die RomDoc-Terminadresse bei.",
      },
      {
        title: "Die Sprechstunde findet ohne Aufzeichnung statt",
        description:
          "Daily stellt die Videoverbindung bereit. RomDoc und Daily zeichnen Audio- oder Videoinhalte weder auf noch transkribieren oder speichern sie diese.",
      },
    ],
    valueEyebrow: "Mehrwert für alle Beteiligten",
    valueTitle: "Weniger Verwaltungsaufwand und mehr Klarheit",
    patientValueTitle: "Für Patienten",
    patientValue:
      "Einfacherer Zugang, wenn keine Anreise nötig ist, klare Informationen vor der Zahlung und alle Sprechstundendetails im RomDoc-Konto.",
    doctorValueTitle: "Für selbstständige Ärzte",
    doctorValue:
      "Kontrolle über Angebot, Dauer und Preis, Zahlung auf das eigene Stripe-Konto und ein direkt mit dem Termin verbundener Videoablauf.",
    clinicValueTitle: "Für medizinische Organisationen",
    clinicValue:
      "Zentrale Verwaltung von Angebot und Einnahmen für eingeladene Ärzte, während Termine und kaufmännische Verantwortung in der Organisation bleiben.",
    paymentsTitle: "Wer erhält die Zahlung und bearbeitet Erstattungen?",
    paymentsDescription:
      "Je nach Arztkontotyp geht die Zahlung an den selbstständigen Arzt oder die medizinische Organisation. RomDoc erhebt eine Anwendungsgebühr von 0. Der Zahlungsempfänger stellt Rechnung oder Beleg aus und bearbeitet Erstattungen.",
    privacyTitle: "Wird die Sprechstunde aufgezeichnet?",
    privacyDescription:
      "Nein. Audio- und Videoinhalte werden weder von RomDoc noch von Daily aufgezeichnet, transkribiert oder gespeichert. RomDoc speichert nur die für Termin, Zahlung, Zugriff und Prüfpfad erforderlichen Betriebsdaten.",
    suitabilityTitle: "Ersetzt Video immer eine persönliche Untersuchung?",
    suitabilityDescription:
      "Nein. Der Arzt entscheidet, ob Fernbehandlung für die Situation geeignet ist, und kann anschließend einen persönlichen Termin oder weitere Untersuchungen empfehlen.",
    availabilityTitle: "Wie lange ist der Videoraum verfügbar?",
    availabilityDescription:
      "Der Raum bleibt bis zum Ende des Tages nach dem Termin verfügbar. Eine vollständige Erstattung macht die Videosprechstunde nicht mehr verfügbar.",
    emergencyTitle: "Ist Telemedizin für Notfälle geeignet?",
    emergencyDescription:
      "Nein. RomDoc Telemedizin ersetzt keine medizinischen Notfalldienste. Wenden Sie sich in einem Notfall an den zuständigen Notdienst.",
    closingTitle: "Videosprechstunden ohne separates Buchungssystem",
    closingDescription:
      "RomDoc hält Video, Arztprofil, Verfügbarkeit, Termin, Nachrichten und erlaubte medizinische Informationen an einem Ort zusammen.",
  },
};

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

export default async function TelehealthInformationPage() {
  const locale = normalizeAppLocale(await getLocale());
  const copy = COPY[locale];
  const doctorsHref = getPathname({ locale, href: "/medici" });
  const doctorRegistrationHref = `/register?locale=${locale}&role=doctor&type=doctor`;

  const valueCards = [
    {
      title: copy.patientValueTitle,
      description: copy.patientValue,
    },
    {
      title: copy.doctorValueTitle,
      description: copy.doctorValue,
    },
    {
      title: copy.clinicValueTitle,
      description: copy.clinicValue,
    },
  ];

  const questions = [
    {
      title: copy.paymentsTitle,
      description: copy.paymentsDescription,
    },
    {
      title: copy.privacyTitle,
      description: copy.privacyDescription,
    },
    {
      title: copy.suitabilityTitle,
      description: copy.suitabilityDescription,
    },
    {
      title: copy.availabilityTitle,
      description: copy.availabilityDescription,
    },
    {
      title: copy.emergencyTitle,
      description: copy.emergencyDescription,
    },
  ];

  return (
    <PublicLayout locale={locale}>
      <main className="bg-[#F0EEE9] text-gray-950">
        <section className="border-b border-gray-200 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              {copy.eyebrow}
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {copy.title}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              {copy.lead}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={doctorsHref} className="romdoc-button romdoc-button-primary">
                {copy.patientCta}
              </Link>

              <Link href={doctorRegistrationHref} className="romdoc-button romdoc-button-secondary">
                {copy.professionalCta}
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              {copy.capabilitiesEyebrow}
            </p>

            <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              {copy.capabilitiesTitle}
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {copy.capabilities.map((capability) => (
                <article key={capability.title} className="rounded-2xl border border-gray-200 bg-[#F8F7F4] p-6">
                  <h3 className="text-lg font-semibold text-gray-950">
                    {capability.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {capability.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              {copy.flowEyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {copy.flowTitle}
            </h2>

            <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {copy.steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#036661] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#073B3A] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#91D7D0]">
              {copy.valueEyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              {copy.valueTitle}
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {valueCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-white/15 bg-white/5 p-6">
                  <h3 className="text-lg font-semibold">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/75">
                    {card.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200">
              {questions.map((question) => (
                <article key={question.title} className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-gray-950">
                    {question.title}
                  </h2>
                  <p className="mt-3 leading-7 text-gray-600">
                    {question.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-sm sm:p-12">
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              {copy.closingTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600">
              {copy.closingDescription}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={doctorsHref} className="romdoc-button romdoc-button-primary">
                {copy.patientCta}
              </Link>
              <Link href={doctorRegistrationHref} className="romdoc-button romdoc-button-secondary">
                {copy.professionalCta}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
