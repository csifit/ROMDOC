import {
  Resend,
} from "resend";

import type {
  ClinicOrganizationInvitationLocale,
} from "@/lib/admin/clinic-organization-invitations";

type SendClinicOrganizationInvitationEmailInput = {
  organizationName: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: ClinicOrganizationInvitationLocale;
  personalMessage: string | null;
  trialMonths: number;
  expiresAt: string;
  actionLink: string;
};

type SendClinicOrganizationInvitationEmailResult =
  | {
      sent: true;
      providerMessageId: string | null;
      error: null;
    }
  | {
      sent: false;
      providerMessageId: null;
      error: string;
    };

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

function getLocaleTag(
  locale: ClinicOrganizationInvitationLocale
) {
  if (
    locale === "en"
  ) {
    return "en-GB";
  }

  if (
    locale === "de"
  ) {
    return "de-DE";
  }

  return "ro-RO";
}

function formatExpiry(
  value: string,
  locale: ClinicOrganizationInvitationLocale
) {
  return new Intl.DateTimeFormat(
    getLocaleTag(
      locale
    ),
    {
      dateStyle:
        "long",
      timeStyle:
        "short",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(
    new Date(
      value
    )
  );
}

export async function sendClinicOrganizationInvitationEmail({
  organizationName,
  email,
  firstName,
  lastName,
  locale,
  personalMessage,
  trialMonths,
  expiresAt,
  actionLink,
}: SendClinicOrganizationInvitationEmailInput): Promise<SendClinicOrganizationInvitationEmailResult> {
  const resendApiKey =
    process.env
      .RESEND_API_KEY;

  const resendFromEmail =
    process.env
      .RESEND_FROM_EMAIL;

  if (
    !resendApiKey ||
    !resendFromEmail
  ) {
    return {
      sent: false,
      providerMessageId:
        null,
      error:
        "Resend is not configured for Clinic Organisation invitations.",
    };
  }

  const displayName =
    [
      firstName,
      lastName,
    ]
      .filter(
        Boolean
      )
      .join(" ")
      .trim();

  const safeName =
    escapeHtml(
      displayName
    );

  const safeOrganizationName =
    escapeHtml(
      organizationName
    );

  const safeActionLink =
    escapeHtml(
      actionLink
    );

  const safeMessage =
    personalMessage
      ? escapeHtml(
          personalMessage
        )
      : null;

  const expiry =
    escapeHtml(
      formatExpiry(
        expiresAt,
        locale
      )
    );

  const resend =
    new Resend(
      resendApiKey
    );

  const subjects = {
    ro:
      `Invitație RomDoc pentru ${organizationName}`,
    en:
      `RomDoc invitation for ${organizationName}`,
    de:
      `RomDoc-Einladung für ${organizationName}`,
  } as const;

  const messageBlock =
    safeMessage
      ? `<div style="margin:18px 0;padding:16px;border-left:4px solid #036661;background:#f0eee9;white-space:pre-wrap;">${safeMessage}</div>`
      : "";

  const htmlByLocale = {
    ro: `
      <div style="font-family:Arial,sans-serif;line-height:1.65;color:#111827;max-width:640px;margin:0 auto;">
        <h1 style="font-size:24px;margin:0 0 18px;">Invitație RomDoc pentru organizația dumneavoastră</h1>
        <p>Bună ziua, ${safeName},</p>
        <p>Administratorul RomDoc a invitat organizația <strong>${safeOrganizationName}</strong> să își activeze contul de organizație clinică.</p>
        ${messageBlock}
        <p>Invitația include o <strong>perioadă de test de ${trialMonths} luni</strong>. Perioada de test începe numai în momentul în care acceptați invitația și activați contul.</p>
        <p style="margin:24px 0;">
          <a href="${safeActionLink}" style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:13px 21px;border-radius:13px;font-weight:700;">
            Acceptă invitația
          </a>
        </p>
        <p>Linkul de activare expiră la <strong>${expiry}</strong>. Expirarea linkului nu consumă din perioada de test.</p>
        <p style="font-size:13px;color:#4b5563;">Dacă butonul nu funcționează, copiați linkul de mai jos în browser:</p>
        <p style="font-size:13px;word-break:break-all;color:#036661;">${safeActionLink}</p>
        <p style="font-size:13px;color:#4b5563;">Dacă nu vă așteptați la această invitație, puteți ignora mesajul.</p>
      </div>
    `,
    en: `
      <div style="font-family:Arial,sans-serif;line-height:1.65;color:#111827;max-width:640px;margin:0 auto;">
        <h1 style="font-size:24px;margin:0 0 18px;">RomDoc invitation for your organisation</h1>
        <p>Hello ${safeName},</p>
        <p>A RomDoc administrator invited <strong>${safeOrganizationName}</strong> to activate a clinic organisation account.</p>
        ${messageBlock}
        <p>The invitation includes a <strong>${trialMonths}-month trial</strong>. The trial starts only when you accept the invitation and activate the account.</p>
        <p style="margin:24px 0;">
          <a href="${safeActionLink}" style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:13px 21px;border-radius:13px;font-weight:700;">
            Accept invitation
          </a>
        </p>
        <p>The activation link expires on <strong>${expiry}</strong>. Link expiry does not consume any of the trial period.</p>
        <p style="font-size:13px;color:#4b5563;">If the button does not work, copy the link below into your browser:</p>
        <p style="font-size:13px;word-break:break-all;color:#036661;">${safeActionLink}</p>
        <p style="font-size:13px;color:#4b5563;">If you were not expecting this invitation, you can ignore this message.</p>
      </div>
    `,
    de: `
      <div style="font-family:Arial,sans-serif;line-height:1.65;color:#111827;max-width:640px;margin:0 auto;">
        <h1 style="font-size:24px;margin:0 0 18px;">RomDoc-Einladung für Ihre Organisation</h1>
        <p>Guten Tag ${safeName},</p>
        <p>Ein RomDoc-Administrator hat <strong>${safeOrganizationName}</strong> eingeladen, ein Klinikorganisationskonto zu aktivieren.</p>
        ${messageBlock}
        <p>Die Einladung umfasst eine <strong>Testphase von ${trialMonths} Monaten</strong>. Die Testphase beginnt erst, wenn Sie die Einladung annehmen und das Konto aktivieren.</p>
        <p style="margin:24px 0;">
          <a href="${safeActionLink}" style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:13px 21px;border-radius:13px;font-weight:700;">
            Einladung annehmen
          </a>
        </p>
        <p>Der Aktivierungslink läuft am <strong>${expiry}</strong> ab. Der Ablauf des Links verkürzt die Testphase nicht.</p>
        <p style="font-size:13px;color:#4b5563;">Falls die Schaltfläche nicht funktioniert, kopieren Sie den folgenden Link in Ihren Browser:</p>
        <p style="font-size:13px;word-break:break-all;color:#036661;">${safeActionLink}</p>
        <p style="font-size:13px;color:#4b5563;">Wenn Sie diese Einladung nicht erwartet haben, können Sie diese Nachricht ignorieren.</p>
      </div>
    `,
  } as const;

  const {
    data,
    error,
  } =
    await resend.emails.send({
      from:
        resendFromEmail,
      to:
        email,
      replyTo:
        process.env
          .ROMDOC_CLINIC_RELATIONS_EMAIL ??
        "admin@romdoc.fit",
      subject:
        subjects[
          locale
        ],
      html:
        htmlByLocale[
          locale
        ],
    });

  if (error) {
    console.error(
      "Clinic Organisation invitation email failed:",
      error
    );

    return {
      sent: false,
      providerMessageId:
        null,
      error:
        "The Clinic Organisation invitation email could not be sent.",
    };
  }

  return {
    sent: true,
    providerMessageId:
      data?.id ??
      null,
    error:
      null,
  };
}
