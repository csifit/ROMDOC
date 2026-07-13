import createMiddleware
  from "next-intl/middleware";
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  getPathname,
} from "@/i18n/navigation";
import {
  type AppLocale,
  routing,
} from "@/i18n/routing";

const handleI18nRouting =
  createMiddleware(routing);

const localeNeutralPrefixes = [
  "/api",
  "/auth",
  "/mfa",
  "/login",
  "/register",
  "/dashboard",
  "/admin",
  "/manager-dashboard",
  "/clinic-manager-dashboard",
  "/doctor-dashboard",
  "/staff-dashboard",
  "/patient-dashboard",
  "/doctor-application",
  "/appointments",
  "/medical-folder",
  "/check-email",
  "/forgot-password",
  "/reset-password",
  "/set-password",
  "/support",
] as const;

const publicEntryPaths = [
  "/",
  "/medici",
  "/specialitati",
  "/ghid-pacienti",
  "/ghid-medici-personal",
  "/termeni-si-conditii",
  "/confidentialitate",
  "/cookies",
  "/informatii-legale",
  "/contact",
  "/oferta-clinici",
] as const;

type PublicEntryPath =
  (typeof publicEntryPaths)[number];

const canonicalSegments = {
  ro: {
    directory: "medici",
    doctor: "doctor",
    specialties: "specialitati",
    patientGuide: "ghid-pacienti",
    doctorStaffGuide:
      "ghid-medici-personal",
    terms: "termeni-si-conditii",
    privacy: "confidentialitate",
    cookies: "cookies",
    legal: "informatii-legale",
    contact: "contact",
    clinicOffer: "oferta-clinici",
  },
  en: {
    directory: "doctors",
    doctor: "doctor",
    specialties: "specialties",
    patientGuide: "patient-guide",
    doctorStaffGuide:
      "doctor-staff-guide",
    terms: "terms-and-conditions",
    privacy: "privacy-policy",
    cookies: "cookie-policy",
    legal: "legal-information",
    contact: "contact",
    clinicOffer: "clinic-offer",
  },
  de: {
    directory: "aerzte",
    doctor: "arzt",
    specialties: "fachrichtungen",
    patientGuide:
      "patientenratgeber",
    doctorStaffGuide:
      "ratgeber-aerzte-personal",
    terms:
      "allgemeine-geschaeftsbedingungen",
    privacy: "datenschutz",
    cookies: "cookie-richtlinie",
    legal:
      "rechtliche-informationen",
    contact: "kontakt",
    clinicOffer:
      "angebot-fuer-kliniken",
  },
} as const;

type CanonicalRouteKey =
  keyof (typeof canonicalSegments)["ro"];

const segmentRouteKeys: Record<
  string,
  CanonicalRouteKey
> = {
  medici: "directory",
  doctors: "directory",
  aerzte: "directory",

  doctor: "doctor",
  arzt: "doctor",

  specialitati: "specialties",
  specialties: "specialties",
  fachrichtungen: "specialties",

  "ghid-pacienti": "patientGuide",
  "patient-guide": "patientGuide",
  patientenratgeber: "patientGuide",

  "ghid-medici-personal":
    "doctorStaffGuide",
  "doctor-staff-guide":
    "doctorStaffGuide",
  "ratgeber-aerzte-personal":
    "doctorStaffGuide",

  "termeni-si-conditii": "terms",
  "terms-and-conditions": "terms",
  "allgemeine-geschaeftsbedingungen":
    "terms",

  confidentialitate: "privacy",
  "privacy-policy": "privacy",
  datenschutz: "privacy",

  cookies: "cookies",
  "cookie-policy": "cookies",
  "cookie-richtlinie": "cookies",

  "informatii-legale": "legal",
  "legal-information": "legal",
  "rechtliche-informationen":
    "legal",

  contact: "contact",
  kontakt: "contact",

  "oferta-clinici": "clinicOffer",
  "clinic-offer": "clinicOffer",
  "angebot-fuer-kliniken":
    "clinicOffer",
};

function isLocaleNeutralPath(
  pathname: string
) {
  return localeNeutralPrefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(
        `${prefix}/`
      )
  );
}

function isPublicEntryPath(
  pathname: string
): pathname is PublicEntryPath {
  return publicEntryPaths.includes(
    pathname as PublicEntryPath
  );
}

function isAppLocale(
  value: string | undefined
): value is AppLocale {
  return routing.locales.includes(
    value as AppLocale
  );
}

function getPreferredLocale(
  request: NextRequest
): AppLocale {
  const cookieLocale =
    request.cookies.get(
      "NEXT_LOCALE"
    )?.value;

  if (isAppLocale(cookieLocale)) {
    return cookieLocale;
  }

  return routing.defaultLocale;
}

function redirectPublicEntry(
  request: NextRequest,
  pathname: PublicEntryPath
) {
  const locale =
    getPreferredLocale(request);

  const localizedPathname =
    getPathname({
      locale,
      href: pathname,
    });

  const redirectUrl =
    request.nextUrl.clone();

  redirectUrl.pathname =
    localizedPathname;

  return NextResponse.redirect(
    redirectUrl
  );
}

function getCanonicalRedirectPath(
  pathname: string
) {
  const segments =
    pathname.split("/");

  const locale = segments[1];
  const firstPublicSegment =
    segments[2];

  if (
    !isAppLocale(locale) ||
    !firstPublicSegment
  ) {
    return null;
  }

  const routeKey =
    segmentRouteKeys[
      firstPublicSegment
    ];

  if (!routeKey) {
    return null;
  }

  const canonicalSegment =
    canonicalSegments[locale][
      routeKey
    ];

  if (
    firstPublicSegment ===
    canonicalSegment
  ) {
    return null;
  }

  segments[2] =
    canonicalSegment;

  return segments.join("/");
}

function redirectLegacyLocalizedPath(
  request: NextRequest,
  canonicalPathname: string
) {
  const redirectUrl =
    request.nextUrl.clone();

  redirectUrl.pathname =
    canonicalPathname;

  return NextResponse.redirect(
    redirectUrl,
    308
  );
}

export default function proxy(
  request: NextRequest
) {
  const {
    pathname,
  } = request.nextUrl;

  if (
    isLocaleNeutralPath(pathname)
  ) {
    return NextResponse.next();
  }

  const canonicalRedirectPath =
    getCanonicalRedirectPath(
      pathname
    );

  if (canonicalRedirectPath) {
    return redirectLegacyLocalizedPath(
      request,
      canonicalRedirectPath
    );
  }

  if (
    isPublicEntryPath(pathname)
  ) {
    return redirectPublicEntry(
      request,
      pathname
    );
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    "/",
    "/(ro|en|de)/:path*",
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
