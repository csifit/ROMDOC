import type { AppLocale } from "@/lib/i18n/app-locale";

export type SupportRequesterType =
  | "patient"
  | "doctor"
  | "clinic"
  | "visitor";

export type SupportCategory =
  | "patient_support"
  | "doctor_support"
  | "profile_correction"
  | "booking_problem"
  | "privacy_request"
  | "technical_problem"
  | "other";

export type ContactOptionCopy = {
  id: string;
  title: string;
  description: string;
  email: string;
  requesterType: SupportRequesterType;
  category: SupportCategory;
  buttonLabel: string;
};

export type SupportTicketFormCopy = {
  eyebrow: string;
  title: string;
  description: string;
  warning: string;
  successPrefix: string;
  errorFallback: string;
  requesterLabel: string;
  categoryLabel: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  appointmentIdLabel: string;
  appointmentPlaceholder: string;
  subjectLabel: string;
  relatedUrlLabel: string;
  relatedUrlPlaceholder: string;
  messageLabel: string;
  messageHint: string;
  optionalLabel: string;
  submittingLabel: string;
  submitLabel: string;
  requesterOptions: Array<{
    value: SupportRequesterType;
    label: string;
  }>;
  categoryOptions: Array<{
    value: SupportCategory;
    label: string;
    hint: string;
  }>;
};

type PublicSupportCopy = {
  contact: {
    metadataTitle: string;
    metadataDescription: string;
    eyebrow: string;
    title: string;
    introduction: string;
    medicalWarning: string;
    privacyLabel: string;
    termsLabel: string;
    options: ContactOptionCopy[];
  };
  supportPage: {
    metadataTitle: string;
    metadataDescription: string;
    eyebrow: string;
    title: string;
    description: string;
    backToContact: string;
    privacyLabel: string;
  };
  form: SupportTicketFormCopy;
};

export const publicSupportCopy: Record<
  AppLocale,
  PublicSupportCopy
> = {
  ro: {
    contact: {
      metadataTitle: "Contact RomDoc",
      metadataDescription:
        "Contactează echipa RomDoc pentru suport, corectări de profil, probleme de programare, probleme tehnice sau confidențialitate.",
      eyebrow: "Contact",
      title: "Cum te putem ajuta?",
      introduction:
        "Alege categoria potrivită pentru a trimite un tichet către echipa RomDoc. Formularul este destinat suportului privind platforma, nu sfaturilor medicale.",
      medicalWarning:
        "Pentru întrebări medicale, diagnostic, tratament sau urgențe, contactează direct medicul, clinica sau serviciile medicale potrivite.",
      privacyLabel: "Confidențialitate",
      termsLabel: "Termeni și condiții",
      options: [
        {
          id: "suport-pacienti",
          title: "Suport pentru pacienți",
          description:
            "Cont pacient, autentificare, dashboard, programări care nu apar sau anulări.",
          email: "support@romdoc.fit",
          requesterType: "patient",
          category: "patient_support",
          buttonLabel: "Deschide tichet pacient",
        },
        {
          id: "suport-medici",
          title: "Suport pentru medici și organizații de clinici",
          description:
            "Profil medic, cont de clinică, abonamente, locații, invitații, disponibilitate, verificare profesională sau dashboard profesional.",
          email: "medici@romdoc.fit",
          requesterType: "doctor",
          category: "doctor_support",
          buttonLabel: "Deschide tichet profesional",
        },
        {
          id: "corectari-profil",
          title: "Corectări profil / informații publice",
          description:
            "Semnalează informații incorecte despre un medic, o clinică, adresă, specialitate sau pagină publică.",
          email: "support@romdoc.fit",
          requesterType: "visitor",
          category: "profile_correction",
          buttonLabel: "Raportează corectare",
        },
        {
          id: "probleme-programare",
          title: "Probleme cu programările",
          description:
            "Programare lipsă, confirmare lipsă, oră greșită, mesaj de eroare sau problemă la trimiterea solicitării.",
          email: "support@romdoc.fit",
          requesterType: "patient",
          category: "booking_problem",
          buttonLabel: "Raportează problemă",
        },
        {
          id: "probleme-tehnice",
          title: "Probleme tehnice",
          description:
            "Erori de pagină, butoane care nu funcționează, formulare care nu se trimit sau probleme de afișare.",
          email: "support@romdoc.fit",
          requesterType: "visitor",
          category: "technical_problem",
          buttonLabel: "Raportează eroare tehnică",
        },
        {
          id: "confidentialitate",
          title: "Confidențialitate și date personale",
          description:
            "Solicitări privind accesul, corectarea, ștergerea datelor personale sau întrebări de confidențialitate.",
          email: "privacy@romdoc.fit",
          requesterType: "visitor",
          category: "privacy_request",
          buttonLabel: "Trimite solicitare de confidențialitate",
        },
      ],
    },
    supportPage: {
      metadataTitle: "Suport RomDoc",
      metadataDescription:
        "Trimite o solicitare de suport pentru cont, profil, programări, probleme tehnice sau confidențialitate.",
      eyebrow: "Suport platformă",
      title: "Contactează echipa RomDoc",
      description:
        "Acest formular este pentru folosirea platformei RomDoc: conturi, profiluri publice, programări, probleme tehnice și solicitări de confidențialitate. Nu este un canal pentru sfaturi medicale.",
      backToContact: "Înapoi la Contact",
      privacyLabel: "Politica de confidențialitate",
    },
    form: {
      eyebrow: "Tichet suport RomDoc",
      title: "Trimite o solicitare către echipa RomDoc",
      description:
        "Folosește acest formular pentru probleme legate de platformă: cont, profil public, programări, confidențialitate sau erori tehnice.",
      warning:
        "Nu include date medicale sensibile, diagnostice, rezultate de analize sau urgențe medicale. Pentru urgențe, contactează serviciile medicale potrivite.",
      successPrefix: "Solicitarea a fost trimisă. ID tichet:",
      errorFallback: "Solicitarea nu a putut fi trimisă.",
      requesterLabel: "Cine trimite solicitarea?",
      categoryLabel: "Categoria solicitării",
      nameLabel: "Nume",
      emailLabel: "E-mail",
      phoneLabel: "Telefon",
      appointmentIdLabel: "ID programare",
      appointmentPlaceholder: "Doar dacă îl ai",
      subjectLabel: "Subiect",
      relatedUrlLabel: "Link relevant",
      relatedUrlPlaceholder:
        "Ex: link profil medic, pagină programare, pagină cu eroare",
      messageLabel: "Mesaj",
      messageHint:
        "Maximum 4000 de caractere. Pentru mesaje medicale despre o programare, folosește pagina programării, nu formularul de suport platformă.",
      optionalLabel: "opțional",
      submittingLabel: "Se trimite...",
      submitLabel: "Trimite solicitarea",
      requesterOptions: [
        { value: "patient", label: "Pacient" },
        { value: "doctor", label: "Medic" },
        { value: "clinic", label: "Clinică / recepție" },
        { value: "visitor", label: "Vizitator" },
      ],
      categoryOptions: [
        {
          value: "patient_support",
          label: "Suport pacient",
          hint: "Cont pacient, acces, dashboard, anulare programare.",
        },
        {
          value: "doctor_support",
          label: "Suport medic sau clinică",
          hint: "Profil medic, clinică, abonament, locații, disponibilitate sau verificare.",
        },
        {
          value: "profile_correction",
          label: "Corectare profil sau informații publice",
          hint: "Date incorecte despre medic, clinică, adresă sau specialitate.",
        },
        {
          value: "booking_problem",
          label: "Problemă cu o programare",
          hint: "Nu apare programarea, confirmare lipsă, oră greșită sau anulare.",
        },
        {
          value: "privacy_request",
          label: "Confidențialitate / date personale",
          hint: "Acces, corectare, ștergere sau întrebări despre date personale.",
        },
        {
          value: "technical_problem",
          label: "Problemă tehnică",
          hint: "Eroare de pagină, formular care nu se trimite sau problemă de autentificare.",
        },
        {
          value: "other",
          label: "Altă solicitare",
          hint: "Alt subiect legat de utilizarea platformei RomDoc.",
        },
      ],
    },
  },
  en: {
    contact: {
      metadataTitle: "Contact RomDoc",
      metadataDescription:
        "Contact the RomDoc team for account support, public profile corrections, booking issues, technical problems or privacy requests.",
      eyebrow: "Contact",
      title: "How can we help?",
      introduction:
        "Choose the appropriate category to send a ticket to the RomDoc team. This form is for platform support, not medical advice.",
      medicalWarning:
        "For medical questions, diagnosis, treatment or emergencies, contact the doctor, clinic or appropriate medical services directly.",
      privacyLabel: "Privacy",
      termsLabel: "Terms and conditions",
      options: [
        {
          id: "suport-pacienti",
          title: "Patient support",
          description:
            "Patient account, sign-in, dashboard, missing appointments or cancellations.",
          email: "support@romdoc.fit",
          requesterType: "patient",
          category: "patient_support",
          buttonLabel: "Open patient ticket",
        },
        {
          id: "suport-medici",
          title: "Support for doctors and clinic organisations",
          description:
            "Doctor profile, clinic account, subscriptions, locations, invitations, availability, professional verification or professional dashboards.",
          email: "medici@romdoc.fit",
          requesterType: "doctor",
          category: "doctor_support",
          buttonLabel: "Open professional ticket",
        },
        {
          id: "corectari-profil",
          title: "Profile or public information corrections",
          description:
            "Report incorrect information about a doctor, clinic, address, specialty or public page.",
          email: "support@romdoc.fit",
          requesterType: "visitor",
          category: "profile_correction",
          buttonLabel: "Report a correction",
        },
        {
          id: "probleme-programare",
          title: "Appointment problems",
          description:
            "Missing appointment, missing confirmation, incorrect time, error message or request submission problem.",
          email: "support@romdoc.fit",
          requesterType: "patient",
          category: "booking_problem",
          buttonLabel: "Report an appointment problem",
        },
        {
          id: "probleme-tehnice",
          title: "Technical problems",
          description:
            "Page errors, buttons that do not work, forms that cannot be submitted or display problems.",
          email: "support@romdoc.fit",
          requesterType: "visitor",
          category: "technical_problem",
          buttonLabel: "Report a technical problem",
        },
        {
          id: "confidentialitate",
          title: "Privacy and personal data",
          description:
            "Requests concerning access, correction or deletion of personal data, or other privacy questions.",
          email: "privacy@romdoc.fit",
          requesterType: "visitor",
          category: "privacy_request",
          buttonLabel: "Send a privacy request",
        },
      ],
    },
    supportPage: {
      metadataTitle: "RomDoc support",
      metadataDescription:
        "Send a support request concerning an account, public profile, appointment, technical problem or privacy matter.",
      eyebrow: "Platform support",
      title: "Contact the RomDoc team",
      description:
        "This form is for using the RomDoc platform: accounts, public profiles, appointments, technical problems and privacy requests. It is not a medical advice channel.",
      backToContact: "Back to Contact",
      privacyLabel: "Privacy policy",
    },
    form: {
      eyebrow: "RomDoc support ticket",
      title: "Send a request to the RomDoc team",
      description:
        "Use this form for platform-related matters such as accounts, public profiles, appointments, privacy or technical errors.",
      warning:
        "Do not include sensitive medical data, diagnoses, test results or medical emergencies. For emergencies, contact the appropriate medical services.",
      successPrefix: "Your request was sent. Ticket ID:",
      errorFallback: "The request could not be sent.",
      requesterLabel: "Who is submitting the request?",
      categoryLabel: "Request category",
      nameLabel: "Name",
      emailLabel: "Email",
      phoneLabel: "Phone",
      appointmentIdLabel: "Appointment ID",
      appointmentPlaceholder: "Only when available",
      subjectLabel: "Subject",
      relatedUrlLabel: "Relevant link",
      relatedUrlPlaceholder:
        "Example: doctor profile, appointment page or page showing the error",
      messageLabel: "Message",
      messageHint:
        "Maximum 4,000 characters. For medical messages about an appointment, use the appointment page rather than the platform support form.",
      optionalLabel: "optional",
      submittingLabel: "Sending...",
      submitLabel: "Send request",
      requesterOptions: [
        { value: "patient", label: "Patient" },
        { value: "doctor", label: "Doctor" },
        { value: "clinic", label: "Clinic / reception" },
        { value: "visitor", label: "Visitor" },
      ],
      categoryOptions: [
        {
          value: "patient_support",
          label: "Patient support",
          hint: "Patient account, access, dashboard or appointment cancellation.",
        },
        {
          value: "doctor_support",
          label: "Doctor or clinic support",
          hint: "Doctor profile, clinic, subscription, locations, availability or verification.",
        },
        {
          value: "profile_correction",
          label: "Profile or public information correction",
          hint: "Incorrect Doctor, Clinic, address or specialty information.",
        },
        {
          value: "booking_problem",
          label: "Appointment problem",
          hint: "Missing appointment or confirmation, incorrect time or cancellation.",
        },
        {
          value: "privacy_request",
          label: "Privacy / personal data",
          hint: "Access, correction, deletion or questions about personal data.",
        },
        {
          value: "technical_problem",
          label: "Technical problem",
          hint: "Page error, form submission failure or sign-in problem.",
        },
        {
          value: "other",
          label: "Other request",
          hint: "Another matter related to using the RomDoc platform.",
        },
      ],
    },
  },
  de: {
    contact: {
      metadataTitle: "RomDoc kontaktieren",
      metadataDescription:
        "Kontaktieren Sie das RomDoc-Team bei Konto- und Profilfragen, Terminproblemen, technischen Fehlern oder Datenschutzanfragen.",
      eyebrow: "Kontakt",
      title: "Wie können wir Ihnen helfen?",
      introduction:
        "Wählen Sie die passende Kategorie, um ein Ticket an das RomDoc-Team zu senden. Dieses Formular dient dem Plattform-Support und nicht der medizinischen Beratung.",
      medicalWarning:
        "Wenden Sie sich bei medizinischen Fragen, Diagnosen, Behandlungen oder Notfällen direkt an den Arzt, die Klinik oder die zuständigen medizinischen Dienste.",
      privacyLabel: "Datenschutz",
      termsLabel: "Allgemeine Geschäftsbedingungen",
      options: [
        {
          id: "suport-pacienti",
          title: "Support für Patienten",
          description:
            "Patientenkonto, Anmeldung, Dashboard, fehlende Termine oder Stornierungen.",
          email: "support@romdoc.fit",
          requesterType: "patient",
          category: "patient_support",
          buttonLabel: "Patienten-Ticket öffnen",
        },
        {
          id: "suport-medici",
          title: "Support für Ärzte und Klinikorganisationen",
          description:
            "Arztprofil, Klinikkonto, Abonnements, Standorte, Einladungen, Verfügbarkeit, berufliche Verifizierung oder professionelle Dashboards.",
          email: "medici@romdoc.fit",
          requesterType: "doctor",
          category: "doctor_support",
          buttonLabel: "Professionelles Ticket öffnen",
        },
        {
          id: "corectari-profil",
          title: "Korrektur von Profilen oder öffentlichen Angaben",
          description:
            "Melden Sie falsche Angaben zu einem Arzt, einer Klinik, Adresse, Fachrichtung oder öffentlichen Seite.",
          email: "support@romdoc.fit",
          requesterType: "visitor",
          category: "profile_correction",
          buttonLabel: "Korrektur melden",
        },
        {
          id: "probleme-programare",
          title: "Terminprobleme",
          description:
            "Fehlender Termin, fehlende Bestätigung, falsche Uhrzeit, Fehlermeldung oder Problem beim Senden der Anfrage.",
          email: "support@romdoc.fit",
          requesterType: "patient",
          category: "booking_problem",
          buttonLabel: "Terminproblem melden",
        },
        {
          id: "probleme-tehnice",
          title: "Technische Probleme",
          description:
            "Seitenfehler, nicht funktionierende Schaltflächen, nicht versendbare Formulare oder Darstellungsprobleme.",
          email: "support@romdoc.fit",
          requesterType: "visitor",
          category: "technical_problem",
          buttonLabel: "Technisches Problem melden",
        },
        {
          id: "confidentialitate",
          title: "Datenschutz und personenbezogene Daten",
          description:
            "Anfragen zu Auskunft, Berichtigung oder Löschung personenbezogener Daten sowie andere Datenschutzfragen.",
          email: "privacy@romdoc.fit",
          requesterType: "visitor",
          category: "privacy_request",
          buttonLabel: "Datenschutzanfrage senden",
        },
      ],
    },
    supportPage: {
      metadataTitle: "RomDoc-Support",
      metadataDescription:
        "Senden Sie eine Supportanfrage zu einem Konto, öffentlichen Profil, Termin, technischen Problem oder Datenschutzthema.",
      eyebrow: "Plattform-Support",
      title: "Kontaktieren Sie das RomDoc-Team",
      description:
        "Dieses Formular ist für die Nutzung der RomDoc-Plattform bestimmt: Konten, öffentliche Profile, Termine, technische Probleme und Datenschutzanfragen. Es ist kein Kanal für medizinische Beratung.",
      backToContact: "Zurück zu Kontakt",
      privacyLabel: "Datenschutzerklärung",
    },
    form: {
      eyebrow: "RomDoc-Supportticket",
      title: "Anfrage an das RomDoc-Team senden",
      description:
        "Verwenden Sie dieses Formular für plattformbezogene Themen wie Konten, öffentliche Profile, Termine, Datenschutz oder technische Fehler.",
      warning:
        "Geben Sie keine sensiblen medizinischen Daten, Diagnosen, Untersuchungsergebnisse oder medizinischen Notfälle an. Wenden Sie sich bei Notfällen an die zuständigen medizinischen Dienste.",
      successPrefix: "Ihre Anfrage wurde gesendet. Ticket-ID:",
      errorFallback: "Die Anfrage konnte nicht gesendet werden.",
      requesterLabel: "Wer sendet die Anfrage?",
      categoryLabel: "Anfragekategorie",
      nameLabel: "Name",
      emailLabel: "E-Mail",
      phoneLabel: "Telefon",
      appointmentIdLabel: "Termin-ID",
      appointmentPlaceholder: "Nur wenn vorhanden",
      subjectLabel: "Betreff",
      relatedUrlLabel: "Relevanter Link",
      relatedUrlPlaceholder:
        "Beispiel: Arztprofil, Terminseite oder Seite mit dem Fehler",
      messageLabel: "Nachricht",
      messageHint:
        "Maximal 4.000 Zeichen. Verwenden Sie für medizinische Nachrichten zu einem Termin die Terminseite und nicht das Plattform-Supportformular.",
      optionalLabel: "optional",
      submittingLabel: "Wird gesendet...",
      submitLabel: "Anfrage senden",
      requesterOptions: [
        { value: "patient", label: "Patient" },
        { value: "doctor", label: "Arzt" },
        { value: "clinic", label: "Klinik / Rezeption" },
        { value: "visitor", label: "Besucher" },
      ],
      categoryOptions: [
        {
          value: "patient_support",
          label: "Patienten-Support",
          hint: "Patientenkonto, Zugang, Dashboard oder Terminstornierung.",
        },
        {
          value: "doctor_support",
          label: "Arzt- oder Klinik-Support",
          hint: "Arztprofil, Klinik, Abonnement, Standorte, Verfügbarkeit oder Verifizierung.",
        },
        {
          value: "profile_correction",
          label: "Korrektur von Profilen oder öffentlichen Angaben",
          hint: "Falsche Arzt-, Klinik-, Adress- oder Fachrichtungsangaben.",
        },
        {
          value: "booking_problem",
          label: "Terminproblem",
          hint: "Fehlender Termin oder Bestätigung, falsche Uhrzeit oder Stornierung.",
        },
        {
          value: "privacy_request",
          label: "Datenschutz / personenbezogene Daten",
          hint: "Auskunft, Berichtigung, Löschung oder Fragen zu personenbezogenen Daten.",
        },
        {
          value: "technical_problem",
          label: "Technisches Problem",
          hint: "Seitenfehler, fehlgeschlagenes Formular oder Anmeldeproblem.",
        },
        {
          value: "other",
          label: "Andere Anfrage",
          hint: "Ein anderes Thema zur Nutzung der RomDoc-Plattform.",
        },
      ],
    },
  },
};
