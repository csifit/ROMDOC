import {
  Resend,
} from "resend";

import {
  normalizeAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";

type SendPatientRegistrationInviteInput = {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  locale?: string | null;
  inviteToken: string;
};

type SendPatientRegistrationInviteResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

const COPY: Record<
  AppLocale,
  {
    subject: string;
    heading: string;
    greeting: (
      patientName: string
    ) => string;
    intro: (
      doctorName: string
    ) => string;
    explanation: string;
    sameEmail: string;
    action: string;
    existingAccount: string;
    expiry: string;
    privacy: string;
  }
> = {
  ro: {
    subject:
      "Invitație pentru contul tău RomDoc",
    heading:
      "Creează contul tău de pacient RomDoc",
    greeting:
      (patientName) =>
        `Bună, ${patientName},`,
    intro:
      (doctorName) =>
        `${doctorName} te-a invitat să creezi un cont de pacient RomDoc.`,
    explanation:
      "După autentificare, această invitație poate asocia în siguranță fișa administrativă creată de medic cu profilul tău RomDoc.",
    sameEmail:
      "Important: folosește aceeași adresă de e-mail la înregistrare sau autentificare.",
    action:
      "Creează cont / Autentifică-te",
    existingAccount:
      "Dacă ai deja cont RomDoc, folosește opțiunea de autentificare de pe pagina de înregistrare.",
    expiry:
      "Linkul este valabil 7 zile și poate fi folosit o singură dată.",
    privacy:
      "Invitația nu acordă automat acces la informații medicale în afara regulilor RomDoc pentru programări și Dosarul medical.",
  },
  en: {
    subject:
      "Invitation to your RomDoc patient account",
    heading:
      "Create your RomDoc patient account",
    greeting:
      (patientName) =>
        `Hello ${patientName},`,
    intro:
      (doctorName) =>
        `${doctorName} invited you to create a RomDoc patient account.`,
    explanation:
      "After you sign in, this invitation can securely link the administrative patient record created by the doctor to your RomDoc profile.",
    sameEmail:
      "Important: use the same email address when registering or signing in.",
    action:
      "Create account / Sign in",
    existingAccount:
      "If you already have a RomDoc account, use the sign-in option on the registration page.",
    expiry:
      "This link is valid for 7 days and can be used once.",
    privacy:
      "The invitation does not automatically grant medical access outside RomDoc appointment and Medical Folder rules.",
  },
  de: {
    subject:
      "Einladung zu Ihrem RomDoc-Patientenkonto",
    heading:
      "Erstellen Sie Ihr RomDoc-Patientenkonto",
    greeting:
      (patientName) =>
        `Guten Tag ${patientName},`,
    intro:
      (doctorName) =>
        `${doctorName} hat Sie eingeladen, ein RomDoc-Patientenkonto zu erstellen.`,
    explanation:
      "Nach der Anmeldung kann diese Einladung den vom Arzt angelegten administrativen Patienteneintrag sicher mit Ihrem RomDoc-Profil verknüpfen.",
    sameEmail:
      "Wichtig: Verwenden Sie bei Registrierung oder Anmeldung dieselbe E-Mail-Adresse.",
    action:
      "Konto erstellen / Anmelden",
    existingAccount:
      "Wenn Sie bereits ein RomDoc-Konto haben, verwenden Sie die Anmeldeoption auf der Registrierungsseite.",
    expiry:
      "Dieser Link ist 7 Tage gültig und kann einmal verwendet werden.",
    privacy:
      "Die Einladung gewährt keinen automatischen medizinischen Zugriff außerhalb der RomDoc-Regeln für Termine und die medizinische Akte.",
  },
};

function getSiteUrl() {
  const configured =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    process.env
      .NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    "";

  if (
    configured.trim()
  ) {
    return configured
      .trim()
      .replace(
        /\/$/,
        ""
      );
  }

  if (
    process.env
      .VERCEL_URL
  ) {
    return `https://${process.env.VERCEL_URL}`.replace(
      /\/$/,
      ""
    );
  }

  return "https://www.romdoc.fit";
}

function escapeHtml(
  value: string
) {
  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function normalizeError(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return {
      code:
        error.name ||
        "EMAIL_ERROR",
      message:
        error.message,
    };
  }

  return {
    code:
      "EMAIL_ERROR",
    message:
      String(error),
  };
}

export async function sendPatientRegistrationInvite(
  input:
    SendPatientRegistrationInviteInput
): Promise<
  SendPatientRegistrationInviteResult
> {
  const locale =
    normalizeAppLocale(
      input.locale
    );

  const copy =
    COPY[locale];

  const apiKey =
    process.env
      .RESEND_API_KEY;

  const from =
    process.env
      .RESEND_FROM_EMAIL;

  if (
    !apiKey ||
    !from
  ) {
    return {
      sent: false,
      skipped: true,
      providerMessageId:
        null,
      errorCode:
        "MISSING_CONFIGURATION",
      errorMessage:
        "RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
    };
  }

  const claimPath =
    `/auth/patient-invite-claim?token=${encodeURIComponent(
      input.inviteToken
    )}&locale=${locale}`;

  const query =
    new URLSearchParams({
      email:
        input.patientEmail,
      type:
        "patient",
      role:
        "patient",
      locale,
      next:
        claimPath,
    });

  const registrationUrl =
    `${getSiteUrl()}/register?${query.toString()}`;

  const resend =
    new Resend(
      apiKey
    );

  try {
    const result =
      await resend.emails.send({
        from,
        to:
          input.patientEmail,
        subject:
          copy.subject,
        html: `
          <!doctype html>
          <html lang="${locale}">
            <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
              <div style="max-width:640px;margin:0 auto;padding:32px 16px">
                <div style="background:#ffffff;border-radius:16px;padding:32px">
                  <p style="margin:0 0 12px;color:#036661;font-weight:700">RomDoc</p>
                  <h1 style="margin:0;font-size:28px">${escapeHtml(copy.heading)}</h1>

                  <p style="margin-top:20px;line-height:1.7">
                    ${escapeHtml(copy.greeting(input.patientName))}
                  </p>

                  <p style="line-height:1.7">
                    ${escapeHtml(copy.intro(input.doctorName))}
                  </p>

                  <p style="line-height:1.7">
                    ${escapeHtml(copy.explanation)}
                  </p>

                  <div style="margin-top:20px;border:1px solid #d1fae5;background:#f0fdf4;border-radius:12px;padding:18px">
                    <p style="margin:0;line-height:1.7;color:#065f46;font-weight:700">
                      ${escapeHtml(copy.sameEmail)}
                    </p>
                    <p style="margin:8px 0 0;line-height:1.7;color:#374151">
                      ${escapeHtml(input.patientEmail)}
                    </p>
                  </div>

                  <p style="margin:24px 0 0">
                    <a
                      href="${escapeHtml(registrationUrl)}"
                      style="display:inline-block;border-radius:10px;background:#036661;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700"
                    >
                      ${escapeHtml(copy.action)}
                    </a>
                  </p>

                  <p style="margin-top:20px;line-height:1.7;color:#4b5563">
                    ${escapeHtml(copy.existingAccount)}
                  </p>

                  <p style="margin-top:14px;line-height:1.7;color:#4b5563">
                    ${escapeHtml(copy.expiry)}
                  </p>

                  <p style="margin-top:22px;font-size:13px;line-height:1.6;color:#6b7280">
                    ${escapeHtml(copy.privacy)}
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: [
          "RomDoc",
          "",
          copy.heading,
          "",
          copy.greeting(
            input.patientName
          ),
          copy.intro(
            input.doctorName
          ),
          copy.explanation,
          "",
          copy.sameEmail,
          input.patientEmail,
          "",
          `${copy.action}: ${registrationUrl}`,
          "",
          copy.existingAccount,
          copy.expiry,
          copy.privacy,
        ].join(
          "\n"
        ),
      });

    if (
      result.error
    ) {
      const normalized =
        normalizeError(
          result.error
        );

      return {
        sent: false,
        skipped: false,
        providerMessageId:
          null,
        errorCode:
          normalized.code,
        errorMessage:
          normalized.message,
      };
    }

    return {
      sent: true,
      skipped: false,
      providerMessageId:
        result.data?.id ??
        null,
      errorCode:
        null,
      errorMessage:
        null,
    };
  } catch (error) {
    const normalized =
      normalizeError(
        error
      );

    return {
      sent: false,
      skipped: false,
      providerMessageId:
        null,
      errorCode:
        normalized.code,
      errorMessage:
        normalized.message,
    };
  }
}
