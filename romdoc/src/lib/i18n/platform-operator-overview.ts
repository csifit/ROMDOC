import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

const overviewMessages = {
  ro: {
    common: {
      needsAttention:
        "Necesită atenție",
      viewAll:
        "Vezi toate",
      viewAllDoctors:
        "Vezi toți medicii",
      addressUnavailable:
        "Adresă indisponibilă",
      createdOn:
        "Creat la {date}",
      active:
        "Activ",
      pending:
        "În așteptare",
      dataWarningTitle:
        "Unele date nu au putut fi încărcate",
      dataWarningDescription:
        "Valorile afișate pot fi incomplete. Reîncarcă pagina înainte de a lua o decizie administrativă.",
      openSection:
        "Deschide secțiunea",
    },
    admin: {
      eyebrow:
        "Panou administrator",
      welcome:
        "Bun venit",
      description:
        "Urmărește activitatea platformei și deschide rapid elementele care necesită intervenție administrativă.",
      platformStatus:
        "Priorități operaționale",
      attentionItems: {
        label:
          "Elemente care necesită atenție",
        description:
          "Clinici și programări care pot necesita intervenție.",
      },
      pendingClinics: {
        label:
          "Clinici în așteptare",
        description:
          "Propuneri care trebuie verificate și moderate.",
      },
      pendingAppointments: {
        label:
          "Programări în așteptare",
        description:
          "Acces excepțional pentru situații de suport.",
      },
      activeDoctors: {
        label:
          "Medici activi",
        description:
          "Medici cu acces activ la platformă.",
      },
      secondaryMetrics: {
        title:
          "Indicatori secundari",
        description:
          "Date generale utile pentru monitorizarea platformei.",
        totalDoctors:
          "Total medici",
        totalDoctorsDescription:
          "Toate profilurile de medici create în RomDoc.",
        approvedClinics:
          "Clinici aprobate",
        approvedClinicsDescription:
          "Clinici comune disponibile medicilor RomDoc.",
        activeStaff:
          "Personal activ",
        activeStaffDescription:
          "Atribuiri active între personal, medic și clinică.",
        patients:
          "Pacienți",
        patientsDescription:
          "Conturi de pacienți înregistrate în platformă.",
      },
      pendingClinicsQueue: {
        title:
          "Clinici care necesită aprobare",
        description:
          "Cele mai recente propuneri de clinică.",
        empty:
          "Nu există clinici care așteaptă aprobarea.",
      },
      recentDoctors: {
        title:
          "Medici recenți",
        description:
          "Cele mai noi profiluri de medici.",
        empty:
          "Nu există medici înregistrați.",
      },
      supportAppointments: {
        title:
          "Acces excepțional la programări",
        description:
          "Programările sunt gestionate în mod normal de medic și personalul său. Administratorul poate deschide lista globală numai pentru suport, investigații sau situații excepționale.",
        action:
          "Deschide programările",
      },
    },
    manager: {
      eyebrow:
        "Panou manager",
      title:
        "Prezentare generală",
      description:
        "Accesează instrumentele operaționale disponibile managerului. Funcțiile rezervate administratorului sau unei permisiuni speciale nu sunt afișate ca acțiuni active.",
      coreOperations: {
        title:
          "Activitate operațională",
        description:
          "Zonele principale folosite în activitatea zilnică.",
      },
      users: {
        title:
          "Utilizatori",
        description:
          "Vezi utilizatorii și gestionează suspendarea conturilor în limitele rolului de manager.",
      },
      doctors: {
        title:
          "Medici",
        description:
          "Caută medicii și gestionează profilurile fără acțiunile rezervate administratorului.",
      },
      verifications: {
        title:
          "Verificări profesionale",
        description:
          "Analizează cererile de verificare profesională și documentele asociate.",
      },
      clinics: {
        title:
          "Clinici",
        description:
          "Verifică și gestionează clinicile propuse în platformă.",
      },
      directoryAndModeration: {
        title:
          "Director și moderare",
        description:
          "Instrumente folosite periodic pentru conținutul public.",
      },
      cities: {
        title:
          "Orașe",
        description:
          "Actualizează informațiile orașelor utilizate în directoare și filtre.",
      },
      reviews: {
        title:
          "Recenzii",
        description:
          "Moderează recenziile care încalcă regulile platformei.",
      },
      billing: {
        title:
          "Facturare și SMS",
        description:
          "Instrumente disponibile numai managerilor care au permisiunea Facturare.",
        noAccessTitle:
          "Permisiunea Facturare nu este activă",
        noAccessDescription:
          "Instrumentele de facturare și consum SMS sunt ascunse. Administratorul poate acorda această permisiune din pagina Manageri.",
      },
      invoices: {
        title:
          "Facturi",
        description:
          "Înregistrează facturile operaționale și confirmă încasările.",
      },
      clinicSms: {
        title:
          "Facturare SMS clinici",
        description:
          "Vezi consumul SMS al clinicilor și datele necesare facturării.",
      },
      doctorSms: {
        title:
          "Facturare SMS medici",
        description:
          "Vezi consumul SMS al medicilor individuali și datele necesare facturării.",
      },
      account: {
        title:
          "Cont și securitate",
        description:
          "Verifică protecția contului și sesiunea MFA.",
      },
      security: {
        title:
          "Securitatea contului",
        description:
          "Verifică starea autentificării în doi pași a contului de manager.",
      },
      rules: {
        title:
          "Cum este controlat accesul",
        description:
          "Managerul folosește aceleași API-uri securizate ca zona administrativă, însă fiecare operațiune este verificată separat. Rolul de manager nu primește automat acțiunile rezervate administratorului și nu oferă acces la conținut medical.",
      },
    },
  },
  en: {
    common: {
      needsAttention:
        "Needs attention",
      viewAll:
        "View all",
      viewAllDoctors:
        "View all doctors",
      addressUnavailable:
        "Address unavailable",
      createdOn:
        "Created on {date}",
      active:
        "Active",
      pending:
        "Pending",
      dataWarningTitle:
        "Some data could not be loaded",
      dataWarningDescription:
        "The displayed values may be incomplete. Reload the page before making an administrative decision.",
      openSection:
        "Open section",
    },
    admin: {
      eyebrow:
        "Administrator dashboard",
      welcome:
        "Welcome",
      description:
        "Monitor platform activity and quickly open items that require administrative intervention.",
      platformStatus:
        "Operational priorities",
      attentionItems: {
        label:
          "Items requiring attention",
        description:
          "Clinics and appointments that may require intervention.",
      },
      pendingClinics: {
        label:
          "Pending clinics",
        description:
          "Proposals that must be reviewed and moderated.",
      },
      pendingAppointments: {
        label:
          "Pending appointments",
        description:
          "Exceptional access for support situations.",
      },
      activeDoctors: {
        label:
          "Active doctors",
        description:
          "Doctors with active platform access.",
      },
      secondaryMetrics: {
        title:
          "Secondary indicators",
        description:
          "General data useful for monitoring the platform.",
        totalDoctors:
          "Total doctors",
        totalDoctorsDescription:
          "All doctor profiles created in RomDoc.",
        approvedClinics:
          "Approved clinics",
        approvedClinicsDescription:
          "Shared clinics available to RomDoc doctors.",
        activeStaff:
          "Active staff",
        activeStaffDescription:
          "Active staff, doctor and clinic assignments.",
        patients:
          "Patients",
        patientsDescription:
          "Registered patient accounts on the platform.",
      },
      pendingClinicsQueue: {
        title:
          "Clinics requiring approval",
        description:
          "The most recent clinic proposals.",
        empty:
          "There are no clinics waiting for approval.",
      },
      recentDoctors: {
        title:
          "Recent doctors",
        description:
          "The newest doctor profiles.",
        empty:
          "There are no registered doctors.",
      },
      supportAppointments: {
        title:
          "Exceptional appointment access",
        description:
          "Appointments are normally managed by the doctor and their staff. The administrator may open the global list only for support, investigations or exceptional situations.",
        action:
          "Open appointments",
      },
    },
    manager: {
      eyebrow:
        "Manager dashboard",
      title:
        "Overview",
      description:
        "Open the operational tools available to the manager. Functions reserved for administrators or a special permission are not displayed as active actions.",
      coreOperations: {
        title:
          "Operational activity",
        description:
          "The primary areas used in daily work.",
      },
      users: {
        title:
          "Users",
        description:
          "View users and manage account suspension within the manager role limits.",
      },
      doctors: {
        title:
          "Doctors",
        description:
          "Search doctors and manage profiles without administrator-only actions.",
      },
      verifications: {
        title:
          "Professional verification",
        description:
          "Review professional verification requests and their supporting documents.",
      },
      clinics: {
        title:
          "Clinics",
        description:
          "Review and manage clinics proposed on the platform.",
      },
      directoryAndModeration: {
        title:
          "Directory and moderation",
        description:
          "Tools used periodically for public content.",
      },
      cities: {
        title:
          "Cities",
        description:
          "Update city information used in directories and filters.",
      },
      reviews: {
        title:
          "Reviews",
        description:
          "Moderate reviews that breach the platform rules.",
      },
      billing: {
        title:
          "Billing and SMS",
        description:
          "Tools available only to managers who have the Billing permission.",
        noAccessTitle:
          "Billing permission is not active",
        noAccessDescription:
          "Billing and SMS-consumption tools are hidden. An administrator can grant this permission from the Managers page.",
      },
      invoices: {
        title:
          "Invoices",
        description:
          "Record operational invoices and confirm payments.",
      },
      clinicSms: {
        title:
          "Clinic SMS billing",
        description:
          "View clinic SMS consumption and the data required for invoicing.",
      },
      doctorSms: {
        title:
          "Doctor SMS billing",
        description:
          "View individual doctor SMS consumption and the data required for invoicing.",
      },
      account: {
        title:
          "Account and security",
        description:
          "Review account protection and the MFA session.",
      },
      security: {
        title:
          "Account security",
        description:
          "Check the two-factor authentication status of the manager account.",
      },
      rules: {
        title:
          "How access is controlled",
        description:
          "The manager uses the same secured APIs as the administration area, but every operation is checked separately. The manager role does not automatically receive administrator-only actions and does not provide access to medical content.",
      },
    },
  },
  de: {
    common: {
      needsAttention:
        "Aufmerksamkeit erforderlich",
      viewAll:
        "Alle anzeigen",
      viewAllDoctors:
        "Alle Ärzte anzeigen",
      addressUnavailable:
        "Adresse nicht verfügbar",
      createdOn:
        "Erstellt am {date}",
      active:
        "Aktiv",
      pending:
        "Ausstehend",
      dataWarningTitle:
        "Einige Daten konnten nicht geladen werden",
      dataWarningDescription:
        "Die angezeigten Werte können unvollständig sein. Die Seite vor einer administrativen Entscheidung neu laden.",
      openSection:
        "Bereich öffnen",
    },
    admin: {
      eyebrow:
        "Administrator-Dashboard",
      welcome:
        "Willkommen",
      description:
        "Plattformaktivitäten überwachen und Elemente mit administrativem Handlungsbedarf schnell öffnen.",
      platformStatus:
        "Operative Prioritäten",
      attentionItems: {
        label:
          "Elemente mit Handlungsbedarf",
        description:
          "Kliniken und Termine, die einen Eingriff erfordern können.",
      },
      pendingClinics: {
        label:
          "Ausstehende Kliniken",
        description:
          "Vorschläge, die geprüft und moderiert werden müssen.",
      },
      pendingAppointments: {
        label:
          "Ausstehende Termine",
        description:
          "Außerordentlicher Zugriff für Supportfälle.",
      },
      activeDoctors: {
        label:
          "Aktive Ärzte",
        description:
          "Ärzte mit aktivem Plattformzugang.",
      },
      secondaryMetrics: {
        title:
          "Sekundäre Kennzahlen",
        description:
          "Allgemeine Daten zur Überwachung der Plattform.",
        totalDoctors:
          "Ärzte insgesamt",
        totalDoctorsDescription:
          "Alle in RomDoc erstellten Arztprofile.",
        approvedClinics:
          "Genehmigte Kliniken",
        approvedClinicsDescription:
          "Gemeinsame Kliniken, die RomDoc-Ärzten zur Verfügung stehen.",
        activeStaff:
          "Aktives Personal",
        activeStaffDescription:
          "Aktive Zuordnungen zwischen Personal, Arzt und Klinik.",
        patients:
          "Patienten",
        patientsDescription:
          "Registrierte Patientenkonten auf der Plattform.",
      },
      pendingClinicsQueue: {
        title:
          "Kliniken mit Genehmigungsbedarf",
        description:
          "Die neuesten Klinikvorschläge.",
        empty:
          "Es warten keine Kliniken auf eine Genehmigung.",
      },
      recentDoctors: {
        title:
          "Neue Ärzte",
        description:
          "Die neuesten Arztprofile.",
        empty:
          "Es sind keine Ärzte registriert.",
      },
      supportAppointments: {
        title:
          "Außerordentlicher Terminzugriff",
        description:
          "Termine werden normalerweise vom Arzt und seinem Personal verwaltet. Der Administrator darf die globale Liste nur für Support, Untersuchungen oder außergewöhnliche Situationen öffnen.",
        action:
          "Termine öffnen",
      },
    },
    manager: {
      eyebrow:
        "Manager-Dashboard",
      title:
        "Übersicht",
      description:
        "Die für den Manager verfügbaren operativen Werkzeuge öffnen. Funktionen, die Administratoren oder einer besonderen Berechtigung vorbehalten sind, werden nicht als aktive Aktionen angezeigt.",
      coreOperations: {
        title:
          "Operative Tätigkeit",
        description:
          "Die wichtigsten Bereiche für die tägliche Arbeit.",
      },
      users: {
        title:
          "Benutzer",
        description:
          "Benutzer anzeigen und Kontosperrungen innerhalb der Grenzen der Managerrolle verwalten.",
      },
      doctors: {
        title:
          "Ärzte",
        description:
          "Ärzte suchen und Profile ohne administrator-exklusive Aktionen verwalten.",
      },
      verifications: {
        title:
          "Berufliche Verifizierung",
        description:
          "Anträge zur beruflichen Verifizierung und zugehörige Dokumente prüfen.",
      },
      clinics: {
        title:
          "Kliniken",
        description:
          "Auf der Plattform vorgeschlagene Kliniken prüfen und verwalten.",
      },
      directoryAndModeration: {
        title:
          "Verzeichnis und Moderation",
        description:
          "Regelmäßig verwendete Werkzeuge für öffentliche Inhalte.",
      },
      cities: {
        title:
          "Städte",
        description:
          "Stadtinformationen aktualisieren, die in Verzeichnissen und Filtern verwendet werden.",
      },
      reviews: {
        title:
          "Bewertungen",
        description:
          "Bewertungen moderieren, die gegen die Plattformregeln verstoßen.",
      },
      billing: {
        title:
          "Abrechnung und SMS",
        description:
          "Werkzeuge nur für Manager mit der Berechtigung Abrechnung.",
        noAccessTitle:
          "Die Abrechnungsberechtigung ist nicht aktiv",
        noAccessDescription:
          "Werkzeuge für Abrechnung und SMS-Verbrauch sind ausgeblendet. Ein Administrator kann diese Berechtigung auf der Seite Manager erteilen.",
      },
      invoices: {
        title:
          "Rechnungen",
        description:
          "Operative Rechnungen erfassen und Zahlungseingänge bestätigen.",
      },
      clinicSms: {
        title:
          "SMS-Abrechnung für Kliniken",
        description:
          "SMS-Verbrauch der Kliniken und die für die Rechnungsstellung erforderlichen Daten anzeigen.",
      },
      doctorSms: {
        title:
          "SMS-Abrechnung für Ärzte",
        description:
          "SMS-Verbrauch einzelner Ärzte und die für die Rechnungsstellung erforderlichen Daten anzeigen.",
      },
      account: {
        title:
          "Konto und Sicherheit",
        description:
          "Kontoschutz und MFA-Sitzung prüfen.",
      },
      security: {
        title:
          "Kontosicherheit",
        description:
          "Status der Zwei-Faktor-Authentifizierung des Managerkontos prüfen.",
      },
      rules: {
        title:
          "So wird der Zugriff kontrolliert",
        description:
          "Der Manager verwendet dieselben gesicherten APIs wie der Administrationsbereich, jedoch wird jede Operation einzeln geprüft. Die Managerrolle erhält nicht automatisch administrator-exklusive Aktionen und gewährt keinen Zugriff auf medizinische Inhalte.",
      },
    },
  },
} as const;

export function getPlatformOperatorOverview(
  locale: AppLocale
) {
  return overviewMessages[
    locale
  ];
}
