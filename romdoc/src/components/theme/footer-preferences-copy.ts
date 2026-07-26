import type { AppLocale } from "@/lib/i18n/app-locale";

export type FooterPreferencesCopy = {
  triggerLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  languageTitle: string;
  languageDescription: string;
  appearanceTitle: string;
  appearanceDescription: string;
  light: string;
  dark: string;
  system: string;
  selected: string;
  close: string;
  footerText: string;
};

export const footerPreferencesCopy: Record<
  AppLocale,
  FooterPreferencesCopy
> = {
  ro: {
    triggerLabel: "Limbă și aspect",
    eyebrow: "Preferințe RomDoc",
    title: "Limbă și aspect",
    description:
      "Alege limba interfeței și aspectul folosit în panourile autentificate.",
    languageTitle: "Limbă",
    languageDescription:
      "Panourile rămân pe aceleași adrese, indiferent de limba selectată.",
    appearanceTitle: "Aspect",
    appearanceDescription:
      "Modul întunecat se aplică panourilor. Paginile publice rămân în aspectul luminos actual.",
    light: "Luminos",
    dark: "Întunecat",
    system: "Sistem",
    selected: "Selectat",
    close: "Închide preferințele",
    footerText: "Preferințe de limbă și aspect",
  },
  en: {
    triggerLabel: "Language and appearance",
    eyebrow: "RomDoc preferences",
    title: "Language and appearance",
    description:
      "Choose the interface language and the appearance used by authenticated dashboards.",
    languageTitle: "Language",
    languageDescription:
      "Dashboard addresses remain unchanged when another language is selected.",
    appearanceTitle: "Appearance",
    appearanceDescription:
      "Dark mode applies to dashboards. Public pages retain the current light appearance.",
    light: "Light",
    dark: "Dark",
    system: "System",
    selected: "Selected",
    close: "Close preferences",
    footerText: "Language and appearance preferences",
  },
  de: {
    triggerLabel: "Sprache und Darstellung",
    eyebrow: "RomDoc-Einstellungen",
    title: "Sprache und Darstellung",
    description:
      "Wählen Sie die Sprache der Oberfläche und die Darstellung der geschützten Dashboards.",
    languageTitle: "Sprache",
    languageDescription:
      "Die Dashboard-Adressen bleiben bei einem Sprachwechsel unverändert.",
    appearanceTitle: "Darstellung",
    appearanceDescription:
      "Der Dunkelmodus gilt für Dashboards. Öffentliche Seiten behalten die aktuelle helle Darstellung.",
    light: "Hell",
    dark: "Dunkel",
    system: "System",
    selected: "Ausgewählt",
    close: "Einstellungen schließen",
    footerText: "Sprach- und Darstellungsoptionen",
  },
};
