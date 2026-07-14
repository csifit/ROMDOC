import type { AppLocale } from "@/i18n/routing";

export const LEGAL_PAGE_KEYS = [
  "terms",
  "privacy",
  "cookies",
  "legal_information",
] as const;

export const LEGAL_LOCALES = ["ro", "en", "de"] as const;

export type LegalPageKey = (typeof LEGAL_PAGE_KEYS)[number];
export type LegalLocale = (typeof LEGAL_LOCALES)[number];

export type LegalPageDefinition = {
  key: LegalPageKey;
  title: string;
  route: string;
  eyebrow: string;
  description: string;
  notice: string;
  defaultContent: string;
  fallbackUpdatedAt: string;
};

export type LegalContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export type ParsedLegalSection = {
  id: string;
  title: string;
  blocks: LegalContentBlock[];
};

const FALLBACK_UPDATED_AT = "2026-07-14T00:00:00.000Z";

const routes: Record<LegalPageKey, string> = {
  terms: "/termeni-si-conditii",
  privacy: "/confidentialitate",
  cookies: "/cookies",
  legal_information: "/informatii-legale",
};

const definitions: Record<LegalLocale, Record<LegalPageKey, Omit<LegalPageDefinition, "key" | "route" | "fallbackUpdatedAt">>> = {
  ro: {
    terms: {
      title: "Termeni și condiții",
      eyebrow: "Document legal",
      description: "Regulile generale pentru accesarea și utilizarea platformei RomDoc.",
      notice: "Vă rugăm să citiți cu atenție acest document.",
      defaultContent: `## 1. Despre platformă

RomDoc este o platformă digitală pentru descoperirea medicilor și clinicilor, consultarea informațiilor publice și transmiterea solicitărilor de programare.

RomDoc nu furnizează servicii medicale și nu stabilește diagnostice sau tratamente.

## 2. Conturi și eligibilitate

Unele funcții sunt publice, iar altele necesită un cont valid și o adresă de e-mail verificată.

Utilizatorii sunt responsabili pentru corectitudinea datelor introduse și pentru păstrarea confidențialității datelor de autentificare.

## 3. Programări

O solicitare transmisă prin RomDoc nu reprezintă confirmarea automată a unei consultații. Confirmarea depinde de medic sau clinică.

## 4. Informații medicale

Informațiile publice au scop informativ și nu reprezintă recomandare medicală personalizată. În caz de urgență, contactați serviciile de urgență.

## 5. Obligațiile medicilor și clinicilor

Medicii și clinicile sunt responsabili pentru exactitatea informațiilor profesionale, serviciilor, tarifelor, adreselor și disponibilității publicate.

## 6. Limitarea răspunderii

RomDoc depune eforturi rezonabile pentru disponibilitatea platformei, fără a garanta funcționarea neîntreruptă sau lipsa totală a erorilor.

## 7. Modificarea termenilor

Termenii pot fi actualizați pentru a reflecta schimbări funcționale, comerciale sau juridice.`,
    },
    privacy: {
      title: "Politica de confidențialitate",
      eyebrow: "Confidențialitate",
      description: "Categoriile de date utilizate de RomDoc, scopurile prelucrării și drepturile utilizatorilor.",
      notice: "Vă rugăm să citiți cu atenție această politică.",
      defaultContent: `## 1. Date colectate

Putem prelucra date de cont, date de contact, informații despre programări, date profesionale ale medicilor, documente încărcate și date tehnice necesare securității platformei.

## 2. Scopurile prelucrării

Folosim datele pentru administrarea conturilor, programări, comunicări tranzacționale, plăți, suport, securitate și respectarea obligațiilor legale.

## 3. Date privind sănătatea

Datele medicale și documentele din Dosarul medical sunt accesibile numai persoanelor autorizate conform relației de programare și regulilor de acces RomDoc.

## 4. Furnizori tehnici

RomDoc poate utiliza Supabase, Vercel, Resend, Stripe, Google Maps și alți furnizori contractați pentru funcționarea serviciului.

## 5. Păstrarea datelor

Datele sunt păstrate numai atât cât este necesar pentru scopurile declarate, obligațiile legale, securitate și soluționarea disputelor.

## 6. Drepturile utilizatorilor

Puteți solicita acces, rectificare, ștergere, restricționare, portabilitate sau opoziție, în condițiile legii.

## 7. Securitate și contact

Aplicăm măsuri tehnice și organizatorice rezonabile. Solicitările de confidențialitate pot fi trimise la privacy@romdoc.fit.`,
    },
    cookies: {
      title: "Politica privind modulele cookie",
      eyebrow: "Cookie-uri și tehnologii similare",
      description: "Modul în care RomDoc utilizează cookie-uri și tehnologii similare.",
      notice: "Lista exactă trebuie actualizată după auditarea mediului de producție.",
      defaultContent: `## 1. Ce sunt cookie-urile

Cookie-urile sunt fișiere mici stocate de browser pentru funcționarea, securitatea și preferințele unui serviciu online.

## 2. Cookie-uri strict necesare

Pot fi utilizate pentru autentificare, menținerea sesiunii, securitate, prevenirea abuzului, formulare și plăți inițiate de utilizator. Acestea nu necesită consimțământ atunci când sunt strict necesare serviciului solicitat.

## 3. Preferințe

RomDoc poate memora limba selectată și alte opțiuni cerute de utilizator.

## 4. Analiză și marketing

RomDoc nu activează instrumente opționale de analiză sau marketing fără un mecanism de consimțământ adecvat.

## 5. Servicii terțe

Google Maps, Stripe și alte servicii integrate pot utiliza propriile tehnologii. Acestea sunt încărcate numai în condițiile aplicabile configurației tehnice și legii.

## 6. Controlul cookie-urilor

Puteți controla cookie-urile din browser. Dezactivarea celor strict necesare poate împiedica autentificarea sau utilizarea funcțiilor esențiale.`,
    },
    legal_information: {
      title: "Informații legale",
      eyebrow: "Informații legale",
      description: "Rolul platformei, operatorul, verificarea profesională și responsabilitățile participanților.",
      notice: "Datele juridice complete ale operatorului trebuie publicate înainte de lansarea comercială.",
      defaultContent: `## 1. Operatorul platformei

RomDoc este denumirea comercială a platformei. Datele juridice complete ale operatorului vor fi publicate înainte de lansarea comercială.

## 2. Rolul platformei

RomDoc este un serviciu digital de listare, descoperire și intermediere a solicitărilor de programare. Platforma nu furnizează consultații și nu intervine în deciziile medicale.

## 3. Verificarea profesională

Insigna „Medic verificat de RomDoc” indică verificarea unor informații profesionale existente. RomDoc nu emite licențe medicale.

## 4. Informații publice

Medicii și clinicile sunt responsabili pentru menținerea informațiilor publice corecte.

## 5. Urgențe medicale

RomDoc nu este un serviciu de urgență. Într-o situație urgentă, contactați imediat serviciile locale de urgență.

## 6. Sesizări

Informațiile incorecte, profilurile suspecte sau problemele tehnice pot fi raportate prin pagina de contact.`,
    },
  },
  en: {
    terms: {
      title: "Terms and Conditions",
      eyebrow: "Legal document",
      description: "General rules for accessing and using the RomDoc platform.",
      notice: "Please read this document carefully.",
      defaultContent: `## 1. About the platform

RomDoc is a digital platform for finding doctors and clinics, viewing public information and submitting appointment requests.

RomDoc does not provide medical services and does not establish diagnoses or treatments.

## 2. Accounts and eligibility

Some features are public, while others require a valid account and a verified email address.

Users are responsible for the accuracy of submitted information and for keeping authentication details confidential.

## 3. Appointments

A request submitted through RomDoc is not automatic confirmation of a consultation. Confirmation depends on the doctor or clinic.

## 4. Medical information

Public information is provided for informational purposes and is not personalised medical advice. In an emergency, contact the emergency services.

## 5. Doctor and clinic obligations

Doctors and clinics are responsible for the accuracy of professional information, services, prices, addresses and published availability.

## 6. Limitation of liability

RomDoc takes reasonable steps to maintain the platform but does not guarantee uninterrupted operation or complete absence of errors.

## 7. Changes to these terms

These terms may be updated to reflect functional, commercial or legal changes.`,
    },
    privacy: {
      title: "Privacy Policy",
      eyebrow: "Privacy",
      description: "The categories of data used by RomDoc, processing purposes and user rights.",
      notice: "Please read this policy carefully.",
      defaultContent: `## 1. Data we collect

We may process account data, contact details, appointment information, doctors' professional data, uploaded documents and technical information required to secure the platform.

## 2. Purposes of processing

We use data to manage accounts, appointments, transactional communications, payments, support, security and legal obligations.

## 3. Health data

Medical data and documents in the Medical Folder are accessible only to authorised persons under RomDoc appointment relationships and access rules.

## 4. Technical providers

RomDoc may use Supabase, Vercel, Resend, Stripe, Google Maps and other contracted providers to operate the service.

## 5. Data retention

Data is retained only for as long as necessary for the stated purposes, legal obligations, security and dispute resolution.

## 6. Your rights

Subject to applicable law, you may request access, rectification, erasure, restriction, portability or object to certain processing.

## 7. Security and contact

We apply reasonable technical and organisational safeguards. Privacy requests may be sent to privacy@romdoc.fit.`,
    },
    cookies: {
      title: "Cookie Policy",
      eyebrow: "Cookies and similar technologies",
      description: "How RomDoc uses cookies and similar technologies.",
      notice: "The exact list must be updated after auditing the production environment.",
      defaultContent: `## 1. What cookies are

Cookies are small files stored by the browser to support the operation, security and preferences of an online service.

## 2. Strictly necessary cookies

They may be used for authentication, session continuity, security, abuse prevention, forms and user-initiated payments. Consent is not required where they are strictly necessary for the requested service.

## 3. Preferences

RomDoc may remember the selected language and other options requested by the user.

## 4. Analytics and marketing

RomDoc does not activate optional analytics or marketing tools without an appropriate consent mechanism.

## 5. Third-party services

Google Maps, Stripe and other integrated services may use their own technologies. They are loaded only as permitted by the technical configuration and applicable law.

## 6. Cookie controls

You can control cookies through your browser. Disabling strictly necessary cookies may prevent authentication or essential functions.`,
    },
    legal_information: {
      title: "Legal Information",
      eyebrow: "Legal information",
      description: "The platform's role, operator, professional verification and participant responsibilities.",
      notice: "The operator's complete legal details must be published before commercial launch.",
      defaultContent: `## 1. Platform operator

RomDoc is the commercial name of the platform. The operator's complete legal details will be published before commercial launch.

## 2. Role of the platform

RomDoc is a digital listing, discovery and appointment-request intermediation service. It does not provide consultations or intervene in medical decisions.

## 3. Professional verification

The “Doctor verified by RomDoc” badge indicates that existing professional information has been reviewed. RomDoc does not issue medical licences.

## 4. Public information

Doctors and clinics are responsible for keeping their public information accurate.

## 5. Medical emergencies

RomDoc is not an emergency service. In an urgent situation, contact the local emergency services immediately.

## 6. Reports

Incorrect information, suspicious profiles or technical issues may be reported through the contact page.`,
    },
  },
  de: {
    terms: {
      title: "Allgemeine Geschäftsbedingungen",
      eyebrow: "Rechtliches Dokument",
      description: "Allgemeine Regeln für den Zugang zur RomDoc-Plattform und deren Nutzung.",
      notice: "Bitte lesen Sie dieses Dokument sorgfältig.",
      defaultContent: `## 1. Über die Plattform

RomDoc ist eine digitale Plattform zur Suche nach Ärzten und Kliniken, zur Anzeige öffentlicher Informationen und zur Übermittlung von Terminanfragen.

RomDoc erbringt keine medizinischen Leistungen und stellt keine Diagnosen oder Behandlungspläne.

## 2. Konten und Berechtigung

Einige Funktionen sind öffentlich, andere erfordern ein gültiges Konto und eine bestätigte E-Mail-Adresse.

Nutzer sind für die Richtigkeit ihrer Angaben und die Vertraulichkeit ihrer Zugangsdaten verantwortlich.

## 3. Termine

Eine über RomDoc gesendete Anfrage ist keine automatische Terminbestätigung. Die Bestätigung erfolgt durch den Arzt oder die Klinik.

## 4. Medizinische Informationen

Öffentliche Informationen dienen nur der Orientierung und ersetzen keine individuelle medizinische Beratung. In Notfällen wenden Sie sich an den Rettungsdienst.

## 5. Pflichten von Ärzten und Kliniken

Ärzte und Kliniken sind für die Richtigkeit ihrer beruflichen Angaben, Leistungen, Preise, Adressen und veröffentlichten Verfügbarkeiten verantwortlich.

## 6. Haftungsbeschränkung

RomDoc ergreift angemessene Maßnahmen für die Verfügbarkeit der Plattform, garantiert jedoch keinen unterbrechungsfreien oder vollständig fehlerfreien Betrieb.

## 7. Änderungen

Diese Bedingungen können aufgrund funktionaler, geschäftlicher oder rechtlicher Änderungen aktualisiert werden.`,
    },
    privacy: {
      title: "Datenschutzerklärung",
      eyebrow: "Datenschutz",
      description: "Welche Daten RomDoc verarbeitet, zu welchen Zwecken und welche Rechte Nutzer haben.",
      notice: "Bitte lesen Sie diese Datenschutzerklärung sorgfältig.",
      defaultContent: `## 1. Welche Daten wir verarbeiten

Wir können Kontodaten, Kontaktdaten, Termininformationen, berufliche Angaben von Ärzten, hochgeladene Dokumente und technische Sicherheitsdaten verarbeiten.

## 2. Zwecke der Verarbeitung

Wir verwenden Daten zur Verwaltung von Konten und Terminen, für transaktionale Mitteilungen, Zahlungen, Support, Sicherheit und gesetzliche Pflichten.

## 3. Gesundheitsdaten

Medizinische Daten und Dokumente im medizinischen Ordner sind nur für autorisierte Personen gemäß den Terminbeziehungen und Zugriffsregeln von RomDoc zugänglich.

## 4. Technische Dienstleister

RomDoc kann Supabase, Vercel, Resend, Stripe, Google Maps und weitere vertraglich gebundene Dienstleister einsetzen.

## 5. Speicherdauer

Daten werden nur so lange gespeichert, wie dies für die genannten Zwecke, gesetzliche Pflichten, Sicherheit und Streitbeilegung erforderlich ist.

## 6. Ihre Rechte

Nach Maßgabe des anwendbaren Rechts können Sie Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit oder Widerspruch verlangen.

## 7. Sicherheit und Kontakt

Wir setzen angemessene technische und organisatorische Schutzmaßnahmen ein. Datenschutzanfragen können an privacy@romdoc.fit gerichtet werden.`,
    },
    cookies: {
      title: "Cookie-Richtlinie",
      eyebrow: "Cookies und ähnliche Technologien",
      description: "Wie RomDoc Cookies und ähnliche Technologien verwendet.",
      notice: "Die genaue Liste muss nach einer Prüfung der Produktionsumgebung aktualisiert werden.",
      defaultContent: `## 1. Was Cookies sind

Cookies sind kleine Dateien, die vom Browser gespeichert werden, um Betrieb, Sicherheit und Präferenzen eines Online-Dienstes zu unterstützen.

## 2. Unbedingt erforderliche Cookies

Sie können für Anmeldung, Sitzung, Sicherheit, Missbrauchsschutz, Formulare und vom Nutzer gestartete Zahlungen verwendet werden. Eine Einwilligung ist nicht erforderlich, wenn sie für den gewünschten Dienst unbedingt notwendig sind.

## 3. Präferenzen

RomDoc kann die gewählte Sprache und andere ausdrücklich gewünschte Einstellungen speichern.

## 4. Analyse und Marketing

RomDoc aktiviert keine optionalen Analyse- oder Marketing-Werkzeuge ohne einen geeigneten Einwilligungsmechanismus.

## 5. Dienste Dritter

Google Maps, Stripe und andere integrierte Dienste können eigene Technologien verwenden. Sie werden nur entsprechend der technischen Konfiguration und dem geltenden Recht geladen.

## 6. Cookie-Einstellungen

Sie können Cookies im Browser steuern. Das Deaktivieren unbedingt erforderlicher Cookies kann Anmeldung oder wesentliche Funktionen verhindern.`,
    },
    legal_information: {
      title: "Rechtliche Informationen",
      eyebrow: "Rechtliche Informationen",
      description: "Rolle der Plattform, Betreiber, berufliche Verifizierung und Verantwortlichkeiten.",
      notice: "Die vollständigen rechtlichen Angaben des Betreibers müssen vor dem kommerziellen Start veröffentlicht werden.",
      defaultContent: `## 1. Betreiber der Plattform

RomDoc ist der Handelsname der Plattform. Die vollständigen rechtlichen Angaben des Betreibers werden vor dem kommerziellen Start veröffentlicht.

## 2. Rolle der Plattform

RomDoc ist ein digitaler Verzeichnis-, Such- und Vermittlungsdienst für Terminanfragen. RomDoc erbringt keine medizinischen Beratungen und greift nicht in medizinische Entscheidungen ein.

## 3. Berufliche Verifizierung

Das Abzeichen „Von RomDoc verifizierter Arzt“ zeigt, dass vorhandene berufliche Informationen geprüft wurden. RomDoc erteilt keine ärztlichen Zulassungen.

## 4. Öffentliche Informationen

Ärzte und Kliniken sind dafür verantwortlich, ihre öffentlichen Angaben korrekt zu halten.

## 5. Medizinische Notfälle

RomDoc ist kein Notfalldienst. Wenden Sie sich in einer dringenden Situation sofort an den örtlichen Rettungsdienst.

## 6. Meldungen

Falsche Angaben, verdächtige Profile oder technische Probleme können über die Kontaktseite gemeldet werden.`,
    },
  },
};

export function normalizeLegalLocale(locale: string): LegalLocale {
  return LEGAL_LOCALES.includes(locale as LegalLocale) ? (locale as LegalLocale) : "ro";
}

export function isLegalLocale(value: unknown): value is LegalLocale {
  return typeof value === "string" && LEGAL_LOCALES.includes(value as LegalLocale);
}

export function isLegalPageKey(value: unknown): value is LegalPageKey {
  return typeof value === "string" && LEGAL_PAGE_KEYS.includes(value as LegalPageKey);
}

export function getLegalPageDefinition(key: LegalPageKey, locale: string = "ro"): LegalPageDefinition {
  const normalizedLocale = normalizeLegalLocale(locale);
  return {
    key,
    route: routes[key],
    fallbackUpdatedAt: FALLBACK_UPDATED_AT,
    ...definitions[normalizedLocale][key],
  };
}

export function formatLegalDate(value: string, locale: AppLocale | LegalLocale = "ro") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const formatLocale = locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "ro-RO";
  return new Intl.DateTimeFormat(formatLocale, { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function createSectionId(title: string, usedIds: Set<string>) {
  const baseId = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
  usedIds.add(id);
  return id;
}

function parseBlocks(value: string): LegalContentBlock[] {
  return value.trim().split(/\n\s*\n/g).map((raw) => raw.split("\n").map((line) => line.trim()).filter(Boolean)).filter((lines) => lines.length > 0).map((lines) => {
    if (lines.every((line) => line.startsWith("- "))) {
      return { type: "list" as const, items: lines.map((line) => line.slice(2).trim()) };
    }
    return { type: "paragraph" as const, text: lines.join("\n") };
  });
}

export function parseLegalContent(content: string): ParsedLegalSection[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const sections: ParsedLegalSection[] = [];
  const usedIds = new Set<string>();
  let currentTitle = "Introduction";
  let currentLines: string[] = [];
  const flush = () => {
    const body = currentLines.join("\n").trim();
    if (body) sections.push({ id: createSectionId(currentTitle, usedIds), title: currentTitle, blocks: parseBlocks(body) });
    currentLines = [];
  };
  for (const line of normalized.split("\n")) {
    if (line.trim().startsWith("## ")) {
      flush();
      currentTitle = line.trim().slice(3).trim();
    } else {
      currentLines.push(line);
    }
  }
  flush();
  return sections;
}
