import createMiddleware
  from "next-intl/middleware";
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
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

  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    "/",
    "/(ro|en|de)/:path*",
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
