import {
  getClinicOrganizationInvitationExpiryDate,
  getClinicOrganizationInvitationRedirectUrl,
  getSafeClinicOrganizationInvitationFailure,
  type CreateClinicOrganizationInvitationInput,
} from "@/lib/admin/clinic-organization-invitations";
import {
  sendClinicOrganizationInvitationEmail,
} from "@/lib/admin/send-clinic-organization-invitation-email";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

type ClinicOrganizationInvitationOtpType =
  | "invite"
  | "magiclink";

export type CreateClinicOrganizationInvitationResult =
  | {
      ok: true;
      status: 201;
      code: "clinic_organization_invitation_sent";
      message: string;
      invitation: Record<string, unknown>;
    }
  | {
      ok: false;
      status: number;
      code: string;
      error: string;
      invitationId?: string;
    };

function buildClinicOrganizationInvitationVerificationLink(
  redirectTo: string,
  hashedToken: string,
  otpType: ClinicOrganizationInvitationOtpType,
  locale: "ro" | "en" | "de"
) {
  const verificationUrl =
    new URL(
      redirectTo
    );

  verificationUrl
    .searchParams
    .set(
      "token_hash",
      hashedToken
    );

  verificationUrl
    .searchParams
    .set(
      "type",
      otpType
    );

  verificationUrl
    .searchParams
    .set(
      "locale",
      locale
    );

  return verificationUrl
    .toString();
}

export async function createClinicOrganizationInvitation({
  actorProfileId,
  input,
}: {
  actorProfileId: string;
  input: CreateClinicOrganizationInvitationInput;
}): Promise<CreateClinicOrganizationInvitationResult> {
  const admin =
    createAdminClient();

  if (
    input.organizationId
  ) {
    const {
      data:
        organization,
      error:
        organizationError,
    } = await admin
      .from(
        "clinic_organizations"
      )
      .select(
        "id, name, status"
      )
      .eq(
        "id",
        input.organizationId
      )
      .maybeSingle();

    if (
      organizationError
    ) {
      console.error(
        "Clinic Organisation invitation organization lookup failed:",
        organizationError
      );

      return {
        ok: false,
        status: 500,
        code:
          "clinic_organization_invitation_organization_check_failed",
        error:
          "Organizația selectată nu a putut fi verificată.",
      };
    }

    if (
      !organization
    ) {
      return {
        ok: false,
        status: 404,
        code:
          "clinic_organization_invitation_organization_not_found",
        error:
          "Organizația selectată nu a fost găsită.",
      };
    }

    if (
      [
        "suspended",
        "rejected",
        "archived",
      ].includes(
        organization.status
      )
    ) {
      return {
        ok: false,
        status: 409,
        code:
          "clinic_organization_invitation_organization_unavailable",
        error:
          "Organizația selectată nu poate primi o invitație în starea curentă.",
      };
    }
  }

  const {
    data:
      existingInvitation,
    error:
      existingInvitationError,
  } = await admin
    .from(
      "clinic_organization_invitations"
    )
    .select(
      "id, status, created_at"
    )
    .eq(
      "normalized_email",
      input.email
    )
    .in(
      "status",
      [
        "draft",
        "sent",
      ]
    )
    .maybeSingle();

  if (
    existingInvitationError
  ) {
    console.error(
      "Clinic Organisation invitation duplicate check failed:",
      existingInvitationError
    );

    return {
      ok: false,
      status: 500,
      code:
        "clinic_organization_invitation_check_failed",
      error:
        "Invitația nu a putut fi verificată.",
    };
  }

  if (
    existingInvitation
  ) {
    return {
      ok: false,
      status: 409,
      code:
        "clinic_organization_invitation_exists",
      error:
        "Există deja o invitație activă pentru această adresă de e-mail.",
      invitationId:
        existingInvitation.id,
    };
  }

  const expiresAt =
    getClinicOrganizationInvitationExpiryDate();

  const {
    data:
      invitation,
    error:
      invitationInsertError,
  } = await admin
    .from(
      "clinic_organization_invitations"
    )
    .insert({
      organization_name:
        input.organizationName,
      email:
        input.email,
      first_name:
        input.firstName,
      last_name:
        input.lastName,
      phone:
        input.phone,
      locale:
        input.locale,
      personal_message:
        input.personalMessage,
      trial_months:
        input.trialMonths,
      organization_id:
        input.organizationId,
      status:
        "draft",
      invited_by_profile_id:
        actorProfileId,
      redirect_path:
        "/auth/clinic-organization-invitation",
      expires_at:
        expiresAt,
    })
    .select(`
      id,
      organization_name,
      email,
      normalized_email,
      first_name,
      last_name,
      phone,
      locale,
      personal_message,
      trial_months,
      organization_id,
      status,
      invited_by_profile_id,
      expires_at,
      created_at,
      updated_at
    `)
    .single();

  if (
    invitationInsertError ||
    !invitation
  ) {
    console.error(
      "Clinic Organisation invitation insert failed:",
      invitationInsertError
    );

    const duplicate =
      invitationInsertError
        ?.code ===
      "23505";

    return {
      ok: false,
      status:
        duplicate
          ? 409
          : 500,
      code:
        duplicate
          ? "clinic_organization_invitation_exists"
          : "clinic_organization_invitation_create_failed",
      error:
        duplicate
          ? "Există deja o invitație activă pentru această adresă de e-mail sau organizație."
          : "Invitația organizației nu a putut fi creată.",
    };
  }

  const {
    error:
      createdEventError,
  } = await admin
    .from(
      "clinic_organization_invitation_events"
    )
    .insert({
      invitation_id:
        invitation.id,
      organization_id:
        input.organizationId,
      actor_profile_id:
        actorProfileId,
      event_type:
        "invitation_created",
      event_data: {
        locale:
          input.locale,
        trialMonths:
          input.trialMonths,
        organizationName:
          input.organizationName,
        hasPersonalMessage:
          Boolean(
            input.personalMessage
          ),
      },
    });

  if (
    createdEventError
  ) {
    console.error(
      "Clinic Organisation invitation created-event insert failed:",
      createdEventError
    );
  }

  let redirectTo:
    string;

  try {
    redirectTo =
      getClinicOrganizationInvitationRedirectUrl();
  } catch (
    configurationError
  ) {
    const safeFailure =
      getSafeClinicOrganizationInvitationFailure(
        configurationError
      );

    await admin
      .from(
        "clinic_organization_invitations"
      )
      .update({
        status:
          "failed",
        failure_code:
          safeFailure.code,
        failure_message:
          safeFailure.message,
      })
      .eq(
        "id",
        invitation.id
      );

    await admin
      .from(
        "clinic_organization_invitation_events"
      )
      .insert({
        invitation_id:
          invitation.id,
        organization_id:
          input.organizationId,
        actor_profile_id:
          actorProfileId,
        event_type:
          "invitation_send_failed",
        event_data: {
          code:
            safeFailure.code,
        },
        reason:
          safeFailure.message,
      });

    return {
      ok: false,
      status: 500,
      code:
        "clinic_organization_invitation_site_url_missing",
      error:
        "Invitația a fost înregistrată, dar configurația URL-ului aplicației lipsește.",
      invitationId:
        invitation.id,
    };
  }

  const {
    data:
      linkData,
    error:
      linkError,
  } =
    await admin.auth.admin.generateLink({
      type:
        "invite",
      email:
        input.email,
      options: {
        redirectTo,
        data: {
          invitation_type:
            "clinic_organization",
          clinic_organization_invitation_id:
            invitation.id,
          organization_name:
            input.organizationName,
          first_name:
            input.firstName,
          last_name:
            input.lastName,
          phone:
            input.phone,
          locale:
            input.locale,
          trial_months:
            input.trialMonths,
        },
      },
    });

  const hashedToken =
    linkData
      ?.properties
      ?.hashed_token
      ?.trim() ??
    "";

  const authUserId =
    linkData
      ?.user
      ?.id ??
    null;

  if (
    linkError ||
    !hashedToken ||
    !authUserId
  ) {
    const safeFailure =
      getSafeClinicOrganizationInvitationFailure(
        linkError ??
          new Error(
            "Supabase did not return a Clinic Organisation invitation token."
          )
      );

    await admin
      .from(
        "clinic_organization_invitations"
      )
      .update({
        status:
          "failed",
        auth_user_id:
          authUserId,
        failure_code:
          safeFailure.code,
        failure_message:
          safeFailure.message,
      })
      .eq(
        "id",
        invitation.id
      );

    await admin
      .from(
        "clinic_organization_invitation_events"
      )
      .insert({
        invitation_id:
          invitation.id,
        organization_id:
          input.organizationId,
        actor_profile_id:
          actorProfileId,
        event_type:
          "invitation_send_failed",
        event_data: {
          code:
            safeFailure.code,
        },
        reason:
          safeFailure.message,
      });

    console.error(
      "Supabase Clinic Organisation invitation token failed:",
      linkError
    );

    return {
      ok: false,
      status: 502,
      code:
        "clinic_organization_invitation_link_failed",
      error:
        "Invitația a fost înregistrată, dar linkul securizat nu a putut fi creat.",
      invitationId:
        invitation.id,
    };
  }

  const actionLink =
    buildClinicOrganizationInvitationVerificationLink(
      redirectTo,
      hashedToken,
      "invite",
      input.locale
    );

  const {
    error:
      linkStoreError,
  } = await admin
    .from(
      "clinic_organization_invitations"
    )
    .update({
      auth_user_id:
        authUserId,
      invitation_action_link:
        actionLink,
    })
    .eq(
      "id",
      invitation.id
    );

  if (
    linkStoreError
  ) {
    console.error(
      "Clinic Organisation invitation link storage failed:",
      linkStoreError
    );

    return {
      ok: false,
      status: 500,
      code:
        "clinic_organization_invitation_state_update_failed",
      error:
        "Linkul a fost creat, dar nu a putut fi salvat în siguranță.",
      invitationId:
        invitation.id,
    };
  }

  const emailResult =
    await sendClinicOrganizationInvitationEmail({
      organizationName:
        input.organizationName,
      email:
        input.email,
      firstName:
        input.firstName,
      lastName:
        input.lastName,
      locale:
        input.locale,
      personalMessage:
        input.personalMessage,
      trialMonths:
        input.trialMonths,
      expiresAt,
      actionLink,
    });

  if (
    !emailResult.sent
  ) {
    const safeFailure =
      getSafeClinicOrganizationInvitationFailure(
        new Error(
          emailResult.error
        )
      );

    await admin
      .from(
        "clinic_organization_invitations"
      )
      .update({
        status:
          "failed",
        failure_code:
          safeFailure.code,
        failure_message:
          safeFailure.message,
      })
      .eq(
        "id",
        invitation.id
      );

    await admin
      .from(
        "clinic_organization_invitation_events"
      )
      .insert({
        invitation_id:
          invitation.id,
        organization_id:
          input.organizationId,
        actor_profile_id:
          actorProfileId,
        event_type:
          "invitation_send_failed",
        event_data: {
          code:
            safeFailure.code,
        },
        reason:
          safeFailure.message,
      });

    return {
      ok: false,
      status: 502,
      code:
        "clinic_organization_invitation_email_failed",
      error:
        "Invitația a fost înregistrată, dar e-mailul nu a putut fi trimis.",
      invitationId:
        invitation.id,
    };
  }

  const sentAt =
    new Date()
      .toISOString();

  const {
    data:
      sentInvitation,
    error:
      sentUpdateError,
  } = await admin
    .from(
      "clinic_organization_invitations"
    )
    .update({
      status:
        "sent",
      auth_user_id:
        authUserId,
      provider_message_id:
        emailResult
          .providerMessageId,
      sent_at:
        sentAt,
      failure_code:
        null,
      failure_message:
        null,
    })
    .eq(
      "id",
      invitation.id
    )
    .select(`
      id,
      organization_name,
      email,
      normalized_email,
      first_name,
      last_name,
      phone,
      locale,
      personal_message,
      trial_months,
      organization_id,
      status,
      invited_by_profile_id,
      auth_user_id,
      provider_message_id,
      sent_at,
      expires_at,
      created_at,
      updated_at
    `)
    .single();

  if (
    sentUpdateError ||
    !sentInvitation
  ) {
    console.error(
      "Clinic Organisation invitation sent-status update failed:",
      sentUpdateError
    );

    return {
      ok: false,
      status: 500,
      code:
        "clinic_organization_invitation_state_update_failed",
      error:
        "E-mailul a fost trimis, dar starea internă nu a putut fi actualizată. Verifică invitația înainte de retrimitere.",
      invitationId:
        invitation.id,
    };
  }

  const {
    error:
      sentEventError,
  } = await admin
    .from(
      "clinic_organization_invitation_events"
    )
    .insert({
      invitation_id:
        invitation.id,
      organization_id:
        input.organizationId,
      actor_profile_id:
        actorProfileId,
      event_type:
        "invitation_sent",
      event_data: {
        authUserId,
        redirectTo,
        expiresAt,
        providerMessageId:
          emailResult
            .providerMessageId,
        linkType:
          "invite",
      },
    });

  if (
    sentEventError
  ) {
    console.error(
      "Clinic Organisation invitation sent-event insert failed:",
      sentEventError
    );
  }

  return {
    ok: true,
    status: 201,
    code:
      "clinic_organization_invitation_sent",
    message:
      "Invitația organizației a fost trimisă.",
    invitation:
      sentInvitation as Record<
        string,
        unknown
      >,
  };
}
