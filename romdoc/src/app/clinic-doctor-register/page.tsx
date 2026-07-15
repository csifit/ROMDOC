import {
  getLocale,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import ClinicInvitedDoctorRegisterForm from "@/components/clinic-manager/clinic-invited-doctor-register-form";
import PublicFooter from "@/components/public/public-footer";
import {
  type AppLocale,
} from "@/i18n/routing";
import {
  createClient,
} from "@/lib/supabase/server";

type ClinicDoctorRegisterPageProps = {
  searchParams: Promise<{
    token?: string;
    email?: string;
    locale?: string;
  }>;
};

type TranslationRow = {
  locale: string;
  name: string;
};

type SpecialtyRow = {
  id: string;
  slug: string;
  specialty_translations:
    | TranslationRow[]
    | null;
};

function getSafeToken(
  value: string | undefined
) {
  return typeof value === "string"
    ? value
        .trim()
        .slice(0, 500)
    : "";
}

function getSafeEmail(
  value: string | undefined
) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .slice(0, 320)
    : "";
}

function resolveLocale(
  requestedLocale:
    | string
    | undefined,
  requestLocale: AppLocale
): AppLocale {
  if (
    requestedLocale === "ro" ||
    requestedLocale === "en" ||
    requestedLocale === "de"
  ) {
    return requestedLocale;
  }

  return requestLocale;
}

function getLocalizedName(
  translations:
    | TranslationRow[]
    | null,
  locale: AppLocale,
  fallback: string
) {
  return (
    translations?.find(
      (translation) =>
        translation.locale ===
        locale
    )?.name ??
    translations?.find(
      (translation) =>
        translation.locale ===
        "ro"
    )?.name ??
    translations?.[0]?.name ??
    fallback
  );
}

export default async function ClinicDoctorRegisterPage({
  searchParams,
}: ClinicDoctorRegisterPageProps) {
  const parameters =
    await searchParams;

  const token =
    getSafeToken(
      parameters.token
    );

  const invitedEmail =
    getSafeEmail(
      parameters.email
    );

  const requestLocale =
    (await getLocale()) as AppLocale;

  const locale =
    resolveLocale(
      parameters.locale,
      requestLocale
    );

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const {
    data: specialtiesData,
    error: specialtiesError,
  } = await supabase
    .from("specialties")
    .select(`
      id,
      slug,
      specialty_translations (
        locale,
        name
      )
    `)
    .order("slug");

  if (specialtiesError) {
    console.error(
      "Clinic invited doctor registration specialties query failed:",
      specialtiesError
    );
  }

  const specialtyRows =
    (specialtiesData as unknown as
      | SpecialtyRow[]
      | null) ?? [];

  const specialties =
    specialtyRows
      .map((specialty) => ({
        id: specialty.id,

        name:
          getLocalizedName(
            specialty
              .specialty_translations,
            locale,
            specialty.slug
          ),
      }))
      .sort((first, second) =>
        first.name.localeCompare(
          second.name,
          locale
        )
      );

  const hasInvitationData =
    Boolean(
      token &&
      invitedEmail
    );

  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        {hasInvitationData ? (
          <ClinicInvitedDoctorRegisterForm
            token={token}
            invitedEmail={
              invitedEmail
            }
            specialties={
              specialties
            }
            locale={locale}
          />
        ) : (
          <section className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Link invitație invalid
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Linkul invitației nu
              conține tokenul și
              adresa de e-mail
              necesare. Solicită
              clinicii să îți trimită
              o invitație nouă.
            </p>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
