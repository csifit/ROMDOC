import TelehealthCall from "@/components/telehealth/telehealth-call";
import { isAppLocale } from "@/lib/i18n/app-locale";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";

export default async function TelehealthPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  const { reference } = await params;
  const { locale: requestedLocale } = await searchParams;
  const locale =
    typeof requestedLocale === "string" &&
    isAppLocale(requestedLocale)
      ? requestedLocale
      : await getStoredAppLocale();

  return <TelehealthCall reference={reference} locale={locale} />;
}
