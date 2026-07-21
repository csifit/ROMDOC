import {
  NextIntlClientProvider,
} from "next-intl";
import {
  redirect,
} from "next/navigation";

import AdminMfaSetupForm from "@/components/auth/admin-mfa-setup-form";
import PublicFooter from "@/components/public/public-footer";
import {
  sanitizePlatformOperatorNextPath,
} from "@/lib/auth/admin-mfa";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  platformOperatorMessagesByLocale,
} from "@/lib/i18n/platform-operator-foundation";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

type AdminMfaSetupPageProps = {
  searchParams: Promise<{
    next?: string;
    locale?: string;
  }>;
};

export default async function AdminMfaSetupPage({
  searchParams,
}: AdminMfaSetupPageProps) {
  const params =
    await searchParams;

  const storedLocale =
    await getStoredAppLocale();

  const locale =
    normalizeAppLocale(
      params.locale ??
      storedLocale
    );

  const nextPath =
    sanitizePlatformOperatorNextPath(
      params.next
    );

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  if (
    !user
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        next:
          nextPath,
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  const {
    data:
      profile,
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
    !profile ||
    ![
      "admin",
      "manager",
      "clinic_manager",
    ].includes(
      profile.role
    ) ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data:
      assurance,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (
    assurance
      ?.currentLevel ===
    "aal2"
  ) {
    redirect(
      nextPath
    );
  }

  const {
    data:
      factors,
  } =
    await supabase.auth.mfa
      .listFactors();

  if (
    (
      factors?.totp
        ?.length ??
      0
    ) >
    0
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        next:
          nextPath,
      });

    redirect(
      `/mfa/admin/verify?${parameters.toString()}`
    );
  }

  return (
    <NextIntlClientProvider
      locale={
        locale
      }
      messages={
        platformOperatorMessagesByLocale[
          locale
        ]
      }
    >
      <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-6">
          <AdminMfaSetupForm
            nextPath={
              nextPath
            }
          />
        </main>

        <PublicFooter />
      </div>
    </NextIntlClientProvider>
  );
}
