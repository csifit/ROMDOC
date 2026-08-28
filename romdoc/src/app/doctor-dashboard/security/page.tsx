import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import DoctorSecuritySettings from "@/components/doctor/doctor-security-settings";
import SharedAccountSecuritySettings from "@/components/security/shared-account-security-settings";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function DoctorSecurityPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "DoctorConfiguration.securityPage",
    });

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  if (!user) {
    const query =
      new URLSearchParams({
        locale,
        next:
          "/doctor-dashboard/security",
      });

    redirect(
      `/login?${query.toString()}`
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
    profile.role !==
      "doctor" ||
    profile
      .account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
            {t(
              "eyebrow"
            )}
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            {t(
              "title"
            )}
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-gray-600">
            {t(
              "description"
            )}
          </p>
        </header>

        <div className="mt-[34px]">
          <SharedAccountSecuritySettings
            locale={locale}
          />
        </div>

        <div className="mt-[21px]">
          <DoctorSecuritySettings />
        </div>
      </div>
    </main>
  );
}
