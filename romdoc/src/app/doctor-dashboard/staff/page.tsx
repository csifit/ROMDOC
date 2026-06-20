import { redirect } from "next/navigation";
import DoctorStaffManager from "@/components/doctor/doctor-staff-manager";
import { createClient } from "@/lib/supabase/server";

export default async function DoctorStaffPage() {
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
    redirect(
      "/login?next=/doctor-dashboard/staff"
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/dashboard");
  }

  if (profile.role !== "doctor") {
    redirect("/dashboard");
  }

  return <DoctorStaffManager />;
}