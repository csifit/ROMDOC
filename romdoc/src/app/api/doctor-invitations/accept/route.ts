import {
  NextResponse,
} from "next/server";

import {
  createUniqueInvitedDoctorSlug,
  getInvitationIdFromUserMetadata,
} from "@/lib/admin/doctor-invitation-acceptance";
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
  "Cache-Control": "no-store",
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

export async function POST(): Promise<Response> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

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

  if (!email) {
    return json(
      {
        error:
          "Contul autentificat nu are o adresă de e-mail validă.",
      },
      400
    );
  }

  const invitationId =
    getInvitationIdFromUserMetadata(
      user.user_metadata
    );

  if (!invitationId) {
    return json(
      {
        error:
          "Contul nu conține o invitație de medic validă.",
        code:
          "invitation_metadata_missing",
      },
      400
    );
  }

  const admin =
    createAdminClient();

  const {
    data: invitation,
    error:
      invitationError,
  } = await admin
    .from(
      "doctor_invitations"
    )
    .select(`
      id,
      email,
      first_name,
      last_name,
      status,
      auth_user_id,
      accepted_profile_id,
      doctor_id,
      complimentary_months,
      expires_at
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
          "Invitația nu a fost găsită.",
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
    invitation.auth_user_id &&
    invitation.auth_user_id !==
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
    invitation.accepted_profile_id ===
      user.id
  ) {
    return json({
      accepted: true,
      doctorId:
        invitation.doctor_id,
      alreadyAccepted: true,
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
          `invitation_${invitation.status}`,
      },
      409
    );
  }

  const doctorId =
    crypto.randomUUID();

  let doctorSlug: string;

  try {
    doctorSlug =
      await createUniqueInvitedDoctorSlug(
        invitation.first_name,
        invitation.last_name,
        user.id
      );
  } catch (error) {
    console.error(
      "Invited doctor slug creation failed:",
      error
    );

    return json(
      {
        error:
          "Profilul medicului nu a putut fi pregătit.",
      },
      500
    );
  }

  const {
    data,
    error,
  } = await admin.rpc(
    "accept_doctor_invitation",
    {
      p_invitation_id:
        invitation.id,
      p_profile_id:
        user.id,
      p_auth_user_id:
        user.id,
      p_doctor_id:
        doctorId,
      p_doctor_slug:
        doctorSlug,
      p_email:
        email,
    }
  );

  if (error) {
    console.error(
      "Doctor invitation acceptance failed:",
      error
    );

    const message =
      error.message.includes(
        "expired"
      )
        ? "Invitația a expirat."
        : "Invitația nu a putut fi acceptată.";

    return json(
      {
        error:
          message,
        code:
          "invitation_acceptance_failed",
      },
      409
    );
  }

  const result =
    Array.isArray(data)
      ? data[0] ?? null
      : data;

  return json({
    accepted: true,
    doctorId:
      result?.doctor_id ??
      invitation.doctor_id ??
      doctorId,
    accessGrantId:
      result?.access_grant_id ??
      null,
    accessStartsAt:
      result?.access_starts_at ??
      null,
    accessEndsAt:
      result?.access_ends_at ??
      null,
  });
}
