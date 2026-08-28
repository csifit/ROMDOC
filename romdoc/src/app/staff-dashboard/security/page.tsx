import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import SharedAccountSecuritySettings from "@/components/security/shared-account-security-settings";
import {
  getAccountSecurityCopy,
} from "@/lib/i18n/account-security";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function StaffSecurityPage() {
  const locale =
    await getStoredAppLocale();

  const copy =
    getAccountSecurityCopy(
      locale
    );

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        next:
          "/staff-dashboard/security",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  const registrationType =
    typeof user
      .user_metadata
      ?.registration_type ===
    "string"
      ? user
          .user_metadata
          .registration_type
      : "";

  const passwordInitialized =
    user.user_metadata
      ?.password_initialized ===
    true;

  if (
    registrationType ===
      "staff" &&
    !passwordInitialized
  ) {
    const parameters =
      new URLSearchParams({
        mode:
          "invite",
        locale,
        next:
          "/staff-dashboard/security",
      });

    redirect(
      `/set-password?${parameters.toString()}`
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "role, account_status"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "staff" ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[21px] sm:px-[21px] sm:py-[34px] lg:px-[34px]">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <div className="flex flex-col justify-between gap-[13px] sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                {copy.pageEyebrow}
              </p>

              <h1 className="mt-[8px] text-3xl font-bold tracking-tight text-gray-900">
                {copy.pageTitle}
              </h1>

              <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
                {copy.pageDescription}
              </p>
            </div>

            <Link
              href="/staff-dashboard"
              className="romdoc-button romdoc-button-secondary romdoc-button-sm"
            >
              {copy.back}
            </Link>
          </div>
        </header>

        <div className="mt-[34px]">
          <SharedAccountSecuritySettings
            locale={locale}
          />
        </div>
      </div>
    </main>
  );
}
