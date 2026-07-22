import {
  DEFAULT_APP_LOCALE,
  isAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";

export type AppointmentNotificationLocale =
  AppLocale;

type LocalizedRecord = {
  locale: string;
};

type NotificationEntity =
  | "doctor"
  | "clinic";

const ENTITY_FALLBACKS:
  Record<
    AppointmentNotificationLocale,
    Record<
      NotificationEntity,
      string
    >
  > = {
    ro: {
      doctor: "Medic RomDoc",
      clinic: "Clinică",
    },
    en: {
      doctor: "RomDoc Doctor",
      clinic: "Clinic",
    },
    de: {
      doctor: "RomDoc-Arzt",
      clinic: "Klinik",
    },
  };

export function
resolveAppointmentNotificationLocale(
  ...candidates: unknown[]
): AppointmentNotificationLocale {
  for (
    const candidate of
    candidates
  ) {
    if (
      typeof candidate ===
        "string" &&
      isAppLocale(candidate)
    ) {
      return candidate;
    }
  }

  return DEFAULT_APP_LOCALE;
}

export function
selectNotificationTranslation<
  T extends LocalizedRecord,
>(
  translations:
    | T[]
    | null
    | undefined,
  locale:
    AppointmentNotificationLocale
): T | null {
  if (
    !translations ||
    translations.length === 0
  ) {
    return null;
  }

  return (
    translations.find(
      (translation) =>
        translation.locale ===
        locale
    ) ??
    translations.find(
      (translation) =>
        translation.locale ===
        DEFAULT_APP_LOCALE
    ) ??
    translations[0] ??
    null
  );
}

export function
getNotificationEntityFallback(
  locale:
    AppointmentNotificationLocale,
  entity: NotificationEntity
) {
  return ENTITY_FALLBACKS[
    locale
  ][entity];
}
