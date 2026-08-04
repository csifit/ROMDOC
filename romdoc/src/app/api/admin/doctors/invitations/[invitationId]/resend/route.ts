import {
  NextResponse,
} from "next/server";

import {
  getDoctorInvitationExpiryDate,
  getDoctorInvitationRedirectUrl,
  getSafeInvitationFailure,
} from "@/lib/admin/doctor-invitations";
import {
  sendDoctorInvitationEmail,
} from "@/lib/admin/send-doctor-invitation-email";
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

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

const RESENDABLE_STATUSES = new Set([
  "sent",
  "expired",
  "failed",
]);

type InvitationRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  locale: "ro" | "en";
  personal_message: string | null;
  complimentary_months: number;
  status: string;
  auth_user_id: string | null;
  accepted_profile_id: string | null;
  doctor_id: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  resend_count: number;
  last_resent_at: string | null;
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

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

async function recordResendFailure({
  invitationId,
  actorProfileId,
  error,
}: {
  invitationId: string;
  actorProfileId: string;
  error: unknown;
}) {
  const admin = createAdminClient();
  const safeFailure = getSafeInvitationFailure(error);
  const failedAt = new Date().toISOString();

  const { error: updateError } = await admin
    .from("doctor_invitations")
    .update({
      last_resend_failure_at: failedAt,
      last_resend_failure_code: safeFailure.code,
      last_resend_failure_message: safeFailure.message,
    })
    .eq("id", invitationId);

  if (updateError) {
    console.error(
      "Doctor invitation resend failure-state update failed:",
      updateError
    );
  }

  const { error: eventError } = await admin
    .from("doctor_invitation_events")
    .insert({
      invitation_id: invitationId,
      actor_profile_id: actorProfileId,
      event_type: "invitation_send_failed",
      event_data: {
        attemptType: "resend",
        code: safeFailure.code,
      },
      reason: safeFailure.message,
    });

  if (eventError) {
    console.error(
      "Doctor invitation resend failure-event insert failed:",
      eventError
    );
  }

  return safeFailure;
}

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      invitationId: string;
    }>;
  }
): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot retrimite invitațiile medicilor."
  );

  if (adminOnly) {
    return adminOnly;
  }

  const { invitationId } = await context.params;
  const normalizedInvitationId = invitationId.trim();

  if (!normalizedInvitationId) {
    return failure(
      "doctor_invitation_id_required",
      "Invitația lipsește.",
      400
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("doctor_invitations")
    .select(`
      id,
      email,
      first_name,
      last_name,
      locale,
      personal_message,
      complimentary_months,
      status,
      auth_user_id,
      accepted_profile_id,
      doctor_id,
      provider_message_id,
      sent_at,
      accepted_at,
      expires_at,
      cancelled_at,
      resend_count,
      last_resent_at
    `)
    .eq("id", normalizedInvitationId)
    .maybeSingle();

  if (error) {
    console.error("Doctor invitation resend query failed:", error);

    return failure(
      "doctor_invitation_resend_load_failed",
      "Invitația nu a putut fi încărcată.",
      500
    );
  }

  const invitation = data as InvitationRow | null;

  if (!invitation) {
    return failure(
      "doctor_invitation_not_found",
      "Invitația nu a fost găsită.",
      404
    );
  }

  if (
    invitation.status === "accepted" ||
    invitation.accepted_at ||
    invitation.accepted_profile_id ||
    invitation.doctor_id
  ) {
    return failure(
      "doctor_invitation_already_accepted",
      "Invitația a fost deja acceptată și nu poate fi retrimisă.",
      409
    );
  }

  if (invitation.status === "cancelled" || invitation.cancelled_at) {
    return failure(
      "doctor_invitation_cancelled",
      "Invitația anulată nu poate fi retrimisă.",
      409
    );
  }

  if (!RESENDABLE_STATUSES.has(invitation.status)) {
    return failure(
      "doctor_invitation_resend_not_allowed",
      "Invitația nu poate fi retrimisă în starea curentă.",
      409
    );
  }

  if (!invitation.auth_user_id) {
    return failure(
      "doctor_invitation_auth_user_missing",
      "Invitația nu are un utilizator Auth asociat. Creează o invitație nouă.",
      409
    );
  }

  const mostRecentSend = invitation.last_resent_at ?? invitation.sent_at;

  if (mostRecentSend) {
    const elapsed = Date.now() - new Date(mostRecentSend).getTime();

    if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - elapsed) / 1000
      );

      return failure(
        "doctor_invitation_resend_too_soon",
        "Invitația a fost trimisă recent. Așteaptă câteva minute înainte de retrimitere.",
        429,
        { retryAfterSeconds }
      );
    }
  }

  const {
    data: authUserResult,
    error: authUserError,
  } = await admin.auth.admin.getUserById(invitation.auth_user_id);

  const authUser = authUserResult?.user ?? null;

  if (authUserError || !authUser) {
    console.error(
      "Doctor invitation resend auth-user lookup failed:",
      authUserError
    );

    return failure(
      "doctor_invitation_auth_user_not_found",
      "Utilizatorul Auth al invitației nu a fost găsit. Creează o invitație nouă.",
      409
    );
  }

  if (normalizeEmail(authUser.email) !== normalizeEmail(invitation.email)) {
    return failure(
      "doctor_invitation_email_mismatch",
      "Adresa invitației nu corespunde utilizatorului Auth asociat.",
      409
    );
  }

  let redirectTo: string;

  try {
    redirectTo = getDoctorInvitationRedirectUrl();
  } catch (configurationError) {
    await recordResendFailure({
      invitationId: invitation.id,
      actorProfileId: authorization.profileId,
      error: configurationError,
    });

    return failure(
      "doctor_invitation_site_url_missing",
      "Configurația URL-ului aplicației lipsește.",
      500
    );
  }

  const metadata = {
    ...(authUser.user_metadata ?? {}),
    invitation_type: "doctor",
    doctor_invitation_id: invitation.id,
    first_name: invitation.first_name,
    last_name: invitation.last_name,
    locale: invitation.locale,
    personal_message: invitation.personal_message,
    complimentary_months: invitation.complimentary_months,
  };

  const { error: metadataError } = await admin.auth.admin.updateUserById(
    authUser.id,
    {
      user_metadata: metadata,
    }
  );

  if (metadataError) {
    await recordResendFailure({
      invitationId: invitation.id,
      actorProfileId: authorization.profileId,
      error: metadataError,
    });

    return failure(
      "doctor_invitation_metadata_update_failed",
      "Datele invitației nu au putut fi pregătite pentru retrimitere.",
      500
    );
  }

  const {
    data: linkData,
    error: linkError,
  } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: invitation.email,
    options: {
      redirectTo,
    },
  });

  const actionLink = linkData?.properties?.action_link ?? null;
  const generatedUserId = linkData?.user?.id ?? null;

  if (
    linkError ||
    !actionLink ||
    generatedUserId !== invitation.auth_user_id
  ) {
    const safeError =
      linkError ??
      new Error("Supabase did not return the expected resend link.");

    await recordResendFailure({
      invitationId: invitation.id,
      actorProfileId: authorization.profileId,
      error: safeError,
    });

    console.error("Doctor invitation resend link failed:", linkError);

    return failure(
      "doctor_invitation_resend_link_failed",
      "Noul link securizat nu a putut fi creat.",
      502
    );
  }

  const expiresAt = getDoctorInvitationExpiryDate();
  const emailResult = await sendDoctorInvitationEmail({
    email: invitation.email,
    firstName: invitation.first_name,
    lastName: invitation.last_name,
    locale: invitation.locale,
    personalMessage: invitation.personal_message,
    complimentaryMonths: invitation.complimentary_months,
    expiresAt,
    actionLink,
  });

  if (!emailResult.sent) {
    await recordResendFailure({
      invitationId: invitation.id,
      actorProfileId: authorization.profileId,
      error: new Error(emailResult.error),
    });

    return failure(
      "doctor_invitation_resend_email_failed",
      "Invitația nu a putut fi retrimisă prin e-mail. Linkul anterior nu a fost modificat.",
      502
    );
  }

  const resentAt = new Date().toISOString();
  const nextResendCount = invitation.resend_count + 1;

  const {
    data: updatedInvitation,
    error: updateError,
  } = await admin
    .from("doctor_invitations")
    .update({
      status: "sent",
      auth_user_id: invitation.auth_user_id,
      invitation_action_link: actionLink,
      provider_message_id: emailResult.providerMessageId,
      sent_at: resentAt,
      expires_at: expiresAt,
      resend_count: nextResendCount,
      last_resent_at: resentAt,
      last_resend_failure_at: null,
      last_resend_failure_code: null,
      last_resend_failure_message: null,
      failure_code: null,
      failure_message: null,
    })
    .eq("id", invitation.id)
    .in("status", ["sent", "expired", "failed"])
    .is("accepted_at", null)
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
    .maybeSingle();

  if (updateError || !updatedInvitation) {
    console.error(
      "Doctor invitation resend state update failed:",
      updateError
    );

    const { error: auditError } = await admin
      .from("doctor_invitation_events")
      .insert({
        invitation_id: invitation.id,
        actor_profile_id: authorization.profileId,
        event_type: "invitation_resent",
        event_data: {
          authUserId: invitation.auth_user_id,
          redirectTo,
          expiresAt,
          providerMessageId: emailResult.providerMessageId,
          previousProviderMessageId: invitation.provider_message_id,
          stateUpdateFailed: true,
        },
        reason:
          "Resend email was delivered, but the invitation state could not be updated.",
      });

    if (auditError) {
      console.error(
        "Doctor invitation resend partial-success audit failed:",
        auditError
      );
    }

    return failure(
      "doctor_invitation_resend_state_update_failed",
      "E-mailul a fost retrimis, dar starea internă nu a putut fi actualizată. Verifică invitația înainte de o nouă încercare.",
      500
    );
  }

  const { error: eventError } = await admin
    .from("doctor_invitation_events")
    .insert({
      invitation_id: invitation.id,
      actor_profile_id: authorization.profileId,
      event_type: "invitation_resent",
      event_data: {
        authUserId: invitation.auth_user_id,
        redirectTo,
        expiresAt,
        providerMessageId: emailResult.providerMessageId,
        previousProviderMessageId: invitation.provider_message_id,
        resendCount: nextResendCount,
        linkType: "magiclink",
      },
    });

  if (eventError) {
    console.error(
      "Doctor invitation resent-event insert failed:",
      eventError
    );
  }

  return json({
    code: "doctor_invitation_resent",
    message: "Invitația medicului a fost retrimisă.",
    invitation: updatedInvitation,
  });
}
