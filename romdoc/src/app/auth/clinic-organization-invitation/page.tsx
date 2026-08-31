import {
  redirect,
} from "next/navigation";

import ClinicOrganizationInvitationAcceptance from "@/components/auth/clinic-organization-invitation-acceptance";
import {
  getClinicOrganizationInvitationIdFromUserMetadata,
} from "@/lib/admin/clinic-organization-invitations";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

export default async function ClinicOrganizationInvitationPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  if (
    !user
  ) {
    redirect(
      "/login?next=/auth/clinic-organization-invitation"
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
    redirect(
      "/login?error=invalid-clinic-organization-invitation"
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      invitation,
    error,
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
      phone,
      locale,
      personal_message,
      trial_months,
      status,
      auth_user_id,
      accepted_profile_id,
      accepted_at,
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
    error ||
    !invitation
  ) {
    redirect(
      "/login?error=invalid-clinic-organization-invitation"
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
      "/login?error=clinic-organization-invitation-email-mismatch"
    );
  }

  if (
    invitation.status ===
      "accepted" &&
    invitation
      .accepted_profile_id ===
      user.id
  ) {
    redirect(
      "/clinic-manager-dashboard"
    );
  }

  if (
    invitation.status !==
    "sent"
  ) {
    redirect(
      `/login?error=clinic-organization-invitation-${invitation.status}`
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
    redirect(
      "/login?error=clinic-organization-invitation-expired"
    );
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6">
      <ClinicOrganizationInvitationAcceptance
        organizationName={
          invitation
            .organization_name
        }
        email={
          invitation.email
        }
        firstName={
          invitation
            .first_name
        }
        lastName={
          invitation
            .last_name
        }
        locale={
          invitation.locale ===
            "en"
            ? "en"
            : invitation.locale ===
                "de"
              ? "de"
              : "ro"
        }
        trialMonths={
          invitation
            .trial_months
        }
        personalMessage={
          invitation
            .personal_message
        }
      />
    </main>
  );
}
