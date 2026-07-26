import type { AppLocale } from "@/lib/i18n/app-locale";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const routeSegments = {
  directory: { ro: "medici", en: "doctors", de: "aerzte" },
  doctor: { ro: "doctor", en: "doctor", de: "arzt" },
  specialties: { ro: "specialitati", en: "specialties", de: "fachrichtungen" },
  patientGuide: {
    ro: "ghid-pacienti",
    en: "patient-guide",
    de: "patientenratgeber",
  },
  doctorStaffGuide: {
    ro: "ghid-medici-personal",
    en: "doctor-staff-guide",
    de: "ratgeber-aerzte-personal",
  },
  terms: {
    ro: "termeni-si-conditii",
    en: "terms-and-conditions",
    de: "allgemeine-geschaeftsbedingungen",
  },
  privacy: { ro: "confidentialitate", en: "privacy-policy", de: "datenschutz" },
  cookies: { ro: "cookies", en: "cookie-policy", de: "cookie-richtlinie" },
  legal: {
    ro: "informatii-legale",
    en: "legal-information",
    de: "rechtliche-informationen",
  },
  contact: { ro: "contact", en: "contact", de: "kontakt" },
  clinicOffer: {
    ro: "oferta-clinici",
    en: "clinic-offer",
    de: "angebot-fuer-kliniken",
  },
} as const;

type RouteSegmentKey = keyof typeof routeSegments;

const segmentToRouteKey = new Map<string, RouteSegmentKey>();

for (const [routeKey, localizedSegments] of Object.entries(routeSegments)) {
  for (const segment of Object.values(localizedSegments)) {
    segmentToRouteKey.set(segment, routeKey as RouteSegmentKey);
  }
}

function isLocaleSegment(value: string | undefined): value is AppLocale {
  return value === "ro" || value === "en" || value === "de";
}

export function setAppLocaleCookie(locale: AppLocale) {
  document.cookie = [
    `NEXT_LOCALE=${locale}`,
    "Path=/",
    `Max-Age=${ONE_YEAR_IN_SECONDS}`,
    "SameSite=Lax",
  ].join("; ");
}

export function getLocalizedBrowserPath(
  pathname: string,
  locale: AppLocale
) {
  const segments = pathname.split("/");
  const currentLocale = segments[1];

  if (!isLocaleSegment(currentLocale)) {
    return pathname;
  }

  segments[1] = locale;

  const publicSegment = segments[2];
  const routeKey = publicSegment
    ? segmentToRouteKey.get(publicSegment)
    : undefined;

  if (routeKey) {
    segments[2] = routeSegments[routeKey][locale];
  }

  return segments.join("/") || `/${locale}`;
}

export function switchBrowserLocale(locale: AppLocale) {
  setAppLocaleCookie(locale);
  document.documentElement.lang = locale;

  const nextPathname = getLocalizedBrowserPath(
    window.location.pathname,
    locale
  );

  window.location.assign(
    `${nextPathname}${window.location.search}${window.location.hash}`
  );
}
