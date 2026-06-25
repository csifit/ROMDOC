import { redirect } from "next/navigation";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  getAdminMfaRedirect,
} from "@/lib/auth/admin-mfa";
import { createClient } from "@/lib/supabase/server";

type ProfileRole =
  | "admin"
  | "manager"
  | "doctor"
  | "doctor_applicant"
  | "staff"
  | "patient"
  | "user";

type ProfileRow = {
  role: ProfileRole;
  account_status:
    | string
    | null;
};

export default async function DashboardRouterPage() {
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
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        account_status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/");
  }

  const typedProfile =
    profile as ProfileRow;

  if (
    typedProfile
      .account_status ===
    "blocked"
  ) {
    redirect("/");
  }

  if (
    typedProfile.role ===
      "admin" ||
    typedProfile.role ===
      "manager"
  ) {
    if (
      typedProfile.role ===
      "manager"
    ) {
      const admin =
        createAdminClient();

      const {
        data: invitation,
      } =
        await admin
          .from(
            "manager_invitations"
          )
          .select("id")
          .eq(
            "invited_user_id",
            user.id
          )
          .eq(
            "status",
            "pending"
          )
          .maybeSingle();

      if (invitation) {
        const now =
          new Date()
            .toISOString();

        await admin
          .from(
            "manager_invitations"
          )
          .update({
            status:
              "accepted",
            accepted_by_profile_id:
              user.id,
            accepted_at:
              now,
          })
          .eq(
            "id",
            invitation.id
          );

        await admin
          .from(
            "manager_audit_events"
          )
          .insert({
            manager_profile_id:
              user.id,
            invitation_id:
              invitation.id,
            actor_profile_id:
              user.id,
            event_type:
              "accepted",
          });
      }
    }

    const mfaRedirect =
      await getAdminMfaRedirect({
        supabase,
        nextPath:
          "/admin",
      });

    if (mfaRedirect) {
      redirect(mfaRedirect);
    }

    redirect("/admin");
  }

  switch (
    typedProfile.role
  ) {
    case "doctor":
      redirect(
        "/doctor-dashboard/appointments"
      );

    case "doctor_applicant":
      redirect(
        "/doctor-application"
      );

    case "staff":
      redirect(
        "/staff-dashboard"
      );

    case "patient":
    case "user":
      redirect(
        "/patient-dashboard"
      );

    default:
      redirect("/");
  }
}
