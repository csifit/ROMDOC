import type { AppLocale } from "@/lib/i18n/app-locale";

export const TELEHEALTH_CONSENT_VERSION = "2026-09-02";

export const TELEHEALTH_PUBLIC_ORIGIN = "https://www.romdoc.fit";

export const JOINABLE_TELEHEALTH_PAYMENT_STATUSES = [
  "paid",
  "partially_refunded",
] as const;

export function isJoinableTelehealthPaymentStatus(
  status: string | null | undefined
) {
  return JOINABLE_TELEHEALTH_PAYMENT_STATUSES.some(
    (joinableStatus) => joinableStatus === status
  );
}

export const TELEHEALTH_CONSENT_COPY = {
  ro: "Înțeleg că o consultație video poate să nu înlocuiască un examen fizic. Profesionistul poate recomanda o consultație în persoană sau investigații suplimentare. Plata acoperă consultația video programată și nu garantează rezolvarea completă la distanță. Conținutul audio și video nu este înregistrat, transcris sau stocat de RomDoc ori Daily.",
  en: "I understand that a video consultation may not replace an in-person examination. The professional may recommend an in-person visit or additional investigations. Payment covers the scheduled video consultation and does not guarantee that the matter can be resolved remotely. Audio and video are not recorded, transcribed, or stored by RomDoc or Daily.",
  de: "Ich verstehe, dass eine Videosprechstunde eine persönliche Untersuchung möglicherweise nicht ersetzt. Die Fachperson kann einen persönlichen Termin oder weitere Untersuchungen empfehlen. Die Zahlung deckt die geplante Videosprechstunde ab und garantiert nicht, dass das Anliegen aus der Ferne vollständig geklärt werden kann. Audio und Video werden weder von RomDoc noch von Daily aufgezeichnet, transkribiert oder gespeichert.",
} as const;

export const SPOKEN_LANGUAGE_OPTIONS = [
  { code: "ro", labels: { ro: "Română", en: "Romanian", de: "Rumänisch" } },
  { code: "en", labels: { ro: "Engleză", en: "English", de: "Englisch" } },
  { code: "de", labels: { ro: "Germană", en: "German", de: "Deutsch" } },
  { code: "fr", labels: { ro: "Franceză", en: "French", de: "Französisch" } },
  { code: "it", labels: { ro: "Italiană", en: "Italian", de: "Italienisch" } },
  { code: "es", labels: { ro: "Spaniolă", en: "Spanish", de: "Spanisch" } },
  { code: "hu", labels: { ro: "Maghiară", en: "Hungarian", de: "Ungarisch" } },
  { code: "uk", labels: { ro: "Ucraineană", en: "Ukrainian", de: "Ukrainisch" } },
  { code: "ru", labels: { ro: "Rusă", en: "Russian", de: "Russisch" } },
] as const;

export type SpokenLanguageCode = (typeof SPOKEN_LANGUAGE_OPTIONS)[number]["code"];

export function isSpokenLanguageCode(value: string): value is SpokenLanguageCode {
  return SPOKEN_LANGUAGE_OPTIONS.some((language) => language.code === value);
}

export function getTelehealthReferencePath(
  reference: string,
  locale?: AppLocale
) {
  const path = `/telehealth/${encodeURIComponent(reference)}`;

  return locale
    ? `${path}?locale=${encodeURIComponent(locale)}`
    : path;
}

export function getPublicTelehealthUrl(
  reference: string,
  locale?: AppLocale
) {
  return `${TELEHEALTH_PUBLIC_ORIGIN}${getTelehealthReferencePath(reference, locale)}`;
}
