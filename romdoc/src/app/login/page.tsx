import {
  NextIntlClientProvider,
} from "next-intl";

import LoginForm from "@/components/auth/login-form";
import AppLocaleCookieSync from "@/components/i18n/app-locale-cookie-sync";
import PublicFooter from "@/components/public/public-footer";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

import roMessages from "../../../messages/ro.json";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";

type LoginPageProps = {
  searchParams: Promise<{
    locale?: string;
  }>;
};

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const parameters =
    await searchParams;

  const locale =
    normalizeAppLocale(
      parameters.locale
    );

  const messages =
    messagesByLocale[locale];

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
    >
      <AppLocaleCookieSync
        locale={locale}
      />

      <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <LoginForm
              locale={locale}
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
