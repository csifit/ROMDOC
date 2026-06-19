import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type UserRole =
  | "admin"
  | "doctor"
  | "patient"
  | "staff";

function getDashboardPath(role: UserRole) {
  switch (role) {
    case "admin":
      return "/admin";

    case "doctor":
      return "/doctor-dashboard/appointments";

    case "staff":
      return "/staff-dashboard";

    case "patient":
    default:
      return "/patient-dashboard";
  }
}

export default async function DashboardRedirectPage() {
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
      "Dashboard role lookup failed:",
      profileError
    );

    redirect("/");
  }

  if (!profile) {
    console.error(
      `No profile found for authenticated user ${user.id}.`
    );

    redirect("/");
  }

  const role = profile.role as UserRole;

  redirect(getDashboardPath(role));
}
