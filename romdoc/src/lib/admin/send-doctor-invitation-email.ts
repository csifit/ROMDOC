import { Resend } from "resend";

type DoctorInvitationLocale = "ro" | "en";

type SendDoctorInvitationEmailInput = {
  email: string;
  firstName: string;
  lastName: string;
  locale: DoctorInvitationLocale;
  personalMessage: string | null;
  complimentaryMonths: number;
  expiresAt: string;
  actionLink: string;
};

type SendDoctorInvitationEmailResult =
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatExpiry(value: string, locale: DoctorInvitationLocale) {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

export async function sendDoctorInvitationEmail({
  email,
  firstName,
  lastName,
  locale,
  personalMessage,
  complimentaryMonths,
  expiresAt,
  actionLink,
}: SendDoctorInvitationEmailInput): Promise<SendDoctorInvitationEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    return {
      sent: false,
      providerMessageId: null,
      error: "Resend is not configured for doctor invitations.",
    };
  }

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    (locale === "ro" ? "Doctore" : "Doctor");
  const safeActionLink = escapeHtml(actionLink);
  const safeName = escapeHtml(displayName);
  const safeMessage = personalMessage ? escapeHtml(personalMessage) : null;
  const expiry = escapeHtml(formatExpiry(expiresAt, locale));
  const resend = new Resend(resendApiKey);

  const subject =
    locale === "ro"
      ? "Invitație pentru a vă alătura platformei RomDoc"
      : "Invitation to join RomDoc";

  const html =
    locale === "ro"
      ? `
        <div style="font-family:Arial,sans-serif;line-height:1.65;color:#111827;max-width:640px;margin:0 auto;">
          <h1 style="font-size:24px;margin:0 0 18px;">Invitație RomDoc</h1>
          <p>Bună ziua, ${safeName},</p>
          <p>Ați fost invitat(ă) de administratorul RomDoc să creați un cont de medic.</p>
          ${
            safeMessage
              ? `<div style="margin:18px 0;padding:16px;border-left:4px solid #036661;background:#f0eee9;white-space:pre-wrap;">${safeMessage}</div>`
              : ""
          }
          <p>Invitația include <strong>${complimentaryMonths} luni de acces gratuit</strong>.</p>
          <p style="margin:24px 0;">
            <a href="${safeActionLink}" style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:13px 21px;border-radius:13px;font-weight:700;">
              Acceptă invitația
            </a>
          </p>
          <p>Linkul expiră la <strong>${expiry}</strong>.</p>
          <p style="font-size:13px;color:#4b5563;">Dacă butonul nu funcționează, copiați linkul de mai jos în browser:</p>
          <p style="font-size:13px;word-break:break-all;color:#036661;">${safeActionLink}</p>
          <p style="font-size:13px;color:#4b5563;">Dacă nu ați solicitat această invitație, puteți ignora mesajul.</p>
        </div>
      `
      : `
        <div style="font-family:Arial,sans-serif;line-height:1.65;color:#111827;max-width:640px;margin:0 auto;">
          <h1 style="font-size:24px;margin:0 0 18px;">RomDoc invitation</h1>
          <p>Hello ${safeName},</p>
          <p>A RomDoc administrator invited you to create a doctor account.</p>
          ${
            safeMessage
              ? `<div style="margin:18px 0;padding:16px;border-left:4px solid #036661;background:#f0eee9;white-space:pre-wrap;">${safeMessage}</div>`
              : ""
          }
          <p>The invitation includes <strong>${complimentaryMonths} complimentary months</strong>.</p>
          <p style="margin:24px 0;">
            <a href="${safeActionLink}" style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:13px 21px;border-radius:13px;font-weight:700;">
              Accept invitation
            </a>
          </p>
          <p>The link expires on <strong>${expiry}</strong>.</p>
          <p style="font-size:13px;color:#4b5563;">If the button does not work, copy the link below into your browser:</p>
          <p style="font-size:13px;word-break:break-all;color:#036661;">${safeActionLink}</p>
          <p style="font-size:13px;color:#4b5563;">If you were not expecting this invitation, you can ignore this message.</p>
        </div>
      `;

  const { data, error } = await resend.emails.send({
    from: resendFromEmail,
    to: email,
    replyTo: process.env.ROMDOC_DOCTOR_RELATIONS_EMAIL ?? "medici@romdoc.fit",
    subject,
    html,
  });

  if (error) {
    console.error("Doctor invitation email failed:", error);

    return {
      sent: false,
      providerMessageId: null,
      error: "The doctor invitation email could not be sent.",
    };
  }

  return {
    sent: true,
    providerMessageId: data?.id ?? null,
    error: null,
  };
}
