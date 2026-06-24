import {defineRouting} from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ro", "en"],
  defaultLocale: "ro",
  localePrefix: "always",
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/medici": {ro: "/medici", en: "/doctors"},
    "/medici/[specialty]": {ro: "/medici/[specialty]", en: "/doctors/[specialty]"},
    "/medici/[specialty]/[city]": {ro: "/medici/[specialty]/[city]", en: "/doctors/[specialty]/[city]"},
    "/doctor/[slug]": "/doctor/[slug]",
    "/specialitati": {ro: "/specialitati", en: "/specialties"}
  }
});

export type AppLocale = (typeof routing.locales)[number];
