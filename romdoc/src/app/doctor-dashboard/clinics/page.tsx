import {
  redirect,
} from "next/navigation";
import ClinicProposalForm from "@/components/clinic/clinic-proposal-form";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function DoctorClinicsPage() {
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
      "/login?next=/doctor-dashboard/clinics"
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

  if (
    profile.role !== "doctor"
  ) {
    redirect("/dashboard");
  }

  return (
    <ClinicProposalForm />
  );
}