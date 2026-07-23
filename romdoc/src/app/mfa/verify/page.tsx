import {
  redirect,
} from "next/navigation";

import MfaVerifyForm from "@/components/auth/mfa-verify-form";
import AppLocaleCookieSync from "@/components/i18n/app-locale-cookie-sync";
import PublicFooter from "@/components/public/public-footer";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

type MfaVerifyPageProps = {
  searchParams: Promise<{
    locale?: string;
    next?: string;
  }>;
};

function safeNextPath(
  value: string | undefined
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  return value;
}

export default async function
MfaVerifyPage({
  searchParams,
}: MfaVerifyPageProps) {
  const params =
    await searchParams;

  const locale =
    normalizeAppLocale(
      params.locale
    );

  const nextPath =
    safeNextPath(
      params.next
    );

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    const loginParameters =
      new URLSearchParams({
        locale,
        next: nextPath,
      });

    redirect(
      `/login?${loginParameters.toString()}`
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
    ![
      "admin",
      "doctor",
    ].includes(
      profile.role
    ) ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      `/${locale}`
    );
  }

  const {
    data: assurance,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (
    assurance?.currentLevel ===
      "aal2"
  ) {
    redirect(nextPath);
  }

  const {
    data: factors,
  } =
    await supabase.auth.mfa
      .listFactors();

  if (
    (
      factors?.totp?.length ??
      0
    ) === 0
  ) {
    redirect(nextPath);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <AppLocaleCookieSync
        locale={locale}
      />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <MfaVerifyForm
          locale={locale}
          nextPath={
            nextPath
          }
        />
      </main>

      <PublicFooter
        locale={locale}
      />
    </div>
  );
}
