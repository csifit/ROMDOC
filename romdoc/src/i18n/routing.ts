import {
  defineRouting,
} from "next-intl/routing";

export const routing =
  defineRouting({
    locales: ["ro", "en", "de"],
    defaultLocale: "ro",
    localePrefix: "always",
    localeDetection: false,

    pathnames: {
      "/": "/",

      "/medici": {
        ro: "/medici",
        en: "/doctors",
        de: "/aerzte",
      },

      "/medici/[specialty]": {
        ro: "/medici/[specialty]",
        en: "/doctors/[specialty]",
        de: "/aerzte/[specialty]",
      },

      "/medici/[specialty]/[city]": {
        ro:
          "/medici/[specialty]/[city]",
        en:
          "/doctors/[specialty]/[city]",
        de:
          "/aerzte/[specialty]/[city]",
      },

      "/doctor/[slug]": {
        ro: "/doctor/[slug]",
        en: "/doctor/[slug]",
        de: "/arzt/[slug]",
      },

      "/specialitati": {
        ro: "/specialitati",
        en: "/specialties",
        de: "/fachrichtungen",
      },

      "/ghid-pacienti": {
        ro: "/ghid-pacienti",
        en: "/patient-guide",
        de: "/patientenratgeber",
      },

      "/ghid-medici-personal": {
        ro: "/ghid-medici-personal",
        en: "/doctor-staff-guide",
        de: "/ratgeber-aerzte-personal",
      },
    },
  });

export type AppLocale =
  (typeof routing.locales)[number];