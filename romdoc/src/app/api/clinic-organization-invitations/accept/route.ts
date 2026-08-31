import {
  NextResponse,
} from "next/server";

import {
  createUniqueClinicOrganizationSlug,
  getClinicOrganizationInvitationIdFromUserMetadata,
} from "@/lib/admin/clinic-organization-invitations";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control":
    "no-store",
};

function json(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers:
        NO_STORE_HEADERS,
    }
  );
}

async function expireInvitation(
  invitationId: string,
  organizationId: string | null,
  profileId: string
) {
  const admin =
    createAdminClient();

  const {
    data:
      expiredInvitation,
    error:
      updateError,
  } = await admin
    .from(
      "clinic_organization_invitations"
    )
    .update({
      status:
        "expired",
    })
    .eq(
      "id",
      invitationId
    )
    .eq(
      "status",
      "sent"
    )
    .select(
      "id"
    )
    .maybeSingle();

  if (
    updateError
  ) {
    console.error(
      "Clinic Organisation invitation expiry update failed:",
      updateError
    );

    return;
  }

  if (
    !expiredInvitation
  ) {
    return;
  }

  const {
    error:
      eventError,
  } = await admin
    .from(
      "clinic_organization_invitation_events"
    )
    .insert({
      invitation_id:
        invitationId,
      organization_id:
        organizationId,
      actor_profile_id:
        profileId,
      event_type:
        "invitation_expired",
      event_data: {},
    });

  if (
    eventError
  ) {
    console.error(
      "Clinic Organisation invitation expiry event failed:",
      eventError
    );
  }
}

export async function POST(): Promise<Response> {
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
    return json(
      {
        error:
          "Trebuie să fii autentificat pentru a accepta invitația.",
      },
      401
    );
  }

  const email =
    user.email
      ?.trim()
      .toLowerCase() ??
    "";

  if (
    !email
  ) {
    return json(
      {
        error:
          "Contul autentificat nu are o adresă de e-mail validă.",
      },
      400
    );
  }

  const invitationId =
    getClinicOrganizationInvitationIdFromUserMetadata(
      user
        .user_metadata
    );

  if (
    !invitationId
  ) {
    return json(
      {
        error:
          "Contul nu conține o invitație validă pentru organizație.",
        code:
          "clinic_organization_invitation_metadata_missing",
      },
      400
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      invitation,
    error:
      invitationError,
  } = await admin
    .from(
      "clinic_organization_invitations"
    )
    .select(`
      id,
      organization_name,
      organization_id,
      email,
      first_name,
      last_name,
      status,
      auth_user_id,
      accepted_profile_id,
      trial_months,
      expires_at,
      trial_started_at,
      trial_ends_at
    `)
    .eq(
      "id",
      invitationId
    )
    .maybeSingle();

  if (
    invitationError ||
    !invitation
  ) {
    return json(
      {
        error:
          "Invitația organizației nu a fost găsită.",
      },
      404
    );
  }

  if (
    invitation.email
      .trim()
      .toLowerCase() !==
    email
  ) {
    return json(
      {
        error:
          "Contul autentificat nu corespunde adresei invitate.",
      },
      403
    );
  }

  if (
    invitation
      .auth_user_id &&
    invitation
      .auth_user_id !==
      user.id
  ) {
    return json(
      {
        error:
          "Invitația aparține unui alt cont.",
      },
      403
    );
  }

  if (
    invitation.status ===
      "accepted" &&
    invitation
      .accepted_profile_id ===
      user.id
  ) {
    return json({
      accepted:
        true,
      organizationId:
        invitation
          .organization_id,
      trialStartsAt:
        invitation
          .trial_started_at,
      trialEndsAt:
        invitation
          .trial_ends_at,
      alreadyAccepted:
        true,
    });
  }

  if (
    invitation.status !==
    "sent"
  ) {
    return json(
      {
        error:
          "Invitația nu mai poate fi acceptată.",
        code:
          `clinic_organization_invitation_${invitation.status}`,
      },
      409
    );
  }

  if (
    invitation
      .expires_at &&
    new Date(
      invitation
        .expires_at
    ).getTime() <=
      Date.now()
  ) {
    await expireInvitation(
      invitation.id,
      invitation
        .organization_id,
      user.id
    );

    return json(
      {
        error:
          "Invitația a expirat. Solicitați administratorului retrimiterea invitației.",
        code:
          "clinic_organization_invitation_expired",
      },
      409
    );
  }

  if (
    invitation
      .trial_months < 1 ||
    invitation
      .trial_months > 3
  ) {
    return json(
      {
        error:
          "Perioada de test a invitației nu este validă.",
        code:
          "clinic_organization_trial_invalid",
      },
      409
    );
  }

  const organizationId =
    invitation
      .organization_id ??
    crypto.randomUUID();

  let organizationSlug =
    "";

  if (
    !invitation
      .organization_id
  ) {
    try {
      organizationSlug =
        await createUniqueClinicOrganizationSlug(
          invitation
            .organization_name,
          invitation.id
        );
    } catch (
      slugError
    ) {
      console.error(
        "Clinic Organisation slug creation failed:",
        slugError
      );

      return json(
        {
          error:
            "Organizația nu a putut fi pregătită pentru activare.",
        },
        500
      );
    }
  }

  const {
    data,
    error,
  } = await admin.rpc(
    "accept_clinic_organization_invitation",
    {
      p_invitation_id:
        invitation.id,
      p_profile_id:
        user.id,
      p_auth_user_id:
        user.id,
      p_organization_id:
        organizationId,
      p_organization_slug:
        organizationSlug,
      p_email:
        email,
    }
  );

  if (
    error
  ) {
    console.error(
      "Clinic Organisation invitation acceptance failed:",
      error
    );

    let message =
      "Invitația organizației nu a putut fi acceptată.";

    if (
      error.message.includes(
        "expired"
      )
    ) {
      message =
        "Invitația a expirat.";
    } else if (
      error.message.includes(
        "account role"
      )
    ) {
      message =
        "Acest cont are deja un rol incompatibil cu invitația organizației.";
    } else if (
      error.message.includes(
        "Blocked account"
      )
    ) {
      message =
        "Contul este blocat și nu poate accepta invitația.";
    } else if (
      error.message.includes(
        "not available for activation"
      )
    ) {
      message =
        "Organizația nu poate fi activată în starea curentă.";
    }

    return json(
      {
        error:
          message,
        code:
          "clinic_organization_invitation_acceptance_failed",
      },
      409
    );
  }

  const result =
    Array.isArray(
      data
    )
      ? data[0] ??
        null
      : data;

  return json({
    accepted:
      true,
    organizationId:
      result
        ?.organization_id ??
      invitation
        .organization_id ??
      organizationId,
    trialStartsAt:
      result
        ?.trial_started_at ??
      null,
    trialEndsAt:
      result
        ?.trial_ends_at ??
      null,
  });
}
