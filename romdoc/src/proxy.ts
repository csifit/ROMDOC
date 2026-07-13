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

function getPreferredLocale(
  request: NextRequest
): AppLocale {
  const cookieLocale =
    request.cookies.get(
      "NEXT_LOCALE"
    )?.value;

  if (
    routing.locales.includes(
      cookieLocale as AppLocale
    )
  ) {
    return cookieLocale as AppLocale;
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
