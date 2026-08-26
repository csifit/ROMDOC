import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getDoctorInvitationExpiryDate,
  getDoctorInvitationRedirectUrl,
  getSafeInvitationFailure,
  validateDoctorInvitationInput,
} from "@/lib/admin/doctor-invitations";
import { sendDoctorInvitationEmail } from "@/lib/admin/send-doctor-invitation-email";
import {
  PLATFORM_OPERATOR_DOCTOR_CODES as CODE,
} from "@/lib/api/platform-operator-doctor-codes";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type DoctorInvitationOtpType = "invite" | "magiclink";

type DoctorInvitationRow = {
  id: string;
  email: string;
  normalized_email: string;
  first_name: string;
  last_name: string;
  locale: "ro" | "en";
  personal_message: string | null;
  complimentary_months: number;
  status:
    | "draft"
    | "sent"
    | "accepted"
    | "expired"
    | "cancelled"
    | "failed";
  invited_by_profile_id: string;
  auth_user_id: string | null;
  accepted_profile_id: string | null;
  doctor_id: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  resend_count: number;
  last_resent_at: string | null;
  last_resend_failure_at: string | null;
  last_resend_failure_code: string | null;
  last_resend_failure_message: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function failure(
  code: string,
  error: string,
  status: number,
  extra: Record<string, unknown> = {}
) {
  return json(
    {
      code,
      error,
      ...extra,
    },
    status
  );
}

function getValidationCode(field: string | undefined) {
  switch (field) {
    case "email":
      return CODE.doctorInvitationEmailInvalid;
    case "firstName":
      return CODE.doctorInvitationFirstNameRequired;
    case "lastName":
      return CODE.doctorInvitationLastNameRequired;
    case "personalMessage":
      return CODE.doctorInvitationMessageInvalid;
    case "complimentaryMonths":
      return CODE.doctorInvitationMonthsInvalid;
    default:
      return CODE.doctorInvitationInvalidPayload;
  }
}

function buildDoctorInvitationVerificationLink(
  redirectTo: string,
  hashedToken: string,
  otpType: DoctorInvitationOtpType
) {
  const verificationUrl = new URL(redirectTo);

  verificationUrl.searchParams.set(
    "token_hash",
    hashedToken
  );
  verificationUrl.searchParams.set(
    "type",
    otpType
  );

  return verificationUrl.toString();
}

export async function GET(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot consulta invitațiile medicilor."
  );

  if (adminOnly) {
    return adminOnly;
  }

  const requestedStatus =
    request.nextUrl.searchParams.get("status")?.trim() ?? "";

  const allowedStatuses = new Set([
    "draft",
    "sent",
    "accepted",
    "expired",
    "cancelled",
    "failed",
  ]);

  if (requestedStatus && !allowedStatuses.has(requestedStatus)) {
    return failure(
      CODE.doctorInvitationStatusFilterInvalid,
      "Filtrul de statut nu este valid.",
      400
    );
  }

  const admin = createAdminClient();

  let query = admin
    .from("doctor_invitations")
    .select(`
      id,
      email,
      normalized_email,
      first_name,
      last_name,
      locale,
      personal_message,
      complimentary_months,
      status,
      invited_by_profile_id,
      auth_user_id,
      accepted_profile_id,
      doctor_id,
      sent_at,
      accepted_at,
      expires_at,
      cancelled_at,
      resend_count,
      last_resent_at,
      last_resend_failure_at,
      last_resend_failure_code,
      last_resend_failure_message,
      failure_code,
      failure_message,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (requestedStatus) {
    query = query.eq("status", requestedStatus);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Doctor invitations query failed:", error);

    return failure(
      CODE.doctorInvitationsLoadFailed,
      "Invitațiile medicilor nu au putut fi încărcate.",
      500
    );
  }

  return json({
    code: CODE.doctorInvitationsLoaded,
    invitations: (data ?? []) as DoctorInvitationRow[],
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot invita medici."
  );

  if (adminOnly) {
    return adminOnly;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return failure(
      CODE.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const validation = validateDoctorInvitationInput(body);

  if (!validation.ok) {
    return failure(
      getValidationCode(validation.field),
      validation.error,
      400,
      {
        field: validation.field ?? null,
      }
    );
  }

  const input = validation.value;
  const admin = createAdminClient();

  const {
    data: existingInvitation,
    error: existingInvitationError,
  } = await admin
    .from("doctor_invitations")
    .select("id, status, created_at")
    .eq("normalized_email", input.email)
    .in("status", ["draft", "sent"])
    .maybeSingle();

  if (existingInvitationError) {
    console.error(
      "Doctor invitation duplicate check failed:",
      existingInvitationError
    );

    return failure(
      CODE.doctorInvitationCheckFailed,
      "Invitația nu a putut fi verificată.",
      500
    );
  }

  if (existingInvitation) {
    return failure(
      CODE.doctorInvitationExists,
      "Există deja o invitație activă pentru această adresă de e-mail.",
      409,
      {
        invitationId: existingInvitation.id,
      }
    );
  }

  const expiresAt = getDoctorInvitationExpiryDate();

  const {
    data: invitation,
    error: invitationInsertError,
  } = await admin
    .from("doctor_invitations")
    .insert({
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      locale: input.locale,
      personal_message: input.personalMessage,
      complimentary_months: input.complimentaryMonths,
      status: "draft",
      invited_by_profile_id: authorization.profileId,
      redirect_path: "/auth/doctor-invitation",
      expires_at: expiresAt,
    })
    .select(`
      id,
      email,
      first_name,
      last_name,
      locale,
      personal_message,
      complimentary_months,
      status,
      invited_by_profile_id,
      expires_at,
      created_at,
      updated_at
    `)
    .single();

  if (invitationInsertError || !invitation) {
    console.error(
      "Doctor invitation insert failed:",
      invitationInsertError
    );

    const duplicate = invitationInsertError?.code === "23505";

    return failure(
      duplicate
        ? CODE.doctorInvitationExists
        : CODE.doctorInvitationCreateFailed,
      duplicate
        ? "Există deja o invitație activă pentru această adresă de e-mail."
        : "Invitația medicului nu a putut fi creată.",
      duplicate ? 409 : 500
    );
  }

  const { error: createdEventError } = await admin
    .from("doctor_invitation_events")
    .insert({
      invitation_id: invitation.id,
      actor_profile_id: authorization.profileId,
      event_type: "invitation_created",
      event_data: {
        locale: input.locale,
        complimentaryMonths: input.complimentaryMonths,
        hasPersonalMessage: Boolean(input.personalMessage),
      },
    });

  if (createdEventError) {
    console.error(
      "Doctor invitation created-event insert failed:",
      createdEventError
    );
  }

  let redirectTo: string;

  try {
    redirectTo = getDoctorInvitationRedirectUrl();
  } catch (configurationError) {
    const safeFailure = getSafeInvitationFailure(configurationError);

    await admin
      .from("doctor_invitations")
      .update({
        status: "failed",
        failure_code: safeFailure.code,
        failure_message: safeFailure.message,
      })
      .eq("id", invitation.id);

    await admin.from("doctor_invitation_events").insert({
      invitation_id: invitation.id,
      actor_profile_id: authorization.profileId,
      event_type: "invitation_send_failed",
      event_data: {
        code: safeFailure.code,
      },
      reason: safeFailure.message,
    });

    console.error(
      "Doctor invitation configuration failed:",
      configurationError
    );

    return failure(
      CODE.doctorInvitationSiteUrlMissing,
      "Invitația a fost înregistrată, dar configurația URL-ului aplicației lipsește.",
      500,
      {
        invitationId: invitation.id,
      }
    );
  }

  const {
    data: linkData,
    error: linkError,
  } = await admin.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: {
      redirectTo,
      data: {
        invitation_type: "doctor",
        doctor_invitation_id: invitation.id,
        first_name: input.firstName,
        last_name: input.lastName,
        locale: input.locale,
        personal_message: input.personalMessage,
        complimentary_months: input.complimentaryMonths,
      },
    },
  });

  const hashedToken =
    linkData?.properties?.hashed_token?.trim() ?? "";
  const authUserId = linkData?.user?.id ?? null;

  if (linkError || !hashedToken || !authUserId) {
    const safeFailure = getSafeInvitationFailure(
      linkError ?? new Error("Supabase did not return an invitation token.")
    );

    await admin
      .from("doctor_invitations")
      .update({
        status: "failed",
        auth_user_id: authUserId,
        failure_code: safeFailure.code,
        failure_message: safeFailure.message,
      })
      .eq("id", invitation.id);

    await admin.from("doctor_invitation_events").insert({
      invitation_id: invitation.id,
      actor_profile_id: authorization.profileId,
      event_type: "invitation_send_failed",
      event_data: {
        code: safeFailure.code,
      },
      reason: safeFailure.message,
    });

    console.error("Supabase doctor invitation token failed:", linkError);

    return failure(
      CODE.doctorInvitationSendFailed,
      "Invitația a fost înregistrată, dar linkul securizat nu a putut fi creat.",
      502,
      {
        invitationId: invitation.id,
      }
    );
  }

  const actionLink =
    buildDoctorInvitationVerificationLink(
      redirectTo,
      hashedToken,
      "invite"
    );

  const { error: linkStoreError } = await admin
    .from("doctor_invitations")
    .update({
      auth_user_id: authUserId,
      invitation_action_link: actionLink,
    })
    .eq("id", invitation.id);

  if (linkStoreError) {
    console.error(
      "Doctor invitation link storage failed:",
      linkStoreError
    );

    return failure(
      CODE.doctorInvitationStateUpdateFailed,
      "Linkul a fost creat, dar nu a putut fi salvat în siguranță.",
      500,
      {
        invitationId: invitation.id,
      }
    );
  }

  const emailResult = await sendDoctorInvitationEmail({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    locale: input.locale,
    personalMessage: input.personalMessage,
    complimentaryMonths: input.complimentaryMonths,
    expiresAt,
    actionLink,
  });

  if (!emailResult.sent) {
    const safeFailure = getSafeInvitationFailure(
      new Error(emailResult.error)
    );

    await admin
      .from("doctor_invitations")
      .update({
        status: "failed",
        failure_code: safeFailure.code,
        failure_message: safeFailure.message,
      })
      .eq("id", invitation.id);

    await admin.from("doctor_invitation_events").insert({
      invitation_id: invitation.id,
      actor_profile_id: authorization.profileId,
      event_type: "invitation_send_failed",
      event_data: {
        code: safeFailure.code,
      },
      reason: safeFailure.message,
    });

    return failure(
      CODE.doctorInvitationSendFailed,
      "Invitația a fost înregistrată, dar e-mailul nu a putut fi trimis.",
      502,
      {
        invitationId: invitation.id,
      }
    );
  }

  const sentAt = new Date().toISOString();

  const {
    data: sentInvitation,
    error: sentUpdateError,
  } = await admin
    .from("doctor_invitations")
    .update({
      status: "sent",
      auth_user_id: authUserId,
      provider_message_id: emailResult.providerMessageId,
      sent_at: sentAt,
      failure_code: null,
      failure_message: null,
    })
    .eq("id", invitation.id)
    .select(`
      id,
      email,
      first_name,
      last_name,
      locale,
      personal_message,
      complimentary_months,
      status,
      invited_by_profile_id,
      auth_user_id,
      sent_at,
      expires_at,
      resend_count,
      last_resent_at,
      last_resend_failure_at,
      last_resend_failure_code,
      last_resend_failure_message,
      created_at,
      updated_at
    `)
    .single();

  if (sentUpdateError || !sentInvitation) {
    console.error(
      "Doctor invitation sent-status update failed:",
      sentUpdateError
    );

    return failure(
      CODE.doctorInvitationStateUpdateFailed,
      "E-mailul a fost trimis, dar starea internă nu a putut fi actualizată. Verifică invitația înainte de retrimitere.",
      500,
      {
        invitationId: invitation.id,
      }
    );
  }

  const { error: sentEventError } = await admin
    .from("doctor_invitation_events")
    .insert({
      invitation_id: invitation.id,
      actor_profile_id: authorization.profileId,
      event_type: "invitation_sent",
      event_data: {
        authUserId,
        redirectTo,
        expiresAt,
        providerMessageId: emailResult.providerMessageId,
        manualLinkAvailable: true,
        linkType: "invite",
      },
    });

  if (sentEventError) {
    console.error(
      "Doctor invitation sent-event insert failed:",
      sentEventError
    );
  }

  return json(
    {
      code: CODE.doctorInvitationSent,
      message: "Invitația medicului a fost trimisă.",
      invitation: sentInvitation,
    },
    201
  );
}
