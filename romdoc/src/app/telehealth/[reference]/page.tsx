import { getLocale } from "next-intl/server";

import TelehealthCall from "@/components/telehealth/telehealth-call";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";

export default async function TelehealthPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const locale = normalizeAppLocale(await getLocale());

  return <TelehealthCall reference={reference} locale={locale} />;
}
