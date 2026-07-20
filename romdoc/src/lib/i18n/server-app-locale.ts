import {
  cookies,
} from "next/headers";

import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

export async function getStoredAppLocale():
  Promise<AppLocale> {
  const cookieStore =
    await cookies();

  return normalizeAppLocale(
    cookieStore.get(
      "NEXT_LOCALE"
    )?.value
  );
}
