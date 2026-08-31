"use client";

import { FormEvent, useMemo, useState } from "react";

import { Link as LocalizedLink } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/app-locale";

type PreferredSolution = "integrated" | "romdoc";
type Props = {
  locale: AppLocale;
  initialSolution: PreferredSolution | null;
};

type Copy = {
  question: string;
  selectOne: string;
  solutionA: string;
  solutionADescription: string;
  solutionB: string;
  solutionBDescription: string;
  prioritiesTitle: string;
  prioritiesDescription: string;
  priorities: Record<string, string>;
  organisationTitle: string;
  organisationDescription: string;
  organisationTypes: Record<string, string>;
  doctorCountLabel: string;
  doctorCounts: Record<string, string>;
  nextStepTitle: string;
  nextStepDescription: string;
  nextSteps: Record<string, string>;
  contactTitle: string;
  contactDescription: string;
  organisationName: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
  notesPlaceholder: string;
  privacyPrefix: string;
  privacyLink: string;
  submit: string;
  submitting: string;
  submitError: string;
  successTitle: string;
  successText: string;
  required: string;
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    question: "Cum ați prefera să gestionați programările online pentru organizația dumneavoastră?",
    selectOne: "Alegeți varianta care se apropie cel mai mult de ceea ce aveți nevoie.",
    solutionA: "Soluție pentru website-ul și sistemele noastre",
    solutionADescription:
      "Integrați programările online cu website-ul, software-ul sau fluxurile interne existente ale organizației.",
    solutionB: "Folosiți platforma RomDoc",
    solutionBDescription:
      "Listați clinicile și medicii în RomDoc și utilizați sistemul de programări și administrare deja construit.",
    prioritiesTitle: "Ce este cel mai important pentru organizația dumneavoastră?",
    prioritiesDescription: "Puteți selecta mai multe variante.",
    priorities: {
      online_booking: "Programări online pentru pacienți",
      reduce_phone_calls: "Reducerea apelurilor și programărilor manuale",
      multi_location_management: "Gestionarea mai multor medici sau locații într-un singur loc",
      existing_system_integration: "Integrarea cu website-ul sau software-ul existent",
      patient_acquisition: "Vizibilitate online și atragerea de pacienți noi",
      sms_services: "Confirmări și mementouri pentru programări prin SMS",
      patient_communication: "Comunicare mai bună cu pacienții",
      other: "Altă prioritate",
    },
    organisationTitle: "Ce descrie cel mai bine organizația dumneavoastră?",
    organisationDescription:
      "Aceste informații ne ajută să înțelegem amploarea și structura soluției necesare.",
    organisationTypes: {
      independent_clinic: "Clinică medicală independentă",
      multi_location_clinic: "Clinică cu mai multe locații",
      medical_centre: "Centru medical / policlinică",
      private_hospital: "Spital privat / grup de spitale",
      diagnostic_imaging: "Centru de diagnostic / imagistică",
      laboratory: "Laborator",
      other: "Alt tip de organizație",
    },
    doctorCountLabel: "Aproximativ câți medici lucrează în organizație?",
    doctorCounts: {
      "1_5": "1–5 medici",
      "6_20": "6–20 medici",
      "21_50": "21–50 medici",
      "51_100": "51–100 medici",
      "100_plus": "Peste 100 de medici",
    },
    nextStepTitle: "Cum doriți să continuăm?",
    nextStepDescription: "Alegeți următorul pas care v-ar fi cel mai util.",
    nextSteps: {
      intro_meeting: "Stabilirea unei scurte întâlniri introductive",
      demo: "O demonstrație RomDoc",
      integration_discussion: "Discuție despre integrarea cu sistemul nostru existent",
      email_information: "Mai multe informații prin e-mail",
      custom_solution: "Discuție despre o soluție personalizată",
    },
    contactTitle: "Aproape gata — unde vă putem contacta?",
    contactDescription:
      "Vom folosi aceste date numai pentru a răspunde acestei solicitări și pentru a discuta cerințele organizației.",
    organisationName: "Numele organizației",
    contactName: "Persoană de contact (opțional)",
    email: "E-mail",
    phone: "Telefon",
    notes: "Alte informații (opțional)",
    notesPlaceholder: "De exemplu: software folosit în prezent, număr de locații sau o cerință importantă.",
    privacyPrefix: "Prin trimiterea formularului confirmați că putem folosi datele introduse pentru a răspunde solicitării. Consultați",
    privacyLink: "Politica de confidențialitate",
    submit: "Trimite cerințele organizației",
    submitting: "Se trimite…",
    submitError: "Solicitarea nu a putut fi trimisă. Verificați câmpurile și încercați din nou.",
    successTitle: "Vă mulțumim.",
    successText:
      "Am primit cerințele organizației. Echipa RomDoc vă va contacta pentru a discuta soluția potrivită.",
    required: "Obligatoriu",
  },
  en: {
    question: "How would you prefer to manage online appointments for your organisation?",
    selectOne: "Choose the approach that is closest to what you need.",
    solutionA: "A solution for our own website and systems",
    solutionADescription:
      "Integrate online appointments with your existing website, software or internal workflows.",
    solutionB: "Use the RomDoc platform",
    solutionBDescription:
      "List your clinics and doctors in RomDoc and use the ready-built appointment and management system.",
    prioritiesTitle: "What is most important to your organisation?",
    prioritiesDescription: "You can select more than one option.",
    priorities: {
      online_booking: "Online appointment booking for patients",
      reduce_phone_calls: "Reduce phone calls and manual appointment administration",
      multi_location_management: "Manage multiple doctors or locations centrally",
      existing_system_integration: "Integrate with our existing website or software",
      patient_acquisition: "Increase online visibility and attract new patients",
      sms_services: "SMS confirmations and appointment reminders",
      patient_communication: "Improve communication with patients",
      other: "Other priority",
    },
    organisationTitle: "What best describes your organisation?",
    organisationDescription:
      "This helps us understand the scale and structure of the solution you may need.",
    organisationTypes: {
      independent_clinic: "Independent medical clinic",
      multi_location_clinic: "Clinic with multiple locations",
      medical_centre: "Medical centre / polyclinic",
      private_hospital: "Private hospital / hospital group",
      diagnostic_imaging: "Diagnostic / imaging centre",
      laboratory: "Laboratory",
      other: "Other organisation",
    },
    doctorCountLabel: "Approximately how many doctors work in your organisation?",
    doctorCounts: {
      "1_5": "1–5 doctors",
      "6_20": "6–20 doctors",
      "21_50": "21–50 doctors",
      "51_100": "51–100 doctors",
      "100_plus": "More than 100 doctors",
    },
    nextStepTitle: "How would you like us to continue?",
    nextStepDescription: "Choose the next step that would be most useful to you.",
    nextSteps: {
      intro_meeting: "Arrange a short introductory meeting",
      demo: "Request a RomDoc demonstration",
      integration_discussion: "Discuss integration with our existing system",
      email_information: "Receive more information by email",
      custom_solution: "Discuss a customised solution",
    },
    contactTitle: "Almost finished — where can we contact you?",
    contactDescription:
      "We will use these details only to respond to this enquiry and discuss your organisation's requirements.",
    organisationName: "Organisation name",
    contactName: "Contact person's name (optional)",
    email: "Email",
    phone: "Phone number",
    notes: "Anything else we should know? (optional)",
    notesPlaceholder: "For example: current software, number of locations, or an important requirement.",
    privacyPrefix: "By submitting the form, you confirm that we may use the information provided to respond to your enquiry. See our",
    privacyLink: "Privacy Policy",
    submit: "Send our requirements",
    submitting: "Sending…",
    submitError: "Your request could not be submitted. Check the fields and try again.",
    successTitle: "Thank you.",
    successText:
      "We have received your organisation's requirements. The RomDoc team will contact you to discuss the most suitable approach.",
    required: "Required",
  },
  de: {
    question: "Wie möchten Sie Online-Termine für Ihre Organisation verwalten?",
    selectOne: "Wählen Sie den Ansatz, der Ihrem Bedarf am nächsten kommt.",
    solutionA: "Eine Lösung für unsere eigene Website und Systeme",
    solutionADescription:
      "Integrieren Sie Online-Termine in Ihre bestehende Website, Software oder interne Arbeitsabläufe.",
    solutionB: "Die RomDoc-Plattform verwenden",
    solutionBDescription:
      "Listen Sie Ihre Kliniken und Ärzte bei RomDoc und nutzen Sie das bereits vorhandene Termin- und Verwaltungssystem.",
    prioritiesTitle: "Was ist für Ihre Organisation am wichtigsten?",
    prioritiesDescription: "Sie können mehrere Optionen auswählen.",
    priorities: {
      online_booking: "Online-Terminbuchung für Patienten",
      reduce_phone_calls: "Weniger Telefonate und manuelle Terminverwaltung",
      multi_location_management: "Mehrere Ärzte oder Standorte zentral verwalten",
      existing_system_integration: "Integration mit unserer bestehenden Website oder Software",
      patient_acquisition: "Online-Sichtbarkeit erhöhen und neue Patienten erreichen",
      sms_services: "SMS-Bestätigungen und Terminerinnerungen",
      patient_communication: "Kommunikation mit Patienten verbessern",
      other: "Andere Priorität",
    },
    organisationTitle: "Was beschreibt Ihre Organisation am besten?",
    organisationDescription:
      "Diese Angaben helfen uns, Umfang und Struktur der benötigten Lösung zu verstehen.",
    organisationTypes: {
      independent_clinic: "Unabhängige medizinische Klinik",
      multi_location_clinic: "Klinik mit mehreren Standorten",
      medical_centre: "Medizinisches Zentrum / Poliklinik",
      private_hospital: "Privatkrankenhaus / Krankenhausgruppe",
      diagnostic_imaging: "Diagnostik- / Bildgebungszentrum",
      laboratory: "Labor",
      other: "Andere Organisation",
    },
    doctorCountLabel: "Wie viele Ärzte arbeiten ungefähr in Ihrer Organisation?",
    doctorCounts: {
      "1_5": "1–5 Ärzte",
      "6_20": "6–20 Ärzte",
      "21_50": "21–50 Ärzte",
      "51_100": "51–100 Ärzte",
      "100_plus": "Mehr als 100 Ärzte",
    },
    nextStepTitle: "Wie möchten Sie fortfahren?",
    nextStepDescription: "Wählen Sie den nächsten Schritt, der für Sie am hilfreichsten wäre.",
    nextSteps: {
      intro_meeting: "Kurzes Einführungsgespräch vereinbaren",
      demo: "RomDoc-Demonstration anfordern",
      integration_discussion: "Integration mit unserem bestehenden System besprechen",
      email_information: "Weitere Informationen per E-Mail erhalten",
      custom_solution: "Individuelle Lösung besprechen",
    },
    contactTitle: "Fast fertig — wie können wir Sie erreichen?",
    contactDescription:
      "Wir verwenden diese Angaben nur, um auf diese Anfrage zu antworten und die Anforderungen Ihrer Organisation zu besprechen.",
    organisationName: "Name der Organisation",
    contactName: "Kontaktperson (optional)",
    email: "E-Mail",
    phone: "Telefonnummer",
    notes: "Weitere Informationen (optional)",
    notesPlaceholder: "Zum Beispiel: aktuelle Software, Anzahl der Standorte oder eine wichtige Anforderung.",
    privacyPrefix: "Mit dem Absenden bestätigen Sie, dass wir die eingegebenen Daten zur Beantwortung Ihrer Anfrage verwenden dürfen. Siehe",
    privacyLink: "Datenschutzerklärung",
    submit: "Anforderungen senden",
    submitting: "Wird gesendet…",
    submitError: "Ihre Anfrage konnte nicht gesendet werden. Prüfen Sie die Felder und versuchen Sie es erneut.",
    successTitle: "Vielen Dank.",
    successText:
      "Wir haben die Anforderungen Ihrer Organisation erhalten. Das RomDoc-Team wird Sie kontaktieren, um den passenden Ansatz zu besprechen.",
    required: "Pflichtfeld",
  },
};

const PRIORITY_VALUES = [
  "online_booking",
  "reduce_phone_calls",
  "multi_location_management",
  "existing_system_integration",
  "patient_acquisition",
  "sms_services",
  "patient_communication",
  "other",
] as const;

const ORGANISATION_VALUES = [
  "independent_clinic",
  "multi_location_clinic",
  "medical_centre",
  "private_hospital",
  "diagnostic_imaging",
  "laboratory",
  "other",
] as const;

const DOCTOR_COUNT_VALUES = ["1_5", "6_20", "21_50", "51_100", "100_plus"] as const;

const NEXT_STEP_VALUES = [
  "intro_meeting",
  "demo",
  "integration_discussion",
  "email_information",
  "custom_solution",
] as const;

function ChoiceCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`romdoc-focus-ring min-h-[178px] rounded-[21px] border p-[21px] text-left transition ${
        selected
          ? "border-[#036661] bg-[#036661]/7 shadow-sm ring-2 ring-[#036661]/15"
          : "border-gray-200 bg-white hover:border-[#036661]/50 hover:bg-[#036661]/3"
      }`}
    >
      <span className="flex items-start justify-between gap-[13px]">
        <span className="text-lg font-bold text-gray-950">{title}</span>
        <span
          aria-hidden="true"
          className={`mt-[2px] flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border ${
            selected
              ? "border-[#036661] bg-[#036661] text-white"
              : "border-gray-300 bg-white text-transparent"
          }`}
        >
          ✓
        </span>
      </span>
      <span className="mt-[13px] block text-sm leading-6 text-gray-600">{description}</span>
    </button>
  );
}

export default function ClinicOrganisationQuestionnaire({
  locale,
  initialSolution,
}: Props) {
  const t = COPY[locale];
  const [preferredSolution, setPreferredSolution] = useState<PreferredSolution | null>(
    initialSolution
  );
  const [priorities, setPriorities] = useState<string[]>([]);
  const [organizationType, setOrganizationType] = useState("");
  const [doctorCountRange, setDoctorCountRange] = useState("");
  const [desiredNextStep, setDesiredNextStep] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prioritySet = useMemo(() => new Set(priorities), [priorities]);

  function togglePriority(value: string) {
    setPriorities((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (
      !preferredSolution ||
      priorities.length === 0 ||
      !organizationType ||
      !doctorCountRange ||
      !desiredNextStep
    ) {
      setError(t.submitError);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      preferredSolution,
      priorities,
      organizationType,
      doctorCountRange,
      desiredNextStep,
      organizationName: String(formData.get("organizationName") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      website: String(formData.get("website") ?? ""),
      locale,
    };

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/clinic-organisation-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("SUBMIT_FAILED");
      }

      setSubmitted(true);
    } catch {
      setError(t.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="rounded-[34px] border border-[#036661]/25 bg-white p-[34px] shadow-sm">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-[55px] w-[55px] items-center justify-center rounded-full bg-[#036661] text-2xl text-white">
            ✓
          </div>
          <h2 className="mt-[21px] text-3xl font-bold tracking-tight text-gray-950">
            {t.successTitle}
          </h2>
          <p className="mx-auto mt-[13px] max-w-2xl text-base leading-7 text-gray-600">
            {t.successText}
          </p>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[34px]">
      <section className="rounded-[34px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">01</p>
          <h2 className="mt-[8px] text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            {t.question}
          </h2>
          <p className="mt-[13px] text-sm leading-6 text-gray-600">{t.selectOne}</p>
        </div>

        <div className="mt-[21px] grid gap-[13px] md:grid-cols-2">
          <ChoiceCard
            selected={preferredSolution === "integrated"}
            title={`A — ${t.solutionA}`}
            description={t.solutionADescription}
            onClick={() => setPreferredSolution("integrated")}
          />
          <ChoiceCard
            selected={preferredSolution === "romdoc"}
            title={`B — ${t.solutionB}`}
            description={t.solutionBDescription}
            onClick={() => setPreferredSolution("romdoc")}
          />
        </div>
      </section>

      <section className="rounded-[34px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">02</legend>
          <h2 className="mt-[8px] text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            {t.prioritiesTitle}
          </h2>
          <p className="mt-[13px] text-sm leading-6 text-gray-600">{t.prioritiesDescription}</p>

          <div className="mt-[21px] grid gap-[13px] md:grid-cols-2">
            {PRIORITY_VALUES.map((value) => (
              <label
                key={value}
                className={`romdoc-focus-ring flex cursor-pointer items-start gap-[13px] rounded-[13px] border p-[13px] transition ${
                  prioritySet.has(value)
                    ? "border-[#036661] bg-[#036661]/7"
                    : "border-gray-200 bg-gray-50 hover:border-[#036661]/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={prioritySet.has(value)}
                  onChange={() => togglePriority(value)}
                  className="mt-[3px] h-[18px] w-[18px] accent-[#036661]"
                />
                <span className="text-sm font-medium leading-6 text-gray-800">
                  {t.priorities[value]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="rounded-[34px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">03</p>
        <h2 className="mt-[8px] text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
          {t.organisationTitle}
        </h2>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {t.organisationDescription}
        </p>

        <div className="mt-[21px] grid gap-[21px] md:grid-cols-2">
          <label className="block">
            <span className="mb-[8px] block text-sm font-semibold text-gray-800">{t.organisationTitle}</span>
            <select
              required
              value={organizationType}
              onChange={(event) => setOrganizationType(event.target.value)}
              className="romdoc-focus-ring min-h-[55px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] text-sm text-gray-900"
            >
              <option value="">—</option>
              {ORGANISATION_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t.organisationTypes[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-[8px] block text-sm font-semibold text-gray-800">{t.doctorCountLabel}</span>
            <select
              required
              value={doctorCountRange}
              onChange={(event) => setDoctorCountRange(event.target.value)}
              className="romdoc-focus-ring min-h-[55px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] text-sm text-gray-900"
            >
              <option value="">—</option>
              {DOCTOR_COUNT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t.doctorCounts[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-[34px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">04</legend>
          <h2 className="mt-[8px] text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            {t.nextStepTitle}
          </h2>
          <p className="mt-[13px] text-sm leading-6 text-gray-600">{t.nextStepDescription}</p>

          <div className="mt-[21px] grid gap-[13px] md:grid-cols-2">
            {NEXT_STEP_VALUES.map((value) => (
              <label
                key={value}
                className={`romdoc-focus-ring flex cursor-pointer items-start gap-[13px] rounded-[13px] border p-[13px] transition ${
                  desiredNextStep === value
                    ? "border-[#036661] bg-[#036661]/7"
                    : "border-gray-200 bg-gray-50 hover:border-[#036661]/40"
                }`}
              >
                <input
                  required
                  type="radio"
                  name="desiredNextStep"
                  value={value}
                  checked={desiredNextStep === value}
                  onChange={() => setDesiredNextStep(value)}
                  className="mt-[3px] h-[18px] w-[18px] accent-[#036661]"
                />
                <span className="text-sm font-medium leading-6 text-gray-800">
                  {t.nextSteps[value]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="rounded-[34px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">05</p>
        <h2 className="mt-[8px] text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
          {t.contactTitle}
        </h2>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {t.contactDescription}
        </p>

        <div className="mt-[21px] grid gap-[21px] md:grid-cols-2">
          <label className="block">
            <span className="mb-[8px] block text-sm font-semibold text-gray-800">
              {t.organisationName} <span className="text-[#9A4F35]">*</span>
            </span>
            <input
              required
              name="organizationName"
              type="text"
              maxLength={180}
              autoComplete="organization"
              className="romdoc-focus-ring min-h-[55px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] text-sm text-gray-900"
            />
          </label>

          <label className="block">
            <span className="mb-[8px] block text-sm font-semibold text-gray-800">{t.contactName}</span>
            <input
              name="contactName"
              type="text"
              maxLength={140}
              autoComplete="name"
              className="romdoc-focus-ring min-h-[55px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] text-sm text-gray-900"
            />
          </label>

          <label className="block">
            <span className="mb-[8px] block text-sm font-semibold text-gray-800">
              {t.email} <span className="text-[#9A4F35]">*</span>
            </span>
            <input
              required
              name="email"
              type="email"
              maxLength={254}
              autoComplete="email"
              className="romdoc-focus-ring min-h-[55px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] text-sm text-gray-900"
            />
          </label>

          <label className="block">
            <span className="mb-[8px] block text-sm font-semibold text-gray-800">
              {t.phone} <span className="text-[#9A4F35]">*</span>
            </span>
            <input
              required
              name="phone"
              type="tel"
              maxLength={30}
              autoComplete="tel"
              className="romdoc-focus-ring min-h-[55px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] text-sm text-gray-900"
            />
          </label>
        </div>

        <label className="mt-[21px] block">
          <span className="mb-[8px] block text-sm font-semibold text-gray-800">{t.notes}</span>
          <textarea
            name="notes"
            rows={5}
            maxLength={2000}
            placeholder={t.notesPlaceholder}
            className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm leading-6 text-gray-900"
          />
        </label>

        <label className="hidden" aria-hidden="true">
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>

        <p className="mt-[21px] text-xs leading-5 text-gray-500">
          {t.privacyPrefix}{" "}
          <LocalizedLink
            href="/confidentialitate"
            className="romdoc-focus-ring rounded-sm font-semibold text-[#036661] underline-offset-2 hover:underline"
          >
            {t.privacyLink}
          </LocalizedLink>
          .
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-[21px]">
          <button
            type="submit"
            disabled={isSubmitting}
            className="romdoc-button romdoc-button-primary min-h-[55px] px-[34px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t.submitting : t.submit}
          </button>
        </div>
      </section>
    </form>
  );
}
