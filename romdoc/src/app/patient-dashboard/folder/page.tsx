import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import PatientMedicalProfile from "@/components/medical-folder/patient-medical-profile";
import PatientMedicalFolder from "@/components/patient/patient-medical-folder";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function PatientFolderPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientPages.folder.page",
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
          "/patient-dashboard/folder",
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
          "/patient-dashboard/folder",
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
      .select(`
        role,
        account_status,
        first_name,
        last_name
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

  const patientName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

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
                {patientName
                  ? t(
                      "descriptionWithName",
                      {
                        name:
                          patientName,
                      }
                    )
                  : t(
                      "description"
                    )}
              </p>
            </div>

            <Link
              href="/patient-dashboard"
              className="romdoc-button romdoc-button-secondary romdoc-button-sm"
            >
              {t(
                "back"
              )}
            </Link>
          </div>

          <div className="mt-[21px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-sm leading-6 text-blue-950">
            {t(
              "privacyNotice"
            )}
          </div>
        </header>

        <PatientMedicalProfile />

        <PatientMedicalFolder />
      </div>
    </main>
  );
}
