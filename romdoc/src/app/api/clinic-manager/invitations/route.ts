import crypto from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  Resend,
} from "resend";

import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type InvitationRequestBody = {
  organizationId?: unknown;
  doctorEmail?: unknown;
  locale?: unknown;
};

type EmailSendResult = {
  sent: boolean;

  error:
    | string
    | null;
};

type InvitationCopy = {
  subject:
    (
      organization:
        string
    ) =>
      string;

  greeting: string;

  introduction:
    (
      organization:
        string
    ) =>
      string;

  subscription: string;
  continue: string;
  ignore: string;
  team: string;
  heading: string;
  button: string;
  linkFallback: string;
  authRequired: string;
  permissionDenied: string;
  invalidJson: string;
  organizationRequired: string;
  emailInvalid: string;
  organizationAccessDenied: string;
  organizationNotFound: string;
  organizationInactive: string;
  invitationCheckFailed: string;
  duplicateInvitation: string;
  invitationCreateFailed: string;
  invitationSent: string;
  invitationCreatedWithoutEmail: string;
};

const COPY:
  Record<
    AppLocale,
    InvitationCopy
  > = {
    ro: {
      subject:
        (
          organization
        ) =>
          `${organization} te invită pe RomDoc`,

      greeting:
        "Bună ziua,",

      introduction:
        (
          organization
        ) =>
          `${organization} te-a invitat să îți creezi un cont de medic pe RomDoc.`,

      subscription:
        "Abonamentul acestui cont RomDoc va fi acoperit de clinică. Nu trebuie să activezi un abonament Stripe individual.",

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

      authRequired:
        "Trebuie să fii autentificat.",

      permissionDenied:
        "Nu ai permisiunea necesară.",

      invalidJson:
        "Cererea nu conține date JSON valide.",

      organizationRequired:
        "Selectează organizația clinicii.",

      emailInvalid:
        "Introdu o adresă de e-mail validă pentru medic.",

      organizationAccessDenied:
        "Nu ai acces la această organizație de clinică.",

      organizationNotFound:
        "Organizația clinicii nu a fost găsită.",

      organizationInactive:
        "Poți invita medici doar după ce organizația clinicii este activă.",

      invitationCheckFailed:
        "Invitația nu a putut fi verificată.",

      duplicateInvitation:
        "Există deja o invitație activă sau acceptată pentru acest medic în această organizație.",

      invitationCreateFailed:
        "Invitația nu a putut fi creată.",

      invitationSent:
        "Invitația a fost creată și trimisă medicului.",

      invitationCreatedWithoutEmail:
        "Invitația a fost creată. E-mailul nu a fost trimis automat, dar poți copia linkul de invitație.",
    },

    en: {
      subject:
        (
          organization
        ) =>
          `${organization} invited you to RomDoc`,

      greeting:
        "Hello,",

      introduction:
        (
          organization
        ) =>
          `${organization} invited you to create a doctor account on RomDoc.`,

      subscription:
        "The clinic will cover the subscription for this RomDoc account. You do not need to activate an individual Stripe subscription.",

      continue:
        "Open the link below to continue:",

      ignore:
        "You can ignore this message when you were not expecting this invitation.",

      team:
        "The RomDoc team",

      heading:
        "RomDoc invitation",

      button:
        "Create doctor account",

      linkFallback:
        "When the button does not work, copy this link into your browser:",

      authRequired:
        "You must be signed in.",

      permissionDenied:
        "You do not have the required permission.",

      invalidJson:
        "The request does not contain valid JSON data.",

      organizationRequired:
        "Select the clinic organisation.",

      emailInvalid:
        "Enter a valid email address for the doctor.",

      organizationAccessDenied:
        "You do not have access to this clinic organisation.",

      organizationNotFound:
        "The clinic organisation was not found.",

      organizationInactive:
        "Doctors can only be invited after the clinic organisation is active.",

      invitationCheckFailed:
        "The invitation could not be checked.",

      duplicateInvitation:
        "An active or accepted invitation already exists for this doctor in this organisation.",

      invitationCreateFailed:
        "The invitation could not be created.",

      invitationSent:
        "The invitation was created and sent to the doctor.",

      invitationCreatedWithoutEmail:
        "The invitation was created. The email was not sent automatically, but you can copy the invitation link.",
    },

    de: {
      subject:
        (
          organization
        ) =>
          `${organization} lädt Sie zu RomDoc ein`,

      greeting:
        "Guten Tag,",

      introduction:
        (
          organization
        ) =>
          `${organization} hat Sie eingeladen, ein Arztkonto bei RomDoc zu erstellen.`,

      subscription:
        "Die Klinik übernimmt das Abonnement für dieses RomDoc-Konto. Sie müssen kein individuelles Stripe-Abonnement aktivieren.",

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

      authRequired:
        "Sie müssen angemeldet sein.",

      permissionDenied:
        "Sie verfügen nicht über die erforderliche Berechtigung.",

      invalidJson:
        "Die Anfrage enthält keine gültigen JSON-Daten.",

      organizationRequired:
        "Wählen Sie die Klinikorganisation aus.",

      emailInvalid:
        "Geben Sie eine gültige E-Mail-Adresse für den Arzt ein.",

      organizationAccessDenied:
        "Sie haben keinen Zugriff auf diese Klinikorganisation.",

      organizationNotFound:
        "Die Klinikorganisation wurde nicht gefunden.",

      organizationInactive:
        "Ärzte können erst eingeladen werden, nachdem die Klinikorganisation aktiv ist.",

      invitationCheckFailed:
        "Die Einladung konnte nicht geprüft werden.",

      duplicateInvitation:
        "Für diesen Arzt existiert in dieser Organisation bereits eine aktive oder angenommene Einladung.",

      invitationCreateFailed:
        "Die Einladung konnte nicht erstellt werden.",

      invitationSent:
        "Die Einladung wurde erstellt und an den Arzt gesendet.",

      invitationCreatedWithoutEmail:
        "Die Einladung wurde erstellt. Die E-Mail wurde nicht automatisch gesendet, aber Sie können den Einladungslink kopieren.",
    },
  };

function normalizeString(
  value:
    unknown,
  maximumLength =
    500
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .slice(
          0,
          maximumLength
        )
    : "";
}

function normalizeEmail(
  value:
    unknown
) {
  return normalizeString(
    value,
    320
  ).toLowerCase();
}

function isValidEmail(
  value:
    string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function createInvitationToken() {
  return crypto
    .randomBytes(
      32
    )
    .toString(
      "base64url"
    );
}

function hashInvitationToken(
  token:
    string
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      token
    )
    .digest(
      "hex"
    );
}

function escapeHtml(
  value:
    string
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

async function sendInvitationEmail({
  doctorEmail,
  organizationName,
  inviteUrl,
  locale,
}: {
  doctorEmail: string;
  organizationName: string;
  inviteUrl: string;
  locale: AppLocale;
}): Promise<EmailSendResult> {
  const apiKey =
    process.env
      .RESEND_API_KEY;

  if (
    !apiKey
  ) {
    return {
      sent:
        false,

      error:
        "RESEND_API_KEY is not configured.",
    };
  }

  const copy =
    COPY[
      locale
    ];

  const resend =
    new Resend(
      apiKey
    );

  const fromAddress =
    process.env
      .RESEND_FROM ??
    "RomDoc <programari@romdoc.fit>";

  const safeOrganization =
    escapeHtml(
      organizationName
    );

  const safeInviteUrl =
    escapeHtml(
      inviteUrl
    );

  try {
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
                escapeHtml(
                  organizationName
                ),
                `<strong>${safeOrganization}</strong>`
              )}</p>
              <p>${escapeHtml(
                copy.subscription
              )}</p>
              <p>
                <a href="${safeInviteUrl}" style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
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

    return {
      sent:
        true,

      error:
        null,
    };
  } catch (
    error
  ) {
    console.error(
      "Clinic doctor invitation email failed:",
      error
    );

    return {
      sent:
        false,

      error:
        error instanceof
          Error
          ? error.message
          : "Invitation email could not be sent.",
    };
  }
}

export async function POST(
  request:
    NextRequest
): Promise<Response> {
  let body:
    InvitationRequestBody;

  try {
    body =
      (await request
        .json()) as
        InvitationRequestBody;
  } catch {
    const copy =
      COPY.ro;

    return NextResponse.json(
      {
        error:
          copy.invalidJson,
      },
      {
        status:
          400,
      }
    );
  }

  const locale =
    normalizeAppLocale(
      normalizeString(
        body.locale,
        10
      )
    );

  const copy =
    COPY[
      locale
    ];

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    return NextResponse.json(
      {
        error:
          copy.authRequired,
      },
      {
        status:
          401,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await admin
      .from(
        "profiles"
      )
      .select(
        "role, account_status"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "clinic_manager" ||
    profile
      .account_status !==
      "active"
  ) {
    return NextResponse.json(
      {
        error:
          copy.permissionDenied,
      },
      {
        status:
          403,
      }
    );
  }

  const organizationId =
    normalizeString(
      body.organizationId,
      100
    );

  const doctorEmail =
    normalizeEmail(
      body.doctorEmail
    );

  if (
    !organizationId
  ) {
    return NextResponse.json(
      {
        error:
          copy.organizationRequired,
      },
      {
        status:
          400,
      }
    );
  }

  if (
    !isValidEmail(
      doctorEmail
    )
  ) {
    return NextResponse.json(
      {
        error:
          copy.emailInvalid,
      },
      {
        status:
          400,
      }
    );
  }

  const {
    data:
      membership,
    error:
      membershipError,
  } =
    await admin
      .from(
        "clinic_organization_members"
      )
      .select(
        "id, member_role, status"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "profile_id",
        user.id
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    return NextResponse.json(
      {
        error:
          copy.organizationAccessDenied,
      },
      {
        status:
          403,
      }
    );
  }

  const {
    data:
      organization,
    error:
      organizationError,
  } =
    await admin
      .from(
        "clinic_organizations"
      )
      .select(
        "id, name, status"
      )
      .eq(
        "id",
        organizationId
      )
      .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    return NextResponse.json(
      {
        error:
          copy.organizationNotFound,
      },
      {
        status:
          404,
      }
    );
  }

  if (
    organization.status !==
    "active"
  ) {
    return NextResponse.json(
      {
        error:
          copy.organizationInactive,
      },
      {
        status:
          409,
      }
    );
  }

  const {
    data:
      existingInvitation,
    error:
      existingInvitationError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .select(
        "id, invitation_status, coverage_status"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "invited_doctor_email",
        doctorEmail
      )
      .in(
        "invitation_status",
        [
          "pending",
          "accepted",
        ]
      )
      .maybeSingle();

  if (
    existingInvitationError
  ) {
    console.error(
      "Existing clinic doctor invitation query failed:",
      existingInvitationError
    );

    return NextResponse.json(
      {
        error:
          copy.invitationCheckFailed,
      },
      {
        status:
          500,
      }
    );
  }

  if (
    existingInvitation
  ) {
    return NextResponse.json(
      {
        error:
          copy.duplicateInvitation,
      },
      {
        status:
          409,
      }
    );
  }

  const invitationToken =
    createInvitationToken();

  const invitationTokenHash =
    hashInvitationToken(
      invitationToken
    );

  const expiresAt =
    new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      30
  );

  const baseUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    request.nextUrl
      .origin;

  const inviteUrl =
    new URL(
      "/clinic-doctor-register",
      baseUrl
    );

  inviteUrl.searchParams
    .set(
      "token",
      invitationToken
    );

  inviteUrl.searchParams
    .set(
      "email",
      doctorEmail
    );

  inviteUrl.searchParams
    .set(
      "locale",
      locale
    );

  const {
    data:
      invitation,
    error:
      invitationError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .insert({
        organization_id:
          organizationId,

        invited_doctor_email:
          doctorEmail,

        invitation_token_hash:
          invitationTokenHash,

        invitation_status:
          "pending",

        payment_responsibility:
          "clinic_paid",

        coverage_status:
          "none",

        invited_by_profile_id:
          user.id,

        expires_at:
          expiresAt.toISOString(),
      })
      .select(`
        id,
        organization_id,
        invited_doctor_email,
        invitation_status,
        payment_responsibility,
        coverage_status,
        expires_at,
        created_at
      `)
      .maybeSingle();

  if (
    invitationError ||
    !invitation
  ) {
    console.error(
      "Clinic doctor invitation insert failed:",
      invitationError
    );

    return NextResponse.json(
      {
        error:
          copy.invitationCreateFailed,
      },
      {
        status:
          500,
      }
    );
  }

  const emailResult =
    await sendInvitationEmail({
      doctorEmail,
      organizationName:
        organization.name,

      inviteUrl:
        inviteUrl.toString(),

      locale,
    });

  return NextResponse.json({
    invitation,

    inviteUrl:
      inviteUrl.toString(),

    emailSent:
      emailResult.sent,

    emailError:
      emailResult.error,

    message:
      emailResult.sent
        ? copy.invitationSent
        : copy.invitationCreatedWithoutEmail,
  });
}
