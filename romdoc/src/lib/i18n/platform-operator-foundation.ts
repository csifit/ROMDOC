import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

import roMessages from "../../../messages/ro.json";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";

const foundationMessages = {
  ro: {
    PlatformOperatorFoundation: {
      common: {
        emailUnavailable:
          "E-mail indisponibil",
        fallbackAdmin:
          "Administrator",
        fallbackManager:
          "Manager",
        roleAdmin:
          "Administrator",
        roleManager:
          "Manager",
      },
      sidebar: {
        adminBrand:
          "RomDoc Admin",
        managerBrand:
          "RomDoc Manager",
        adminNavigationLabel:
          "Navigare administrator",
        managerNavigationLabel:
          "Navigare manager",
        expandMenu:
          "Extinde meniul",
        collapseMenu:
          "Restrânge meniul",
        openMenu:
          "Deschide meniul",
        closeMenu:
          "Închide meniul",
        signOut:
          "Deconectare",
        signingOut:
          "Se deconectează...",
        navigation: {
          overview:
            "Prezentare generală",
          users:
            "Utilizatori",
          managers:
            "Manageri",
          doctors:
            "Medici",
          verifications:
            "Verificări profesionale",
          clinics:
            "Clinici",
          specialties:
            "Specialități",
          cities:
            "Orașe",
          reviews:
            "Recenzii",
          sms:
            "SMS",
          invoices:
            "Facturi",
          privacy:
            "Confidențialitate",
          ai:
            "Asistent AI",
          security:
            "Securitatea contului",
          home:
            "Pagina principală",
        },
      },
      mfa: {
        setupPageTitle:
          "Configurează Google Authenticator",
        verifyPageTitle:
          "Introdu codul Google Authenticator",
        verificationCode:
          "Cod de verificare",
        authenticatorCode:
          "Cod Google Authenticator",
        verifying:
          "Se verifică...",
        generatingQr:
          "Se generează codul QR...",
        cannotScanQr:
          "Nu poți scana codul QR?",
        manualKey:
          "Introdu manual această cheie în Google Authenticator:",
        stepOne:
          "Deschide Google Authenticator pe telefon.",
        stepTwo:
          "Apasă „+” și alege scanarea unui cod QR.",
        stepThree:
          "Scanează codul și introdu mai jos codul curent de 6 cifre.",
        invalidSixDigitCode:
          "Introdu codul de 6 cifre din Google Authenticator.",
        factorsUnavailable:
          "Factorii MFA nu au putut fi verificați.",
        setupUnavailable:
          "Configurarea MFA nu a putut fi începută.",
        setupNotReady:
          "Configurarea MFA nu este încă pregătită.",
        factorUnavailable:
          "Factorul MFA nu a putut fi verificat.",
        invalidOrExpired:
          "Codul nu este valid sau a expirat. Introdu codul curent din Google Authenticator.",
        roles: {
          admin: {
            setupEyebrow:
              "Securitate administrator",
            setupDescription:
              "Autentificarea în doi pași este obligatorie pentru conturile de administrator RomDoc.",
            setupFriendlyName:
              "RomDoc Admin Google Authenticator",
            setupQrAlt:
              "Cod QR Google Authenticator pentru administrator",
            setupButton:
              "Activează MFA și continuă",
            verifyEyebrow:
              "Verificare administrator",
            verifyDescription:
              "Accesul la administrarea RomDoc necesită o sesiune MFA verificată.",
            verifyButton:
              "Continuă în administrare",
          },
          manager: {
            setupEyebrow:
              "Securitate manager",
            setupDescription:
              "Autentificarea în doi pași este obligatorie pentru conturile de manager RomDoc.",
            setupFriendlyName:
              "RomDoc Manager Google Authenticator",
            setupQrAlt:
              "Cod QR Google Authenticator pentru manager",
            setupButton:
              "Activează MFA și continuă",
            verifyEyebrow:
              "Verificare manager",
            verifyDescription:
              "Accesul la panoul de manager RomDoc necesită o sesiune MFA verificată.",
            verifyButton:
              "Continuă în panoul manager",
          },
          clinicManager: {
            setupEyebrow:
              "Securitate manager clinică",
            setupDescription:
              "MFA este opțională pentru managerul clinicii, dar este recomandată pentru conturile care gestionează medici, facturare și SMS-uri.",
            setupFriendlyName:
              "RomDoc Clinic Manager Google Authenticator",
            setupQrAlt:
              "Cod QR Google Authenticator pentru managerul clinicii",
            setupButton:
              "Activează MFA și continuă",
            verifyEyebrow:
              "Verificare manager clinică",
            verifyDescription:
              "Introdu codul Google Authenticator pentru a continua către panoul clinicii.",
            verifyButton:
              "Continuă în panoul clinicii",
          },
        },
      },
      security: {
        eyebrow:
          "Securitate",
        title:
          "Securitatea contului",
        adminDescription:
          "Verifică starea autentificării în doi pași pentru contul administrativ RomDoc.",
        managerDescription:
          "Verifică starea autentificării în doi pași pentru contul de manager RomDoc.",
        loadError:
          "Setările MFA nu au putut fi încărcate. Reîncarcă pagina și încearcă din nou.",
        activeTitle:
          "Google Authenticator este activ",
        adminActiveDescription:
          "Contul are un factor TOTP configurat. MFA rămâne obligatorie pentru accesul administrativ RomDoc.",
        managerActiveDescription:
          "MFA este obligatorie pentru conturile de manager RomDoc.",
        configuredAt:
          "Configurat sau actualizat la {date}.",
        currentLevel:
          "Nivelul sesiunii curente:",
        aal2:
          "AAL2 — verificată prin MFA",
        adminAal1:
          "AAL1 — sesiune fără verificare MFA curentă",
        managerAal1:
          "AAL1 — este necesară o verificare nouă",
        inactiveTitle:
          "Google Authenticator nu este configurat",
        adminInactiveDescription:
          "Configurează autentificarea în doi pași înainte de a folosi contul administrativ din afara unei rețele de încredere.",
        managerInactiveDescription:
          "Configurează MFA pentru a continua utilizarea contului de manager.",
        configure:
          "Configurează Google Authenticator",
        recommendations:
          "Recomandări",
        adminRecommendationOne:
          "Păstrează telefonul și aplicația Google Authenticator protejate.",
        managerRecommendationOne:
          "Protejează telefonul pe care este instalat autentificatorul.",
        recommendationTwo:
          "Nu comunica nimănui codurile temporare de șase cifre.",
        adminRecommendationThree:
          "Dacă pierzi accesul la autentificator, folosește procedura internă de recuperare a contului administrativ.",
        managerRecommendationThree:
          "Anunță administratorul RomDoc dacă pierzi accesul la dispozitiv.",
      },
      states: {
        loading:
          "Se încarcă panoul...",
        errorTitle:
          "Panoul nu a putut fi încărcat",
        errorDescription:
          "A apărut o eroare neașteptată. Încearcă din nou fără a părăsi pagina.",
        tryAgain:
          "Încearcă din nou",
      },
    },
  },
  en: {
    PlatformOperatorFoundation: {
      common: {
        emailUnavailable:
          "Email unavailable",
        fallbackAdmin:
          "Administrator",
        fallbackManager:
          "Manager",
        roleAdmin:
          "Administrator",
        roleManager:
          "Manager",
      },
      sidebar: {
        adminBrand:
          "RomDoc Admin",
        managerBrand:
          "RomDoc Manager",
        adminNavigationLabel:
          "Administrator navigation",
        managerNavigationLabel:
          "Manager navigation",
        expandMenu:
          "Expand menu",
        collapseMenu:
          "Collapse menu",
        openMenu:
          "Open menu",
        closeMenu:
          "Close menu",
        signOut:
          "Sign out",
        signingOut:
          "Signing out...",
        navigation: {
          overview:
            "Overview",
          users:
            "Users",
          managers:
            "Managers",
          doctors:
            "Doctors",
          verifications:
            "Professional verification",
          clinics:
            "Clinics",
          specialties:
            "Specialties",
          cities:
            "Cities",
          reviews:
            "Reviews",
          sms:
            "SMS",
          invoices:
            "Invoices",
          privacy:
            "Privacy",
          ai:
            "AI assistant",
          security:
            "Account security",
          home:
            "Home page",
        },
      },
      mfa: {
        setupPageTitle:
          "Set up Google Authenticator",
        verifyPageTitle:
          "Enter your Google Authenticator code",
        verificationCode:
          "Verification code",
        authenticatorCode:
          "Google Authenticator code",
        verifying:
          "Verifying...",
        generatingQr:
          "Generating the QR code...",
        cannotScanQr:
          "Unable to scan the QR code?",
        manualKey:
          "Enter this key manually in Google Authenticator:",
        stepOne:
          "Open Google Authenticator on your phone.",
        stepTwo:
          "Tap “+” and choose to scan a QR code.",
        stepThree:
          "Scan the code and enter the current six-digit code below.",
        invalidSixDigitCode:
          "Enter the six-digit code from Google Authenticator.",
        factorsUnavailable:
          "The MFA factors could not be checked.",
        setupUnavailable:
          "MFA setup could not be started.",
        setupNotReady:
          "MFA setup is not ready yet.",
        factorUnavailable:
          "The MFA factor could not be verified.",
        invalidOrExpired:
          "The code is invalid or has expired. Enter the current Google Authenticator code.",
        roles: {
          admin: {
            setupEyebrow:
              "Administrator security",
            setupDescription:
              "Two-factor authentication is mandatory for RomDoc administrator accounts.",
            setupFriendlyName:
              "RomDoc Admin Google Authenticator",
            setupQrAlt:
              "Google Authenticator QR code for the administrator",
            setupButton:
              "Enable MFA and continue",
            verifyEyebrow:
              "Administrator verification",
            verifyDescription:
              "A verified MFA session is required to access RomDoc administration.",
            verifyButton:
              "Continue to administration",
          },
          manager: {
            setupEyebrow:
              "Manager security",
            setupDescription:
              "Two-factor authentication is mandatory for RomDoc manager accounts.",
            setupFriendlyName:
              "RomDoc Manager Google Authenticator",
            setupQrAlt:
              "Google Authenticator QR code for the manager",
            setupButton:
              "Enable MFA and continue",
            verifyEyebrow:
              "Manager verification",
            verifyDescription:
              "A verified MFA session is required to access the RomDoc Manager dashboard.",
            verifyButton:
              "Continue to Manager dashboard",
          },
          clinicManager: {
            setupEyebrow:
              "Clinic Manager security",
            setupDescription:
              "MFA is optional for Clinic Managers, but recommended for accounts that manage doctors, billing and clinic SMS usage.",
            setupFriendlyName:
              "RomDoc Clinic Manager Google Authenticator",
            setupQrAlt:
              "Google Authenticator QR code for the Clinic Manager",
            setupButton:
              "Enable MFA and continue",
            verifyEyebrow:
              "Clinic Manager verification",
            verifyDescription:
              "Enter your Google Authenticator code to continue to the clinic dashboard.",
            verifyButton:
              "Continue to clinic dashboard",
          },
        },
      },
      security: {
        eyebrow:
          "Security",
        title:
          "Account security",
        adminDescription:
          "Check the two-factor authentication status of your RomDoc administrator account.",
        managerDescription:
          "Check the two-factor authentication status of your RomDoc manager account.",
        loadError:
          "The MFA settings could not be loaded. Reload the page and try again.",
        activeTitle:
          "Google Authenticator is active",
        adminActiveDescription:
          "The account has a configured TOTP factor. MFA remains mandatory for RomDoc administrative access.",
        managerActiveDescription:
          "MFA is mandatory for RomDoc manager accounts.",
        configuredAt:
          "Configured or updated on {date}.",
        currentLevel:
          "Current session level:",
        aal2:
          "AAL2 — verified through MFA",
        adminAal1:
          "AAL1 — session without current MFA verification",
        managerAal1:
          "AAL1 — a new verification is required",
        inactiveTitle:
          "Google Authenticator is not configured",
        adminInactiveDescription:
          "Set up two-factor authentication before using the administrator account outside a trusted network.",
        managerInactiveDescription:
          "Set up MFA to continue using the manager account.",
        configure:
          "Set up Google Authenticator",
        recommendations:
          "Recommendations",
        adminRecommendationOne:
          "Keep your phone and the Google Authenticator app protected.",
        managerRecommendationOne:
          "Protect the phone on which the authenticator is installed.",
        recommendationTwo:
          "Never share temporary six-digit codes.",
        adminRecommendationThree:
          "If you lose access to the authenticator, use the internal administrator account recovery procedure.",
        managerRecommendationThree:
          "Notify the RomDoc administrator if you lose access to the device.",
      },
      states: {
        loading:
          "Loading dashboard...",
        errorTitle:
          "The dashboard could not be loaded",
        errorDescription:
          "An unexpected error occurred. Try again without leaving the page.",
        tryAgain:
          "Try again",
      },
    },
  },
  de: {
    PlatformOperatorFoundation: {
      common: {
        emailUnavailable:
          "E-Mail nicht verfügbar",
        fallbackAdmin:
          "Administrator",
        fallbackManager:
          "Manager",
        roleAdmin:
          "Administrator",
        roleManager:
          "Manager",
      },
      sidebar: {
        adminBrand:
          "RomDoc Admin",
        managerBrand:
          "RomDoc Manager",
        adminNavigationLabel:
          "Administrator-Navigation",
        managerNavigationLabel:
          "Manager-Navigation",
        expandMenu:
          "Menü erweitern",
        collapseMenu:
          "Menü einklappen",
        openMenu:
          "Menü öffnen",
        closeMenu:
          "Menü schließen",
        signOut:
          "Abmelden",
        signingOut:
          "Abmeldung läuft...",
        navigation: {
          overview:
            "Übersicht",
          users:
            "Benutzer",
          managers:
            "Manager",
          doctors:
            "Ärzte",
          verifications:
            "Berufliche Verifizierung",
          clinics:
            "Kliniken",
          specialties:
            "Fachrichtungen",
          cities:
            "Städte",
          reviews:
            "Bewertungen",
          sms:
            "SMS",
          invoices:
            "Rechnungen",
          privacy:
            "Datenschutz",
          ai:
            "KI-Assistent",
          security:
            "Kontosicherheit",
          home:
            "Startseite",
        },
      },
      mfa: {
        setupPageTitle:
          "Google Authenticator einrichten",
        verifyPageTitle:
          "Google-Authenticator-Code eingeben",
        verificationCode:
          "Bestätigungscode",
        authenticatorCode:
          "Google-Authenticator-Code",
        verifying:
          "Überprüfung läuft...",
        generatingQr:
          "QR-Code wird erstellt...",
        cannotScanQr:
          "QR-Code kann nicht gescannt werden?",
        manualKey:
          "Diesen Schlüssel manuell in Google Authenticator eingeben:",
        stepOne:
          "Google Authenticator auf dem Telefon öffnen.",
        stepTwo:
          "Auf „+“ tippen und das Scannen eines QR-Codes auswählen.",
        stepThree:
          "Den Code scannen und unten den aktuellen sechsstelligen Code eingeben.",
        invalidSixDigitCode:
          "Den sechsstelligen Code aus Google Authenticator eingeben.",
        factorsUnavailable:
          "Die MFA-Faktoren konnten nicht geprüft werden.",
        setupUnavailable:
          "Die MFA-Einrichtung konnte nicht gestartet werden.",
        setupNotReady:
          "Die MFA-Einrichtung ist noch nicht bereit.",
        factorUnavailable:
          "Der MFA-Faktor konnte nicht überprüft werden.",
        invalidOrExpired:
          "Der Code ist ungültig oder abgelaufen. Den aktuellen Google-Authenticator-Code eingeben.",
        roles: {
          admin: {
            setupEyebrow:
              "Administrator-Sicherheit",
            setupDescription:
              "Die Zwei-Faktor-Authentifizierung ist für RomDoc-Administratorkonten verpflichtend.",
            setupFriendlyName:
              "RomDoc Admin Google Authenticator",
            setupQrAlt:
              "Google-Authenticator-QR-Code für den Administrator",
            setupButton:
              "MFA aktivieren und fortfahren",
            verifyEyebrow:
              "Administrator-Verifizierung",
            verifyDescription:
              "Für den Zugriff auf die RomDoc-Administration ist eine verifizierte MFA-Sitzung erforderlich.",
            verifyButton:
              "Zur Administration",
          },
          manager: {
            setupEyebrow:
              "Manager-Sicherheit",
            setupDescription:
              "Die Zwei-Faktor-Authentifizierung ist für RomDoc-Managerkonten verpflichtend.",
            setupFriendlyName:
              "RomDoc Manager Google Authenticator",
            setupQrAlt:
              "Google-Authenticator-QR-Code für den Manager",
            setupButton:
              "MFA aktivieren und fortfahren",
            verifyEyebrow:
              "Manager-Verifizierung",
            verifyDescription:
              "Für den Zugriff auf das RomDoc-Manager-Dashboard ist eine verifizierte MFA-Sitzung erforderlich.",
            verifyButton:
              "Zum Manager-Dashboard",
          },
          clinicManager: {
            setupEyebrow:
              "Sicherheit für Klinikmanager",
            setupDescription:
              "MFA ist für Klinikmanager optional, wird jedoch für Konten empfohlen, die Ärzte, Abrechnung und Klinik-SMS verwalten.",
            setupFriendlyName:
              "RomDoc Clinic Manager Google Authenticator",
            setupQrAlt:
              "Google-Authenticator-QR-Code für den Klinikmanager",
            setupButton:
              "MFA aktivieren und fortfahren",
            verifyEyebrow:
              "Verifizierung für Klinikmanager",
            verifyDescription:
              "Den Google-Authenticator-Code eingeben, um zum Klinik-Dashboard zu gelangen.",
            verifyButton:
              "Zum Klinik-Dashboard",
          },
        },
      },
      security: {
        eyebrow:
          "Sicherheit",
        title:
          "Kontosicherheit",
        adminDescription:
          "Den Status der Zwei-Faktor-Authentifizierung des RomDoc-Administratorkontos prüfen.",
        managerDescription:
          "Den Status der Zwei-Faktor-Authentifizierung des RomDoc-Managerkontos prüfen.",
        loadError:
          "Die MFA-Einstellungen konnten nicht geladen werden. Die Seite neu laden und erneut versuchen.",
        activeTitle:
          "Google Authenticator ist aktiv",
        adminActiveDescription:
          "Für das Konto ist ein TOTP-Faktor eingerichtet. MFA bleibt für den administrativen RomDoc-Zugriff verpflichtend.",
        managerActiveDescription:
          "MFA ist für RomDoc-Managerkonten verpflichtend.",
        configuredAt:
          "Eingerichtet oder aktualisiert am {date}.",
        currentLevel:
          "Aktuelle Sitzungsstufe:",
        aal2:
          "AAL2 — durch MFA verifiziert",
        adminAal1:
          "AAL1 — Sitzung ohne aktuelle MFA-Verifizierung",
        managerAal1:
          "AAL1 — eine neue Verifizierung ist erforderlich",
        inactiveTitle:
          "Google Authenticator ist nicht eingerichtet",
        adminInactiveDescription:
          "Die Zwei-Faktor-Authentifizierung einrichten, bevor das Administratorkonto außerhalb eines vertrauenswürdigen Netzwerks verwendet wird.",
        managerInactiveDescription:
          "MFA einrichten, um das Managerkonto weiter zu verwenden.",
        configure:
          "Google Authenticator einrichten",
        recommendations:
          "Empfehlungen",
        adminRecommendationOne:
          "Das Telefon und die Google-Authenticator-App schützen.",
        managerRecommendationOne:
          "Das Telefon schützen, auf dem der Authenticator installiert ist.",
        recommendationTwo:
          "Temporäre sechsstellige Codes niemals weitergeben.",
        adminRecommendationThree:
          "Bei Verlust des Authenticator-Zugriffs das interne Verfahren zur Wiederherstellung des Administratorkontos verwenden.",
        managerRecommendationThree:
          "Den RomDoc-Administrator informieren, wenn der Zugriff auf das Gerät verloren geht.",
      },
      states: {
        loading:
          "Dashboard wird geladen...",
        errorTitle:
          "Das Dashboard konnte nicht geladen werden",
        errorDescription:
          "Ein unerwarteter Fehler ist aufgetreten. Erneut versuchen, ohne die Seite zu verlassen.",
        tryAgain:
          "Erneut versuchen",
      },
    },
  },
} as const;

export function getPlatformOperatorFoundation(
  locale: AppLocale
) {
  return foundationMessages[locale]
    .PlatformOperatorFoundation;
}

export const platformOperatorMessagesByLocale = {
  ro: {
    ...roMessages,
    ...foundationMessages.ro,
  },
  en: {
    ...enMessages,
    ...foundationMessages.en,
  },
  de: {
    ...deMessages,
    ...foundationMessages.de,
  },
} as const;
