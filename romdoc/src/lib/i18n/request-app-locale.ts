import type {
  NextRequest,
} from "next/server";

import {
  isAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";

function parseLocale(
  value: unknown
): AppLocale | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return isAppLocale(
    normalized
  )
    ? normalized
    : null;
}

function getRefererLocale(
  request: NextRequest
): AppLocale | null {
  const referer =
    request.headers.get(
      "referer"
    );

  if (!referer) {
    return null;
  }

  try {
    const pathname =
      new URL(
        referer
      ).pathname;

    const firstSegment =
      pathname
        .split("/")
        .filter(Boolean)[0];

    return parseLocale(
      firstSegment
    );
  } catch {
    return null;
  }
}

export function getRequestAppLocale(
  request: NextRequest,
  explicitLocale?: unknown
): AppLocale {
  return (
    parseLocale(
      explicitLocale
    ) ??
    parseLocale(
      request.nextUrl
        .searchParams
        .get("locale")
    ) ??
    getRefererLocale(
      request
    ) ??
    parseLocale(
      request.cookies.get(
        "NEXT_LOCALE"
      )?.value
    ) ??
    "ro"
  );
}
