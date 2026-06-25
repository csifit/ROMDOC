import {
  redirect,
} from "next/navigation";

import PrivacyOperationsManagement from "@/components/admin/privacy-operations-management";
import {
  getAdminMfaRedirect,
} from "@/lib/auth/admin-mfa";
import {
  isTrustedAdminMfaIp,
} from "@/lib/auth/admin-mfa-ip";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function AdminPrivacyPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?next=/admin/privacy"
    );
  }

  const {
    data: profile,
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
    !profile ||
    profile.role !==
      "admin" ||
    profile.account_status !==
      "active"
  ) {
    redirect("/admin");
  }

  const trustedIp =
    await isTrustedAdminMfaIp();

  if (!trustedIp) {
    const mfaRedirect =
      await getAdminMfaRedirect({
        supabase,
        nextPath:
          "/admin/privacy",
      });

    if (mfaRedirect) {
      redirect(
        mfaRedirect
      );
    }
  }

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PrivacyOperationsManagement />
      </div>
    </main>
  );
}
