import {
  type AppLocale,
} from "@/i18n/routing";

export const SUPPORTED_LOCALES = [
  "ro",
  "en",
  "de",
] as const satisfies readonly AppLocale[];

const LOCALE_NEUTRAL_PREFIXES = [
  "/login",
  "/register",
  "/dashboard",
  "/admin",
  "/manager-dashboard",
  "/clinic-manager-dashboard",
  "/doctor-dashboard",
  "/staff-dashboard",
  "/patient-dashboard",
  "/api",
  "/auth",
  "/check-email",
] as const;

const FIXED_PUBLIC_PATHS: Record<
  string,
  Record<AppLocale, string>
> = {
  "/": {
    ro: "/",
    en: "/",
    de: "/",
  },
  "/medici": {
    ro: "/medici",
    en: "/doctors",
    de: "/aerzte",
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
};

type SplitHref = {
  pathname: string;
  suffix: string;
};

function splitHref(href: string): SplitHref {
  const suffixIndex = href.search(/[?#]/);

  if (suffixIndex === -1) {
    return {
      pathname: href,
      suffix: "",
    };
  }

  return {
    pathname: href.slice(0, suffixIndex),
    suffix: href.slice(suffixIndex),
  };
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const withLeadingSlash = pathname.startsWith("/")
    ? pathname
    : `/${pathname}`;

  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

function isExternalOrSpecialHref(href: string) {
  return (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//")
  );
}

export function isSupportedLocale(
  value: string
): value is AppLocale {
  return SUPPORTED_LOCALES.includes(
    value as AppLocale
  );
}

export function getLocaleFromPathname(
  pathname: string
): AppLocale | null {
  const normalized =
    normalizePathname(pathname);
  const firstSegment =
    normalized.split("/")[1] ?? "";

  return isSupportedLocale(firstSegment)
    ? firstSegment
    : null;
}

export function stripLocalePrefix(
  pathname: string
) {
  const normalized =
    normalizePathname(pathname);
  const locale =
    getLocaleFromPathname(normalized);

  if (!locale) {
    return normalized;
  }

  const withoutLocale = normalized.slice(
    locale.length + 1
  );

  return withoutLocale || "/";
}

export function isLocaleNeutralPath(
  pathname: string
) {
  const normalized =
    stripLocalePrefix(pathname);

  return LOCALE_NEUTRAL_PREFIXES.some(
    (prefix) =>
      normalized === prefix ||
      normalized.startsWith(`${prefix}/`)
  );
}

function translateDoctorPath(
  locale: AppLocale,
  pathname: string
) {
  if (!pathname.startsWith("/doctor/")) {
    return null;
  }

  const remainder = pathname.slice(
    "/doctor".length
  );

  return locale === "de"
    ? `/arzt${remainder}`
    : `/doctor${remainder}`;
}

function translateDoctorsDirectoryPath(
  locale: AppLocale,
  pathname: string
) {
  if (!pathname.startsWith("/medici/")) {
    return null;
  }

  const remainder = pathname.slice(
    "/medici".length
  );

  const base =
    locale === "ro"
      ? "/medici"
      : locale === "en"
        ? "/doctors"
        : "/aerzte";

  return `${base}${remainder}`;
}

function translateKnownPublicPath(
  locale: AppLocale,
  pathname: string
) {
  const fixed =
    FIXED_PUBLIC_PATHS[pathname];

  if (fixed) {
    return fixed[locale];
  }

  return (
    translateDoctorPath(
      locale,
      pathname
    ) ??
    translateDoctorsDirectoryPath(
      locale,
      pathname
    ) ??
    pathname
  );
}

export function localizePublicPath(
  locale: AppLocale,
  href: string
) {
  if (isExternalOrSpecialHref(href)) {
    return href;
  }

  const {
    pathname,
    suffix,
  } = splitHref(href);

  const normalized =
    stripLocalePrefix(pathname);

  if (isLocaleNeutralPath(normalized)) {
    return `${normalized}${suffix}`;
  }

  const translated =
    translateKnownPublicPath(
      locale,
      normalized
    );

  const localizedPath =
    translated === "/"
      ? `/${locale}`
      : `/${locale}${translated}`;

  return `${localizedPath}${suffix}`;
}
