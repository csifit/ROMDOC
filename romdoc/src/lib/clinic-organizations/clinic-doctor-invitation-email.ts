import {
  Resend,
} from "resend";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type InvitationEmailCopy = {
  subject:
    (
      organizationName:
        string
    ) => string;
  greeting: string;
  introduction:
    (
      organizationName:
        string
    ) => string;
  subscription: string;
  continue: string;
  ignore: string;
  team: string;
  heading: string;
  button: string;
  linkFallback: string;
};

export type ClinicDoctorInvitationEmailResult = {
  sent: boolean;
  error:
    string | null;
};

const COPY:
  Record<
    AppLocale,
    InvitationEmailCopy
  > = {
    ro: {
      subject:
        (organizationName) =>
          `${organizationName} te invită pe RomDoc`,
      greeting:
        "Bună ziua,",
      introduction:
        (organizationName) =>
          `${organizationName} te-a invitat să îți creezi un cont de medic pe RomDoc.`,
      subscription:
        "Organizația clinicii va acoperi costurile acestui cont RomDoc conform relației comerciale configurate. Nu trebuie să activezi un abonament Stripe individual.",
      continue:
        "Pentru a continua, deschide linkul de mai jos:",
      ignore:
        "Dacă nu te așteptai la această invitație, poți ignora mesajul.",
      team:
        "Echipa RomDoc",
      heading:
        "Invitație RomDoc",
      button:
        "Creează contul de medic",
      linkFallback:
        "Dacă butonul nu funcționează, copiază acest link în browser:",
    },
    en: {
      subject:
        (organizationName) =>
          `${organizationName} invited you to RomDoc`,
      greeting:
        "Hello,",
      introduction:
        (organizationName) =>
          `${organizationName} invited you to create a Doctor account on RomDoc.`,
      subscription:
        "The clinic organisation will cover the costs of this RomDoc account according to the configured commercial relationship. You do not need to activate an individual Stripe subscription.",
      continue:
        "Open the link below to continue:",
      ignore:
        "You can ignore this message when you were not expecting this invitation.",
      team:
        "The RomDoc team",
      heading:
        "RomDoc invitation",
      button:
        "Create Doctor account",
      linkFallback:
        "When the button does not work, copy this link into your browser:",
    },
    de: {
      subject:
        (organizationName) =>
          `${organizationName} lädt Sie zu RomDoc ein`,
      greeting:
        "Guten Tag,",
      introduction:
        (organizationName) =>
          `${organizationName} hat Sie eingeladen, ein Arztkonto bei RomDoc zu erstellen.`,
      subscription:
        "Die Klinikorganisation übernimmt die Kosten dieses RomDoc-Kontos entsprechend der eingerichteten Geschäftsbeziehung. Sie müssen kein individuelles Stripe-Abonnement aktivieren.",
      continue:
        "Öffnen Sie den folgenden Link, um fortzufahren:",
      ignore:
        "Wenn Sie diese Einladung nicht erwartet haben, können Sie diese Nachricht ignorieren.",
      team:
        "Das RomDoc-Team",
      heading:
        "RomDoc-Einladung",
      button:
        "Arztkonto erstellen",
      linkFallback:
        "Wenn die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:",
    },
  };

function escapeHtml(
  value: string
) {
  return value.replace(
    /[&<>"']/g,
    (
      character
    ) => {
      switch (
        character
      ) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        default:
          return "&#039;";
      }
    }
  );
}

export async function
sendClinicDoctorInvitationEmail({
  doctorEmail,
  organizationName,
  inviteUrl,
  locale,
}: {
  doctorEmail: string;
  organizationName: string;
  inviteUrl: string;
  locale: AppLocale;
}): Promise<
  ClinicDoctorInvitationEmailResult
> {
  const apiKey =
    process.env
      .RESEND_API_KEY;

  if (!apiKey) {
    return {
      sent: false,
      error:
        "RESEND_API_KEY is not configured.",
    };
  }

  const fromAddress =
    process.env
      .RESEND_FROM ??
    process.env
      .RESEND_FROM_EMAIL ??
    "RomDoc <programari@romdoc.fit>";

  const copy =
    COPY[locale];

  const resend =
    new Resend(
      apiKey
    );

  const safeOrganization =
    escapeHtml(
      organizationName
    );

  const safeInviteUrl =
    escapeHtml(
      inviteUrl
    );

  try {
    const result =
      await resend.emails
        .send({
          from:
            fromAddress,
          to:
            doctorEmail,
          subject:
            copy.subject(
              organizationName
            ),
          text:
            [
              copy.greeting,
              "",
              copy.introduction(
                organizationName
              ),
              "",
              copy.subscription,
              "",
              copy.continue,
              inviteUrl,
              "",
              copy.ignore,
              "",
              copy.team,
            ].join(
              "\n"
            ),
          html:
            `
              <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
                <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(
                  copy.heading
                )}</h1>
                <p>${escapeHtml(
                  copy.greeting
                )}</p>
                <p>${escapeHtml(
                  copy.introduction(
                    organizationName
                  )
                ).replace(
                  safeOrganization,
                  `<strong>${safeOrganization}</strong>`
                )}</p>
                <p>${escapeHtml(
                  copy.subscription
                )}</p>
                <p>
                  <a
                    href="${safeInviteUrl}"
                    style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700"
                  >
                    ${escapeHtml(
                      copy.button
                    )}
                  </a>
                </p>
                <p style="font-size:13px;color:#6b7280">${escapeHtml(
                  copy.linkFallback
                )}</p>
                <p style="font-size:13px;color:#374151;word-break:break-all">${safeInviteUrl}</p>
                <p style="font-size:13px;color:#6b7280">${escapeHtml(
                  copy.ignore
                )}</p>
                <p>${escapeHtml(
                  copy.team
                )}</p>
              </div>
            `,
        });

    if (
      result.error
    ) {
      return {
        sent: false,
        error:
          result.error.message,
      };
    }

    return {
      sent: true,
      error: null,
    };
  } catch (
    error
  ) {
    console.error(
      "Clinic doctor invitation email failed:",
      error
    );

    return {
      sent: false,
      error:
        error instanceof
          Error
          ? error.message
          : "Invitation email could not be sent.",
    };
  }
}
