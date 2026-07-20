import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import PatientReminderPreferences from "@/components/patient/patient-reminder-preferences";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function PatientReminderPreferencesPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientPages.reminders.page",
    });

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
          "/patient-dashboard/reminders",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  if (
    !user
      .email_confirmed_at
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        type:
          "patient",
        next:
          "/patient-dashboard/reminders",
      });

    if (
      user.email
    ) {
      parameters.set(
        "email",
        user.email
      );
    }

    redirect(
      `/check-email?${parameters.toString()}`
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
      "patient" ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[21px] sm:px-[21px] sm:py-[34px]">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/patient-dashboard"
          className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-[#036661] transition hover:border-[#036661]"
        >
          ← {t(
            "back"
          )}
        </Link>

        <div className="mt-[21px]">
          <PatientReminderPreferences />
        </div>
      </div>
    </main>
  );
}
