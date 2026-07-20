import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import DoctorVerificationForm from "@/components/doctor/doctor-verification-form";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  requireActiveProfile,
} from "@/lib/auth/require-active-profile";

export default async function DoctorVerificationPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "DoctorConfiguration.verificationPage",
    });

  const {
    profile,
  } =
    await requireActiveProfile();

  if (
    profile.role !==
    "doctor"
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

        <div className="mt-8">
          <DoctorVerificationForm />
        </div>
      </div>
    </main>
  );
}
