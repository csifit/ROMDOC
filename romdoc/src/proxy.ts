import createMiddleware
  from "next-intl/middleware";
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  routing,
} from "@/i18n/routing";
import {
  stripLocalePrefix,
} from "@/lib/i18n/locale-path";

const intlMiddleware =
  createMiddleware(routing);

const localePrefixPattern =
  /^\/(ro|en|de)(?=\/|$)/;

const localizedPublicRoots = [
  "/medici",
  "/doctor",
  "/specialitati",
  "/ghid-pacienti",
  "/ghid-medici-personal",
] as const;

const unlocalizedApplicationRoots = [
  "/login",
  "/register",
  "/check-email",
  "/forgot-password",
  "/set-password",
  "/dashboard",
  "/admin",
  "/doctor-dashboard",
  "/patient-dashboard",
  "/staff-dashboard",
  "/manager-dashboard",
  "/clinic-manager-dashboard",
  "/appointments",
  "/medical-folder",
  "/mfa",
  "/auth",
  "/doctor-application",
  "/clinic-doctor-register",
  "/confidentialitate",
  "/termeni-si-conditii",
  "/cookies",
  "/informatii-legale",
  "/contact",
  "/support",
  "/oferta-clinici",
  "/pentru-medici",
  "/medici/cautare",
] as const;

function startsWithRoute(
  pathname: string,
  route: string
) {
  return (
    pathname === route ||
    pathname.startsWith(
      `${route}/`
    )
  );
}

function isLocalizedPublicLegacyPath(
  pathname: string
) {
  return localizedPublicRoots.some(
    (route) =>
      startsWithRoute(
        pathname,
        route
      )
  );
}

function isUnlocalizedApplicationPath(
  pathname: string
) {
  return unlocalizedApplicationRoots.some(
    (route) =>
      startsWithRoute(
        pathname,
        route
      )
  );
}

function redirectWithoutLocale(
  request: NextRequest,
  pathname: string
) {
  const url =
    request.nextUrl.clone();

  url.pathname = pathname;

  return NextResponse.redirect(
    url
  );
}

export default function proxy(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;

  const hasLocalePrefix =
    localePrefixPattern.test(
      pathname
    );

  if (hasLocalePrefix) {
    const unprefixedPath =
      stripLocalePrefix(
        pathname
      );

    /*
     * Compatibility redirect:
     * /ro/register -> /register
     * /en/dashboard -> /dashboard
     * /de/doctor-dashboard -> /doctor-dashboard
     */
    if (
      isUnlocalizedApplicationPath(
        unprefixedPath
      )
    ) {
      return redirectWithoutLocale(
        request,
        unprefixedPath
      );
    }

    return intlMiddleware(
      request
    );
  }

  /*
   * Localize only the public directory routes.
   * Dashboards, authentication and legal pages remain unprefixed.
   */
  if (
    pathname === "/" ||
    isLocalizedPublicLegacyPath(
      pathname
    )
  ) {
    return intlMiddleware(
      request
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
