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

      "/medici/cautare": {
        ro: "/medici/cautare",
        en: "/doctors/search",
        de: "/aerzte/suche",
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

      "/termeni-si-conditii": {
        ro: "/termeni-si-conditii",
        en: "/terms-and-conditions",
        de:
          "/allgemeine-geschaeftsbedingungen",
      },

      "/confidentialitate": {
        ro: "/confidentialitate",
        en: "/privacy-policy",
        de: "/datenschutz",
      },

      "/cookies": {
        ro: "/cookies",
        en: "/cookie-policy",
        de: "/cookie-richtlinie",
      },

      "/informatii-legale": {
        ro: "/informatii-legale",
        en: "/legal-information",
        de:
          "/rechtliche-informationen",
      },

      "/contact": {
        ro: "/contact",
        en: "/contact",
        de: "/kontakt",
      },

      "/oferta-clinici": {
        ro: "/oferta-clinici",
        en: "/clinic-offer",
        de:
          "/angebot-fuer-kliniken",
      },
    },
  });

export type AppLocale =
  (typeof routing.locales)[number];
