import {
  type AppLocale,
} from "@/i18n/routing";

const localePattern =
  /^\/(ro|en|de)(?=\/|$)/;

function splitHref(href: string) {
  const hashIndex =
    href.indexOf("#");

  const beforeHash =
    hashIndex >= 0
      ? href.slice(0, hashIndex)
      : href;

  const hash =
    hashIndex >= 0
      ? href.slice(hashIndex)
      : "";

  const queryIndex =
    beforeHash.indexOf("?");

  return {
    pathname:
      queryIndex >= 0
        ? beforeHash.slice(0, queryIndex)
        : beforeHash,
    query:
      queryIndex >= 0
        ? beforeHash.slice(queryIndex)
        : "",
    hash,
  };
}

function withSuffix(
  pathname: string,
  query: string,
  hash: string
) {
  return `${pathname}${query}${hash}`;
}

export function stripLocalePrefix(
  pathname: string
) {
  const stripped =
    pathname.replace(
      localePattern,
      ""
    );

  return stripped || "/";
}

export function getLocaleFromPathname(
  pathname: string
): AppLocale | null {
  const match =
    pathname.match(localePattern);

  return (
    match?.[1] as
      | AppLocale
      | undefined
  ) ?? null;
}

export function getLocalizedPublicPath(
  href: string,
  locale: AppLocale
) {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    localePattern.test(href)
  ) {
    return href;
  }

  const {
    pathname,
    query,
    hash,
  } = splitHref(href);

  if (pathname === "/") {
    return withSuffix(
      `/${locale}`,
      query,
      hash
    );
  }

  /*
   * This search route currently exists only outside [locale].
   * Keep it unprefixed until a localized route is created.
   */
  if (
    pathname === "/medici/cautare" ||
    pathname.startsWith(
      "/medici/cautare/"
    )
  ) {
    return href;
  }

  if (
    pathname === "/medici" ||
    pathname.startsWith("/medici/")
  ) {
    const translatedRoot =
      locale === "en"
        ? "/doctors"
        : locale === "de"
          ? "/aerzte"
          : "/medici";

    return withSuffix(
      `/${locale}${translatedRoot}${pathname.slice("/medici".length)}`,
      query,
      hash
    );
  }

  if (
    pathname === "/doctor" ||
    pathname.startsWith("/doctor/")
  ) {
    const translatedRoot =
      locale === "de"
        ? "/arzt"
        : "/doctor";

    return withSuffix(
      `/${locale}${translatedRoot}${pathname.slice("/doctor".length)}`,
      query,
      hash
    );
  }

  const staticPublicPaths:
    Record<
      string,
      Record<AppLocale, string>
    > = {
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

  const translatedPath =
    staticPublicPaths[pathname]?.[
      locale
    ];

  if (translatedPath) {
    return withSuffix(
      `/${locale}${translatedPath}`,
      query,
      hash
    );
  }

  /*
   * Authentication, legal pages and dashboards remain unlocalized.
   */
  return href;
}
