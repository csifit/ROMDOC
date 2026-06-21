import {
  redirect,
} from "next/navigation";
import {
  createClient,
} from "@/lib/supabase/server";

export async function requireActiveProfile() {
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
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      first_name,
      last_name,
      account_status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/login");
  }

  if (
    profile.account_status ===
    "blocked"
  ) {
    await supabase.auth.signOut();

    redirect(
      "/login?error=account-blocked"
    );
  }

  return {
    supabase,
    user,
    profile,
  };
}