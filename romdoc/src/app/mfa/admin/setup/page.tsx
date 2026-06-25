import { redirect } from "next/navigation";

import AdminMfaSetupForm from "@/components/auth/admin-mfa-setup-form";
import PublicFooter from "@/components/public/public-footer";
import { createClient } from "@/lib/supabase/server";

type AdminMfaSetupPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

function safeNextPath(
  value: string | undefined
) {
  if (
    !value ||
    !value.startsWith(
      "/admin"
    ) ||
    value.startsWith("//")
  ) {
    return "/admin";
  }

  return value;
}

export default async function AdminMfaSetupPage({
  searchParams,
}: AdminMfaSetupPageProps) {
  const params =
    await searchParams;

  const nextPath =
    safeNextPath(
      params.next
    );

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
      `/login?next=${encodeURIComponent(
        nextPath
      )}`
    );
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
    !profile ||
    profile.role !==
      "admin" ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data: assurance,
    error: assuranceError,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (assuranceError) {
    console.error(
      "Admin MFA setup assurance lookup failed:",
      assuranceError
    );
  }

  if (
    assurance?.currentLevel ===
    "aal2"
  ) {
    redirect(nextPath);
  }

  const {
    data: factors,
    error: factorsError,
  } =
    await supabase.auth.mfa
      .listFactors();

  if (factorsError) {
    console.error(
      "Admin MFA setup factors lookup failed:",
      factorsError
    );
  }

  if (
    (
      factors?.totp
        ?.length ?? 0
    ) > 0
  ) {
    redirect(
      `/mfa/admin/verify?next=${encodeURIComponent(
        nextPath
      )}`
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <AdminMfaSetupForm
          nextPath={
            nextPath
          }
        />
      </main>

      <PublicFooter />
    </div>
  );
}
