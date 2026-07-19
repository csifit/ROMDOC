import {
  NextIntlClientProvider,
} from "next-intl";
import {
  redirect,
} from "next/navigation";

import RegisterForm from "@/components/auth/register-form";
import PublicFooter from "@/components/public/public-footer";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

import roMessages from "../../../messages/ro.json";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";

type RegistrationType =
  | "patient"
  | "doctor"
  | "clinic";

type RegisterPageProps = {
  searchParams: Promise<{
    type?: string;
    role?: string;
    next?: string;
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

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

function resolveRegistrationType(
  type?: string,
  role?: string
): RegistrationType {
  const requestedType =
    type ?? role;

  if (
    requestedType === "doctor"
  ) {
    return "doctor";
  }

  if (
    requestedType === "clinic" ||
    requestedType === "clinica"
  ) {
    return "clinic";
  }

  return "patient";
}

function getSafeNextPath(
  value?: string
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/patient-dashboard";
  }

  return value;
}

function getLocalizedName(
  translations:
    | TranslationRow[]
    | null,
  locale:
    | "ro"
    | "en"
    | "de",
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

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const parameters =
    await searchParams;

  const initialRegistrationType =
    resolveRegistrationType(
      parameters.type,
      parameters.role
    );

  const initialNextPath =
    getSafeNextPath(
      parameters.next
    );

  const locale =
    normalizeAppLocale(
      parameters.locale
    );

  const messages =
    messagesByLocale[locale];

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
      "Registration specialties query failed:",
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

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
    >
      <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
        <main className="flex-1 px-6 py-12">
          <div className="mx-auto flex min-h-[calc(100vh-6rem)] items-center justify-center">
            <RegisterForm
              specialties={specialties}
              locale={locale}
              initialRegistrationType={
                initialRegistrationType
              }
              initialNextPath={
                initialNextPath
              }
            />
          </div>
        </main>

        <PublicFooter
          locale={locale}
        />
      </div>
    </NextIntlClientProvider>
  );
}
