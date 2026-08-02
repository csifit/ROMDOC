import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import PatientMedicalFolderSharing from "@/components/patient/patient-medical-folder-sharing";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function PatientFolderSharingPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientPages.folder.sharing.page",
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
          "/patient-dashboard/folder/sharing",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  if (
    !user.email_confirmed_at
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        type:
          "patient",
        next:
          "/patient-dashboard/folder/sharing",
      });

    if (user.email) {
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
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
          <p className="text-sm font-semibold text-[#036661]">
            {t(
              "eyebrow"
            )}
          </p>

          <div className="mt-[8px] flex flex-col justify-between gap-[21px] sm:flex-row sm:items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t(
                  "title"
                )}
              </h1>

              <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
                {t(
                  "description"
                )}
              </p>
            </div>

            <Link
              href="/patient-dashboard/folder"
              className="romdoc-button romdoc-button-secondary romdoc-button-sm"
            >
              {t(
                "back"
              )}
            </Link>
          </div>

          <div className="mt-[21px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-sm leading-6 text-blue-950">
            {t(
              "securityNotice"
            )}
          </div>

          <div className="mt-[13px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm leading-6 text-amber-950">
            {t(
              "futureNotice"
            )}
          </div>
        </header>

        <PatientMedicalFolderSharing />
      </div>
    </main>
  );
}
