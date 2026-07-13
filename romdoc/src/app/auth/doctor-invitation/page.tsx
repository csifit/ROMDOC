import {
  redirect,
} from "next/navigation";

import DoctorInvitationAcceptance from "@/components/auth/doctor-invitation-acceptance";
import {
  getInvitationIdFromUserMetadata,
} from "@/lib/admin/doctor-invitation-acceptance";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

function getCurrentTimestamp() {
  return new Date().getTime();
}

export default async function DoctorInvitationPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?next=/auth/doctor-invitation"
    );
  }

  const invitationId =
    getInvitationIdFromUserMetadata(
      user.user_metadata
    );

  if (!invitationId) {
    redirect(
      "/login?error=invalid-doctor-invitation"
    );
  }

  const admin =
    createAdminClient();

  const {
    data: invitation,
    error,
  } = await admin
    .from(
      "doctor_invitations"
    )
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
      expires_at
    `)
    .eq(
      "id",
      invitationId
    )
    .maybeSingle();

  if (
    error ||
    !invitation
  ) {
    redirect(
      "/login?error=invalid-doctor-invitation"
    );
  }

  if (
    invitation.email
      .trim()
      .toLowerCase() !==
    user.email
      ?.trim()
      .toLowerCase()
  ) {
    redirect(
      "/login?error=doctor-invitation-email-mismatch"
    );
  }

  if (
    invitation.status ===
      "accepted" &&
    invitation.accepted_profile_id ===
      user.id
  ) {
    redirect(
      "/doctor-dashboard"
    );
  }

  if (
    invitation.status !==
    "sent"
  ) {
    redirect(
      `/login?error=doctor-invitation-${invitation.status}`
    );
  }

  const currentTimestamp =
    getCurrentTimestamp();

  if (
    invitation.expires_at &&
    new Date(
      invitation.expires_at
    ).getTime() <=
      currentTimestamp
  ) {
    redirect(
      "/login?error=doctor-invitation-expired"
    );
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6">
      <DoctorInvitationAcceptance
        email={
          invitation.email
        }
        firstName={
          invitation.first_name
        }
        lastName={
          invitation.last_name
        }
        complimentaryMonths={
          invitation.complimentary_months
        }
        personalMessage={
          invitation.personal_message
        }
      />
    </main>
  );
}
