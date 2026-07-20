import {
  NextIntlClientProvider,
} from "next-intl";
import {
  getLocale,
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import ClinicInvitedDoctorRegisterForm from "@/components/clinic-manager/clinic-invited-doctor-register-form";
import PublicFooter from "@/components/public/public-footer";
import {
  type AppLocale,
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

import roMessages from "../../../messages/ro.json";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";

const messagesByLocale = {
  ro:
    roMessages,
  en:
    enMessages,
  de:
    deMessages,
} as const;

type ClinicDoctorRegisterPageProps = {
  searchParams:
    Promise<{
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

function safeToken(
  value:
    | string
    | undefined
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .slice(
          0,
          500
        )
    : "";
}

function safeEmail(
  value:
    | string
    | undefined
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .toLowerCase()
        .slice(
          0,
          320
        )
    : "";
}

export default async function ClinicDoctorRegisterPage({
  searchParams,
}: ClinicDoctorRegisterPageProps) {
  const parameters =
    await searchParams;

  const token =
    safeToken(
      parameters.token
    );

  const invitedEmail =
    safeEmail(
      parameters.email
    );

  const requestLocale =
    normalizeAppLocale(
      await getLocale()
    );

  const locale:
    AppLocale =
    normalizeAppLocale(
      parameters.locale ??
      requestLocale
    );

  const t =
    await getTranslations({
      locale,
      namespace:
        "ClinicOrganisationDashboard.invitedDoctorPage",
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

  if (
    user
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data:
      specialtiesData,
    error:
      specialtiesError,
  } =
    await supabase
      .from(
        "specialties"
      )
      .select(`
        id,
        slug,
        specialty_translations (
          locale,
          name
        )
      `)
      .order(
        "slug"
      );

  if (
    specialtiesError
  ) {
    console.error(
      "Clinic invited doctor registration specialties query failed:",
      specialtiesError
    );
  }

  const specialtyRows =
    (
      specialtiesData as unknown as
        | SpecialtyRow[]
        | null
    ) ??
    [];

  const specialties =
    specialtyRows
      .map(
        (
          specialty
        ) => ({
          id:
            specialty.id,

          name:
            selectTranslation(
              specialty
                .specialty_translations,
              locale
            )?.name ??
            specialty.slug,
        })
      )
      .sort(
        (
          first,
          second
        ) =>
          first.name
            .localeCompare(
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
    <NextIntlClientProvider
      locale={
        locale
      }
      messages={
        messagesByLocale[
          locale
        ]
      }
    >
      <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
        <main className="flex flex-1 items-center justify-center px-[21px] py-[55px]">
          {hasInvitationData ? (
            <ClinicInvitedDoctorRegisterForm
              token={
                token
              }
              invitedEmail={
                invitedEmail
              }
              specialties={
                specialties
              }
            />
          ) : (
            <section className="w-full max-w-xl rounded-[21px] border border-red-200 bg-white p-[21px] text-center shadow-sm sm:p-[34px]">
              <h1 className="text-2xl font-bold text-gray-900">
                {t(
                  "invalidTitle"
                )}
              </h1>

              <p className="mt-[13px] text-sm leading-6 text-gray-600">
                {t(
                  "invalidDescription"
                )}
              </p>
            </section>
          )}
        </main>

        <PublicFooter
          locale={
            locale
          }
        />
      </div>
    </NextIntlClientProvider>
  );
}
