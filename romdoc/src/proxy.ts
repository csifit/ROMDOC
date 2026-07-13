import createMiddleware
  from "next-intl/middleware";

import {
  routing,
} from "@/i18n/routing";

export default createMiddleware(
  routing
);

export const config = {
  matcher: [
    "/",
    "/(ro|en|de)/:path*",
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};