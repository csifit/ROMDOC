import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileRole =
  | "admin"
  | "doctor"
  | "doctor_applicant"
  | "staff"
  | "patient"
  | "user";

type ProfileRow = {
  role: ProfileRole;
};

export default async function DashboardRouterPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Dashboard profile lookup failed:",
      profileError
    );

    redirect("/");
  }

  if (!profile) {
    console.error(
      "Authenticated user does not have a profiles row:",
      user.id
    );

    redirect("/");
  }

  const typedProfile =
    profile as ProfileRow;

  switch (typedProfile.role) {
    case "admin":
      redirect("/admin");

    case "doctor":
      redirect(
        "/doctor-dashboard/appointments"
      );

    case "doctor_applicant":
      redirect("/doctor-application");

    case "staff":
      redirect("/staff-dashboard");

    case "patient":
    case "user":
      redirect("/patient-dashboard");

    default:
      console.error(
        "Unknown profile role:",
        typedProfile.role
      );

      redirect("/");
  }
}