import {
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();

const translations = {
  ro: {
    forgot: {
      title:
        "Resetarea parolei",
      description:
        "Introdu adresa contului. Îți vom trimite un link securizat pentru alegerea unei parole noi.",
      emailLabel:
        "E-mail",
      emailPlaceholder:
        "nume@example.com",
      emailRequired:
        "Introdu adresa de e-mail.",
      securityMessage:
        "Dacă există un cont asociat acestei adrese, vei primi un e-mail cu linkul pentru alegerea unei parole noi.",
      sending:
        "Se trimite...",
      submit:
        "Trimite linkul de resetare",
      backToLogin:
        "Înapoi la autentificare",
    },
    set: {
      recoveryTitle:
        "Alege o parolă nouă",
      inviteTitle:
        "Creează parola contului",
      recoveryDescription:
        "Introdu și confirmă noua parolă pentru contul tău.",
      inviteDescription:
        "Invitația a fost confirmată. Creează acum parola pe care o vei folosi la autentificare.",
      checkingLink:
        "Se verifică linkul securizat...",
      newPasswordLabel:
        "Parolă nouă",
      newPasswordPlaceholder:
        "Minimum 8 caractere",
      confirmPasswordLabel:
        "Confirmă parola",
      confirmPasswordPlaceholder:
        "Repetă parola",
      passwordGuidance:
        "Folosește minimum 8 caractere și evită parolele utilizate pe alte servicii.",
      saving:
        "Se salvează...",
      savePassword:
        "Salvează parola",
      requestNewLink:
        "Solicită un link nou",
      backToLogin:
        "Înapoi la autentificare",
      invalidLink:
        "Linkul nu este valid sau a expirat. Solicită un link nou.",
      sessionVerificationFailed:
        "Sesiunea nu a putut fi verificată. Solicită un link nou.",
      sessionUnavailable:
        "Sesiunea nu este disponibilă. Solicită un link nou.",
      passwordMinLength:
        "Parola trebuie să conțină cel puțin 8 caractere.",
      passwordMismatch:
        "Parolele introduse nu coincid.",
      passwordUpdated:
        "Parola a fost actualizată.",
      passwordCreated:
        "Parola a fost creată. Vei fi redirecționat către contul tău.",
      passwordSaveFailed:
        "Parola nu a putut fi salvată.",
    },
  },
  en: {
    forgot: {
      title:
        "Reset your password",
      description:
        "Enter the email address for your account. We will send you a secure link to choose a new password.",
      emailLabel:
        "Email",
      emailPlaceholder:
        "name@example.com",
      emailRequired:
        "Enter your email address.",
      securityMessage:
        "If an account is associated with this address, you will receive an email with a link to choose a new password.",
      sending:
        "Sending...",
      submit:
        "Send reset link",
      backToLogin:
        "Back to sign in",
    },
    set: {
      recoveryTitle:
        "Choose a new password",
      inviteTitle:
        "Create your account password",
      recoveryDescription:
        "Enter and confirm the new password for your account.",
      inviteDescription:
        "Your invitation has been confirmed. Create the password you will use to sign in.",
      checkingLink:
        "Checking the secure link...",
      newPasswordLabel:
        "New password",
      newPasswordPlaceholder:
        "At least 8 characters",
      confirmPasswordLabel:
        "Confirm password",
      confirmPasswordPlaceholder:
        "Enter the password again",
      passwordGuidance:
        "Use at least 8 characters and avoid passwords you use for other services.",
      saving:
        "Saving...",
      savePassword:
        "Save password",
      requestNewLink:
        "Request a new link",
      backToLogin:
        "Back to sign in",
      invalidLink:
        "This link is invalid or has expired. Request a new link.",
      sessionVerificationFailed:
        "The session could not be verified. Request a new link.",
      sessionUnavailable:
        "The session is unavailable. Request a new link.",
      passwordMinLength:
        "The password must contain at least 8 characters.",
      passwordMismatch:
        "The passwords do not match.",
      passwordUpdated:
        "Your password has been updated.",
      passwordCreated:
        "Your password has been created. You will be redirected to your account.",
      passwordSaveFailed:
        "The password could not be saved.",
    },
  },
  de: {
    forgot: {
      title:
        "Passwort zurücksetzen",
      description:
        "Gib die E-Mail-Adresse deines Kontos ein. Wir senden dir einen sicheren Link, über den du ein neues Passwort festlegen kannst.",
      emailLabel:
        "E-Mail",
      emailPlaceholder:
        "name@beispiel.de",
      emailRequired:
        "Gib deine E-Mail-Adresse ein.",
      securityMessage:
        "Falls ein Konto mit dieser Adresse verknüpft ist, erhältst du eine E-Mail mit einem Link zum Festlegen eines neuen Passworts.",
      sending:
        "Wird gesendet...",
      submit:
        "Link zum Zurücksetzen senden",
      backToLogin:
        "Zurück zur Anmeldung",
    },
    set: {
      recoveryTitle:
        "Neues Passwort festlegen",
      inviteTitle:
        "Passwort für dein Konto erstellen",
      recoveryDescription:
        "Gib das neue Passwort für dein Konto ein und bestätige es.",
      inviteDescription:
        "Deine Einladung wurde bestätigt. Erstelle jetzt das Passwort, mit dem du dich anmelden wirst.",
      checkingLink:
        "Der sichere Link wird geprüft...",
      newPasswordLabel:
        "Neues Passwort",
      newPasswordPlaceholder:
        "Mindestens 8 Zeichen",
      confirmPasswordLabel:
        "Passwort bestätigen",
      confirmPasswordPlaceholder:
        "Passwort erneut eingeben",
      passwordGuidance:
        "Verwende mindestens 8 Zeichen und kein Passwort, das du auch für andere Dienste nutzt.",
      saving:
        "Wird gespeichert...",
      savePassword:
        "Passwort speichern",
      requestNewLink:
        "Neuen Link anfordern",
      backToLogin:
        "Zurück zur Anmeldung",
      invalidLink:
        "Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen Link an.",
      sessionVerificationFailed:
        "Die Sitzung konnte nicht geprüft werden. Fordere einen neuen Link an.",
      sessionUnavailable:
        "Die Sitzung ist nicht verfügbar. Fordere einen neuen Link an.",
      passwordMinLength:
        "Das Passwort muss mindestens 8 Zeichen enthalten.",
      passwordMismatch:
        "Die Passwörter stimmen nicht überein.",
      passwordUpdated:
        "Dein Passwort wurde aktualisiert.",
      passwordCreated:
        "Dein Passwort wurde erstellt. Du wirst zu deinem Konto weitergeleitet.",
      passwordSaveFailed:
        "Das Passwort konnte nicht gespeichert werden.",
    },
  },
};

async function updateLocale(
  locale
) {
  const filePath =
    path.join(
      projectRoot,
      "messages",
      `${locale}.json`
    );

  const source =
    await readFile(
      filePath,
      "utf8"
    );

  const messages =
    JSON.parse(source);

  messages.PasswordReset =
    translations[locale];

  await writeFile(
    filePath,
    `${JSON.stringify(
      messages,
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    `Updated ${path.relative(
      projectRoot,
      filePath
    )}`
  );
}

for (
  const locale of [
    "ro",
    "en",
    "de",
  ]
) {
  await updateLocale(locale);
}

console.log(
  "\nPassword-reset translations updated successfully."
);
