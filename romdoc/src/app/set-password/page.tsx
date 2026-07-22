import {
  NextIntlClientProvider,
} from "next-intl";

import SetPasswordForm from "@/components/auth/set-password-form";
import PublicFooter from "@/components/public/public-footer";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

import deMessages from "../../../messages/de.json";
import enMessages from "../../../messages/en.json";
import roMessages from "../../../messages/ro.json";

type SetPasswordMode =
  | "invite"
  | "recovery";

type SetPasswordPageProps = {
  searchParams?: Promise<{
    locale?: string;
    mode?: string;
    next?: string;
  }>;
};

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

function getMode(
  value: string | undefined
): SetPasswordMode {
  return value === "recovery"
    ? "recovery"
    : "invite";
}

function getSafeNextPath(
  value: string | undefined,
  fallback: string
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return fallback;
  }

  return value;
}

export default async function
SetPasswordPage({
  searchParams,
}: SetPasswordPageProps) {
  const parameters = searchParams
    ? await searchParams
    : {};

  const locale =
    normalizeAppLocale(
      parameters.locale
    );

  const mode =
    getMode(
      parameters.mode
    );

  const destination =
    getSafeNextPath(
      parameters.next,
      mode === "recovery"
        ? "/login"
        : "/staff-dashboard"
    );

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={
        messagesByLocale[
          locale
        ]
      }
    >
      <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <SetPasswordForm
              locale={locale}
              mode={mode}
              destination={
                destination
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
