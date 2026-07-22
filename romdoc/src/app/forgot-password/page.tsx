import {
  NextIntlClientProvider,
} from "next-intl";

import ForgotPasswordForm from "@/components/auth/forgot-password-form";
import PublicFooter from "@/components/public/public-footer";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

import deMessages from "../../../messages/de.json";
import enMessages from "../../../messages/en.json";
import roMessages from "../../../messages/ro.json";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    locale?: string;
    next?: string;
  }>;
};

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

function getSafeNextPath(
  value: string | undefined
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/login";
  }

  return value;
}

export default async function
ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const parameters = searchParams
    ? await searchParams
    : {};

  const locale =
    normalizeAppLocale(
      parameters.locale
    );

  const nextPath =
    getSafeNextPath(
      parameters.next
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
            <ForgotPasswordForm
              locale={locale}
              nextPath={nextPath}
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
