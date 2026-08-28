import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type AccountSecurityCopy = {
  navigationLabel: string;
  pageEyebrow: string;
  pageTitle: string;
  pageDescription: string;
  back: string;
  sectionTitle: string;
  sectionDescription: string;
  loading: string;
  loadError: string;
  emailTitle: string;
  emailDescription: string;
  currentEmail: string;
  emailUnavailable: string;
  newEmail: string;
  newEmailPlaceholder: string;
  emailPrivateNote: string;
  emailRequired: string;
  emailInvalid: string;
  emailSame: string;
  emailInUse: string;
  emailRateLimited: string;
  emailGenericError: string;
  emailSubmit: string;
  emailSubmitting: string;
  emailSuccess: string;
  pendingEmail: string;
  passwordTitle: string;
  passwordDescription: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordRequirements: string;
  passwordCurrentRequired: string;
  passwordTooShort: string;
  passwordMismatch: string;
  passwordSame: string;
  passwordIncorrect: string;
  passwordWeak: string;
  passwordRateLimited: string;
  passwordGenericError: string;
  passwordSubmit: string;
  passwordSubmitting: string;
  passwordSuccess: string;
};

const COPY: Record<
  AppLocale,
  AccountSecurityCopy
> = {
  ro: {
    navigationLabel:
      "Securitate cont",
    pageEyebrow:
      "Cont RomDoc",
    pageTitle:
      "Securitate și acces",
    pageDescription:
      "Gestionează adresa de e-mail folosită pentru autentificare și parola contului tău RomDoc.",
    back:
      "Înapoi",
    sectionTitle:
      "Acces la cont",
    sectionDescription:
      "Aceste date controlează autentificarea în RomDoc. Nu modifică automat informațiile publice afișate pe platformă.",
    loading:
      "Se încarcă informațiile contului...",
    loadError:
      "Informațiile contului nu au putut fi încărcate. Reîncarcă pagina și încearcă din nou.",
    emailTitle:
      "Adresă de e-mail a contului",
    emailDescription:
      "Folosește această adresă pentru autentificare și notificări de securitate ale contului.",
    currentEmail:
      "E-mail curent",
    emailUnavailable:
      "E-mail indisponibil",
    newEmail:
      "Adresă de e-mail nouă",
    newEmailPlaceholder:
      "nume@exemplu.ro",
    emailPrivateNote:
      "Aceasta este adresa contului. Pentru medici, nu este aceeași cu adresa publică din profil și nu va modifica acel câmp.",
    emailRequired:
      "Introdu o adresă de e-mail nouă.",
    emailInvalid:
      "Introdu o adresă de e-mail validă.",
    emailSame:
      "Noua adresă este identică cu adresa curentă.",
    emailInUse:
      "Această adresă de e-mail este deja asociată unui alt cont.",
    emailRateLimited:
      "Au fost trimise prea multe solicitări. Încearcă din nou mai târziu.",
    emailGenericError:
      "Schimbarea adresei de e-mail nu a putut fi inițiată.",
    emailSubmit:
      "Schimbă adresa de e-mail",
    emailSubmitting:
      "Se trimite confirmarea...",
    emailSuccess:
      "Solicitarea a fost trimisă. Urmează instrucțiunile din mesajele de confirmare înainte ca noua adresă să devină activă.",
    pendingEmail:
      "Adresă solicitată",
    passwordTitle:
      "Parolă",
    passwordDescription:
      "Schimbă parola fără a modifica adresa de e-mail sau profilul public.",
    currentPassword:
      "Parola curentă",
    newPassword:
      "Parola nouă",
    confirmPassword:
      "Confirmă parola nouă",
    passwordRequirements:
      "Folosește minimum 12 caractere și o parolă unică pentru RomDoc.",
    passwordCurrentRequired:
      "Introdu parola curentă.",
    passwordTooShort:
      "Parola nouă trebuie să aibă minimum 12 caractere.",
    passwordMismatch:
      "Cele două parole noi nu coincid.",
    passwordSame:
      "Parola nouă trebuie să fie diferită de parola curentă.",
    passwordIncorrect:
      "Parola curentă nu este corectă.",
    passwordWeak:
      "Parola nouă nu îndeplinește cerințele de securitate.",
    passwordRateLimited:
      "Au fost făcute prea multe încercări. Încearcă din nou mai târziu.",
    passwordGenericError:
      "Parola nu a putut fi schimbată.",
    passwordSubmit:
      "Schimbă parola",
    passwordSubmitting:
      "Se schimbă parola...",
    passwordSuccess:
      "Parola a fost schimbată cu succes.",
  },

  en: {
    navigationLabel:
      "Account security",
    pageEyebrow:
      "RomDoc account",
    pageTitle:
      "Security and access",
    pageDescription:
      "Manage the email address used to sign in and the password for your RomDoc account.",
    back:
      "Back",
    sectionTitle:
      "Account access",
    sectionDescription:
      "These details control access to RomDoc. They do not automatically change information that is publicly displayed on the platform.",
    loading:
      "Loading account information...",
    loadError:
      "Account information could not be loaded. Reload the page and try again.",
    emailTitle:
      "Account email address",
    emailDescription:
      "Use this address to sign in and receive account-security notifications.",
    currentEmail:
      "Current email",
    emailUnavailable:
      "Email unavailable",
    newEmail:
      "New email address",
    newEmailPlaceholder:
      "name@example.com",
    emailPrivateNote:
      "This is your account email. For doctors, it is separate from the public profile email and changing it will not modify that field.",
    emailRequired:
      "Enter a new email address.",
    emailInvalid:
      "Enter a valid email address.",
    emailSame:
      "The new address is the same as the current address.",
    emailInUse:
      "This email address is already associated with another account.",
    emailRateLimited:
      "Too many requests have been sent. Try again later.",
    emailGenericError:
      "The email-address change could not be started.",
    emailSubmit:
      "Change email address",
    emailSubmitting:
      "Sending confirmation...",
    emailSuccess:
      "The request was sent. Follow the confirmation instructions before the new address becomes active.",
    pendingEmail:
      "Requested address",
    passwordTitle:
      "Password",
    passwordDescription:
      "Change your password without changing your email address or public profile.",
    currentPassword:
      "Current password",
    newPassword:
      "New password",
    confirmPassword:
      "Confirm new password",
    passwordRequirements:
      "Use at least 12 characters and a password that is unique to RomDoc.",
    passwordCurrentRequired:
      "Enter your current password.",
    passwordTooShort:
      "The new password must contain at least 12 characters.",
    passwordMismatch:
      "The two new passwords do not match.",
    passwordSame:
      "The new password must be different from your current password.",
    passwordIncorrect:
      "The current password is incorrect.",
    passwordWeak:
      "The new password does not meet the security requirements.",
    passwordRateLimited:
      "Too many attempts were made. Try again later.",
    passwordGenericError:
      "The password could not be changed.",
    passwordSubmit:
      "Change password",
    passwordSubmitting:
      "Changing password...",
    passwordSuccess:
      "Your password was changed successfully.",
  },

  de: {
    navigationLabel:
      "Kontosicherheit",
    pageEyebrow:
      "RomDoc-Konto",
    pageTitle:
      "Sicherheit und Zugang",
    pageDescription:
      "Verwalten Sie die E-Mail-Adresse für die Anmeldung und das Passwort Ihres RomDoc-Kontos.",
    back:
      "Zurück",
    sectionTitle:
      "Kontozugang",
    sectionDescription:
      "Diese Angaben steuern den Zugang zu RomDoc. Öffentlich angezeigte Informationen auf der Plattform werden dadurch nicht automatisch geändert.",
    loading:
      "Kontoinformationen werden geladen...",
    loadError:
      "Die Kontoinformationen konnten nicht geladen werden. Laden Sie die Seite neu und versuchen Sie es erneut.",
    emailTitle:
      "E-Mail-Adresse des Kontos",
    emailDescription:
      "Verwenden Sie diese Adresse zur Anmeldung und für Sicherheitsbenachrichtigungen des Kontos.",
    currentEmail:
      "Aktuelle E-Mail-Adresse",
    emailUnavailable:
      "E-Mail-Adresse nicht verfügbar",
    newEmail:
      "Neue E-Mail-Adresse",
    newEmailPlaceholder:
      "name@beispiel.de",
    emailPrivateNote:
      "Dies ist die E-Mail-Adresse des Kontos. Bei Ärzten ist sie von der öffentlichen Profil-E-Mail getrennt und wird durch diese Änderung nicht angepasst.",
    emailRequired:
      "Geben Sie eine neue E-Mail-Adresse ein.",
    emailInvalid:
      "Geben Sie eine gültige E-Mail-Adresse ein.",
    emailSame:
      "Die neue Adresse entspricht der aktuellen Adresse.",
    emailInUse:
      "Diese E-Mail-Adresse ist bereits mit einem anderen Konto verknüpft.",
    emailRateLimited:
      "Es wurden zu viele Anfragen gesendet. Versuchen Sie es später erneut.",
    emailGenericError:
      "Die Änderung der E-Mail-Adresse konnte nicht gestartet werden.",
    emailSubmit:
      "E-Mail-Adresse ändern",
    emailSubmitting:
      "Bestätigung wird gesendet...",
    emailSuccess:
      "Die Anfrage wurde gesendet. Folgen Sie den Bestätigungsanweisungen, bevor die neue Adresse aktiv wird.",
    pendingEmail:
      "Angeforderte Adresse",
    passwordTitle:
      "Passwort",
    passwordDescription:
      "Ändern Sie Ihr Passwort, ohne die E-Mail-Adresse oder das öffentliche Profil zu ändern.",
    currentPassword:
      "Aktuelles Passwort",
    newPassword:
      "Neues Passwort",
    confirmPassword:
      "Neues Passwort bestätigen",
    passwordRequirements:
      "Verwenden Sie mindestens 12 Zeichen und ein Passwort, das ausschließlich für RomDoc genutzt wird.",
    passwordCurrentRequired:
      "Geben Sie Ihr aktuelles Passwort ein.",
    passwordTooShort:
      "Das neue Passwort muss mindestens 12 Zeichen enthalten.",
    passwordMismatch:
      "Die beiden neuen Passwörter stimmen nicht überein.",
    passwordSame:
      "Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.",
    passwordIncorrect:
      "Das aktuelle Passwort ist nicht korrekt.",
    passwordWeak:
      "Das neue Passwort erfüllt die Sicherheitsanforderungen nicht.",
    passwordRateLimited:
      "Es gab zu viele Versuche. Versuchen Sie es später erneut.",
    passwordGenericError:
      "Das Passwort konnte nicht geändert werden.",
    passwordSubmit:
      "Passwort ändern",
    passwordSubmitting:
      "Passwort wird geändert...",
    passwordSuccess:
      "Ihr Passwort wurde erfolgreich geändert.",
  },
};

export function getAccountSecurityCopy(
  locale: AppLocale
) {
  return COPY[locale];
}
