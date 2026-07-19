export const APP_LOCALES = [
  "ro",
  "en",
  "de",
] as const;

export type AppLocale =
  (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE:
  AppLocale = "ro";

export type TranslationRecord = {
  locale: string;
};

export function isAppLocale(
  value: string
): value is AppLocale {
  return APP_LOCALES.includes(
    value as AppLocale
  );
}

export function normalizeAppLocale(
  value:
    | string
    | null
    | undefined
): AppLocale {
  return value &&
    isAppLocale(value)
    ? value
    : DEFAULT_APP_LOCALE;
}

export function selectTranslation<
  T extends TranslationRecord,
>(
  translations:
    | T[]
    | null
    | undefined,
  locale:
    | AppLocale
    | string
    | null
    | undefined,
  fallbackLocale:
    AppLocale = DEFAULT_APP_LOCALE
): T | null {
  if (
    !translations ||
    translations.length === 0
  ) {
    return null;
  }

  const normalizedLocale =
    normalizeAppLocale(locale);

  return (
    translations.find(
      (translation) =>
        translation.locale ===
        normalizedLocale
    ) ??
    translations.find(
      (translation) =>
        translation.locale ===
        fallbackLocale
    ) ??
    translations[0] ??
    null
  );
}

export function selectTranslatedField<
  T extends TranslationRecord,
  K extends keyof T,
>(
  translations:
    | T[]
    | null
    | undefined,
  locale:
    | AppLocale
    | string
    | null
    | undefined,
  field: K,
  fallbackValue:
    | T[K]
    | null = null
): T[K] | null {
  const translation =
    selectTranslation(
      translations,
      locale
    );

  const value =
    translation?.[field];

  if (
    value === null ||
    value === undefined ||
    (
      typeof value ===
        "string" &&
      value.trim().length === 0
    )
  ) {
    return fallbackValue;
  }

  return value;
}
