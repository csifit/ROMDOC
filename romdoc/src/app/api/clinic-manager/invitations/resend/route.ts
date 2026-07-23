import crypto from "node:crypto";

import {
  NextRequest,
} from "next/server";

import {
  stableApiError,
  stableApiSuccess,
} from "@/lib/api/stable-api-response";
import {
  sendClinicDoctorInvitationEmail,
} from "@/lib/clinic-organizations/clinic-doctor-invitation-email";
import {
  type AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getRequestAppLocale,
} from "@/lib/i18n/request-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

const CODES = {
  invalidJson:
    "invalid_json",
  authenticationRequired:
    "authentication_required",
  clinicManagerRequired:
    "clinic_manager_required",
  activeManagerRequired:
    "active_manager_required",
  invitationRequired:
    "invitation_required",
  invitationNotFound:
    "invitation_not_found",
  organizationAccessDenied:
    "organization_access_denied",
  organizationNotActive:
    "organization_not_active",
  invitationResendNotAllowed:
    "invitation_resend_not_allowed",
  invitationUpdateFailed:
    "invitation_update_failed",
  invitationResent:
    "invitation_resent",
  invitationResentEmailFailed:
    "invitation_resent_email_failed",
} as const;

type Code =
  (typeof CODES)[keyof typeof CODES];

type ResendInvitationBody = {
  invitationId?: unknown;
  locale?: unknown;
};

type InvitationRow = {
  id: string;
  organization_id: string;
  invited_doctor_email:
    | string
    | null;
  invitation_status: string;
};

const COPY:
  Record<
    AppLocale,
    Record<Code, string>
  > = {
    ro: {
      invalid_json:
        "Cererea nu conține date JSON valide.",
      authentication_required:
        "Trebuie să fii autentificat.",
      clinic_manager_required:
        "Doar un Clinic Manager poate retrimite invitații.",
      active_manager_required:
        "Contul Clinic Manager trebuie să fie activ.",
      invitation_required:
        "Selectează invitația care trebuie retrimisă.",
      invitation_not_found:
        "Invitația nu a fost găsită.",
      organization_access_denied:
        "Nu ai acces la organizația acestei invitații.",
      organization_not_active:
        "Organizația clinicii nu este activă.",
      invitation_resend_not_allowed:
        "Pot fi retrimise numai invitațiile în așteptare sau expirate.",
      invitation_update_failed:
        "Invitația nu a putut fi actualizată.",
      invitation_resent:
        "Invitația a fost actualizată și retrimisă medicului.",
      invitation_resent_email_failed:
        "Invitația a fost actualizată, dar e-mailul nu a putut fi trimis. Poți copia noul link.",
    },
    en: {
      invalid_json:
        "The request does not contain valid JSON.",
      authentication_required:
        "You must be signed in.",
      clinic_manager_required:
        "Only a Clinic Manager can resend invitations.",
      active_manager_required:
        "The Clinic Manager account must be active.",
      invitation_required:
        "Select the invitation that must be resent.",
      invitation_not_found:
        "The invitation was not found.",
      organization_access_denied:
        "You do not have access to the organisation for this invitation.",
      organization_not_active:
        "The clinic organisation is not active.",
      invitation_resend_not_allowed:
        "Only pending or expired invitations can be resent.",
      invitation_update_failed:
        "The invitation could not be updated.",
      invitation_resent:
        "The invitation was updated and resent to the Doctor.",
      invitation_resent_email_failed:
        "The invitation was updated, but the email could not be sent. You can copy the new link.",
    },
    de: {
      invalid_json:
        "Die Anfrage enthält keine gültigen JSON-Daten.",
      authentication_required:
        "Sie müssen angemeldet sein.",
      clinic_manager_required:
        "Nur ein Klinikmanager kann Einladungen erneut senden.",
      active_manager_required:
        "Das Klinikmanager-Konto muss aktiv sein.",
      invitation_required:
        "Wählen Sie die Einladung aus, die erneut gesendet werden soll.",
      invitation_not_found:
        "Die Einladung wurde nicht gefunden.",
      organization_access_denied:
        "Sie haben keinen Zugriff auf die Organisation dieser Einladung.",
      organization_not_active:
        "Die Klinikorganisation ist nicht aktiv.",
      invitation_resend_not_allowed:
        "Nur ausstehende oder abgelaufene Einladungen können erneut gesendet werden.",
      invitation_update_failed:
        "Die Einladung konnte nicht aktualisiert werden.",
      invitation_resent:
        "Die Einladung wurde aktualisiert und erneut an den Arzt gesendet.",
      invitation_resent_email_failed:
        "Die Einladung wurde aktualisiert, aber die E-Mail konnte nicht gesendet werden. Sie können den neuen Link kopieren.",
    },
  };

function normalizeString(
  value: unknown,
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
  token: string
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

function errorResponse(
  locale: AppLocale,
  code: Code,
  status: number
) {
  return stableApiError(
    code,
    COPY[locale][code],
    status
  );
}

export async function PATCH(
  request:
    NextRequest
): Promise<Response> {
  let body:
    ResendInvitationBody;

  try {
    body =
      (await request
        .json()) as
        ResendInvitationBody;
  } catch {
    const locale =
      getRequestAppLocale(
        request
      );

    return errorResponse(
      locale,
      CODES.invalidJson,
      400
    );
  }

  const locale =
    getRequestAppLocale(
      request,
      body.locale
    );

  const invitationId =
    normalizeString(
      body.invitationId,
      100
    );

  if (!invitationId) {
    return errorResponse(
      locale,
      CODES.invitationRequired,
      400
    );
  }

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
    return errorResponse(
      locale,
      CODES.authenticationRequired,
      401
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
      "clinic_manager"
  ) {
    return errorResponse(
      locale,
      CODES.clinicManagerRequired,
      403
    );
  }

  if (
    profile.account_status !==
      "active"
  ) {
    return errorResponse(
      locale,
      CODES.activeManagerRequired,
      403
    );
  }

  const {
    data:
      invitationData,
    error:
      invitationError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .select(`
        id,
        organization_id,
        invited_doctor_email,
        invitation_status
      `)
      .eq(
        "id",
        invitationId
      )
      .maybeSingle();

  const invitation =
    invitationData as
      | InvitationRow
      | null;

  if (
    invitationError ||
    !invitation
  ) {
    return errorResponse(
      locale,
      CODES.invitationNotFound,
      invitationError
        ? 500
        : 404
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
        "id"
      )
      .eq(
        "organization_id",
        invitation
          .organization_id
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
    return errorResponse(
      locale,
      CODES.organizationAccessDenied,
      403
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
        invitation
          .organization_id
      )
      .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    return errorResponse(
      locale,
      CODES.organizationAccessDenied,
      404
    );
  }

  if (
    organization.status !==
      "active"
  ) {
    return errorResponse(
      locale,
      CODES.organizationNotActive,
      409
    );
  }

  if (
    ![
      "pending",
      "expired",
    ].includes(
      invitation
        .invitation_status
    )
  ) {
    return errorResponse(
      locale,
      CODES.invitationResendNotAllowed,
      409
    );
  }

  const doctorEmail =
    invitation
      .invited_doctor_email
      ?.trim()
      .toLowerCase();

  if (!doctorEmail) {
    return errorResponse(
      locale,
      CODES.invitationNotFound,
      409
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

  const {
    data:
      updatedInvitation,
    error:
      updateError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .update({
        invitation_token_hash:
          invitationTokenHash,
        invitation_status:
          "pending",
        expires_at:
          expiresAt
            .toISOString(),
      })
      .eq(
        "id",
        invitation.id
      )
      .select(`
        id,
        organization_id,
        invited_doctor_email,
        invitation_status,
        expires_at,
        updated_at
      `)
      .maybeSingle();

  if (
    updateError ||
    !updatedInvitation
  ) {
    console.error(
      "Clinic Doctor invitation resend update failed:",
      updateError
    );

    return errorResponse(
      locale,
      CODES.invitationUpdateFailed,
      500
    );
  }

  const baseUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    request.nextUrl
      .origin;

  const inviteUrl =
    new URL(
      `/${locale}/clinic-doctor-register`,
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

  const emailResult =
    await sendClinicDoctorInvitationEmail({
      doctorEmail,
      organizationName:
        organization.name,
      inviteUrl:
        inviteUrl.toString(),
      locale,
    });

  const code =
    emailResult.sent
      ? CODES.invitationResent
      : CODES
          .invitationResentEmailFailed;

  return stableApiSuccess(
    code,
    {
      message:
        COPY[locale][code],
      invitation:
        updatedInvitation,
      inviteUrl:
        inviteUrl.toString(),
      emailSent:
        emailResult.sent,
      emailError:
        emailResult.error,
    }
  );
}
