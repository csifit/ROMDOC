import {hasLocale} from "next-intl";
import {getRequestConfig} from "next-intl/server";
import {routing} from "@/i18n/routing";

export default getRequestConfig(async ({requestLocale}) => {
  const requestedLocale = await requestLocale;
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  return {
    locale,
    timeZone: "Europe/Bucharest",
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
